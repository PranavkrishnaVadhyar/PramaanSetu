const session = { token: sessionStorage.getItem('verifyflow_token') || '', apiKey: sessionStorage.getItem('verifyflow_api_key') || '' };
const stageNames = { ocr: 'OCR', validation: 'Validation', tampering: 'Forensics', face_verification: 'Face check', risk_scoring: 'Risk score', report_generation: 'Report' };
const $ = (id) => document.getElementById(id);
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const ACTIVE_SCAN_KEY = 'verifyflow_active_scan';
const RESULT_KEY = 'verifyflow_last_result';
let isPolling = false;

function baseUrl() { return $('api-base-url').value.replace(/\/$/, ''); }
function saveBaseUrl() { sessionStorage.setItem('verifyflow_api_base_url', baseUrl()); }
function headers(json = false) { const value = session.apiKey || session.token; return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(value ? (session.apiKey ? { 'X-API-Key': value } : { Authorization: `Bearer ${value}` }) : {}) }; }
function showError(message) { const el = $('error-message'); el.textContent = message; el.classList.remove('hidden'); }
function clearError() { $('error-message').classList.add('hidden'); }
function setConnection(label, style) { const el = $('connection-status'); el.textContent = label; el.className = `status ${style}`; }
function setFileLabel(inputId, labelId) { $(inputId).addEventListener('change', (event) => { $(labelId).textContent = event.target.files[0]?.name || 'No file selected'; }); }

async function api(path, options = {}) {
  const { json = false, headers: extraHeaders = {}, ...requestOptions } = options;
  const response = await fetch(`${baseUrl()}${path}`, { ...requestOptions, headers: { ...headers(json), ...extraHeaders } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.detail || `Request failed (HTTP ${response.status}).`);
  return data;
}

$('connection-form').addEventListener('submit', async (event) => {
  event.preventDefault(); clearError();
  const key = $('api-key').value.trim();
  if (key) { session.apiKey = key; session.token = ''; sessionStorage.setItem('verifyflow_api_key', key); sessionStorage.removeItem('verifyflow_token'); setConnection('API key ready', 'connected'); return; }
  try {
    const data = await api('/api/auth/login', { method: 'POST', json: true, body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }) });
    session.token = data.token; session.apiKey = ''; sessionStorage.setItem('verifyflow_token', data.token); sessionStorage.removeItem('verifyflow_api_key'); setConnection(`Signed in as ${data.user.email}`, 'connected'); $('password').value = '';
  } catch (error) { setConnection('Connection failed', 'failed'); showError(error.message); }
});

