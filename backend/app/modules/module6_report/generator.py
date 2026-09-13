"""
Module 6 — Deterministic Forensic Report Generator
==================================================
Generates structured, explainable audit reports directly from the findings
of Modules 1–5 using deterministic string templates.

Eliminates LLM dependencies, API keys, and external network latency.
Maintains identical input and output contracts:
  Input: structured scan summary dict
  Output: ReportOutput with .text_en and .text_hi (also dict-subscriptable)
"""
from __future__ import annotations

import re
from typing import Any


class ReportOutput(dict):
    """
    Container compatible with both attribute access (.text_en, .text_hi)
    and dictionary key access (["text_en"], ["text_hi"]).
    """
    def __init__(self, text_en: str, text_hi: str):
        super().__init__(text_en=text_en, text_hi=text_hi)
        self.text_en = text_en
        self.text_hi = text_hi


# ── 1. CHECK EXPLANATIONS (English & Hindi) ──────────────────────────────────

CHECK_EXPLANATIONS: dict[str, tuple[str, ...]] = {
    "mrz_checksum_pass": (
        "The passport's machine-readable zone (MRZ) check digits are valid.",
        "The passport's MRZ check digits do not match — the machine-readable "
        "zone appears to have been altered or does not correspond to the printed data.",
        "Module 2 — Document Validation",
    ),
    "verhoeff_checksum_pass": (
        "The Aadhaar number passes its Verhoeff checksum.",
        "The Aadhaar number fails its Verhoeff checksum — this number is "
        "not structurally valid.",
        "Module 2 — Document Validation",
    ),
    "qr_signature_valid": (
        "The Aadhaar QR code's signature is valid.",
        "The Aadhaar QR code's signature could not be verified.",
        "Module 2 — Document Validation",
    ),
    "qr_field_match": (
        "The Aadhaar QR code's data matches the printed fields.",
        "The Aadhaar QR code's data does NOT match the printed fields — "
        "the printed text may have been edited after the QR code was "
        "generated, since a forger cannot regenerate a validly-signed QR.",
        "Module 3 — Tampering Detection",
    ),
    "pan_structure_valid": (
        "The PAN follows its required structural pattern.",
        "The PAN does not follow its required structural pattern (expected "
        "format AAAAA9999A with a valid holder-type 4th letter).",
        "Module 2 — Document Validation",
    ),
    "field_consistency_pass": (
        "Extracted fields are internally consistent with the document's authoritative source.",
        "Extracted fields are inconsistent with the document's authoritative "
        "source (MRZ / QR / expected pattern).",
        "Could not be verified — no QR/MRZ data was available to check against.",
        "Module 2 — Document Validation",
    ),
}

CHECK_EXPLANATIONS_HI: dict[str, tuple[str, ...]] = {
    "mrz_checksum_pass": (
        "पासपोर्ट के मशीन-पठनीय क्षेत्र (MRZ) के चेक अंक मान्य हैं।",
        "पासपोर्ट के MRZ चेक अंक मेल नहीं खाते — मशीन-पठनीय क्षेत्र में बदलाव किया गया प्रतीत होता है।",
        "मॉड्यूल 2 — दस्तावेज़ सत्यापन",
    ),
    "verhoeff_checksum_pass": (
        "आधार संख्या अपने वेरहॉफ चेकसम सत्यापन में सफल है।",
        "आधार संख्या वेरहॉफ चेकसम सत्यापन में विफल रही — यह संख्या संरचनात्मक रूप से अमान्य है।",
        "मॉड्यूल 2 — दस्तावेज़ सत्यापन",
    ),
    "qr_signature_valid": (
        "आधार क्यूआर कोड का डिजिटल हस्ताक्षर मान्य है।",
        "आधार क्यूआर कोड के डिजिटल हस्ताक्षर को सत्यापित नहीं किया जा सका।",
        "मॉड्यूल 2 — दस्तावेज़ सत्यापन",
    ),
    "qr_field_match": (
        "आधार क्यूआर कोड का डेटा मुद्रित विवरण से मेल खाता है।",
        "आधार क्यूआर कोड का डेटा मुद्रित विवरण से मेल नहीं खाता — क्यूआर कोड जनरेट होने के बाद मुद्रित टेक्स्ट में बदलाव किया गया हो सकता है।",
        "मॉड्यूल 3 — छेड़छाड़ पहचान",
    ),
    "pan_structure_valid": (
        "पैन कार्ड अपने आवश्यक संरचनात्मक प्रारूप का पालन करता है।",
        "पैन कार्ड आवश्यक संरचनात्मक प्रारूप (अपेक्षित प्रारूप AAAAA9999A) का पालन नहीं करता है।",
        "मॉड्यूल 2 — दस्तावेज़ सत्यापन",
    ),
    "field_consistency_pass": (
        "प्राप्त विवरण दस्तावेज़ के आधिकारिक स्रोतों के साथ आंतरिक रूप से सुसंगत हैं।",
        "प्राप्त विवरण दस्तावेज़ के आधिकारिक स्रोतों (MRZ / QR / अपेक्षित प्रारूप) से असंगत हैं।",
        "सत्यापित नहीं किया जा सका — जांच के लिए कोई QR/MRZ डेटा उपलब्ध नहीं था।",
        "मॉड्यूल 2 — दस्तावेज़ सत्यापन",
    ),
}


