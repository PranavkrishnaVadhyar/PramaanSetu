import { ScanHistoryItem, ScanResultResponse, PipelineStage } from './types';

export const PIPELINE_STAGES: { stage: PipelineStage; label: string; module: string; desc: string }[] = [
  { stage: 'ocr', label: 'OCR Extraction', module: 'Module 1', desc: 'Parsing text and visual tokens from document image' },
  { stage: 'validation', label: 'Document Validation', module: 'Module 2', desc: 'Computing checksums, format validation, and QR signatures' },
  { stage: 'tampering', label: 'Tampering Detection', module: 'Module 3', desc: 'Error Level Analysis (ELA) and forensic metadata checks' },
  { stage: 'face_verification', label: 'Face Verification', module: 'Module 4', desc: 'Biometric 1:1 face embedding match against live capture' },
  { stage: 'risk_scoring', label: 'Risk Scoring', module: 'Module 5', desc: 'Gradient boosted risk model composite score generation' },
  { stage: 'report_generation', label: 'Report Generation', module: 'Module 6', desc: 'Bilingual LLM narrative audit report generation' },
];

export const MOCK_HISTORY: ScanHistoryItem[] = [
  {
    scan_id: 'scn-90214-a9',
    document_type: 'passport',
    name: 'Vikram Aditya Sharma',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    risk_score: 14,
    risk_band: 'low',
  },
  {
    scan_id: 'scn-78103-b2',
    document_type: 'aadhaar',
    name: 'Rajesh K. Verma',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    risk_score: 88,
    risk_band: 'high',
  },
  {
    scan_id: 'scn-64219-c4',
    document_type: 'pan',
    name: 'Sunita Rao',
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    risk_score: 52,
    risk_band: 'medium',
  },
  {
    scan_id: 'scn-51109-d7',
    document_type: 'passport',
    name: 'Anita Roy Chowdhury',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    risk_score: 22,
    risk_band: 'low',
  },
  {
    scan_id: 'scn-43098-e1',
    document_type: 'aadhaar',
    name: 'Mohammed Tariq Khan',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    risk_score: 79,
    risk_band: 'high',
  },
  {
    scan_id: 'scn-38201-f5',
    document_type: 'pan',
    name: 'Deepak N. Patel',
    created_at: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    risk_score: 18,
    risk_band: 'low',
  },
  {
    scan_id: 'scn-29110-g3',
    document_type: 'passport',
    name: 'Pooja Bhatt',
    created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    risk_score: 41,
    risk_band: 'medium',
  },
  {
    scan_id: 'scn-18452-h8',
    document_type: 'aadhaar',
    name: 'Sanjay Deshmukh',
    created_at: new Date(Date.now() - 1000 * 60 * 550).toISOString(),
    risk_score: 28,
    risk_band: 'low',
  },
];

