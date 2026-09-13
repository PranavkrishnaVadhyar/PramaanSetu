"""
Module 2 — PAN Card Structure Validation

PAN format: [A-Z]{5}[0-9]{4}[A-Z]
  - 4th character encodes entity type (P=Person, C=Company, H=HUF, etc.)
  - 5th character is first letter of surname (for individuals)
"""
from __future__ import annotations

import re

_PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

_ENTITY_TYPES = {
    "P": "Individual",
    "C": "Company",
    "H": "Hindu Undivided Family",
    "F": "Firm",
    "A": "Association of Persons",
    "T": "Trust",
    "B": "Body of Individuals",
    "L": "Local Authority",
    "J": "Artificial Juridical Person",
    "G": "Government",
}


def validate_pan(pan: str) -> dict[str, bool | str | None]:
    """
    Validate a PAN string.

    Returns
    -------
    dict with:
        valid:        bool
        entity_type:  str | None — human-readable entity type
        error:        str | None
    """
    pan = pan.upper().strip().replace(" ", "")
    result: dict[str, bool | str | None] = {
        "valid": False,
        "entity_type": None,
        "error": None,
    }

    if len(pan) != 10:
        result["error"] = f"PAN must be 10 characters, got {len(pan)}"
        return result

    if not _PAN_REGEX.match(pan):
        result["error"] = "PAN does not match pattern [A-Z]{5}[0-9]{4}[A-Z]"
        return result

    entity_char = pan[3]
    result["valid"] = True
    result["entity_type"] = _ENTITY_TYPES.get(entity_char, f"Unknown ('{entity_char}')")
    return result