# ── 2. NUMERIC THRESHOLD EXPLANATION FUNCTIONS ───────────────────────────────

def explain_ela(score: float) -> str:
    if score >= 70:
        return (f"Error Level Analysis score is {score:.0f}/100 — high "
                f"likelihood of localized image editing.")
    if score >= 40:
        return (f"Error Level Analysis score is {score:.0f}/100 — moderate "
                f"anomaly, worth a closer look.")
    return f"Error Level Analysis score is {score:.0f}/100 — no significant anomaly detected."


def explain_ela_hi(score: float) -> str:
    if score >= 70:
        return f"त्रुटि स्तर विश्लेषण (ELA) स्कोर {score:.0f}/100 है — स्थानीयकृत छवि संपादन की उच्च संभावना है।"
    if score >= 40:
        return f"त्रुटि स्तर विश्लेषण (ELA) स्कोर {score:.0f}/100 है — मध्यम विसंगति पाई गई है, समीक्षा की आवश्यकता है।"
    return f"त्रुटि स्तर विश्लेषण (ELA) स्कोर {score:.0f}/100 है — कोई महत्वपूर्ण विसंगति नहीं पाई गई।"


def explain_font_alignment_deviation(score: float) -> str:
    val = score * 100 if 0.0 <= score <= 1.0 else score
    if val >= 60:
        return f"Font and baseline alignment deviation is {val:.0f}% — marked irregularities detected across text lines."
    if val >= 30:
        return f"Font and baseline alignment deviation is {val:.0f}% — minor baseline inconsistencies detected."
    return f"Font and baseline alignment deviation is {val:.0f}% — typographic baseline and character alignment are uniform."


def explain_font_alignment_deviation_hi(score: float) -> str:
    val = score * 100 if 0.0 <= score <= 1.0 else score
    if val >= 60:
        return f"फ़ॉन्ट और बेसलाइन संरेखण विचलन {val:.0f}% है — टेक्स्ट पंक्तियों में स्पष्ट अनियमितता पाई गई।"
    if val >= 30:
        return f"फ़ॉन्ट और बेसलाइन संरेखण विचलन {val:.0f}% है — मामूली बेसलाइन विसंगति पाई गई।"
    return f"फ़ॉन्ट और बेसलाइन संरेखण विचलन {val:.0f}% है — मुद्रण और संरेखण पूर्णतः एकसमान है।"


def explain_photo_region_anomaly(score: float) -> str:
    val = score * 100 if 0.0 <= score <= 1.0 else score
    if val >= 65:
        return f"Photo region anomaly score is {val:.0f}/100 — high probability of image splicing or portrait border manipulation."
    if val >= 35:
        return f"Photo region anomaly score is {val:.0f}/100 — moderate variance around document photo borders."
    return f"Photo region anomaly score is {val:.0f}/100 — portrait region appears continuous with document substrate."


