# PramaanSetu

**PramaanSetu** (“Bridge to Verification”) is an AI-assisted identity-document screening platform for synthetic/demo Aadhaar, PAN, and passport-like documents. It combines local OCR, document validation, image-forensics checks, optional face comparison, risk scoring, and an optional synthetic cross-document identity-consistency flow.

> **Important:** This repository is a learning and demonstration project. Its Aadhaar workflow uses only bundled synthetic data and a local mock provider. It does **not** connect to UIDAI, perform Aadhaar e-KYC, or establish the authenticity of real government identity documents.

## What it does

1. Accepts a document image and optional selfie.
2. Extracts document fields using a local **PaddleOCR PP-OCRv5 Mobile** model.
3. Checks document structure, QR/MRZ/field consistency, and local registry signals.
4. Produces Error Level Analysis (ELA) evidence and image-forensics observations.
5. Optionally compares document and selfie faces.
6. Combines evidence into a local ML fraud-risk score and human-readable report.
7. Optionally creates a synthetic Aadhaar identity anchor and compares later PAN/passport scans against it.

## Architecture

```text
React Developer Console / standalone demo client
                    |
                    v
            FastAPI REST API
            + JWT/API-key auth
                    |
                    v
       Background verification pipeline
                    |
                    v
               PostgreSQL
                    |
     +--------------+------------------+
     |              |                  |
     v              v                  v
 Local OCR      Validation          Forensics
 PaddleOCR      QR/MRZ/format      ELA/metadata
     |              |                  |
     +--------------+------------------+
                    |
                    v
              Risk / Reporting
              scikit-learn
```

## Verification modules

| Module                    | Purpose                                                                                                                                                           | Main technologies                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **1. OCR extraction**     | Performs full-document OCR, maps detected text to document fields, and uses targeted crops only when fields are missing, low-confidence, or structurally invalid. | PaddleOCR PP-OCRv5 Mobile, OpenCV, Pillow, Pyzbar |
| **2. Validation**         | Applies document-specific format, checksum, MRZ, QR, registry, and field-consistency checks.                                                                      | Python, regex, Verhoeff and MRZ validation logic  |
| **3. Tampering analysis** | Creates ELA evidence and checks metadata, font, alignment, and other image-forensics signals.                                                                     | Pillow, NumPy, OpenCV-style image processing      |
| **4. Face verification**  | Compares a document portrait to an optional user selfie.                                                                                                          | DeepFace, TensorFlow                              |
| **5. Risk scoring**       | Produces a low/medium/high risk band and contributing factors.                                                                                                    | scikit-learn, Joblib, XGBoost-compatible features |
| **6. Reporting**          | Produces readable English/Hindi screening summaries.                                                                                                              | Python report generator                           |

## OCR strategy

PramaanSetu uses a **hybrid PaddleOCR pipeline**.

### Primary path

The complete document image is passed through PaddleOCR detection and recognition. Detected text is collected together with:

* recognized text
* confidence score
* bounding box
* document position

The system then maps the detected text to fields using document-specific semantics and spatial relationships.

For example:

```text
NAME
Pranav Vadhyar

DATE OF BIRTH
23/07/1999

GENDER
M
```

is interpreted as:

```text
full_name = "Pranav Vadhyar"
dob       = "23/07/1999"
gender    = "M"
```

rather than relying solely on fixed image crops.

### Targeted fallback

Crops are still used when the full-page OCR result is:

* missing
* below the confidence threshold
* structurally invalid
* ambiguous
* unreadable in regions such as passport MRZ

Multiple preprocessing variants can be evaluated during fallback, including enlarged, contrast-enhanced, denoised, sharpened, and MRZ-optimized versions.

This approach provides the flexibility of full-document OCR while retaining the reliability of targeted recognition for difficult fields.

## Document validation

Validation is document-specific.

### Aadhaar-like documents

The synthetic Aadhaar workflow can check:

* 12-digit identifier structure
* Verhoeff checksum
* synthetic QR payload
* QR-to-printed-field consistency
* name/date-of-birth/gender consistency where an authoritative synthetic record exists

A missing or unreadable field is not automatically treated as a mismatch.

### PAN-like documents

The PAN structure is checked using the expected format:

```text
AAAAA9999A
```

