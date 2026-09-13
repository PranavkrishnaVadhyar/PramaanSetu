# VerifyFlow demo client

A standalone vanilla HTML/CSS/JavaScript example of an applicant-onboarding client using the PramaanSetu API. It submits Aadhaar (synthetic demo only), PAN, or passport images; polls the async screening pipeline; and presents extraction, validation, risk, and ELA evidence.

## Run locally

Serve this folder with a static web server, for example:

```powershell
cd dummy-app
python -m http.server 8081
```

Then visit `http://localhost:8081`. Start the PramaanSetu backend separately, normally at `http://localhost:8000`.

## Connect

Enter the API key or use the supplied test account credentials in the page’s connection section. They are stored only in `sessionStorage`, so they disappear when the browser session ends. Do not place real API keys or account passwords in `app.js`, `index.html`, or Git.

The app resolves ELA evidence against the backend URL, so heatmaps render when the FastAPI backend serves `/evidence`.

The scan workflow mirrors the main Sandbox: it submits once, polls scan status until `done`, then retrieves the final result while handling the short `425 Too Early` finalisation window. The active scan ID and completed result are preserved in browser session storage, so an accidental reload resumes processing or restores the displayed details. If the backend returns `401`, the app keeps the entered credential in the current browser session and asks the user to reconnect instead of silently clearing it.
