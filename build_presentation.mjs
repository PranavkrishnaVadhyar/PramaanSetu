import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/HP/OneDrive/Desktop/PramaanSetu";
const skillDir = "C:/Users/HP/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.11809/skills/presentations";
const tmpDir = path.join(workspaceDir, "tmp", "ppt_build");
const outDir = path.join(workspaceDir, "output", "presentations");
const runtimePython = "C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const finalPath = path.join(outDir, "PramaanSetu_Project_Presentation.pptx");
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools", "artifact_tool_utils.mjs")).href);
await fs.mkdir(tmpDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });

const font = resolvePresentationFont();
const ppt = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { navy: "#0C2033", teal: "#16A394", cyan: "#3FA8C9", pale: "#EFF5F7", white: "#FFFFFF", ink: "#142433", muted: "#5B7181", amber: "#D99218", red: "#C95555", line: "#D7E2E8" };

function box(slide, x, y, w, h, fill = "none", line = "none", radius = 0) {
  return slide.shapes.add({ geometry: radius ? "roundRect" : "rect", position: { left: x, top: y, width: w, height: h }, fill, line: { fill: line, width: line === "none" ? 0 : 1 } });
}
function text(slide, value, x, y, w, h, opts = {}) {
  const s = slide.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = value;
  s.text.style = { typeface: font, fontSize: opts.size ?? 20, color: opts.color ?? C.ink, bold: opts.bold ?? false, align: opts.align ?? "left", verticalAlignment: opts.valign ?? "top", autoFit: "shrinkText" };
  return s;
}
function title(slide, number, heading, sub = "") {
  text(slide, number, 64, 42, 65, 24, { size: 12, color: C.teal, bold: true });
  text(slide, heading, 64, 70, 950, 56, { size: 34, bold: true, color: C.navy });
  if (sub) text(slide, sub, 64, 130, 1040, 34, { size: 16, color: C.muted });
  box(slide, 64, 178, 1152, 2, C.teal);
}
function footer(slide, page) {
  text(slide, "PRAMAANSETU  |  DOCUMENT VERIFICATION API", 64, 680, 450, 18, { size: 10, color: C.muted, bold: true });
  text(slide, String(page).padStart(2, "0"), 1160, 680, 56, 18, { size: 10, color: C.muted, bold: true, align: "right" });
}
function pill(slide, value, x, y, w, color = C.teal) {
  box(slide, x, y, w, 28, color, color, 12);
  text(slide, value, x + 10, y + 6, w - 20, 17, { size: 10, color: C.white, bold: true, align: "center" });
}
function card(slide, heading, body, x, y, w, h, accent = C.teal) {
  box(slide, x, y, w, h, C.white, C.line, 14);
  box(slide, x, y, 6, h, accent, accent, 14);
  text(slide, heading, x + 24, y + 20, w - 42, 28, { size: 18, bold: true, color: C.navy });
  text(slide, body, x + 24, y + 58, w - 42, h - 70, { size: 14, color: C.muted });
}
function note(slide, content) { slide.speakerNotes.textFrame.setText(content); }

// 1. Cover
{
  const s = ppt.slides.add(); s.background.fill = C.navy;
  box(s, 0, 0, 1280, 720, C.navy);
  box(s, 64, 74, 8, 510, C.teal);
  pill(s, "SMART INDIA HACKATHON PROJECT", 92, 78, 245, C.teal);
  text(s, "PramaanSetu", 92, 160, 820, 76, { size: 52, bold: true, color: C.white });
  text(s, "Indian document verification API", 92, 244, 820, 46, { size: 30, color: "#B9D8E3" });
  text(s, "OCR, document authenticity checks, tamper analysis, risk scoring, and optional synthetic identity correlation for Passport, Aadhaar, and PAN workflows.", 92, 328, 700, 90, { size: 20, color: C.white });
  box(s, 880, 135, 270, 270, "#123754", "#2B5877", 28);
  text(s, "API", 925, 195, 180, 55, { size: 42, bold: true, color: C.teal, align: "center" });
  text(s, "VERIFY\nANALYZE\nEXPLAIN", 925, 260, 180, 100, { size: 18, bold: true, color: C.white, align: "center" });
  text(s, "Synthetic-demo only. No UIDAI integration.", 92, 617, 580, 26, { size: 13, color: "#B9D8E3" });
  note(s, "Project overview based on the supplied PramaanSetu brief and the implemented codebase.");
}

