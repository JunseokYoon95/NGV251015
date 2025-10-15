#!/usr/bin/env python3
"""Builds cars.json manifest for the Car Picker quiz and copies JPG assets."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Set

YEAR_PATTERN = re.compile(r"^\d{4}$")
STOP_TOKENS: Set[str] = {
    "AWD",
    "FWD",
    "RWD",
    "4WD",
    "2WD",
    "4X4",
    "4X2",
    "4DR",
    "2DR",
    "CVT",
    "MT",
    "AT",
    "AUTO",
    "MANUAL",
}


@dataclass
class CarRecord:
    source_path: Path
    image_path: str
    make: str
    model: str

    @property
    def label(self) -> str:
        return f"{self.make} {self.model}".strip()

    def to_dict(self) -> dict:
        return {
            "imagePath": self.image_path.replace("\\", "/"),
            "make": self.make,
            "model": self.model,
            "label": self.label,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate cars.json and copy JPGs for the Car Picker quiz.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Source directory that contains *.JPG assets (e.g. C:/Users/user/Desktop/CAR_PICKER/data).",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public",
        help="Destination web root (defaults to the repo's public/ folder).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on how many images to process (useful for smoke tests).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List the actions without copying files or writing cars.json.",
    )
    parser.add_argument(
        "--skip-copy",
        action="store_true",
        help="Skip copying JPG files (only update cars.json).",
    )
    return parser.parse_args()


def normalise_token(token: str) -> str:
    cleaned = token.replace("-", " ").replace("+", " ").strip()
    if not cleaned:
        return ""
    if cleaned.isupper() and len(cleaned) <= 3:
        return cleaned
    return " ".join(word.capitalize() for word in cleaned.split())


def parse_make_model(stem: str) -> tuple[str, str]:
    parts = [part for part in stem.split("_") if part]
    if len(parts) < 2:
        raise ValueError("파일명에서 메이커와 모델을 추출할 수 없습니다.")

    make = normalise_token(parts[0])
    if not make:
        raise ValueError("메이커 토큰이 비어 있습니다.")

    model_tokens: List[str] = []
    for token in parts[1:]:
        upper_token = token.upper()
        if YEAR_PATTERN.match(token):
            break
        if upper_token in STOP_TOKENS:
            break
        model_tokens.append(token)

    if not model_tokens and len(parts) >= 2:
        model_tokens.append(parts[1])

    model = " ".join(normalise_token(token) for token in model_tokens if token)
    model = re.sub(r"\s{2,}", " ", model).strip()
    if not model:
        raise ValueError("모델명을 파싱하지 못했습니다.")

    return make, model


def gather_records(source_dir: Path, limit: int | None = None) -> Iterable[CarRecord]:
    jpg_files = sorted(source_dir.glob("*.JPG"))
    if limit:
        jpg_files = jpg_files[:limit]

    for file_path in jpg_files:
        try:
            make, model = parse_make_model(file_path.stem)
        except ValueError as exc:
            print(f"[SKIP] {file_path.name}: {exc}", file=sys.stderr)
            continue

        yield CarRecord(
            source_path=file_path,
            image_path=f"images/cars/{file_path.name}",
            make=make,
            model=model,
        )


def copy_assets(records: Iterable[CarRecord], dest_dir: Path, skip_copy: bool) -> List[CarRecord]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    processed: List[CarRecord] = []
    for record in records:
        processed.append(record)
        if skip_copy:
            continue
        destination = dest_dir / Path(record.image_path).name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(record.source_path, destination)
    return processed


def write_manifest(records: Iterable[CarRecord], manifest_path: Path) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    data = [record.to_dict() for record in records]
    with manifest_path.open("w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, indent=2)


def main() -> int:
    args = parse_args()
    source_dir = args.source.expanduser().resolve()
    dest_root = args.dest.expanduser().resolve()
    images_dest = dest_root / "images" / "cars"
    manifest_path = dest_root / "data" / "cars.json"

    if not source_dir.exists():
        print(f"[ERROR] Source directory not found: {source_dir}", file=sys.stderr)
        return 1

    records = list(gather_records(source_dir, args.limit))
    if not records:
        print("[WARN] No valid JPG files were found.", file=sys.stderr)

    if args.dry_run:
        print("=== Dry Run Summary ===")
        print(f"Source: {source_dir}")
        print(f"Destination: {dest_root}")
        print(f"Total candidates: {len(records)}")
        for record in records[:10]:
            print(f"- {record.label} -> {record.image_path}")
        if len(records) > 10:
            print(f"... and {len(records) - 10} more")
        return 0

    processed = copy_assets(records, images_dest, skip_copy=args.skip_copy)
    write_manifest(processed, manifest_path)

    print(f"[DONE] Copied {len(processed)} image(s) to {images_dest}")
    print(f"[DONE] Wrote manifest with {len(processed)} entries to {manifest_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
