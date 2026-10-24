export type Language = 'mr' | 'hi' | 'en';

export type AssessmentStatus = 'PRELIMINARY_SATISFIED' | 'NEEDS_VERIFICATION' | 'INELIGIBLE';

export type DocumentStatus = 'AVAILABLE' | 'NEEDS_VERIFICATION' | 'MISSING' | 'ACTION_REQUIRED';

export type JourneyStage =
  | 'ELIGIBILITY_GUIDANCE'
  | 'DOCUMENT_PREPARATION'
  | 'PORTAL_HANDOFF'
  | 'SUBMITTED'
  | 'OUTCOME_RECORDED';

export type JourneyEvidenceType =
  | 'OFFICIAL_ACKNOWLEDGEMENT_SLIP'
  | 'REGISTRATION_NUMBER'
  | 'IN_PERSON_RECEIPT'
  | 'PORTAL_SCREENSHOT'
  | 'VERIFIED_OFFICIAL_INTEGRATION';

export interface KnowledgeSourceCitation {
  sourceId: string;
  title: string;
  url: string;
  excerpt: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  sourceType: 'OFFICIAL_PORTAL' | 'GOVERNMENT_RESOLUTION' | 'OFFICIAL_FORM' | 'HELPLINE_DIRECTORY';
  checkedAt: string;
  version: string;
  reviewStatus: 'REVIEWED' | 'PROVISIONAL' | 'UNVERIFIED';
  excerpt: string;
  reviewerNotes: string;
}

export interface BenefitRule {
  id: string;
  benefitType: string;
  ruleKey: string;
  condition: string;
  applicableWhen: string;
  sourceId: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  reviewStatus: 'REVIEWED' | 'PROVISIONAL';
}

export interface DocumentRequirement {
  id: string;
  benefitType: string;
  documentKey: string;
  title: {
    en: string;
    mr: string;
    hi: string;
  };
  description: {
    en: string;
    mr: string;
    hi: string;
  };
  ruleVersion: string;
  sourceId: string;
  reviewStatus: 'REVIEWED' | 'PROVISIONAL' | 'UNVERIFIED';
  acceptedAlternatives: {
    en: string[];
    mr: string[];
    hi: string[];
  };
  formDownloadUrl?: string;
}

export interface DocumentChecklistItem {
  id: string;
  sessionId: string;
  requirementId: string;
  status: DocumentStatus;
  userNotes: string;
  updatedAt: string;
  requirement?: DocumentRequirement;
}

export interface QuestionnaireAnswers {
  age?: number | string;
  workedDaysLast12Months?: number | string;
  tradeType?: string;
  isMaharashtraResident?: boolean | string;
  hasPreviousRegistration?: boolean | string;
}

export interface EligibilityCheckResult {
  ruleKey: string;
  title: {
    en: string;
    mr: string;
    hi: string;
  };
  status: 'SATISFIED' | 'UNRESOLVED' | 'FAILED';
  explanation: {
    en: string;
    mr: string;
    hi: string;
  };
  sourceCitation: KnowledgeSourceCitation;
  nextStepRecommendation: {
    en: string;
    mr: string;
    hi: string;
  };
}

export interface EligibilityAssessmentResult {
  id?: string;
  sessionId: string;
  benefitType: string;
  assessmentStatus: AssessmentStatus;
  ruleVersion: string;
  satisfiedChecks: EligibilityCheckResult[];
  unresolvedChecks: EligibilityCheckResult[];
  failedChecks: EligibilityCheckResult[];
  disclaimer: {
    en: string;
    mr: string;
    hi: string;
  };
  evaluatedAt: string;
}

export interface JourneyEventRecord {
  id: string;
  sessionId: string;
  eventType: JourneyStage;
  evidenceType?: JourneyEvidenceType;
  evidenceReference?: string;
  createdAt: string;
}

export interface JourneyStatusSummary {
  currentStage: JourneyStage;
  allowedTransitions: JourneyStage[];
  events: JourneyEventRecord[];
  progressPercent: number;
  stageStatuses: Record<JourneyStage, 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'LOCKED'>;
  whatToDoNext: {
    en: string;
    mr: string;
    hi: string;
  };
}

export interface AssistantChatResponse {
  reply: string;
  language: Language;
  citations: KnowledgeSourceCitation[];
  isDemoFallback: boolean;
  modelUsed: string;
  suggestedFollowUps: string[];
}

export type CertifierType =
  | 'CONTRACTOR'
  | 'GRAMSEVAK'
  | 'MUNICIPAL_OFFICER'
  | 'TRADE_UNION';

export type FormVDocumentType = 'FORM_V_CERTIFICATE' | 'FORM_V_REQUEST_LETTER';

export interface FormVParams {
  documentType: FormVDocumentType;
  workerName: string;
  fatherOrHusbandName: string;
  age: number | string;
  address: string;
  aadhaarNumber?: string;
  mobileNumber?: string;
  tradeType: string;
  certifierType: CertifierType;
  certifierName: string;
  certifierRegistrationNo?: string;
  siteNameAndLocation: string;
  workStartDate: string;
  workEndDate: string;
  daysWorked: number | string;
  issueDate: string;
  issuePlace: string;
  customNotes?: string;
}

export interface CachedChecklistState {
  schemaVersion: number;
  sessionId: string;
  items: DocumentChecklistItem[];
  progressPercent: number;
  availableCount: number;
  totalCount: number;
  needsVerificationCount: number;
  missingCount: number;
  lastFetchedAt: string | null;
  lastSyncedAt: string | null;
  pendingUpdates: Record<
    string,
    {
      status: DocumentStatus;
      userNotes: string;
      clientUpdatedAt: string;
    }
  >;
  syncStatus: 'SYNCED' | 'PENDING' | 'SYNCING' | 'ERROR' | 'OFFLINE';
  lastError: string | null;
}