// 2. Problem
{
  const s = ppt.slides.add(); s.background.fill = C.pale; title(s, "01", "The verification problem", "Developers need structured document intelligence without building a forensic pipeline from scratch");
  card(s, "Unstructured inputs", "Identity images arrive with varied layouts, bilingual fields, image quality issues, and missing machine-readable data.", 64, 225, 350, 220, C.cyan);
  card(s, "Multiple fraud signals", "A useful decision combines OCR quality, document rules, QR or MRZ checks, image tampering evidence, and biometric input.", 465, 225, 350, 220, C.amber);
  card(s, "Opaque outcomes", "Integrators need an API response and a human-readable explanation, rather than an unexplained pass or fail.", 866, 225, 350, 220, C.teal);
  text(s, "PramaanSetu returns evidence, a risk score, and a report while keeping document authenticity separate from identity status.", 160, 510, 960, 40, { size: 22, color: C.navy, bold: true, align: "center" }); footer(s, 2); note(s, "No claims of official government verification. The project uses synthetic documents and a mock identity provider for demonstration.");
}

// 3. Product/API
{
  const s = ppt.slides.add(); s.background.fill = C.white; title(s, "02", "Developer API product", "A console for testing, API keys for integration, and JSON results for applications");
  text(s, "One scan request", 64, 226, 230, 28, { size: 18, bold: true, color: C.navy });
  box(s, 64, 270, 300, 120, "#F2F8FA", C.line, 12); text(s, "POST /api/scans\nDocument image + type\nJWT or API key", 88, 296, 250, 70, { size: 18, bold: true, color: C.navy });
  text(s, "Six-module pipeline", 486, 226, 280, 28, { size: 18, bold: true, color: C.navy, align: "center" });
  for (const [i, label] of ["OCR", "VALIDATE", "TAMPER", "FACE", "RISK", "REPORT"].entries()) { const x = 420 + i * 115; box(s, x, 290, 92, 55, i === 4 ? C.teal : "#EAF2F5", i === 4 ? C.teal : C.line, 10); text(s, label, x + 6, 309, 80, 18, { size: 11, bold: true, color: i === 4 ? C.white : C.navy, align: "center" }); }
  text(s, "Structured response", 925, 226, 250, 28, { size: 18, bold: true, color: C.navy });
  box(s, 902, 270, 314, 120, "#F2F8FA", C.line, 12); text(s, "Risk band + score\nExtracted fields\nValidation, evidence, report", 926, 296, 260, 70, { size: 17, bold: true, color: C.navy });
  text(s, "Console flow: sign up, create an API key, submit a scan, inspect the raw response and supporting evidence.", 132, 500, 1016, 30, { size: 19, color: C.muted, align: "center" }); footer(s, 3); note(s, "Endpoints and authentication reflect the implemented FastAPI backend and React developer console.");
}

// 4. Six modules
{
  const s = ppt.slides.add(); s.background.fill = C.pale; title(s, "03", "Forensic pipeline", "Each module contributes a distinct, inspectable signal");
  const modules = [
    ["01", "OCR extraction", "Region-aware field extraction with English and Hindi support"],
    ["02", "Document validation", "MRZ, Verhoeff, QR and PAN structure checks"],
    ["03", "Tamper detection", "ELA, metadata, font alignment and QR-to-print comparison"],
    ["04", "Face verification", "Optional document photo and live capture comparison"],
    ["05", "Risk scoring", "Classifier output plus deterministic safety overrides"],
    ["06", "Report generation", "Grounded English and Hindi decision report"],
  ];
  modules.forEach(([n,h,b], i) => { const col = i % 3, row = Math.floor(i / 3); const x = 64 + col * 384, y = 220 + row * 180; box(s,x,y,350,142,C.white,C.line,14); text(s,n,x+22,y+20,35,20,{size:12,bold:true,color:C.teal}); text(s,h,x+22,y+48,290,25,{size:18,bold:true,color:C.navy}); text(s,b,x+22,y+82,300,42,{size:13,color:C.muted}); });
  footer(s, 4); note(s, "Implementation uses EasyOCR for text extraction. The current face module is optional and independent of the identity-correlation feature.");
}

