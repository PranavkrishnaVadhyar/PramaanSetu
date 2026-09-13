"""
Module 2 — Verhoeff Checksum (Aadhaar UID)

The Verhoeff algorithm is used by UIDAI to validate the 12-digit Aadhaar number.
The last digit is the check digit.
"""
from __future__ import annotations

# Verhoeff multiplication table
_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

# Permutation table
_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

# Inverse table
_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def validate_aadhaar(uid: str) -> bool:
    """
    Validate a 12-digit Aadhaar UID using the Verhoeff algorithm.

    Strips spaces and hyphens before validation (handles 'XXXX XXXX XXXX'
    and 'XXXX-XXXX-XXXX' formats, though the last 4 digits may be masked).

    Returns True if the checksum is valid, False otherwise.
    Note: masked UIDs (e.g. XXXX-XXXX-4819) cannot be validated — returns None.
    """
    clean = uid.replace(" ", "").replace("-", "").replace("X", "").replace("x", "")

    # If significant digits are masked we cannot validate
    if len(clean) < 12:
        return None  # type: ignore[return-value]  — intentional: None = "unable to validate"

    clean = clean[:12]
    if not clean.isdigit():
        return False

    c = 0
    for i, digit in enumerate(reversed(clean)):
        c = _D[c][_P[i % 8][int(digit)]]

    return c == 0