def explain_photo_region_anomaly_hi(score: float) -> str:
    val = score * 100 if 0.0 <= score <= 1.0 else score
    if val >= 65:
        return f"फ़ोटो क्षेत्र विसंगति स्कोर {val:.0f}/100 है — छवि जोड़ने या फ़ोटो सीमा में छेड़छाड़ की उच्च संभावना।"
    if val >= 35:
        return f"फ़ोटो क्षेत्र विसंगति स्कोर {val:.0f}/100 है — दस्तावेज़ फ़ोटो सीमाओं के आसपास मध्यम भिन्नता पाई गई।"
    return f"फ़ोटो क्षेत्र विसंगति स्कोर {val:.0f}/100 है — चित्र क्षेत्र दस्तावेज़ की सतह के साथ सुसंगत प्रतीत होता है।"


def explain_face_match_confidence(score: float) -> str:
    val = score * 100 if 0.0 <= score <= 1.0 else score
    if val >= 85:
        return f"Facial biometric match confidence is {val:.0f}% — strong facial feature correspondence."
    if val >= 60:
        return f"Facial biometric match confidence is {val:.0f}% — moderate resemblance, review recommended."
    return f"Facial biometric match confidence is {val:.0f}% — low confidence match; biometric mismatch suspected."


def explain_face_match_confidence_hi(score: float) -> str:
    val = score * 100 if 0.0 <= score <= 1.0 else score
    if val >= 85:
        return f"बायोमेट्रिक चेहरा मिलान विश्वसनीयता {val:.0f}% है — चेहरे की विशेषताओं का सटीक मिलान।"
    if val >= 60:
        return f"बायोमेट्रिक चेहरा मिलान विश्वसनीयता {val:.0f}% है — मध्यम समानता पाई गई।"
    return f"बायोमेट्रिक चेहरा मिलान विश्वसनीयता {val:.0f}% है — कम विश्वसनीयता, चेहरा भिन्न होने की संभावना।"


# ── 3. FEATURE EXPLANATIONS DICT ─────────────────────────────────────────────

FEATURE_EXPLANATIONS: dict[str, str] = {
    "mrz_checksum_fail": "the document's built-in checksum did not validate",
    "mrz_checksum_pass": "the passport MRZ checksum validated successfully",
    "verhoeff_checksum_fail": "the Aadhaar number failed its mandatory Verhoeff mathematical checksum",
    "verhoeff_checksum_pass": "the Aadhaar Verhoeff checksum validated successfully",
    "pan_structure_invalid": "the PAN format deviates from the statutory Income Tax department structure",
    "pan_structure_valid": "the PAN follows the standard statutory alphanumeric structure",
    "qr_signature_invalid": "the digital signature inside the embedded QR code could not be cryptographically verified",
    "qr_signature_valid": "the digital QR signature was verified against issuing authority keys",
    "qr_field_match_fail": "data stored in the QR code directly contradicts the visible printed text",
    "qr_field_match": "QR code data matches visible printed text",
    "field_consistency_fail": "extracted fields contain conflicting data across document sections",
    "field_consistency_pass": "all extracted fields are internally consistent",
    "high_ela_score": "compression residuals indicate localized digital image manipulation",
    "ela_score": "elevated Error Level Analysis variance indicates possible image tampering",
    "metadata_anomaly": "file metadata reveals editing software traces or inconsistent timestamps",
    "metadata_anomaly_count": "suspicious image editing signatures found in file metadata",
    "flagged_regions": "localized image artifacts detected around sensitive field areas",
    "flagged_region_count": "multiple document regions flagged for visual or compression anomalies",
    "face_mismatch": "live selfie biometric profile does not match the document photograph",
    "face_match": "biometric facial verification confirmed matching identity",
    "face_confidence_low": "facial recognition confidence fell below operational match threshold",
    "ocr_confidence_variance": "uneven OCR confidence suggests selective field alteration or degradation",
    "fallback_field_count": "multiple text fields required AI fallback due to unreadable primary OCR",
    "registry_blacklisted": "identity record is explicitly blacklisted in national databases",
    "registry_under_investigation": "holder or credential is flagged as under active investigation",
    "document_expired": "document has surpassed its registered validity expiration date",
}