// 5. Safety and separation
{
  const s = ppt.slides.add(); s.background.fill = C.white; title(s, "04", "Risk design and safety controls", "The system separates forensic evidence, identity status, and cross-document consistency");
  box(s, 84, 238, 312, 190, "#F1F8FA", C.cyan, 16); text(s,"Document authenticity",112,265,250,26,{size:20,bold:true,color:C.navy}); text(s,"Checks whether the submitted document appears structurally valid and free from detected editing.",112,315,245,65,{size:15,color:C.muted});
  box(s, 484, 238, 312, 190, "#F7F6F1", C.amber, 16); text(s,"Identity and registry",512,265,250,26,{size:20,bold:true,color:C.navy}); text(s,"Keeps registry and expiry information outside the forensic classifier's feature schema.",512,315,245,65,{size:15,color:C.muted});
  box(s, 884, 238, 312, 190, "#F1F8F5", C.teal, 16); text(s,"Identity consistency",912,265,250,26,{size:20,bold:true,color:C.navy}); text(s,"Optionally compares other documents against a verified synthetic Aadhaar anchor.",912,315,245,65,{size:15,color:C.muted});
  text(s,"Hard safety override",90,505,250,26,{size:20,bold:true,color:C.red}); text(s,"If a primary ID field cannot be extracted, the final risk cannot remain low. The report names that extraction-quality warning.",360,505,760,42,{size:18,color:C.navy}); footer(s, 5); note(s, "The safety override and tri-state field consistency were implemented after a live scan exposed a low-risk false pass for missing primary identifiers.");
}

// 6. Identity correlation
{
  const s = ppt.slides.add(); s.background.fill = C.pale; title(s, "05", "Synthetic identity correlation", "An optional cross-document consistency layer for the developer sandbox");
  pill(s,"MOCK IDENTITY PROVIDER",64,210,200,C.amber);
  const steps = [["1", "Scan Aadhaar", "Complete OCR and document checks"], ["2", "Establish anchor", "Create a tenant-scoped synthetic identity ID"], ["3", "Cross-check Passport or PAN", "Compare name, DOB and gender with dynamic weighting"]];
  steps.forEach(([n,h,b],i)=>{const x=64+i*384; box(s,x,278,330,160,C.white,C.line,14); text(s,n,x+24,302,34,32,{size:24,bold:true,color:C.teal}); text(s,h,x+24,344,270,26,{size:18,bold:true,color:C.navy}); text(s,b,x+24,384,270,35,{size:13,color:C.muted}); if(i<2) text(s,"NEXT",x+334,342,50,18,{size:10,bold:true,color:C.muted,align:"center"});});
  box(s, 160, 505, 960, 64, "#163B57", "#163B57", 12); text(s,"Outputs: name similarity, DOB match, gender match, optional face similarity, overall consistency score, and status.",190,525,900,25,{size:17,color:C.white,align:"center"});
  footer(s, 6); note(s, "The synthetic provider never contacts UIDAI. The UI labels the feature as a synthetic demo and masks the Aadhaar value.");
}

