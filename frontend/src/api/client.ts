import {
  ScanSubmission,
  ScanStatusResponse,
  ScanResultResponse,
  ScanHistoryItem,
  OfficerAction,
  ActionResponse,
  PipelineStage,
  AuthResponse,
  ApiKey,
  AadhaarIdentityVerification,
  IdentityCorrelationEvidence,
  IdentityDocument,
  IdentityGraph,
  IdentityCorrelationRecord,
} from './types';
import { MOCK_HISTORY, MOCK_RESULTS } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Resolve a backend path for browser rendering (for example, evidence images). */
export function resolveApiUrl(pathOrUrl: string): string {
  if (/^(?:https?:|data:|blob:)/i.test(pathOrUrl)) return pathOrUrl;
  return `${BASE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

/** A response from the API was received, but it was not successful. */
class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP error ${status}`);
    this.name = 'ApiResponseError';
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const token = localStorage.getItem('pramaansetu_token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// In-memory simulation state for new scans created during session
const localSimulatedScans = new Map<string, {
  submission: { document_type: string; name: string };
  startTime: number;
  stagesCompleted: PipelineStage[];
  currentStage: PipelineStage;
}>();

const orderedStages: PipelineStage[] = [
  'ocr',
  'validation',
  'tampering',
  'face_verification',
  'risk_scoring',
  'report_generation',
  'done',
];

export async function submitScan(submission: ScanSubmission): Promise<{ scan_id: string }> {
  const formData = new FormData();
  formData.append('document_type', submission.document_type);
  formData.append('document_image', submission.document_image);
  if (submission.live_capture_image) {
    formData.append('live_capture_image', submission.live_capture_image);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/scans`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) throw new ApiResponseError(res.status);
    const data = await res.json();
    return data;
  } catch (error) {
    // A server response (for example 401/422/500) is a real failure, not an
    // offline condition. Never fabricate a scan in that case.
    if (error instanceof ApiResponseError) throw error;
    // Fallback simulation for offline / standalone execution
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const newScanId = `scn-${Date.now().toString().slice(-5)}-${randomSuffix}`;
    
    localSimulatedScans.set(newScanId, {
      submission: {
        document_type: submission.document_type,
        name: submission.document_image.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Screening Subject',
      },
      startTime: Date.now(),
      stagesCompleted: [],
      currentStage: 'ocr',
    });

    return { scan_id: newScanId };
  }
}

export async function getScanStatus(scanId: string): Promise<ScanStatusResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/scans/${scanId}/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new ApiResponseError(res.status);
    return await res.json();
  } catch (error) {
    // In particular, preserve 425 Too Early so callers wait for the pipeline
    // instead of displaying a generated result.
    if (error instanceof ApiResponseError) throw error;
    // Fallback simulation based on elapsed time (approx 1s per stage)
    const sim = localSimulatedScans.get(scanId);
    if (!sim) {
      // Default to done if checking a pre-seeded mock scan
      return {
        scan_id: scanId,
        current_stage: 'done',
        stages_completed: ['ocr', 'validation', 'tampering', 'face_verification', 'risk_scoring', 'report_generation'],
      };
    }

    const elapsedSeconds = Math.floor((Date.now() - sim.startTime) / 1000);
    const stageIndex = Math.min(elapsedSeconds, orderedStages.length - 1);
    const currentStage = orderedStages[stageIndex];
    const stagesCompleted = orderedStages.slice(0, stageIndex);

    sim.currentStage = currentStage;
    sim.stagesCompleted = stagesCompleted;

    return {
      scan_id: scanId,
      current_stage: currentStage,
      stages_completed: stagesCompleted,
    };
  }
}

export async function getScanResult(scanId: string): Promise<ScanResultResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/scans/${scanId}/result`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new ApiResponseError(res.status);
    return await res.json();
  } catch (error) {
    // Never replace a real API error (including 425 Too Early) with mock data.
    if (error instanceof ApiResponseError) throw error;
    // Check pre-seeded mock results
    if (MOCK_RESULTS[scanId]) {
      return MOCK_RESULTS[scanId];
    }

    // Generate result for new simulated scan
    const sim = localSimulatedScans.get(scanId);
    const docType = (sim?.submission.document_type || 'passport') as any;
    const name = sim?.submission.name || 'Subject Individual';

    const result: ScanResultResponse = {
      scan_id: scanId,
      document_type: docType,
      created_at: new Date().toISOString(),
      extracted_fields: {
        full_name: { text: name, confidence: 0.98 },
        document_number: { text: docType === 'pan' ? 'BKLPS9021K' : docType === 'aadhaar' ? 'XXXX-XXXX-9102' : 'P9281034', confidence: 0.96 },
        dob: { text: '19/04/1992', confidence: 0.99 },
        issuing_country: { text: 'IND', confidence: 0.99 },
      },
      validation: {
        mrz_checksum_pass: docType === 'passport' ? true : null,
        verhoeff_checksum_pass: docType === 'aadhaar' ? true : null,
        qr_signature_valid: true,
        qr_field_match: true,
        pan_structure_valid: docType === 'pan' ? true : null,
        field_consistency_pass: true,
      },
      tampering: {
        ela_score: 12.3,
        flagged_regions: [],
        metadata_anomalies: [],
      },
      face_verification: {
        match: true,
        confidence: 0.92,
      },
      identity_risk: {
        registry_status: 'clear',
        document_expired: false,
        issuing_authority: docType === 'aadhaar' ? 'UIDAI' : docType === 'pan' ? 'Income Tax Dept' : 'MEA India',
      },
      risk_model: {
        score: 18,
        band: 'low',
        top_features: [
          'Checksum integrity verified (+0.00)',
          'Cryptographic QR signature match (+0.00)',
          'Error Level Analysis variance within normal distribution (+0.05)',
        ],
      },
      report: {
        text_en: `CLEAR: Automated verification pipeline completed with zero critical anomalies. High confidence OCR extraction and biometric matching verify this ${docType.toUpperCase()} document as authentic.`,
        text_hi: `सत्यापित: स्वचालित सत्यापन पाइपलाइन में कोई विसंगति नहीं पाई गई। उच्च-सटीकता ओसीआर और बायोमेट्रिक मिलान द्वारा यह ${docType.toUpperCase()} दस्तावेज़ प्रामाणिक पाया गया।`,
      },
    };

    MOCK_RESULTS[scanId] = result;
    return result;
  }
}

export async function getScanHistory(params?: {
  q?: string;
  document_type?: string;
  from?: string;
  to?: string;
}): Promise<ScanHistoryItem[]> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.document_type) query.append('document_type', params.document_type);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);

    const res = await fetch(`${BASE_URL}/api/scans?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    // Filter local mock history
    let items = [...MOCK_HISTORY];

    // Prepend any locally added scans
    localSimulatedScans.forEach((sim, id) => {
      if (!items.some(i => i.scan_id === id)) {
        items.unshift({
          scan_id: id,
          document_type: sim.submission.document_type as any,
          name: sim.submission.name,
          created_at: new Date(sim.startTime).toISOString(),
          risk_score: 18,
          risk_band: 'low',
        });
      }
    });

    if (params?.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        i => i.name.toLowerCase().includes(q) || i.scan_id.toLowerCase().includes(q)
      );
    }
    if (params?.document_type && params.document_type !== 'all') {
      items = items.filter(i => i.document_type === params.document_type);
    }

    return items;
  }
}

export async function submitOfficerAction(
  scanId: string,
  action: OfficerAction,
  notes?: string
): Promise<ActionResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/scans/${scanId}/action`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action, notes }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    return {
      ok: true,
      message: `Action '${action}' recorded for scan ${scanId}`,
    };
  }
}

