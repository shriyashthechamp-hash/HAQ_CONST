import { z } from 'zod';

export const LanguageSchema = z.enum(['mr', 'hi', 'en']);

export const DocumentStatusSchema = z.enum([
  'AVAILABLE',
  'NEEDS_VERIFICATION',
  'MISSING',
  'ACTION_REQUIRED',
]);

export const JourneyStageSchema = z.enum([
  'ELIGIBILITY_GUIDANCE',
  'DOCUMENT_PREPARATION',
  'PORTAL_HANDOFF',
  'SUBMITTED',
  'OUTCOME_RECORDED',
]);

export const JourneyEvidenceTypeSchema = z.enum([
  'OFFICIAL_ACKNOWLEDGEMENT_SLIP',
  'REGISTRATION_NUMBER',
  'IN_PERSON_RECEIPT',
  'PORTAL_SCREENSHOT',
  'VERIFIED_OFFICIAL_INTEGRATION',
]);

export const CreateSessionSchema = z.object({
  preferredLanguage: LanguageSchema.default('mr'),
  deviceInfo: z.string().optional(),
});

export const AssessEligibilitySchema = z.object({
  sessionId: z.string().uuid().or(z.string().min(1)),
  benefitType: z.string().default('MAHABOCW_REGISTRATION'),
  answers: z.object({
    age: z.union([z.number(), z.string()]).optional(),
    workedDaysLast12Months: z.union([z.number(), z.string()]).optional(),
    tradeType: z.string().optional(),
    isMaharashtraResident: z.union([z.boolean(), z.string()]).optional(),
    hasPreviousRegistration: z.union([z.boolean(), z.string()]).optional(),
  }),
});

export const UpdateDocumentItemSchema = z.object({
  sessionId: z.string().min(1),
  status: DocumentStatusSchema.optional(),
  userNotes: z.string().max(500).optional(),
});

export const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(1000),
  language: LanguageSchema.optional(),
});

export const DraftRequestSchema = z.object({
  sessionId: z.string().min(1),
  workerName: z.string().min(1).max(100),
  contractorName: z.string().min(1).max(100),
  siteLocation: z.string().min(1).max(200),
  tradeType: z.string().min(1).max(100),
  workDatesDescription: z.string().min(1).max(200),
  language: LanguageSchema.default('mr'),
});

export const CreateJourneyEventSchema = z.object({
  sessionId: z.string().min(1),
  eventType: JourneyStageSchema,
  evidenceType: JourneyEvidenceTypeSchema.optional(),
  evidenceReference: z.string().min(3).max(100).optional(),
});

export const CertifierTypeSchema = z.enum([
  'CONTRACTOR',
  'GRAMSEVAK',
  'MUNICIPAL_OFFICER',
  'TRADE_UNION',
]);

export const FormVDocumentTypeSchema = z.enum([
  'FORM_V_CERTIFICATE',
  'FORM_V_REQUEST_LETTER',
]);

export const FormVParamsSchema = z.object({
  documentType: FormVDocumentTypeSchema.default('FORM_V_CERTIFICATE'),
  workerName: z.string().min(2, 'नाव किमान २ अक्षरी असावे').max(100),
  fatherOrHusbandName: z.string().min(2, 'वडिलांचे/पतीचे नाव आवश्यक आहे').max(100),
  age: z.union([z.number().min(18).max(60), z.string().min(1)]).default(30),
  address: z.string().min(3, 'पत्ता आवश्यक आहे').max(250),
  aadhaarNumber: z.string().max(20).optional(),
  mobileNumber: z.string().min(10, '१० अंकी मोबाईल क्रमांक टाका').max(15).optional(),
  tradeType: z.string().min(2, 'कामाचे स्वरूप आवश्यक आहे').max(100),
  certifierType: CertifierTypeSchema.default('CONTRACTOR'),
  certifierName: z.string().min(2, 'कंत्राटदार किंवा अधिकाऱ्याचे नाव आवश्यक आहे').max(100),
  certifierRegistrationNo: z.string().max(100).optional(),
  siteNameAndLocation: z.string().min(3, 'साइटचे नाव व पत्ता आवश्यक आहे').max(200),
  workStartDate: z.string().min(4, 'सुरुवातीचा दिनांक टाका'),
  workEndDate: z.string().min(4, 'शेवटचा दिनांक टाका'),
  daysWorked: z.union([z.number().min(90), z.string().min(2)]).default(90),
  issueDate: z.string().default(new Date().toISOString().split('T')[0]),
  issuePlace: z.string().default('पुणे (Pune)'),
  customNotes: z.string().max(500).optional(),
});

// ================= HAQ 2.0 AGENT & VOICE SCHEMAS =================

export const ConsentCategorySchema = z.enum([
  'PROFILE_STORAGE',
  'DOCUMENT_ANALYSIS',
  'VOICE_PROCESSING',
  'SCHEME_ASSESSMENT',
]);

export const WorkerProfileSchema = z.object({
  name: z.string().optional(),
  age: z.number().min(18).max(100).optional(),
  state: z.string().default('Maharashtra'),
  district: z.string().default('Pune'),
  occupation: z.string().optional(),
  yearsOfConstructionWork: z.number().optional(),
  isRegistered: z.boolean().default(false),
  registrationNumber: z.string().optional(),
  hasAadhaar: z.boolean().optional(),
  hasBankPassbook: z.boolean().optional(),
  has90DaysCertificate: z.boolean().optional(),
  preferredLanguage: LanguageSchema.default('mr'),
  consentedAt: z.string().datetime().optional(),
});

export const UpdateWorkerProfileSchema = z.object({
  sessionId: z.string().min(1),
  profile: WorkerProfileSchema.partial(),
});

export const AgentChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
  language: LanguageSchema.optional(),
  voiceEnabled: z.boolean().default(false),
  audioInputUrl: z.string().optional(),
});

export const VoiceTranscribeRequestSchema = z.object({
  audioBase64: z.string().min(1),
  languageCode: z.enum(['mr-IN', 'hi-IN', 'en-IN']).default('mr-IN'),
  model: z.string().optional(),
});

export const VoiceSynthesizeRequestSchema = z.object({
  text: z.string().min(1).max(2500),
  languageCode: z.enum(['mr-IN', 'hi-IN', 'en-IN']).default('mr-IN'),
  speaker: z.string().optional(),
});

export const DocumentAnalysisRequestSchema = z.object({
  sessionId: z.string().min(1),
  documentType: z.string().default('FORM_V'),
  textContent: z.string().optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
});

export const CreateApplicationTaskSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  dueCategory: z.string().optional(),
  actionKey: z.string().optional(),
});

export const UpdateApplicationTaskSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
  userNotes: z.string().max(500).optional(),
});
