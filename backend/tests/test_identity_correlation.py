from app.modules.identity_correlation import compare_identity_fields


ANCHOR = {"name": "AYAAN BALA", "dob": "1988-11-19", "gender": "M"}


def test_same_identity_is_consistent() -> None:
    result = compare_identity_fields(ANCHOR, {"name": "Ayaan Bala", "dob": "19/11/1988", "gender": "M"})
    assert result["status"] == "consistent"
    assert result["overall_score"] == 1.0


def test_minor_ocr_variation_remains_consistent() -> None:
    result = compare_identity_fields(ANCHOR, {"name": "Ayan Bala", "dob": "19/11/1988"})
    assert result["status"] == "consistent"
    assert result["gender_match"] is None


def test_conflicting_identity_is_mismatch() -> None:
    result = compare_identity_fields(ANCHOR, {"name": "Rahul BALA", "dob": "01/01/1990", "gender": "F"})
    assert result["status"] == "mismatch"
    assert result["dob_match"] is False


def test_missing_fields_are_not_a_mismatch() -> None:
    result = compare_identity_fields(ANCHOR, {"name": "", "dob": "", "gender": ""})
    assert result["status"] == "insufficient_data"
    assert result["face_similarity"] is None
