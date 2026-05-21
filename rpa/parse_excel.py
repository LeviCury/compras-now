"""
parse_excel.py
==============

Le o arquivo ExportSintetico.xls produzido pelo modulo "Compras Now"
(DUX > Minerva Reports > Relatorios de Controle) e gera um JSON
normalizado para o dashboard.

Saida:
- compras_now_snapshot.json (na mesma pasta do .xls por padrao)

Uso:
    python parse_excel.py <caminho_para_excel> [--output saida.json] \
        [--captured-at 2026-05-20T15:00:00-03:00]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import pandas as pd

ORIGENS_VALIDAS = {"AR", "BR", "CO", "PY", "UY"}
SEXOS_VALIDOS = {"FEMEA", "MACHO"}


def parse_number(value: Any) -> float:
    """Converte string pt-BR ("1.234,56") ou numero para float."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return 0.0
        return float(value)
    text = str(value).strip()
    if not text or text in {"-", "nan", "NaN"}:
        return 0.0
    text = text.replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return 0.0


def normalize_origem(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().upper()
    if text in ORIGENS_VALIDAS:
        return text
    return None


def normalize_sexo(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().upper()
    text = text.replace("Ê", "E").replace("Ã", "A").replace("É", "E").replace("Ó", "O")
    if text in SEXOS_VALIDOS:
        return text
    return None


def find_header_row(df: pd.DataFrame) -> int:
    """Encontra a linha que contem os headers "Pais Origem" e "Sexo"."""
    for idx, row in df.iterrows():
        for val in row:
            if isinstance(val, str) and re.search(r"pa[ií]s\s+origem", val, re.IGNORECASE):
                return int(idx)
    raise ValueError("Cabecalho 'Pais Origem' nao encontrado no Excel.")


def column_indexes(df: pd.DataFrame, header_row: int) -> dict[str, int]:
    """Mapeia os indices das colunas relevantes (origem/sexo/metricas) usando heuristicas.

    O export do Compras Now eh pivot: a coluna do header "Pais Origem" nao eh
    necessariamente a mesma onde os valores aparecem nas linhas de dados. Por
    isso varremos as linhas de dados para localizar a coluna de origem (que
    contem codigos AR/BR/CO/PY/UY).
    """
    indices: dict[str, int] = {}
    header = df.iloc[header_row]
    for j, raw in enumerate(header):
        if not isinstance(raw, str):
            continue
        text = raw.strip().lower()
        if text == "sexo":
            indices["sexo"] = j

    metric_row = header_row + 1
    metrics_header = df.iloc[metric_row]
    for j, raw in enumerate(metrics_header):
        if not isinstance(raw, str):
            continue
        text = raw.strip().lower()
        if "qtd" in text and "compra" in text:
            indices["qtd"] = j
        elif "peso" in text and "kg" in text and "preco" not in text and "pre\u00e7" not in text:
            indices["peso"] = j
        elif "pre" in text and "kg" in text and "usd" in text:
            indices["preco"] = j
        elif "valor" in text and "base" in text:
            indices["base"] = j

    origem_col = _detect_origem_column(df, start_row=header_row + 2)
    if origem_col is not None:
        indices["origem"] = origem_col

    missing = {"origem", "sexo", "qtd", "peso", "preco"} - indices.keys()
    if missing:
        raise ValueError(f"Colunas faltando no Excel: {sorted(missing)}")
    return indices


def _detect_origem_column(df: pd.DataFrame, start_row: int) -> int | None:
    """Procura, varrendo as linhas de dados, a coluna que contem codigos AR/BR/CO/PY/UY."""
    scores: dict[int, int] = {}
    for i in range(start_row, min(start_row + 50, len(df))):
        for j, val in enumerate(df.iloc[i]):
            if not isinstance(val, str):
                continue
            text = val.strip().upper()
            if text in ORIGENS_VALIDAS or text.endswith(" TOTAL"):
                scores[j] = scores.get(j, 0) + 1
    if not scores:
        return None
    return max(scores.items(), key=lambda kv: kv[1])[0]


def extract_rows(xls_path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    df = pd.read_excel(xls_path, sheet_name=0, header=None)

    header_row = find_header_row(df)
    indices = column_indexes(df, header_row)
    data_start = header_row + 2

    rows: list[dict[str, Any]] = []
    current_origem: str | None = None

    grand_total = {
        "qtdCompra": 0.0,
        "pesoMedioKg": 0.0,
        "precoMedioUSDKg": 0.0,
        "valorKgBaseUSD": 0.0,
    }

    has_base_col = "base" in indices

    def _read_base(row) -> float:
        if not has_base_col:
            return 0.0
        return parse_number(row.iloc[indices["base"]])

    def _round_base_or_none(value: float) -> float | None:
        # No DUX, 0,00 significa "sem base configurada" (nao eh um valor real).
        if value <= 0:
            return None
        return round(value, 4)

    for i in range(data_start, len(df)):
        row = df.iloc[i]
        first_cell = row.iloc[0] if len(row) > 0 else None
        first_text = str(first_cell).strip() if pd.notna(first_cell) else ""

        if first_text.lower() == "grand total":
            grand_total["qtdCompra"] = parse_number(row.iloc[indices["qtd"]])
            grand_total["pesoMedioKg"] = parse_number(row.iloc[indices["peso"]])
            grand_total["precoMedioUSDKg"] = parse_number(row.iloc[indices["preco"]])
            grand_total["valorKgBaseUSD"] = _read_base(row)
            continue

        if first_text.endswith("Total") and first_text.split(" ")[0] in ORIGENS_VALIDAS:
            continue

        origem_in_row = normalize_origem(row.iloc[indices["origem"]])
        if origem_in_row:
            current_origem = origem_in_row

        sexo = normalize_sexo(row.iloc[indices["sexo"]])
        if not sexo or not current_origem:
            continue

        qtd = parse_number(row.iloc[indices["qtd"]])
        peso = parse_number(row.iloc[indices["peso"]])
        preco = parse_number(row.iloc[indices["preco"]])
        base = _read_base(row)

        if qtd == 0 and peso == 0 and preco == 0:
            continue

        row_dict: dict[str, Any] = {
            "origem": current_origem,
            "sexo": sexo,
            "qtdCompra": int(round(qtd)),
            "pesoMedioKg": round(peso, 2),
            "precoMedioUSDKg": round(preco, 4),
        }
        base_rounded = _round_base_or_none(base)
        if base_rounded is not None:
            row_dict["valorKgBaseUSD"] = base_rounded
        rows.append(row_dict)

    if not rows:
        raise ValueError("Nenhuma linha de dados valida encontrada no Excel.")

    totals: dict[str, Any] = {
        "qtdCompra": int(round(grand_total["qtdCompra"]))
        if grand_total["qtdCompra"]
        else sum(r["qtdCompra"] for r in rows),
        "pesoMedioKg": round(grand_total["pesoMedioKg"], 2)
        if grand_total["pesoMedioKg"]
        else round(
            sum(r["pesoMedioKg"] * r["qtdCompra"] for r in rows)
            / max(sum(r["qtdCompra"] for r in rows), 1),
            2,
        ),
        "precoMedioUSDKg": round(grand_total["precoMedioUSDKg"], 4)
        if grand_total["precoMedioUSDKg"]
        else round(
            sum(r["precoMedioUSDKg"] * r["qtdCompra"] * r["pesoMedioKg"] for r in rows)
            / max(sum(r["qtdCompra"] * r["pesoMedioKg"] for r in rows), 1),
            4,
        ),
    }

    grand_base = _round_base_or_none(grand_total["valorKgBaseUSD"])
    if grand_base is not None:
        totals["valorKgBaseUSD"] = grand_base

    return rows, totals


VALID_PERIODS = {"today", "yesterday", "last7", "last30"}


def _format_period_label(period: str, date_from: dt.datetime, date_to: dt.datetime) -> str:
    f = date_from.strftime("%d/%m")
    t = date_to.strftime("%d/%m")
    if period == "today":
        return f"Hoje ({t})"
    if period == "yesterday":
        return f"Ontem ({t})"
    if period == "last7":
        return f"Ultimos 7 dias ({f} - {t})"
    if period == "last30":
        return f"Ultimos 30 dias ({f} - {t})"
    return f"{f} - {t}"


def build_snapshot(
    xls_path: Path,
    captured_at: dt.datetime | None = None,
    screenshot_filename: str | None = None,
    period: str | None = None,
    period_from: dt.datetime | None = None,
    period_to: dt.datetime | None = None,
    period_label: str | None = None,
) -> dict[str, Any]:
    rows, totals = extract_rows(xls_path)
    captured_at = captured_at or dt.datetime.now(dt.timezone(dt.timedelta(hours=-3)))

    snapshot: dict[str, Any] = {
        "capturedAt": captured_at.isoformat(timespec="seconds"),
        "rows": rows,
        "totals": totals,
        "source": {
            "module": "Compras Now",
            "breadcrumb": "DUX > Minerva Reports > Relatorios de Controle > Compras Now",
        },
    }

    if period:
        if period not in VALID_PERIODS:
            raise ValueError(f"Periodo invalido: {period}. Use um de {sorted(VALID_PERIODS)}.")
        snapshot["period"] = period

    if period_from:
        snapshot["periodFrom"] = period_from.isoformat(timespec="seconds")
    if period_to:
        snapshot["periodTo"] = period_to.isoformat(timespec="seconds")

    if period_label:
        snapshot["periodLabel"] = period_label
    elif period and period_from and period_to:
        snapshot["periodLabel"] = _format_period_label(period, period_from, period_to)

    if screenshot_filename:
        snapshot["screenshotPath"] = f"data/screenshots/{screenshot_filename}"
    elif period:
        snapshot["screenshotPath"] = f"data/screenshots/{period}.png"

    return snapshot


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Parseia ExportSintetico.xls do Compras Now.")
    parser.add_argument("excel", type=Path, help="Caminho para o ExportSintetico.xls")
    parser.add_argument("--output", "-o", type=Path, default=None, help="Arquivo JSON de saida")
    parser.add_argument("--captured-at", type=str, default=None, help="ISO datetime opcional")
    parser.add_argument("--screenshot", type=str, default=None, help="Nome do arquivo de print")
    parser.add_argument(
        "--period",
        choices=sorted(VALID_PERIODS),
        default=None,
        help="Chave do periodo (today/yesterday/last7/last30)",
    )
    parser.add_argument("--period-from", type=str, default=None, help="ISO datetime inicial")
    parser.add_argument("--period-to", type=str, default=None, help="ISO datetime final")
    parser.add_argument("--period-label", type=str, default=None, help="Label legivel do periodo")
    args = parser.parse_args(argv)

    excel_path: Path = args.excel
    if not excel_path.exists():
        print(f"[parse_excel] Excel nao encontrado: {excel_path}", file=sys.stderr)
        return 2

    captured_at = dt.datetime.fromisoformat(args.captured_at) if args.captured_at else None
    period_from = dt.datetime.fromisoformat(args.period_from) if args.period_from else None
    period_to = dt.datetime.fromisoformat(args.period_to) if args.period_to else None

    snapshot = build_snapshot(
        excel_path,
        captured_at=captured_at,
        screenshot_filename=args.screenshot,
        period=args.period,
        period_from=period_from,
        period_to=period_to,
        period_label=args.period_label,
    )

    out_path: Path = args.output or excel_path.with_name(
        f"snapshot_{args.period or 'output'}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"[parse_excel] OK -> {out_path} ({len(snapshot['rows'])} linhas, periodo={args.period or '-'})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