where the first five characters are alphabetic, the next four are numeric, and the final character is alphabetic.

### Passport-like documents

Passport documents use ICAO-style MRZ validation including:

* passport number check digit
* date-of-birth check digit
* expiry-date check digit
* composite check digit

Unreadable MRZ data is distinguished from a successfully extracted MRZ that fails its checksum.

## Tampering analysis

The image-forensics module produces evidence rather than treating a single visual signal as proof of fraud.

Current signals include:

* Error Level Analysis (ELA)
* metadata anomalies
* font-height variation
* alignment inconsistencies
* synthetic QR/printed-field mismatch
* suspicious image regions

The system reports the suspicious region or observation where possible.

ELA and font/alignment observations are **decision-support signals**, not definitive proof of document manipulation.

## Face verification

An optional selfie can be compared against the portrait detected in the submitted document.

The result includes:

* whether a face comparison was possible
* similarity/confidence information
* match status

Face comparison is treated as supporting evidence and is not intended to establish a person's legal identity by itself.

## Risk scoring

PramaanSetu combines multiple signals into a risk score.

Example evidence includes:

```text
OCR confidence
Identifier validity
Checksum results
QR/MRZ consistency
Document structure
Tampering observations
Face similarity
Registry signals
Critical missing fields
```

The final result is represented as:

```text
LOW
MEDIUM
HIGH
```

A safety/consistency layer ensures that important failures such as a missing primary identifier can prevent an apparently favorable ML score from being treated as low risk.

## Synthetic test dataset

The repository includes a synthetic dataset specifically designed to test both successful and unsuccessful verification cases.

The dataset contains:

* synthetic Aadhaar-like documents
* synthetic PAN-like documents
* synthetic passport-like documents
* separate synthetic person portraits
* structured ground-truth JSON
* synthetic QR payloads
* intentionally corrupted documents

### Positive examples

Some generated documents are intentionally clean and should pass the applicable validation checks.

For example:

```text
Aadhaar
  12-digit identifier       ✓
  Verhoeff checksum         ✓
  QR consistency             ✓
  Required fields            ✓

Expected result:
  LOW / PASS
```

### Negative examples

Other documents are intentionally modified so that PramaanSetu has something meaningful to detect.

Examples include:

```text
Invalid Aadhaar checksum
QR / printed identifier mismatch
Corrupted passport MRZ check digit
Invalid PAN structure
Synthetic visual modification
Missing or corrupted critical fields
```

Expected results are therefore not all identical.

A successful demonstration should show that the system can distinguish:

```text
Clean document
      ↓
  Valid evidence
      ↓
 LOW / PASS
```

from:

```text
Corrupted document
      ↓
 Conflicting evidence
      ↓
 MEDIUM / HIGH / FLAGGED
```

The dataset is synthetic and must not be interpreted as a source of real government identity information.

## Project layout

```text
backend/
    FastAPI application
    verification pipeline
    database models
    migrations

frontend/
    React/Vite developer console

dummy-app/
    Standalone HTML/CSS/JS sample client

docs/
    API_REFERENCE.md

backend/pramaansetu_synthetic_dataset/
    Synthetic Aadhaar, PAN and passport-like documents

backend/synthetic_connected_ids/
    Synthetic cross-document identity test set
```

## Prerequisites

* Python 3.11 or newer
* Node.js 20 or newer
* PostgreSQL
* A locally provisioned PP-OCRv5 model

## Backend setup

From the repository root:

```powershell
cd backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install -r requirements.txt

Copy-Item .env.example .env
```

Configure:

```text
DATABASE_URL
JWT_SECRET_KEY
```

in `backend/.env`.

Use a strong secret for `JWT_SECRET_KEY`.

## Provision local OCR weights

OCR weights are provisioned during setup rather than downloaded during document scanning.

```powershell
cd backend

.\.venv\Scripts\python.exe provision_paddle_ocr_model.py --allow-network-download
```

This places the model in:

```text
backend/models/pp-ocrv5-mobile-rec/
```

The model directory is ignored by Git.

Normal document scans use the locally provisioned model and do not send document images to a cloud OCR service.

## Start the API

