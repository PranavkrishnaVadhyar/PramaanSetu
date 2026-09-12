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
    field_consistency_pass: boolean;
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