export const MOCK_RESULTS: Record<string, ScanResultResponse> = {
  'scn-78103-b2': {
    scan_id: 'scn-78103-b2',
    document_type: 'aadhaar',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    extracted_fields: {
      full_name: { text: 'Rajesh K. Verma', confidence: 0.96 },
      aadhaar_number: { text: 'XXXX-XXXX-4819', confidence: 0.94 },
      dob: { text: '14/08/1984', confidence: 0.98 },
      gender: { text: 'Male', confidence: 0.99 },
      address: { text: 'Plot 42, Sector 12, Dwarka, New Delhi 110075', confidence: 0.91 },
    },
    validation: {
      mrz_checksum_pass: null,
      verhoeff_checksum_pass: false,
      qr_signature_valid: false,
      qr_field_match: false,
      pan_structure_valid: null,
      field_consistency_pass: false,
    },
    tampering: {
      ela_score: 78.4,
      flagged_regions: ['DOB text bounding box', 'Photo boundary compression artifact'],
      metadata_anomalies: ['Software signature: Adobe Photoshop 24.1 (Windows)', 'EXIF creation date postdates nominal issue date'],
      ela_heatmap_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23111"/><rect x="40" y="40" width="120" height="150" fill="%23222" stroke="%23333"/><rect x="180" y="50" width="180" height="20" fill="%23222"/><rect x="180" y="90" width="160" height="24" fill="%23B23A3A" opacity="0.85"/><text x="190" y="107" fill="%23fff" font-size="11" font-family="monospace">HIGH ELA VARIANCE [DOB]</text><rect x="180" y="130" width="140" height="18" fill="%23222"/><rect x="45" y="45" width="110" height="140" fill="none" stroke="%23B5790B" stroke-width="2" stroke-dasharray="4"/><text x="50" y="195" fill="%23B5790B" font-size="10" font-family="monospace">EDGE SPLICE DETECTED</text></svg>',
    },
    face_verification: {
      match: false,
      confidence: 0.42,
    },
    identity_risk: {
      registry_status: 'blacklisted',
      document_expired: false,
      issuing_authority: 'Unique Identification Authority of India (UIDAI)',
    },
    risk_model: {
      score: 88,
      band: 'high',
      top_features: [
        'Verhoeff checksum failure on Aadhaar 12-digit number (weight: +0.38)',
        'Significant Error Level Analysis (ELA) variance in Date of Birth region (weight: +0.29)',
        'QR code digital signature mismatch against UIDAI root certificate (weight: +0.22)',
        'Biometric face verification score below 0.50 threshold (weight: +0.18)',
      ],
    },
    report: {
      text_en: 'CRITICAL ALERT: The submitted Aadhaar document shows multi-vector synthetic tampering. Verhoeff algorithmic check on the nominal UID failed. Error Level Analysis isolated high-frequency compression artifacts in the DOB and photo boundary regions, indicating localized digital paste-up. In addition, the secure QR payload does not decrypt with the official public key. Subject photo comparison against the live capture failed with a 42% match. Escalation for manual physical verification and fraud logging is strongly advised.',
      text_hi: 'गंभीर चेतावनी: प्रस्तुत आधार दस्तावेज़ में बहु-स्तरीय छेड़छाड़ (Tampering) का पता चला है। यूआईडी संख्या का वेरहोफ चेकसम विफल रहा है। एरर लेवल एनालिसिस (ELA) में जन्मतिथि और फोटो के किनारों पर डिजिटल पेस्ट-अप के स्पष्ट संकेत मिले हैं। इसके अलावा, क्यूआर कोड का डिजिटल हस्ताक्षर यूआईडीआई पब्लिक की से मेल नहीं खाता है। लाइव कैप्चर और दस्तावेज़ फोटो का मिलान केवल 42% है। भौतिक सत्यापन और त्वरित जांच की सिफारिश की जाती है।',
    },
  },
  'scn-90214-a9': {
    scan_id: 'scn-90214-a9',
    document_type: 'passport',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    extracted_fields: {
      full_name: { text: 'Vikram Aditya Sharma', confidence: 0.99 },
      passport_number: { text: 'Z3928104', confidence: 0.99 },
      nationality: { text: 'IND', confidence: 0.99 },
      dob: { text: '22/11/1990', confidence: 0.98 },
      expiry_date: { text: '18/05/2031', confidence: 0.98 },
      mrz_line_1: { text: 'P<INDSHARMA<<VIKRAM<ADITYA<<<<<<<<<<<<<<<<<<', confidence: 0.99 },
      mrz_line_2: { text: 'Z3928104<2IND9011228M3105186<<<<<<<<<<<<<<04', confidence: 0.99 },
    },
    validation: {
      mrz_checksum_pass: true,
      verhoeff_checksum_pass: null,
      qr_signature_valid: null,
      qr_field_match: null,
      pan_structure_valid: null,
      field_consistency_pass: true,
    },
    tampering: {
      ela_score: 8.2,
      flagged_regions: [],
      metadata_anomalies: [],
      ela_heatmap_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23111"/><rect x="40" y="40" width="120" height="150" fill="%231a1a1a" stroke="%232a2a2a"/><rect x="180" y="50" width="180" height="16" fill="%231a1a1a"/><rect x="180" y="80" width="140" height="16" fill="%231a1a1a"/><rect x="180" y="110" width="160" height="16" fill="%231a1a1a"/><text x="120" y="220" fill="%231F8A4C" font-size="12" font-family="monospace">UNIFORM COMPRESSION RESIDUALS (CLEAN)</text></svg>',
    },
    face_verification: {
      match: true,
      confidence: 0.95,
    },
    identity_risk: {
      registry_status: 'clear',
      document_expired: false,
      issuing_authority: 'Ministry of External Affairs, Government of India',
    },
    risk_model: {
      score: 14,
      band: 'low',
      top_features: [
        'MRZ Line 1 & Line 2 ICAO Doc 9303 checksums validated (weight: -0.45)',
        'Zero high-variance ELA clusters detected (weight: -0.35)',
        'Biometric face verification match 95.2% (weight: -0.28)',
        'Registry clearance confirmed across border watchlists (weight: -0.20)',
      ],
    },
    report: {
      text_en: 'CLEAR: Document has passed all automated authenticity and cryptographic checks. ICAO Doc 9303 machine-readable zone checksums match OCR extracted biographical data perfectly. Forensic error level analysis shows uniform compression residuals with no evidence of tampering or font re-rendering. Biometric face match with live capture is 95.2%. No hits on internal watchlists.',
      text_hi: 'सत्यापित: दस्तावेज़ ने सभी स्वचालित प्रामाणिकता और क्रिप्टोग्राफ़िक जांच सफलतापूर्वक पास कर ली हैं। आईसीएओ डॉक 9303 मशीन-पठनीय ज़ोन (MRZ) चेकसम बायो डेटा से पूरी तरह मेल खाता है। फॉरेन्सिक एरर लेवल एनालिसिस (ELA) में किसी भी प्रकार की छेड़छाड़ या विसंगति नहीं पाई गई है। लाइव बायोमेट्रिक मिलान 95.2% है। कोई सुरक्षा चेतावनी नहीं मिली है।',
    },
  },
  'scn-64219-c4': {
    scan_id: 'scn-64219-c4',
    document_type: 'pan',
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    extracted_fields: {
      full_name: { text: 'Sunita Rao', confidence: 0.94 },
      pan_number: { text: 'ABCPS1289K', confidence: 0.97 },
      father_name: { text: 'Ramesh Rao', confidence: 0.92 },
      dob: { text: '05/03/1979', confidence: 0.95 },
    },
    validation: {
      mrz_checksum_pass: null,
      verhoeff_checksum_pass: null,
      qr_signature_valid: true,
      qr_field_match: true,
      pan_structure_valid: true,
      field_consistency_pass: true,
    },
    tampering: {
      ela_score: 22.1,
      flagged_regions: [],
      metadata_anomalies: ['Original scanning device metadata missing'],
    },
    face_verification: null,
    identity_risk: {
      registry_status: 'under_investigation',
      document_expired: false,
      issuing_authority: 'Income Tax Department, Government of India',
    },
    risk_model: {
      score: 52,
      band: 'medium',
      top_features: [
        'Entity flagged as "Under Investigation" in financial intelligence registry (weight: +0.48)',
        'Document physical and QR integrity valid (weight: -0.32)',
        'Absence of live face capture verification (weight: +0.15)',
      ],
    },
    report: {
      text_en: 'CAUTION / MEDIUM RISK: The physical PAN document itself is genuine with valid 10-character alphanumeric structure and matching QR payload. However, the holder entity is currently tagged as "Under Investigation" in national compliance databases. Manual verification of additional photo identification is recommended prior to clearance.',
      text_hi: 'सावधानी / मध्यम जोखिम: प्रस्तुत पैन कार्ड भौतिक और तकनीकी रूप से वैध है और क्यूआर पेलोड पूरी तरह मेल खाता है। हालांकि, धारक का रिकॉर्ड केंद्रीय जांच डेटाबेस में "जांच के अधीन" (Under Investigation) दर्ज है। अंतिम मंजूरी से पहले अतिरिक्त पहचान पत्र के साथ मैनुअल जांच की सिफारिश की जाती है।',
    },
  },
};