async function authenticate(
  endpoint: 'login' | 'signup',
  payload: Record<string, string | undefined>,
): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Unable to reach the authentication service. Please try again.');
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
        ? body.detail
        : `Authentication failed (HTTP ${res.status}).`;
    throw new Error(detail);
  }

  if (
    !body || typeof body !== 'object' ||
    !('token' in body) || typeof body.token !== 'string' || !body.token ||
    !('user' in body) || !body.user || typeof body.user !== 'object' ||
    !('id' in body.user) || typeof body.user.id !== 'string' ||
    !('email' in body.user) || typeof body.user.email !== 'string'
  ) {
    throw new Error('Authentication service returned an invalid response.');
  }

  return body as AuthResponse;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return authenticate('login', { email, password });
}

export function signup(
  email: string,
  password: string,
  organization_name?: string,
): Promise<AuthResponse> {
  return authenticate('signup', { email, password, organization_name });
}

async function identityRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: getAuthHeaders({ 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> || {}) }),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
      ? body.detail : `Identity service request failed (HTTP ${res.status}).`;
    throw new Error(detail);
  }
  return body as T;
}

export function verifyAadhaarIdentity(aadhaarNumber: string): Promise<AadhaarIdentityVerification> {
  return identityRequest('/api/identity/aadhaar/verify', { method: 'POST', body: JSON.stringify({ aadhaar_number: aadhaarNumber }) });
}

export function correlateDocument(scanId: string, identityId: string): Promise<IdentityCorrelationEvidence & { scan_id: string; document_type: DocumentType }> {
  return identityRequest(`/api/identity/correlate/${encodeURIComponent(scanId)}`, { method: 'POST', body: JSON.stringify({ identity_id: identityId }) });
}

export function getIdentity(identityId: string): Promise<AadhaarIdentityVerification> {
  return identityRequest(`/api/identity/${encodeURIComponent(identityId)}`);
}

export function getIdentityDocuments(identityId: string): Promise<IdentityDocument[]> {
  return identityRequest(`/api/identity/${encodeURIComponent(identityId)}/documents`);
}

export function getIdentityGraph(identityId: string): Promise<IdentityGraph> {
  return identityRequest(`/api/identity/${encodeURIComponent(identityId)}/graph`);
}

export function getIdentityCorrelations(identityId: string): Promise<IdentityCorrelationRecord[]> {
  return identityRequest(`/api/identity/${encodeURIComponent(identityId)}/correlations`);
}

export async function getKeys(): Promise<ApiKey[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/keys`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    return [
      {
        id: 'key-1',
        label: 'Test Environment',
        environment: 'test',
        masked_value: 'sk_test_••••••3f2a',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        last_used_at: new Date().toISOString(),
      },
      {
        id: 'key-2',
        label: 'Production',
        environment: 'live',
        masked_value: 'sk_live_••••••8b19',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        last_used_at: null,
      },
    ];
  }
}

export async function createKey(label: string, environment: "test" | "live"): Promise<ApiKey & { full_value: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/keys`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ label, environment }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const full_value = `sk_${environment}_mock${randomSuffix}`;
    return {
      id: `key-${Date.now()}`,
      label,
      environment,
      masked_value: `sk_${environment}_••••••${randomSuffix}`,
      created_at: new Date().toISOString(),
      last_used_at: null,
      full_value,
    };
  }
}

export async function deleteKey(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/api/keys/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    return { ok: true };
  }
}
