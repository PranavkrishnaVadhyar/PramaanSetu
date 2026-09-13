# PramaanSetu

**PramaanSetu** (“Bridge to Verification”) is an AI-assisted identity-document screening platform for synthetic/demo Aadhaar, PAN, and passport-like documents. It combines local OCR, document validation, image-forensics checks, optional face comparison, risk scoring, and an optional synthetic cross-document identity-consistency flow.

> This repository is a learning and demonstration project. Its Aadhaar workflow uses only bundled synthetic data and a local mock provider. It does **not** connect to UIDAI, perform Aadhaar e-KYC, or establish the authenticity of real government identity documents.

## What it does

1. Accepts a document image and optional selfie.
2. Extracts document fields using a local PP-OCRv5 Mobile model.
3. Checks document structure, QR/MRZ/field consistency, and local registry signals.
4. Produces Error Level Analysis (ELA) evidence and image-forensics observations.
5. Optionally compares document and selfie faces.
6. Combines evidence into a local ML fraud-risk score and human-readable report.
7. Optionally creates a synthetic Aadhaar identity anchor and compares later PAN/passport scans against it.

## Architecture

\`\`\`text
React Developer Console / standalone demo client
                    |
                    v
            FastAPI REST API + JWT/API-key auth
                    |
                    v
      Background verification pipeline + PostgreSQL
                    |
  +-----------------+------------------+------------------+
  |                 |                  |                  |
  v                 v                  v                  v
Local OCR       Validation          Forensics        Risk/reporting
PP-OCRv5        QR/MRZ/format       ELA/metadata     scikit-learn
\`\`\`

## Verification modules

| Module | Purpose | Main technologies |
| --- | --- | --- |
| 1. OCR extraction | Template-crops document fields and reads them locally. | PaddleOCR PP-OCRv5 Mobile, OpenCV, Pillow, Pyzbar |
| 2. Validation | Applies document-specific format, checksum, MRZ, QR, registry, and field-consistency checks. | Python, regex, Verhoeff and MRZ validation logic |
| 3. Tampering analysis | Creates ELA heatmaps and checks metadata/font-alignment signals. | Pillow, NumPy, OpenCV-style image processing |
| 4. Face verification | Compares a document portrait to an optional user selfie. | DeepFace, TensorFlow |
| 5. Risk scoring | Produces a low/medium/high risk band and contributing factors. | scikit-learn, Joblib, XGBoost-compatible features |
| 6. Reporting | Produces readable English/Hindi screening summaries. | Python report generator |

## Project layout

\`\`\`text
backend/                         FastAPI application, pipeline, database models, migrations
frontend/                        React/Vite developer console
dummy-app/                       Standalone HTML/CSS/JS sample client
docs/API_REFERENCE.md            Versioned API reference
backend/pramaansetu_synthetic_dataset/
                                 Synthetic documents used by local demo verification
backend/synthetic_connected_ids/ Synthetic cross-document test set
\`\`\`

## Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- PostgreSQL (for persistent users, API keys, scans, and reports)
- A locally provisioned PP-OCRv5 model

## Backend setup

From the repository root:

\`\`\`powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
\`\`\`

Configure \`DATABASE_URL\` and a strong \`JWT_SECRET_KEY\` in \`backend/.env\`.

### Provision local OCR weights

The OCR model is not downloaded during scan processing. Review and download it once during setup:

\`\`\`powershell
cd backend
.\.venv\Scripts\python.exe provision_paddle_ocr_model.py --allow-network-download
\`\`\`

This places model files in \`backend/models/pp-ocrv5-mobile-rec\`, which is ignored by Git. Normal scans use only those local files and do not send document images to a cloud OCR service.

### Start the API

\`\`\`powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
\`\`\`

The API runs at \`http://localhost:8000\`.

- Interactive OpenAPI docs: \`http://localhost:8000/docs\`
- Health check: \`http://localhost:8000/health\`
- Evidence images: \`http://localhost:8000/evidence/...\`

## Frontend setup

\`\`\`powershell
cd frontend
npm install
npm run dev
\`\`\`

Open the URL printed by Vite. The developer console provides login/signup, Sandbox scanning, API-key management, history, cross-document correlation, and an API Reference page.

Set \`VITE_API_BASE_URL\` only when the API is not hosted at \`http://localhost:8000\`.

## API flow

1. \`POST /api/auth/signup\` or \`POST /api/auth/login\` to receive a JWT.
2. Optionally create an API key using \`POST /api/keys\`.
3. Submit a document via \`POST /api/scans\` with \`multipart/form-data\`.
4. Poll \`GET /api/scans/{scan_id}/status\` until \`current_stage\` is \`done\` or \`failed\`.
5. Call \`GET /api/scans/{scan_id}/result\` after completion. A \`425 Too Early\` response means the report is still finalizing.

See [the detailed API reference](docs/API_REFERENCE.md) for endpoint contracts, authentication, error handling, and cURL examples.

## Synthetic Aadhaar identity correlation

The optional identity layer is deliberately scoped to local synthetic data.

1. Scan an Aadhaar-like synthetic document.
2. Confirm its 12-digit synthetic number and call \`POST /api/identity/aadhaar/verify\`.
3. The server creates a tenant-scoped identity anchor, never returning the number itself.
4. Scan a PAN or passport-like document.
5. Call \`POST /api/identity/correlate/{scan_id}\` with the anchor ID.

The correlation compares normalized name, date of birth, gender, and optional face similarity. It is a consistency signal, not real-government verification. The provider recognizes the records in \`backend/pramaansetu_synthetic_dataset\` and retains a legacy test record (\`177589178390\`) for backwards compatibility.


## Standalone integration example

\`dummy-app/\` is a plain HTML/CSS/JavaScript example for an applicant-onboarding product. It accepts a key or JWT login at runtime, submits a document, mirrors the Sandbox status/result polling lifecycle, displays structured results, and renders ELA evidence.

\`\`\`powershell
cd dummy-app
python -m http.server 8081
\`\`\`

Then open \`http://localhost:8081\`. Do not hardcode credentials or API keys into the client; enter them at runtime and keep real keys out of Git.

## Security and data-handling notes

- OCR model weights are provisioned locally and document images are not sent to a cloud OCR vendor.
- JWTs and API keys are required for protected actions; API keys are returned in full only at creation time.
- Identity anchors and scans are tenant-scoped by user.
- Generated files, uploads, model weights, \`.env\` files, build output, and local IDE files are excluded by \`.gitignore\`.
- ELA and face comparison are decision-support signals. They must not be the sole basis for denying service or determining a person’s identity.

## Testing and checks

\`\`\`powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_identity_correlation.py

cd ..\frontend
npm run build
\`\`\`

## References

1. C. Cui et al., “PaddleOCR 3.0 Technical Report,” *arXiv*, 2025. https://arxiv.org/abs/2507.05595
2. International Civil Aviation Organization, *Doc 9303: Machine Readable Travel Documents*, 8th ed. https://www.icao.int/publications/doc-series/doc-9303
3. Y. Taigman et al., “DeepFace: Closing the Gap to Human-Level Performance in Face Verification,” *CVPR*, 2014. https://openaccess.thecvf.com/content_cvpr_2014/html/Taigman_DeepFace_Closing_the_2014_CVPR_paper.html
4. C. Bunkhoriun and K. Bae, “An Evaluation of Error Level Analysis in Image Forensics,” *ICDAMT*, 2016. https://ieeexplore.ieee.org/document/7412439/
5. NIST, *SP 800-63A: Digital Identity Guidelines — Identity Proofing and Enrollment*. https://pages.nist.gov/800-63-4/sp800-63a.html

## License

No project license has been declared yet. Add an explicit license before distributing or using this project beyond its intended educational/demo scope.