FEATURE_EXPLANATIONS_HI: dict[str, str] = {
    "mrz_checksum_fail": "दस्तावेज़ का अंतर्निहित चेकसम सत्यापित नहीं हुआ",
    "mrz_checksum_pass": "पासपोर्ट MRZ चेकसम सफलतापूर्वक सत्यापित हुआ",
    "verhoeff_checksum_fail": "आधार संख्या अनिवार्य वेरहॉफ गणितीय चेकसम में विफल रही",
    "verhoeff_checksum_pass": "आधार वेरहॉफ चेकसम सफलतापूर्वक सत्यापित हुआ",
    "pan_structure_invalid": "पैन प्रारूप आयकर विभाग की सांविधिक संरचना से मेल नहीं खाता",
    "pan_structure_valid": "पैन निर्धारित अल्फ़ान्यूमेरिक संरचना का पालन करता है",
    "qr_signature_invalid": "क्यूआर कोड के डिजिटल हस्ताक्षर को सत्यापित नहीं किया जा सका",
    "qr_signature_valid": "क्यूआर डिजिटल हस्ताक्षर सफलतापूर्वक सत्यापित हुआ",
    "qr_field_match_fail": "क्यूआर कोड का डेटा मुद्रित विवरण से मेल नहीं खाता",
    "qr_field_match": "क्यूआर कोड का डेटा मुद्रित विवरण से मेल खाता है",
    "field_consistency_fail": "दस्तावेज़ के विभिन्न भागों में विवरण परस्पर विरोधी हैं",
    "field_consistency_pass": "सभी प्राप्त विवरण आंतरिक रूप से सुसंगत हैं",
    "high_ela_score": "कंप्रेशन पैटर्न छवि में डिजिटल हेरफेर का संकेत देते हैं",
    "ela_score": "उच्च ELA स्कोर छवि में संभावित छेड़छाड़ दर्शाता है",
    "metadata_anomaly": "फ़ाइल मेटाडेटा में संपादन सॉफ़्टवेयर के निशान मिले",
    "metadata_anomaly_count": "मेटाडेटा में संदिग्ध छवि संपादन के संकेत मिले",
    "flagged_regions": "संवेदनशील फ़ील्ड क्षेत्रों के पास विसंगतियां पाई गईं",
    "flagged_region_count": "दस्तावेज़ के कई क्षेत्रों में विसंगतियां चिह्नित की गईं",
    "face_mismatch": "लाइव सेल्फी दस्तावेज़ की फ़ोटो से मेल नहीं खाती",
    "face_match": "बायोमेट्रिक चेहरा सत्यापन सफल रहा",
    "face_confidence_low": "चेहरा पहचान विश्वसनीयता सीमा से कम पाई गई",
    "ocr_confidence_variance": "असामान्य ओसीआर विश्वसनीयता चयनात्मक बदलाव का संकेत देती है",
    "fallback_field_count": "प्राथमिक ओसीआर अस्पष्ट होने के कारण बैकअप प्रणाली का उपयोग किया गया",
    "registry_blacklisted": "पहचान राष्ट्रीय डेटाबेस में ब्लैकलिस्टेड के रूप में दर्ज है",
    "registry_under_investigation": "दस्तावेज़ धारक सक्रिय जांच के अधीन चिह्नित है",
    "document_expired": "दस्तावेज़ की वैधता अवधि समाप्त हो चुकी है",
}


def _clean_feature_item(feat: str, lang: str = "en") -> str:
    """Normalize and explain a feature string (handles raw keys, weights, and prose)."""
    raw_key = feat.strip().lower()
    # Strip weight suffixes like "(weight: +0.20)"
    raw_key = re.sub(r"\(weight:.*?\)", "", raw_key).strip()

    feat_dict = FEATURE_EXPLANATIONS if lang == "en" else FEATURE_EXPLANATIONS_HI

    # Direct match in dict
    if raw_key in feat_dict:
        return feat_dict[raw_key]

    # Check for known keyword stems
    for key, explanation in feat_dict.items():
        if key in raw_key or raw_key in key:
            return explanation

    # If already a prose phrase from rule fallback, return cleaned version
    clean_text = re.sub(r"\(weight:.*?\)", "", feat).strip()
    return clean_text.rstrip("., ")