function renderStages(current, completed = []) { $('stages').innerHTML = Object.entries(stageNames).map(([id, name]) => `<li class="${completed.includes(id) ? 'done' : current === id ? 'active' : ''}">${name}</li>`).join(''); }
async function poll(scanId) {
  if (isPolling) return;
  isPolling = true;
  $('progress-card').classList.remove('hidden'); $('scan-id').textContent = scanId; renderStages('ocr');
  try {
    for (;;) {
      const status = await api(`/api/scans/${encodeURIComponent(scanId)}/status`);
      renderStages(status.current_stage, status.stages_completed);
      $('progress-message').textContent = status.error || `Current stage: ${status.current_stage.replaceAll('_', ' ')}`;
      if (status.current_stage === 'done') return await getCompletedResult(scanId);
      if (status.current_stage === 'failed') throw new Error(status.error || 'The screening pipeline failed.');
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  } finally {
    isPolling = false;
  }
}
async function getCompletedResult(scanId) {
  // The pipeline status is updated just before the result transaction is
  // guaranteed visible. Retry the API's deliberate 425 response briefly.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return await api(`/api/scans/${encodeURIComponent(scanId)}/result`); }
    catch (error) {
      if (error instanceof ApiError && error.status === 425) {
        $('progress-message').textContent = 'Finalizing the verification report…';
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('The scan completed but its report is still unavailable. Wait a moment and submit again.');
}
function bool(value) { return value === null || value === undefined ? 'Not applicable' : value ? 'Passed' : 'Failed'; }
function list(target, values) { $(target).innerHTML = Object.entries(values).map(([key, value]) => `<div><dt>${key.replaceAll('_', ' ')}</dt><dd>${value}</dd></div>`).join(''); }
function renderResult(result) {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  sessionStorage.removeItem(ACTIVE_SCAN_KEY);
  $('progress-card').classList.add('hidden');
  $('result-card').classList.remove('hidden'); const risk = $('risk-badge'); risk.textContent = `${result.risk_model.band} risk · ${result.risk_model.score}/100`; risk.className = `risk ${result.risk_model.band}`;
  $('result-summary').textContent = `${result.document_type.toUpperCase()} screened. ${result.identity_risk.issuing_authority} · Registry: ${result.identity_risk.registry_status}.`;
  list('fields-list', Object.fromEntries(Object.entries(result.extracted_fields).map(([key, item]) => [key, item.text || 'Not extracted'])));
  list('validation-list', Object.fromEntries(Object.entries(result.validation).map(([key, value]) => [key, bool(value)])));
  list('forensic-list', { ela_score: result.tampering.ela_score, flagged_regions: result.tampering.flagged_regions.join(', ') || 'None', metadata_anomalies: result.tampering.metadata_anomalies.join(', ') || 'None' });
  $('report-text').textContent = result.report.text_en; $('raw-response').textContent = JSON.stringify(result, null, 2);
  const heatmap = $('heatmap'); if (result.tampering.ela_heatmap_url) { heatmap.src = new URL(result.tampering.ela_heatmap_url, `${baseUrl()}/`).href; heatmap.classList.remove('hidden'); } else { heatmap.classList.add('hidden'); }
}

$('scan-form').addEventListener('submit', async (event) => {
  event.preventDefault(); clearError();
  if (!session.apiKey && !session.token) return showError('Connect with an API key or sign in before submitting a document.');
  const image = $('document-image').files[0]; if (!image) return showError('Choose a document image first.');
  const form = new FormData(); form.append('document_type', document.querySelector('input[name="document_type"]:checked').value); form.append('document_image', image);
  const selfie = $('selfie-image').files[0]; if (selfie) form.append('live_capture_image', selfie);
  const button = $('submit-scan'); button.disabled = true; button.textContent = 'Submitting…'; $('result-card').classList.add('hidden'); sessionStorage.removeItem(RESULT_KEY);
  try {
    const created = await api('/api/scans', { method: 'POST', body: form });
    sessionStorage.setItem(ACTIVE_SCAN_KEY, created.scan_id);
    renderResult(await poll(created.scan_id));
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      showError('Authentication was rejected. Re-enter your API key or sign in again; your current browser session was not erased.');
    } else {
      showError(error.message);
    }
  }
  finally { button.disabled = false; button.innerHTML = 'Run document check <span>→</span>'; }
});

setFileLabel('document-image', 'document-file-label'); setFileLabel('selfie-image', 'selfie-file-label');
const savedBaseUrl = sessionStorage.getItem('verifyflow_api_base_url');
if (savedBaseUrl) $('api-base-url').value = savedBaseUrl;
$('api-base-url').addEventListener('change', saveBaseUrl);
if (session.apiKey) setConnection('API key ready', 'connected'); else if (session.token) setConnection('Signed in for this session', 'connected');

// Restore the same processing/result lifecycle after an accidental browser
// reload. The sandbox keeps this state in memory; this standalone app keeps it
// in sessionStorage because a plain static page has no React state store.
try {
  const cachedResult = sessionStorage.getItem(RESULT_KEY);
  const activeScanId = sessionStorage.getItem(ACTIVE_SCAN_KEY);
  if (cachedResult) {
    renderResult(JSON.parse(cachedResult));
  } else if (activeScanId && (session.apiKey || session.token)) {
    void poll(activeScanId).then(renderResult).catch((error) => showError(error.message));
  }
} catch {
  sessionStorage.removeItem(RESULT_KEY);
  sessionStorage.removeItem(ACTIVE_SCAN_KEY);
}