```powershell
cd backend

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The API runs at:

```text
http://localhost:8000
```

Useful endpoints:

```text
http://localhost:8000/docs
http://localhost:8000/health
http://localhost:8000/evidence/...
```

## Frontend setup

```powershell
cd frontend

npm install

npm run dev
```

Open the URL printed by Vite.

The developer console provides:

* login/signup
* Sandbox scanning
* API-key management
* scan history
* synthetic identity correlation
* API Reference

Set:

```text
VITE_API_BASE_URL
```

only when the API is not hosted at:

```text
http://localhost:8000
```

## API flow

1. `POST /api/auth/signup` or `POST /api/auth/login` to receive a JWT.
2. Optionally create an API key using `POST /api/keys`.
3. Submit a document using `POST /api/scans` with `multipart/form-data`.
4. Poll `GET /api/scans/{scan_id}/status`.
5. Wait until `current_stage` becomes `done` or `failed`.
6. Call `GET /api/scans/{scan_id}/result`.

A `425 Too Early` response means the report is still being finalized.

See:

```text
docs/API_REFERENCE.md
```

for endpoint contracts, authentication, error handling, and cURL examples.

## Synthetic Aadhaar identity correlation

The optional identity layer is deliberately restricted to local synthetic data.

The workflow is:

```text
Synthetic Aadhaar scan
        |
        v
Verify synthetic identifier
        |
        v
Create tenant-scoped identity anchor
        |
        v
Scan PAN / passport
        |
        v
Correlate against synthetic anchor
```

The API flow is:

```text
POST /api/identity/aadhaar/verify

POST /api/identity/correlate/{scan_id}
```

The correlation can compare:

* normalized name
* date of birth
* gender
* optional face similarity

Possible outcomes include:

```text
consistent
review
mismatch
insufficient_data
```

Missing information is not automatically treated as a mismatch.

The server does not expose the full Aadhaar-like number through the identity anchor. The identity anchor is tenant-scoped.

The local synthetic provider uses records from:

```text
backend/pramaansetu_synthetic_dataset/
```

and retains the legacy synthetic test record:

```text
177589178390
```

for backwards compatibility.

This workflow is a **synthetic consistency demonstration**, not real Aadhaar verification.

## Standalone integration example

`dummy-app/` contains a plain HTML/CSS/JavaScript example for an applicant-onboarding product.

It can:

* accept a JWT or API key at runtime
* submit a document
* poll scan status
* retrieve results
* display structured verification output
* render ELA evidence

Start it with:

```powershell
cd dummy-app

python -m http.server 8081
```

Then open:

```text
http://localhost:8081
```

Do not hardcode credentials or API keys into the client.

## Security and data handling

* OCR model weights are provisioned locally.
* Document images are not sent to a cloud OCR vendor.
* JWTs and API keys protect authenticated actions.
* API keys are returned in full only when created.
* Identity anchors and scans are tenant-scoped.
* Aadhaar-like identifiers should be masked when displayed.
* Generated files, uploads, model weights, `.env` files, build output, and local IDE files are excluded through `.gitignore`.
* Synthetic identity records must not be interpreted as real government records.
* ELA and face comparison are decision-support signals.
* No single automated signal should be used as the sole basis for denying service or determining a person's identity.

## Testing and checks

Backend identity-correlation tests:

```powershell
cd backend

.\.venv\Scripts\python.exe -m pytest tests/test_identity_correlation.py
```

Frontend build:

```powershell
cd frontend

npm run build
```

For the synthetic dataset, test both:

```text
PASSING DOCUMENTS
        +
FAILING / CORRUPTED DOCUMENTS
```

rather than evaluating only clean samples.

## References

1. C. Cui et al., “PaddleOCR 3.0 Technical Report,” *arXiv*, 2025.
2. International Civil Aviation Organization, *Doc 9303: Machine Readable Travel Documents*, 8th ed.
3. Y. Taigman et al., “DeepFace: Closing the Gap to Human-Level Performance in Face Verification,” *CVPR*, 2014.
4. C. Bunkhoriun and K. Bae, “An Evaluation of Error Level Analysis in Image Forensics,” *ICDAMT*, 2016.
5. NIST, *SP 800-63A: Digital Identity Guidelines — Identity Proofing and Enrollment*.

## License

No project license has been declared yet. Add an explicit license before distributing or using this project beyond its intended educational/demo scope.