def _override_text_hi(override: Any) -> str:
    """Translate the deterministic primary-ID extraction warning for Hindi reports."""
    match = re.search(r"Primary identifier field '([^']+)'", str(override))
    if match:
        return (
            f"प्राथमिक पहचान फ़ील्ड '{match.group(1)}' निकाला नहीं जा सका — "
            "मॉडल स्कोर की परवाह किए बिना जोखिम बढ़ाया गया।"
        )
    return str(override)


# ── 4. EXTRACTED FIELD HELPER ────────────────────────────────────────────────

def _get_key_fields(extracted_fields: dict[str, Any], doc_type: str) -> list[tuple[str, str]]:
    """Extract 2-3 most identifying fields (name, id number, dob) regardless of nesting."""
    flat: dict[str, str] = {}
    for k, v in extracted_fields.items():
        if isinstance(v, dict) and "text" in v:
            flat[k] = str(v["text"]).strip()
        elif isinstance(v, (str, int, float)):
            flat[k] = str(v).strip()

    fields_out: list[tuple[str, str]] = []

    # 1. Name
    name_val = flat.get("name") or flat.get("full_name") or flat.get("given_name") or flat.get("surname")
    if name_val:
        fields_out.append(("Name", name_val))

    # 2. ID Number
    id_val = None
    if doc_type == "passport":
        id_val = flat.get("passport_number") or flat.get("passport_no")
        id_label = "Passport No."
    elif doc_type == "aadhaar":
        id_val = flat.get("aadhaar_number") or flat.get("uid")
        id_label = "Aadhaar No."
    elif doc_type == "pan":
        id_val = flat.get("pan_number") or flat.get("pan")
        id_label = "PAN"
    else:
        id_val = flat.get("id_number") or flat.get("number")
        id_label = "ID Number"

    if id_val:
        fields_out.append((id_label, id_val))

    # 3. DOB
    dob_val = flat.get("dob") or flat.get("date_of_birth") or flat.get("birth_date")
    if dob_val:
        fields_out.append(("DOB", dob_val))

    return fields_out


# ── 5. MAIN REPORT GENERATOR ─────────────────────────────────────────────────

async def generate_report(result: dict[str, Any]) -> ReportOutput:
    """
    Generate deterministic, grounded forensic audit reports in English and Hindi.

    Parameters
    ----------
    result : structured scan summary containing:
        - document_type: str
        - extracted_fields: dict
        - validation: dict
        - tampering: dict
        - face_verification: dict | None
        - identity_risk: dict
        - risk_model: dict (score, band, top_features)

    Returns
    -------
    ReportOutput with .text_en and .text_hi
    """
    doc_type = result.get("document_type", "unknown").lower()
    extracted_fields = result.get("extracted_fields", {})
    validation = result.get("validation", {})
    tampering = result.get("tampering", {})
    face = result.get("face_verification")
    identity = result.get("identity_risk", {})
    identity_correlation = identity.get("identity_correlation") if isinstance(identity, dict) else None
    risk = result.get("risk_model", {})

    score = float(risk.get("score", 0.0))
    band = str(risk.get("band", "low")).lower()
    top_features = risk.get("top_features", [])
    overrides = risk.get("overrides", [])

    # Generate English narrative
    text_en = _build_report_en(
        doc_type=doc_type,
        extracted_fields=extracted_fields,
        validation=validation,
        tampering=tampering,
        face=face,
        identity=identity,
        score=score,
        band=band,
        top_features=top_features,
        overrides=overrides,
        identity_correlation=identity_correlation,
    )

    # Generate Hindi narrative
    text_hi = _build_report_hi(
        doc_type=doc_type,
        extracted_fields=extracted_fields,
        validation=validation,
        tampering=tampering,
        face=face,
        identity=identity,
        score=score,
        band=band,
        top_features=top_features,
        overrides=overrides,
        identity_correlation=identity_correlation,
    )

    return ReportOutput(text_en=text_en, text_hi=text_hi)


