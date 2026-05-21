"""
run_pipeline.py
===============

Chamado pelo subfluxo `ReportExport` do Power Automate Desktop UMA VEZ POR
PERIODO, logo apos o flow ter salvo:

  - <LOCAL_DOWNLOAD_DIR>/<EXCEL_FILENAME>      (Excel sintetico exportado)
  - <LOCAL_DOWNLOAD_DIR>/<SCREENSHOT_FILENAME> (Print do DUX/Compras Now)

Recebe 3 argumentos posicionais:
  arg1 = tipo do relatorio (0=today, 1=yesterday, 2=last7, 3=last30)
  arg2 = data inicial em formato dd/MM/yyyy
  arg3 = data final em formato dd/MM/yyyy

Exemplo de chamada (PAD ou manual):
  python run_pipeline.py 1 20/05/2026 20/05/2026
  python run_pipeline.py 2 14/05/2026 20/05/2026
  python run_pipeline.py 3 21/04/2026 20/05/2026
  python run_pipeline.py 0 21/05/2026 21/05/2026

Fluxo:
  1. Le os argumentos posicionais (tipo + datas)
  2. Mapeia tipo -> chave de periodo (today/yesterday/last7/last30)
  3. Parseia o Excel via parse_excel.py -> snapshot_<period>.json em workspace
  4. Copia a print pra workspace renomeada como <period>.<ext>
  5. Faz push para o GitHub via push_to_github.py
  6. Loga tudo em rpa/logs/

Exit codes:
  0 -> sucesso
  2 -> arquivos faltando ou args invalidos
  3 -> parse_excel.py falhou
  4 -> push_to_github.py falhou
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import shutil
import subprocess
import sys
import traceback
from pathlib import Path

from dotenv import load_dotenv

THIS_DIR = Path(__file__).resolve().parent

# Mapeamento entre o tipo de relatorio enviado pelo PAD e a chave de periodo
# do dashboard. O dashboard espera today/yesterday/last7/last30.
REPORT_TYPE_TO_PERIOD: dict[int, str] = {
    0: "today",
    1: "yesterday",
    2: "last7",
    3: "last30",
}

TZ = dt.timezone(dt.timedelta(hours=-3))


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def log(message: str, log_file: Path) -> None:
    stamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{stamp}] {message}"
    print(line)
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def parse_pad_date(value: str) -> dt.datetime:
    """Converte uma data do formato dd/MM/yyyy (PAD) para datetime com TZ -03."""
    try:
        return dt.datetime.strptime(value.strip(), "%d/%m/%Y").replace(tzinfo=TZ)
    except ValueError as exc:
        raise ValueError(
            f"Data invalida '{value}'. Esperado formato dd/MM/yyyy (ex: 20/05/2026)."
        ) from exc


def format_period_label(period: str, date_from: dt.datetime, date_to: dt.datetime) -> str:
    fmt = lambda d: d.strftime("%d/%m")  # noqa: E731
    if period == "today":
        return f"Hoje ({fmt(date_to)})"
    if period == "yesterday":
        return f"Ontem ({fmt(date_to)})"
    if period == "last7":
        return f"Ultimos 7 dias ({fmt(date_from)} - {fmt(date_to)})"
    if period == "last30":
        return f"Ultimos 30 dias ({fmt(date_from)} - {fmt(date_to)})"
    return f"{fmt(date_from)} - {fmt(date_to)}"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Pipeline pos-Power Automate. Recebe tipo do relatorio + datas "
            "como argumentos posicionais e empurra o snapshot pro GitHub."
        ),
    )
    parser.add_argument(
        "report_type",
        type=int,
        choices=sorted(REPORT_TYPE_TO_PERIOD.keys()),
        help="0=today | 1=yesterday | 2=last7 | 3=last30",
    )
    parser.add_argument(
        "date_from",
        type=str,
        help="Data inicial no formato dd/MM/yyyy",
    )
    parser.add_argument(
        "date_to",
        type=str,
        help="Data final no formato dd/MM/yyyy",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Nao chama push_to_github (so parseia e gera JSON localmente)",
    )
    parser.add_argument("--env", type=Path, default=None)

    args = parser.parse_args(argv)

    load_dotenv(dotenv_path=args.env) if args.env else load_dotenv(dotenv_path=THIS_DIR / ".env")

    download_dir = Path(env("LOCAL_DOWNLOAD_DIR", str(THIS_DIR / "downloads")) or "")
    excel_filename = env("EXCEL_FILENAME", "Relatorio-Compras-Now.xls") or "Relatorio-Compras-Now.xls"
    screenshot_filename = (
        env("SCREENSHOT_FILENAME", "Print-Relatorio-Compras-Now.png")
        or "Print-Relatorio-Compras-Now.png"
    )
    log_file = THIS_DIR / "logs" / f"{dt.date.today():%Y-%m}.log"

    period = REPORT_TYPE_TO_PERIOD[args.report_type]

    log("=" * 60, log_file)
    log(
        f"inicio pipeline (report_type={args.report_type} -> period={period}, "
        f"date_from={args.date_from}, date_to={args.date_to})",
        log_file,
    )

    try:
        date_from = parse_pad_date(args.date_from)
        date_to = parse_pad_date(args.date_to).replace(hour=23, minute=59, second=59)
    except ValueError as exc:
        log(f"ERRO: {exc}", log_file)
        return 2

    excel_path = download_dir / excel_filename
    screenshot_path = download_dir / screenshot_filename

    if not excel_path.exists():
        log(f"ERRO: Excel nao encontrado em {excel_path}", log_file)
        return 2
    if not screenshot_path.exists():
        log(f"ERRO: screenshot nao encontrado em {screenshot_path}", log_file)
        return 2

    workspace = THIS_DIR / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    json_out = workspace / f"snapshot_{period}.json"
    screenshot_ext = screenshot_path.suffix.lower() or ".png"
    screenshot_out = workspace / f"{period}{screenshot_ext}"

    captured_at = dt.datetime.now(TZ)
    period_label = format_period_label(period, date_from, date_to)

    try:
        log(f"parse_excel ({period}): {excel_path.name}", log_file)
        rc_parse = subprocess.call(
            [
                sys.executable,
                str(THIS_DIR / "parse_excel.py"),
                str(excel_path),
                "--output",
                str(json_out),
                "--captured-at",
                captured_at.isoformat(timespec="seconds"),
                "--period",
                period,
                "--period-from",
                date_from.isoformat(timespec="seconds"),
                "--period-to",
                date_to.isoformat(timespec="seconds"),
                "--period-label",
                period_label,
                "--screenshot",
                f"{period}{screenshot_ext}",
            ]
        )
        if rc_parse != 0:
            log(f"ERRO no parse_excel (rc={rc_parse})", log_file)
            return 3

        # Copia a print pra workspace renomeada com o nome do periodo,
        # porque o push_to_github usa a extensao do arquivo passado pra
        # gravar em data/screenshots/<period>.<ext>.
        shutil.copy2(screenshot_path, screenshot_out)
        log(f"screenshot copiado: {screenshot_path.name} -> {screenshot_out.name}", log_file)

        if args.dry_run:
            log("--dry-run: pulando push_to_github", log_file)
            log("pipeline OK (dry-run)", log_file)
            return 0

        log("push_to_github", log_file)
        push_cmd = [
            sys.executable,
            str(THIS_DIR / "push_to_github.py"),
            "--snapshot",
            period,
            str(json_out),
            str(screenshot_out),
        ]
        rc = subprocess.call(push_cmd)
        if rc != 0:
            log(f"ERRO no push_to_github rc={rc}", log_file)
            return 4

        log(f"pipeline OK (period={period})", log_file)
        return 0
    except Exception as exc:  # noqa: BLE001
        log(f"EXCECAO: {exc}\n{traceback.format_exc()}", log_file)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
