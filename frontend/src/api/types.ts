export type DocumentType = 'passport' | 'aadhaar' | 'pan';

export type PipelineStage =
  | 'ocr'
  | 'validation'
  | 'tampering'
  | 'face_verification'
  | 'risk_scoring'
  | 'report_generation'
  | 'done'
  | 'failed';

export interface ScanSubmission {
  document_type: DocumentType;
  document_image: File;
  live_capture_image?: File; // optional, for face verification
}

export interface ScanStatusResponse {
  scan_id: string;
  current_stage: PipelineStage;
  stages_completed: PipelineStage[];
  error?: string;
}

export interface ScanResultResponse {
  scan_id: string;
  document_type: DocumentType;
  created_at: string;
  extracted_fields: Record<string, { text: string; confidence: number }>;
  validation: {
    mrz_checksum_pass: boolean | null;
    verhoeff_checksum_pass: boolean | null;
    qr_signature_valid: boolean | null;
    qr_field_match: boolean | null;
    pan_structure_valid: boolean | null;
    field_consistency_pass: boolean | null;
  };
  tampering: {
    ela_score: number;
    flagged_regions: string[];
    metadata_anomalies: string[];
    ela_heatmap_url?: string;
  };
  face_verification: {
    match: boolean;
    confidence: number;
  } | null;
  identity_risk: {
    registry_status: 'clear' | 'blacklisted' | 'under_investigation';
    document_expired: boolean;
    issuing_authority: string;
    identity_correlation?: IdentityCorrelationEvidence | null;
  };
  risk_model: {
    score: number; // 0-100
    band: 'low' | 'medium' | 'high';
    top_features: string[];
  };
  report: {
    text_en: string;
    text_hi?: string;
  };
}

export type IdentityCorrelationStatus = 'anchor' | 'consistent' | 'review' | 'mismatch' | 'insufficient_data';

export interface IdentityCorrelationEvidence {
  identity_id: string;
  name_similarity: number | null;
  dob_match: boolean | null;
  gender_match: boolean | null;
  face_similarity: number | null;
  overall_score: number | null;
  status: Exclude<IdentityCorrelationStatus, 'anchor'>;
  face_status: string;
  provider: 'Mock/Synthetic Aadhaar Verification';
}

export interface AadhaarIdentityVerification {
  provider: 'Mock/Synthetic Aadhaar Verification';
  identity_id: string | null;
  verified: boolean;
  attributes: { name: string; dob: string; gender: string } | null;
}

export interface IdentityDocument {
  scan_id: string;
  document_type: DocumentType;
  score: number | null;
  status: IdentityCorrelationStatus;
}

export interface IdentityGraph {
  identity_id: string;
  anchor: 'synthetic_aadhaar';
  provider: 'Mock/Synthetic Aadhaar Verification';
  nodes: Array<{ id: string; document_type: string; status: IdentityCorrelationStatus; score: number | null }>;
  edges: Array<{ source: string; target: string; overall_score?: number | null; score?: number | null; status: IdentityCorrelationStatus }>;
}

export interface IdentityCorrelationRecord extends Omit<IdentityCorrelationEvidence, 'identity_id' | 'provider' | 'face_status'> {
  scan_id: string;
  source: 'anchor';
  target: string;
}

export interface ScanHistoryItem {
  scan_id: string;
  document_type: DocumentType;
  name: string;
  created_at: string;
  risk_score: number;
  risk_band: 'low' | 'medium' | 'high';
}

export type OfficerAction = 'clear' | 'review' | 'escalate';

export interface OfficerActionPayload {
  action: OfficerAction;
  notes?: string;
}

export interface ActionResponse {
  ok: boolean;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; organization_name?: string };
}

export interface ApiKey {
  id: string;
  label: string;
  environment: "test" | "live";
  masked_value: string;
  created_at: string;
  last_used_at: string | null;
}