def _build_report_en(
    doc_type: str,
    extracted_fields: dict[str, Any],
    validation: dict[str, Any],
    tampering: dict[str, Any],
    face: dict[str, Any] | None,
    identity: dict[str, Any],
    score: float,
    band: str,
    top_features: list[Any],
    overrides: list[Any],
    identity_correlation: dict[str, Any] | None,
) -> str:
    sections: list[str] = []

    # a. VERDICT
    if band == "high":
        verdict = f"VERDICT: HIGH RISK — recommend escalation to secondary inspection. (Risk score: {score:.0f}/100)"
        action = "RECOMMENDED ACTION: Refer to secondary inspection."
    elif band == "medium":
        verdict = f"VERDICT: MEDIUM RISK — recommend manual officer review. (Risk score: {score:.0f}/100)"
        action = "RECOMMENDED ACTION: Flag for manual review."
    else:
        verdict = f"VERDICT: LOW RISK — no significant issues detected. (Risk score: {score:.0f}/100)"
        action = "RECOMMENDED ACTION: No action required."

    sections.append(verdict)

    if overrides:
        warning_lines = [f"• {str(override)} [Module 5 — Risk Scoring]" for override in overrides]
        sections.append("EXTRACTION QUALITY WARNING:\n" + "\n".join(warning_lines))

    # b. DOCUMENT SUMMARY
    summary_lines = [f"• Document Type: {doc_type.upper()}"]
    key_fields = _get_key_fields(extracted_fields, doc_type)
    for label, val in key_fields:
        summary_lines.append(f"• {label}: {val}")

    sections.append("DOCUMENT SUMMARY:\n" + "\n".join(summary_lines))

    # c. AUTHENTICITY
    auth_lines: list[str] = []
    # Validation checks
    for check_key, explanation in CHECK_EXPLANATIONS.items():
        pass_text, fail_text = explanation[:2]
        not_checked_text = explanation[2] if len(explanation) == 4 else None
        module_name = explanation[-1]
        if check_key in validation:
            val = validation[check_key]
            if val is None:
                if check_key != "field_consistency_pass":
                    continue
                text = not_checked_text or "Could not be verified."
            else:
                text = pass_text if bool(val) else fail_text
            auth_lines.append(f"• {text} [{module_name}]")

    # ELA explanation
    ela_score = float(tampering.get("ela_score", 0.0))
    auth_lines.append(f"• {explain_ela(ela_score)} [Module 3 — Tampering Detection]")

    # Flagged regions
    flagged_regions = tampering.get("flagged_regions", [])
    if flagged_regions:
        regions_str = ", ".join(str(r) for r in flagged_regions)
        auth_lines.append(f"• Localized anomalies detected in: {regions_str}. [Module 3 — Tampering Detection]")

    # Metadata anomalies
    meta_anomalies = tampering.get("metadata_anomalies", [])
    if meta_anomalies:
        anom_str = ", ".join(str(m) for m in meta_anomalies)
        auth_lines.append(f"• Metadata forensics detected: {anom_str}. [Module 3 — Tampering Detection]")
    else:
        auth_lines.append("• No metadata anomalies or digital editor signatures detected. [Module 3 — Tampering Detection]")

    sections.append("AUTHENTICITY:\n" + "\n".join(auth_lines))

    # d. IDENTITY RISK
    reg_status = str(identity.get("registry_status", "clear")).lower()
    authority = identity.get("issuing_authority", "National Authority")
    expired = bool(identity.get("document_expired", False))

    id_lines: list[str] = []
    if reg_status == "blacklisted":
        id_lines.append(f"• Registry status is BLACKLISTED in database records.")
    elif reg_status == "under_investigation":
        id_lines.append(f"• Record is flagged as under active investigation.")
    elif reg_status in ("clear", "active"):
        id_lines.append("• Registry status is active and clear.")
    else:
        id_lines.append(f"• Registry status: {reg_status.capitalize()}.")

    if expired:
        id_lines.append("• Document validity: EXPIRED according to authoritative registry.")
    else:
        id_lines.append("• Document validity: Active and unexpired.")

    id_lines.append(f"• Issuing Authority: {authority}.")
    sections.append("IDENTITY RISK:\n" + "\n".join(id_lines))

    if identity_correlation:
        score_text = "not available" if identity_correlation.get("overall_score") is None else f"{float(identity_correlation['overall_score']) * 100:.0f}%"
        sections.append(
            "CROSS-DOCUMENT IDENTITY CONSISTENCY:\n"
            f"• Status: {str(identity_correlation.get('status', 'insufficient_data')).upper()}.\n"
            f"• Overall consistency: {score_text}.\n"
            "• Compared to a synthetic identity anchor for this demonstration; this is not UIDAI authentication."
        )

    # e. FACE VERIFICATION
    if face is None:
        face_text = "Not performed — no live capture was provided."
    else:
        is_match = bool(face.get("match", False))
        conf = float(face.get("confidence", 0.0))
        match_str = "Match confirmed" if is_match else "Biometric mismatch"
        face_text = f"• Result: {match_str}.\n• {explain_face_match_confidence(conf)}"

    sections.append("FACE VERIFICATION:\n" + face_text)

    # f. TOP CONTRIBUTING FACTORS
    factor_lines: list[str] = []
    for feat in top_features[:4]:
        factor_desc = _clean_feature_item(str(feat), lang="en")
        if factor_desc:
            factor_lines.append(f"• {factor_desc.capitalize()}.")

    if not factor_lines:
        factor_lines.append("• No elevated risk factors identified.")

    sections.append("TOP CONTRIBUTING FACTORS:\n" + "\n".join(factor_lines))

    # g. RECOMMENDED ACTION
    sections.append(action)

    return "\n\n".join(sections)


