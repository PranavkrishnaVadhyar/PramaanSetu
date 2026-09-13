"""
Module 2 — MRZ Checksum Validation (ICAO Doc 9303)

Validates the machine-readable zone check digits for Indian passports.
Check digit algorithm: weighted sum mod 10, weights [7, 3, 1] cycling.
"""
from __future__ import annotations

_ICAO_VALUES: dict[str, int] = {
    **{str(i): i for i in range(10)},
    **{chr(c): c - 55 for c in range(65, 91)},   # A=10, B=11, …, Z=35
    "<": 0,
}
_WEIGHTS = [7, 3, 1]


def _check_digit(field: str) -> int:
    """Compute ICAO 9303 check digit for a string."""
    total = sum(_ICAO_VALUES.get(ch, 0) * _WEIGHTS[i % 3] for i, ch in enumerate(field))
    return total % 10


def validate_mrz(mrz_line1: str, mrz_line2: str) -> dict[str, bool | str | None]:
    """
    Validate all check digits in a TD3 (passport) MRZ.

    Parameters
    ----------
    mrz_line1 : str  — 44-character MRZ line 1
    mrz_line2 : str  — 44-character MRZ line 2

    Returns
    -------
    dict with keys:
        overall_pass:       bool — all mandatory checks passed
        document_number_ok: bool
        dob_ok:             bool
        expiry_ok:          bool
        composite_ok:       bool
        error:              str | None — parse error description if any
    """
    result: dict[str, bool | str | None] = {
        "overall_pass": False,
        "document_number_ok": False,
        "dob_ok": False,
        "expiry_ok": False,
        "composite_ok": False,
        "error": None,
    }

    l1 = mrz_line1.upper().replace(" ", "")
    l2 = mrz_line2.upper().replace(" ", "")

    if len(l1) != 44 or len(l2) != 44:
        result["error"] = f"MRZ line lengths invalid: {len(l1)}, {len(l2)} (expected 44 each)"
        return result

    try:
        # Document number: chars 0–8 of line 2, check digit at char 9
        doc_num = l2[0:9]
        doc_cd  = int(l2[9])
        result["document_number_ok"] = _check_digit(doc_num) == doc_cd

        # Date of birth: chars 13–18 of line 2, check digit at char 19
        dob     = l2[13:19]
        dob_cd  = int(l2[19])
        result["dob_ok"] = _check_digit(dob) == dob_cd

        # Expiry date: chars 21–26 of line 2, check digit at char 27
        expiry    = l2[21:27]
        expiry_cd = int(l2[27])
        result["expiry_ok"] = _check_digit(expiry) == expiry_cd

        # Composite check: line2[0:10] + line2[13:20] + line2[21:43]
        composite    = l2[0:10] + l2[13:20] + l2[21:43]
        composite_cd = int(l2[43])
        result["composite_ok"] = _check_digit(composite) == composite_cd

        result["overall_pass"] = all([
            result["document_number_ok"],
            result["dob_ok"],
            result["expiry_ok"],
            result["composite_ok"],
        ])
    except (ValueError, IndexError) as exc:
        result["error"] = f"MRZ parse error: {exc}"

    return result