// 7. Security/API
{
  const s = ppt.slides.add(); s.background.fill = C.white; title(s, "06", "Authentication and tenant isolation", "Dashboard sessions and programmatic API access resolve to the same user");
  const items = [["Console login", "Email and password produce a JWT stored by the standalone console."], ["API keys", "Test and live keys authenticate integrations without exposing the secret after creation."], ["Scan ownership", "Every scan records its user and optional API key. History filters by user."], ["Identity ownership", "Synthetic anchors use tenant-scoped IDs. Cross-document graphs remain private to that tenant."]];
  items.forEach(([h,b],i)=>{const x=i<2?64:650, y=i%2===0?225:425; box(s,x,y,566,150,"#F7FAFB",C.line,14); text(s,h,x+28,y+24,470,24,{size:19,bold:true,color:C.navy}); text(s,b,x+28,y+65,470,52,{size:14,color:C.muted});});
  footer(s, 7); note(s, "Authentication and API key ownership are implemented in the FastAPI backend. Identity endpoints use the same flexible authentication dependency.");
}

// 8. Stack and data
{
  const s = ppt.slides.add(); s.background.fill = C.pale; title(s, "07", "Implementation stack and data boundaries", "A practical web stack with synthetic data and clear limits");
  const rows = [["Frontend", "React, TypeScript, Tailwind CSS"], ["API", "FastAPI, JWT sessions, API keys"], ["Storage", "PostgreSQL for users, scans, keys and synthetic identity profiles"], ["Extraction", "EasyOCR with document-specific field regions"], ["Forensics", "OpenCV and Pillow for ELA, metadata and alignment analysis"], ["Scoring", "scikit-learn classifier plus deterministic safety rules"]];
  rows.forEach(([a,b],i)=>{const y=215+i*58; text(s,a,90,y,205,22,{size:16,bold:true,color:C.navy}); text(s,b,330,y,760,22,{size:16,color:C.muted}); box(s,90,y+38,1020,1,C.line);});
  box(s, 90, 590, 1020, 55, "#FFF8E8", "#F0D291", 10); text(s,"Data boundary: documents and the Aadhaar identity provider are synthetic for the demo. The application does not claim UIDAI authentication or e-KYC.",112,608,980,22,{size:15,bold:true,color:"#785A17"}); footer(s, 8); note(s, "All claims reflect the implementation and source brief. Do not represent the mock Aadhaar provider as a government integration.");
}

// 9. Demo
{
  const s = ppt.slides.add(); s.background.fill = C.navy; text(s,"08",64,44,65,24,{size:12,color:C.teal,bold:true}); text(s,"Project demonstration",64,72,900,56,{size:34,color:C.white,bold:true}); text(s,"A short walkthrough for the developer API product",64,132,900,30,{size:16,color:"#B9D8E3"}); box(s,64,178,1152,2,C.teal);
  const demo = [["01", "Create account and API key", "Show JWT console access and one-time API-key display."], ["02", "Run a document scan", "Upload Passport, Aadhaar, or PAN in the Sandbox and inspect JSON plus report."], ["03", "Establish synthetic anchor", "Use the completed Aadhaar result to create a masked, tenant-scoped identity anchor."], ["04", "Cross-check a second document", "Run Passport or PAN with the active anchor and inspect consistency evidence."], ["05", "Show a safety case", "Demonstrate a missing primary ID field or mismatch and explain the deterministic escalation."]];
  demo.forEach(([n,h,b],i)=>{const y=208+i*82; text(s,n,90,y,40,25,{size:16,bold:true,color:C.teal}); text(s,h,150,y,390,24,{size:18,bold:true,color:C.white}); text(s,b,555,y+2,580,38,{size:14,color:"#B9D8E3"}); box(s,90,y+58,1040,1,"#2B5877");});
  text(s,"Outcome: an explainable developer-facing API workflow that combines document evidence with optional synthetic identity consistency checks.",90,640,1050,28,{size:16,color:C.white,bold:true}); note(s, "Close with the distinction between document authenticity, identity consistency, registry status, and optional biometric evidence.");
}

const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "PramaanSetu_Project_Presentation_candidate.pptx");
await (await PresentationFile.exportPptx(ppt)).save(candidatePath);
await finalizePresentation({
  workspaceDir, candidatePath, finalPath, pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "PramaanSetu_Project_Presentation.validation.json"),
});
console.log(finalPath);