def _build_report_hi(
    doc_type: str,
    extracted_fields: dict[str, Any],
    validation: dict[str, Any],
    tampering: dict[str, Any],
    face: dict[str, Any] | None,
    identity: dict[str, Any],
    score: float,
    band: str,
    top_features: list[Any],
    overrides: list[Any],
    identity_correlation: dict[str, Any] | None,
) -> str:
    sections: list[str] = []

    # a. VERDICT
    if band == "high":
        verdict = f"निष्कर्ष: उच्च जोखिम — द्वितीयक गहन जांच की सिफारिश की जाती है। (जोखिम स्कोर: {score:.0f}/100)"
        action = "अनुशंसित कार्रवाई: द्वितीयक निरीक्षण हेतु संदर्भित करें।"
    elif band == "medium":
        verdict = f"निष्कर्ष: मध्यम जोखिम — अधिकारी द्वारा मैन्युअल समीक्षा की सिफारिश की जाती है। (जोखिम स्कोर: {score:.0f}/100)"
        action = "अनुशंसित कार्रवाई: मैन्युअल समीक्षा के लिए चिह्नित करें।"
    else:
        verdict = f"निष्कर्ष: निम्न जोखिम — कोई महत्वपूर्ण समस्या नहीं पाई गई। (जोखिम स्कोर: {score:.0f}/100)"
        action = "अनुशंसित कार्रवाई: किसी कार्रवाई की आवश्यकता नहीं है।"

    sections.append(verdict)

    if overrides:
        warning_lines = [
            f"• {_override_text_hi(override)} [मॉड्यूल 5 — जोखिम स्कोरिंग]"
            for override in overrides
        ]
        sections.append("निष्कर्षण गुणवत्ता चेतावनी:\n" + "\n".join(warning_lines))

    # b. DOCUMENT SUMMARY
    summary_lines = [f"• दस्तावेज़ का प्रकार: {doc_type.upper()}"]
    key_fields = _get_key_fields(extracted_fields, doc_type)
    for label, val in key_fields:
        label_hi = "नाम" if label == "Name" else ("जन्म तिथि" if label == "DOB" else label)
        summary_lines.append(f"• {label_hi}: {val}")

    sections.append("दस्तावेज़ सारांश:\n" + "\n".join(summary_lines))

    # c. AUTHENTICITY
    auth_lines: list[str] = []
    for check_key, explanation in CHECK_EXPLANATIONS_HI.items():
        pass_text, fail_text = explanation[:2]
        not_checked_text = explanation[2] if len(explanation) == 4 else None
        module_name = explanation[-1]
        if check_key in validation:
            val = validation[check_key]
            if val is None:
                if check_key != "field_consistency_pass":
                    continue
                text = not_checked_text or "सत्यापित नहीं किया जा सका।"
            else:
                text = pass_text if bool(val) else fail_text
            auth_lines.append(f"• {text} [{module_name}]")

    ela_score = float(tampering.get("ela_score", 0.0))
    auth_lines.append(f"• {explain_ela_hi(ela_score)} [मॉड्यूल 3 — छेड़छाड़ पहचान]")

    flagged_regions = tampering.get("flagged_regions", [])
    if flagged_regions:
        regions_str = ", ".join(str(r) for r in flagged_regions)
        auth_lines.append(f"• इन क्षेत्रों में विसंगतियां चिह्नित: {regions_str}। [मॉड्यूल 3 — छेड़छाड़ पहचान]")

    meta_anomalies = tampering.get("metadata_anomalies", [])
    if meta_anomalies:
        anom_str = ", ".join(str(m) for m in meta_anomalies)
        auth_lines.append(f"• मेटाडेटा फोरेंसिक में विसंगतियां: {anom_str}। [मॉड्यूल 3 — छेड़छाड़ पहचान]")
    else:
        auth_lines.append("• कोई मेटाडेटा विसंगति या संपादन सॉफ़्टवेयर के निशान नहीं मिले। [मॉड्यूल 3 — छेड़छाड़ पहचान]")

    sections.append("दस्तावेज़ प्रामाणिकता:\n" + "\n".join(auth_lines))

    # d. IDENTITY RISK
    reg_status = str(identity.get("registry_status", "clear")).lower()
    authority = identity.get("issuing_authority", "राष्ट्रीय प्राधिकरण")
    expired = bool(identity.get("document_expired", False))

    id_lines: list[str] = []
    if reg_status == "blacklisted":
        id_lines.append("• पहचान रजिस्ट्री स्थिति: राष्ट्रीय डेटाबेस में ब्लैकलिस्टेड।")
    elif reg_status == "under_investigation":
        id_lines.append("• पहचान रजिस्ट्री स्थिति: सक्रिय जांच के अधीन चिह्नित।")
    elif reg_status in ("clear", "active"):
        id_lines.append("• पहचान रजिस्ट्री स्थिति: सक्रिय और स्पष्ट।")
    else:
        id_lines.append(f"• पहचान रजिस्ट्री स्थिति: {reg_status}।")

    if expired:
        id_lines.append("• दस्तावेज़ वैधता: आधिकारिक रिकॉर्ड के अनुसार समाप्त (Expired)।")
    else:
        id_lines.append("• दस्तावेज़ वैधता: सक्रिय और वैध।")

    id_lines.append(f"• जारीकर्ता प्राधिकरण: {authority}।")
    sections.append("पहचान जोखिम:\n" + "\n".join(id_lines))

    if identity_correlation:
        score_text = "उपलब्ध नहीं" if identity_correlation.get("overall_score") is None else f"{float(identity_correlation['overall_score']) * 100:.0f}%"
        sections.append(
            "क्रॉस-दस्तावेज़ पहचान संगति:\n"
            f"• स्थिति: {str(identity_correlation.get('status', 'insufficient_data')).upper()}।\n"
            f"• समग्र संगति: {score_text}।\n"
            "• यह डेमो के लिए सिंथेटिक पहचान एंकर से तुलना है; यह UIDAI प्रमाणीकरण नहीं है।"
        )

    # e. FACE VERIFICATION
    if face is None:
        face_text = "निष्पादित नहीं किया गया — कोई लाइव फ़ोटो प्रदान नहीं की गई।"
    else:
        is_match = bool(face.get("match", False))
        conf = float(face.get("confidence", 0.0))
        match_str = "मिलान की पुष्टि हुई" if is_match else "बायोमेट्रिक बेमेल"
        face_text = f"• परिणाम: {match_str}।\n• {explain_face_match_confidence_hi(conf)}"

    sections.append("बायोमेट्रिक चेहरा सत्यापन:\n" + face_text)

    # f. TOP CONTRIBUTING FACTORS
    factor_lines: list[str] = []
    for feat in top_features[:4]:
        factor_desc = _clean_feature_item(str(feat), lang="hi")
        if factor_desc:
            factor_lines.append(f"• {factor_desc}।")

    if not factor_lines:
        factor_lines.append("• कोई जोखिम कारक नहीं पाया गया।")

    sections.append("शीर्ष योगदान कारक:\n" + "\n".join(factor_lines))

    # g. RECOMMENDED ACTION
    sections.append(action)

    return "\n\n".join(sections)
