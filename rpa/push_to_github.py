"""
push_to_github.py
=================

Empurra um ou mais snapshots para o repositorio configurado em GITHUB_REPO.

Cada snapshot eh um par (json, screenshot) marcado com um `period`.
Os destinos no repo seguem o esquema:

  data/snapshots/<period>.json                (sobrescreve)
  data/screenshots/<period>.<ext>             (sobrescreve)

Adicionalmente, quando `period == today`, o JSON tambem eh gravado em:

  data/history/today/<ISO>.json               (novo arquivo)

Retencao automatica: arquivos em `data/history/today/` mais antigos que
INTRADAY_HISTORY_RETENTION_DAYS (default 7) sao apagados.

Uso (multi-period em uma execucao):
    python push_to_github.py \
        --snapshot today snapshot_today.json dux_today.png \
        --snapshot yesterday snapshot_yesterday.json dux_yesterday.png
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import requests
from dotenv import load_dotenv

GITHUB_API = "https://api.github.com"
USER_AGENT = "compras-now-rpa"
VALID_PERIODS = {"today", "yesterday", "last7", "last30"}


@dataclass
class SnapshotInput:
    period: str
    json_path: Path
    screenshot_path: Path


def env(key: str, default: str | None = None) -> str:
    value = os.environ.get(key, default)
    if value is None or value == "":
        raise RuntimeError(f"Variavel de ambiente obrigatoria nao definida: {key}")
    return value


def headers() -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {env('GITHUB_PAT')}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": USER_AGENT,
    }


def repo() -> str:
    return env("GITHUB_REPO")


def branch() -> str:
    return os.environ.get("GITHUB_BRANCH", "main")


def data_path() -> str:
    return os.environ.get("GITHUB_DATA_PATH", "data").strip("/")


def author() -> dict[str, str]:
    return {
        "name": os.environ.get("GIT_AUTHOR_NAME", "Compras Now RPA"),
        "email": os.environ.get("GIT_AUTHOR_EMAIL", "[email protected]"),
    }


def get_existing_sha(path: str) -> str | None:
    url = f"{GITHUB_API}/repos/{repo()}/contents/{path}?ref={branch()}"
    res = requests.get(url, headers=headers(), timeout=30)
    if res.status_code == 200:
        return res.json().get("sha")
    if res.status_code == 404:
        return None
    raise RuntimeError(f"GET {path} -> {res.status_code} {res.text}")


def put_file(path: str, content: bytes, message: str) -> dict:
    url = f"{GITHUB_API}/repos/{repo()}/contents/{path}"
    payload: dict = {
        "message": message,
        "branch": branch(),
        "content": base64.b64encode(content).decode("ascii"),
        "committer": author(),
        "author": author(),
    }
    sha = get_existing_sha(path)
    if sha:
        payload["sha"] = sha

    for attempt in range(3):
        res = requests.put(url, headers=headers(), json=payload, timeout=60)
        if res.status_code in (200, 201):
            return res.json()
        if res.status_code == 409 and attempt < 2:
            time.sleep(1.5)
            sha = get_existing_sha(path)
            if sha:
                payload["sha"] = sha
            continue
        raise RuntimeError(f"PUT {path} -> {res.status_code} {res.text}")
    raise RuntimeError(f"PUT {path} failed after retries")


def delete_file(path: str, sha: str, message: str) -> None:
    url = f"{GITHUB_API}/repos/{repo()}/contents/{path}"
    payload = {
        "message": message,
        "branch": branch(),
        "sha": sha,
        "committer": author(),
        "author": author(),
    }
    res = requests.delete(url, headers=headers(), json=payload, timeout=60)
    if res.status_code not in (200, 204):
        raise RuntimeError(f"DELETE {path} -> {res.status_code} {res.text}")


def list_dir(path: str) -> list[dict]:
    url = f"{GITHUB_API}/repos/{repo()}/contents/{path}?ref={branch()}"
    res = requests.get(url, headers=headers(), timeout=30)
    if res.status_code == 404:
        return []
    if res.status_code != 200:
        raise RuntimeError(f"GET dir {path} -> {res.status_code} {res.text}")
    listing = res.json()
    return listing if isinstance(listing, list) else [listing]


def iso_for_filename(ts: dt.datetime) -> str:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    return ts.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def push_snapshot(item: SnapshotInput) -> None:
    if item.period not in VALID_PERIODS:
        raise ValueError(f"Periodo invalido: {item.period}")

    snapshot_text = item.json_path.read_text(encoding="utf-8")
    snapshot = json.loads(snapshot_text)

    snapshot["period"] = item.period
    snapshot.setdefault(
        "screenshotPath", f"{data_path()}/screenshots/{item.period}{item.screenshot_path.suffix.lower() or '.png'}"
    )

    captured_iso = snapshot.get("capturedAt") or dt.datetime.now(dt.timezone.utc).isoformat()
    captured_at = dt.datetime.fromisoformat(captured_iso.replace("Z", "+00:00"))
    if captured_at.tzinfo is None:
        captured_at = captured_at.replace(tzinfo=dt.timezone.utc)

    ext = item.screenshot_path.suffix.lower().lstrip(".") or "png"

    payload_bytes = json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8")
    image_bytes = item.screenshot_path.read_bytes()

    snapshot_remote = f"{data_path()}/snapshots/{item.period}.json"
    screenshot_remote = f"{data_path()}/screenshots/{item.period}.{ext}"
    commit_msg = f"data: snapshot {item.period} {iso_for_filename(captured_at)}"

    print(f"[push_to_github] push {item.period} -> {snapshot_remote}")
    put_file(snapshot_remote, payload_bytes, f"{commit_msg} (snapshot)")
    put_file(screenshot_remote, image_bytes, f"{commit_msg} (screenshot)")

    if item.period == "today":
        history_remote = f"{data_path()}/history/today/{iso_for_filename(captured_at)}.json"
        put_file(history_remote, payload_bytes, f"{commit_msg} (intraday point)")


def cleanup_intraday_history(retention_days: int, reference: dt.datetime) -> int:
    cutoff = reference - dt.timedelta(days=retention_days)
    removed = 0
    folder = f"{data_path()}/history/today"
    for item in list_dir(folder):
        name = item.get("name", "")
        base = name.rsplit(".", 1)[0]
        base_iso = base.replace("_", ":")
        try:
            parsed = dt.datetime.fromisoformat(base_iso.replace("Z", "+00:00"))
        except ValueError:
            match = re.match(r"(\d{4}-\d{2}-\d{2})", base)
            if not match:
                continue
            try:
                parsed = dt.datetime.fromisoformat(match.group(1))
            except ValueError:
                continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        if parsed < cutoff:
            try:
                delete_file(item["path"], item["sha"], f"chore(rpa): cleanup {item['path']}")
                removed += 1
            except Exception as exc:  # noqa: BLE001
                print(
                    f"[push_to_github] cleanup falhou {item['path']}: {exc}",
                    file=sys.stderr,
                )
    return removed


def parse_snapshot_arg(values: list[str]) -> list[SnapshotInput]:
    if len(values) % 3 != 0:
        raise SystemExit(
            "--snapshot precisa de 3 valores: <period> <json> <screenshot>. Pode repetir varias vezes."
        )
    items: list[SnapshotInput] = []
    for i in range(0, len(values), 3):
        period, json_str, screenshot_str = values[i], values[i + 1], values[i + 2]
        json_path = Path(json_str)
        screenshot_path = Path(screenshot_str)
        if not json_path.exists():
            raise SystemExit(f"JSON nao encontrado: {json_path}")
        if not screenshot_path.exists():
            raise SystemExit(f"Screenshot nao encontrado: {screenshot_path}")
        items.append(SnapshotInput(period=period, json_path=json_path, screenshot_path=screenshot_path))
    return items


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Sobe um ou mais snapshots no repo GitHub.")
    parser.add_argument(
        "--snapshot",
        action="extend",
        nargs=3,
        metavar=("PERIOD", "JSON", "SCREENSHOT"),
        default=[],
        help="Triplet de argumentos: chave do periodo, JSON e screenshot. Pode repetir.",
    )
    parser.add_argument("--retention-days", type=int, default=None)
    parser.add_argument("--env", type=Path, default=None)
    args = parser.parse_args(argv)

    load_dotenv(dotenv_path=args.env) if args.env else load_dotenv()

    items = parse_snapshot_arg(args.snapshot)
    if not items:
        raise SystemExit("Forneca pelo menos um --snapshot PERIOD JSON SCREENSHOT")

    has_today = any(item.period == "today" for item in items)

    for item in items:
        push_snapshot(item)

    retention = args.retention_days or int(os.environ.get("INTRADAY_HISTORY_RETENTION_DAYS", "7"))
    if has_today and retention > 0:
        reference = dt.datetime.now(dt.timezone.utc)
        removed = cleanup_intraday_history(retention, reference)
        if removed:
            print(f"[push_to_github] retention intraday -> {removed} arquivos removidos")

    print("[push_to_github] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
