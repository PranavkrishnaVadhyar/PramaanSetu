"""Explicitly provision PP-OCRv5 Mobile weights for offline PramaanSetu scans.

Run this once during local setup or image building. The scan API itself never
downloads model files and only loads this local directory.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path


DEFAULT_MODEL = "PP-OCRv5_mobile_rec_safetensors"
DEFAULT_TARGET = Path("./models/pp-ocrv5-mobile-rec")
MODEL_REPOSITORY = "PaddlePaddle/PP-OCRv5_mobile_rec_safetensors"
MODEL_WEIGHTS_SHA256 = "0bce74901be5dc8aef6d62a09eef40e46d9687fe7b087b37639e80f5d80219a3"


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision the local PP-OCRv5 Mobile model")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Approved PaddleOCR model name")
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET, help="Destination model directory")
    parser.add_argument(
        "--allow-network-download",
        action="store_true",
        help="Explicitly allow this one-time setup command to download model weights",
    )
    args = parser.parse_args()

    if not args.allow_network_download:
        parser.error("Refusing network access. Re-run with --allow-network-download after reviewing the model.")
    if args.model != DEFAULT_MODEL:
        parser.error(f"Only the approved model '{DEFAULT_MODEL}' can be provisioned.")

    target = args.target.resolve()
    if target.exists() and any(target.iterdir()):
        print(f"Refusing to alter non-empty model directory: {target}", file=sys.stderr)
        return 1
    target.mkdir(parents=True, exist_ok=True)

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("huggingface_hub is not installed. Install backend requirements first.", file=sys.stderr)
        return 1

    try:
        # TextRecognition treats an existing `model_dir` as fully provisioned,
        # so fetch the repository directly instead of asking PaddleOCR to load
        # an empty destination. This remains an explicit setup-only network call.
        snapshot_download(
            repo_id=MODEL_REPOSITORY,
            revision="main",
            local_dir=target,
        )
    except Exception as exc:
        print(f"Model provisioning failed: {exc}", file=sys.stderr)
        return 1

    weights = target / "model.safetensors"
    inference_config = target / "inference.yml"
    if not weights.is_file() or not inference_config.is_file():
        print("Provisioned model is incomplete: expected model.safetensors and inference.yml.", file=sys.stderr)
        return 1
    digest = hashlib.sha256(weights.read_bytes()).hexdigest()
    if digest != MODEL_WEIGHTS_SHA256:
        print("Model hash verification failed; refusing to use unverified weights.", file=sys.stderr)
        return 1

    print(f"PP-OCR model provisioned at: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
