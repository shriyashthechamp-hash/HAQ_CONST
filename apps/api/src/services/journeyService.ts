import { prisma } from '../prisma';
import {
  JourneyEvidenceType,
  JourneyStage,
  JourneyStatusSummary,
  JourneyEventRecord,
} from '@haq/shared';

export class JourneyService {
  private static readonly STAGE_ORDER: JourneyStage[] = [
    'ELIGIBILITY_GUIDANCE',
    'DOCUMENT_PREPARATION',
    'PORTAL_HANDOFF',
    'SUBMITTED',
    'OUTCOME_RECORDED',
  ];

  /**
   * Get the current journey status, event log, and valid next transitions.
   */
  static async getJourneyStatus(sessionId: string): Promise<JourneyStatusSummary> {
    const events = await prisma.journeyEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // If no events exist yet, seed initial ELIGIBILITY_GUIDANCE
    if (events.length === 0) {
      await prisma.journeyEvent.create({
        data: {
          sessionId,
          eventType: 'ELIGIBILITY_GUIDANCE',
        },
      });
      return this.getJourneyStatus(sessionId);
    }

    const recordedStages = new Set(events.map((e) => e.eventType));
    const lastEvent = events[events.length - 1];
    const currentStage = lastEvent.eventType as JourneyStage;

    const currentIndex = this.STAGE_ORDER.indexOf(currentStage);

    // Compute allowed next stages
    const allowedTransitions: JourneyStage[] = [];
    if (currentIndex < this.STAGE_ORDER.length - 1) {
      allowedTransitions.push(this.STAGE_ORDER[currentIndex + 1]);
    }

    const stageStatuses: Record<JourneyStage, 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'LOCKED'> = {
      ELIGIBILITY_GUIDANCE: 'PENDING',
      DOCUMENT_PREPARATION: 'PENDING',
      PORTAL_HANDOFF: 'PENDING',
      SUBMITTED: 'LOCKED',
      OUTCOME_RECORDED: 'LOCKED',
    };

    for (let i = 0; i < this.STAGE_ORDER.length; i++) {
      const stage = this.STAGE_ORDER[i];
      if (stage === currentStage) {
        stageStatuses[stage] = 'ACTIVE';
      } else if (recordedStages.has(stage) && i < currentIndex) {
        stageStatuses[stage] = 'COMPLETED';
      } else if (i === currentIndex + 1) {
        stageStatuses[stage] = 'PENDING';
      } else {
        stageStatuses[stage] = 'LOCKED';
      }
    }

    // Determine what to do next copy
    let whatToDoNext = {
      en: 'Complete the preliminary eligibility questionnaire to identify requirements.',
      mr: 'पात्रतेच्या अटी समजून घेण्यासाठी प्राथमिक प्रश्नावली पूर्ण करा.',
      hi: 'पात्रता की शर्तें समझने के लिए प्रारंभिक प्रश्नावली पूरी करें।',
    };

    if (currentStage === 'DOCUMENT_PREPARATION') {
      whatToDoNext = {
        en: 'Prepare your 90-day work certificate and identity documents in the checklist.',
        mr: 'चेकलिस्टमध्ये तुमचे ९० दिवस कामाचे प्रमाणपत्र आणि ओळखपत्र तयार करा.',
        hi: 'चेकलिस्ट में अपना ९० दिन का कार्य प्रमाण और पहचान पत्र तैयार करें।',
      };
    } else if (currentStage === 'PORTAL_HANDOFF') {
      whatToDoNext = {
        en: 'Visit the official MAHABOCW portal (mahabocw.in) or Aaple Sarkar Kendra in Pune to submit your verified files.',
        mr: 'अधिकृत MAHABOCW पोर्टल (mahabocw.in) किंवा पुण्यातील आपले सरकार केंद्रावर जाऊन अर्ज सादर करा.',
        hi: 'आधिकारिक MAHABOCW पोर्टल (mahabocw.in) या पुणे के आपले सरकार केंद्र पर जाकर आवेदन जमा करें।',
      };
    } else if (currentStage === 'SUBMITTED') {
      whatToDoNext = {
        en: 'Track your official application status using your official acknowledgement receipt number.',
        mr: 'तुमच्या अधिकृत पोचपावती क्रमांकाचा वापर करून अधिकृत अर्जाची स्थिती तपासा.',
        hi: 'अपनी आधिकारिक पावती संख्या का उपयोग करके आवेदन की स्थिति ट्रैक करें।',
      };
    } else if (currentStage === 'OUTCOME_RECORDED') {
      whatToDoNext = {
        en: 'Collect your official 14-digit BOCW Smart Card and verify registered welfare entitlements.',
        mr: 'तुमचे १४-अंकी अधिकृत कामगार स्मार्ट कार्ड मिळवा आणि नोंदणीकृत योजनांचा लाभ तपासा.',
        hi: 'अपना १४-अंकीय आधिकारिक बीओसीडब्ल्यू स्मार्ट कार्ड प्राप्त करें और कल्याणकारी योजनाओं की जांच करें।',
      };
    }

    const progressPercent = Math.round(((currentIndex + 1) / this.STAGE_ORDER.length) * 100);

    const eventRecords: JourneyEventRecord[] = events.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      eventType: e.eventType as JourneyStage,
      evidenceType: (e.evidenceType as JourneyEvidenceType) || undefined,
      evidenceReference: e.evidenceReference || undefined,
      createdAt: e.createdAt.toISOString(),
    }));

    return {
      currentStage,
      allowedTransitions,
      events: eventRecords,
      progressPercent,
      stageStatuses,
      whatToDoNext,
    };
  }

  private static readonly SAMPLE_OR_DUMMY_PATTERN =
    /(sample|demo|test|dummy|fake|mock|xxxx|placeholder|temp|1234|asdf)/i;

  private static validateSubmissionEvidence(
    evidenceType?: JourneyEvidenceType,
    evidenceReference?: string
  ): void {
    if (!evidenceType || !evidenceReference || evidenceReference.trim().length < 6) {
      throw new Error(
        'SUBMISSION GATING FAILED: You cannot mark an application as SUBMITTED without credible official evidence (e.g. Official Acknowledgement Slip or Aaple Sarkar application ID). HAQ does not fabricate official submissions.'
      );
    }

    const cleanRef = evidenceReference.trim();

    // Strictly reject known placeholder, test, or sample inputs
    if (this.SAMPLE_OR_DUMMY_PATTERN.test(cleanRef)) {
      throw new Error(
        'SUBMISSION GATING FAILED: Sample, demo, or placeholder receipt references are strictly rejected. HAQ requires a genuine official government acknowledgement receipt to verify submission.'
      );
    }

    // Verify credible official format
    if (evidenceType === 'OFFICIAL_ACKNOWLEDGEMENT_SLIP' || evidenceType === 'PORTAL_SCREENSHOT') {
      const isValidSlip =
        /^([A-Z]{2,4}[-/]?[0-9A-Z]{2,}[-/]?[0-9]{4,})$/i.test(cleanRef) ||
        /^(AS-[0-9]{6,}|MH-BOCW-[0-9A-Z-]+)$/i.test(cleanRef);
      if (!isValidSlip) {
        throw new Error(
          'SUBMISSION GATING FAILED: Provided acknowledgement reference does not match official MAHABOCW / Aaple Sarkar receipt patterns (e.g. MH-BOCW-PUN-2024-884920 or AS-10928374).'
        );
      }
    } else if (evidenceType === 'REGISTRATION_NUMBER') {
      const isValidRegNo = /^([0-9]{12,14}|MH[-0-9]{10,14})$/i.test(cleanRef);
      if (!isValidRegNo) {
        throw new Error(
          'SUBMISSION GATING FAILED: Registration number must be an official 12 to 14 digit BOCW identifier.'
        );
      }
    } else if (evidenceType === 'IN_PERSON_RECEIPT') {
      const isValidCounter = /^(DLC[-/][A-Z0-9/-]{5,})$/i.test(cleanRef);
      if (!isValidCounter) {
        throw new Error(
          'SUBMISSION GATING FAILED: Counter receipt reference must match Labour Commissioner District Office format (e.g. DLC-PUN-2024/8892).'
        );
      }
    }
  }

  private static validateOutcomeEvidence(evidenceReference?: string): void {
    if (!evidenceReference || evidenceReference.trim().length < 6) {
      throw new Error(
        'OUTCOME RECORDING FAILED: Credible evidence of the official board decision or registration card number is required.'
      );
    }

    const cleanRef = evidenceReference.trim();
    if (this.SAMPLE_OR_DUMMY_PATTERN.test(cleanRef)) {
      throw new Error(
        'OUTCOME RECORDING FAILED: Sample or placeholder outcome tokens are rejected. A genuine 14-digit BOCW Smart Card number or official Board decision order is required.'
      );
    }

    const isValidCardOrOrder =
      /^([0-9]{14}|MH-[0-9]{12}|BOCW-ORD-[0-9A-Z/-]{5,})$/i.test(cleanRef);
    if (!isValidCardOrOrder) {
      throw new Error(
        'OUTCOME RECORDING FAILED: Must provide an official 14-digit BOCW registration card number (e.g. MH-411042889201) or official board decision order reference.'
      );
    }
  }

  /**
   * Add a journey milestone with strict transition and evidence validation.
   */
  static async recordEvent(
    sessionId: string,
    eventType: JourneyStage,
    evidenceType?: JourneyEvidenceType,
    evidenceReference?: string
  ): Promise<JourneyEventRecord> {
    const currentStatus = await this.getJourneyStatus(sessionId);
    const currentIndex = this.STAGE_ORDER.indexOf(currentStatus.currentStage);
    const targetIndex = this.STAGE_ORDER.indexOf(eventType);

    // Rule 1: Cannot skip arbitrary stages forwards
    if (targetIndex > currentIndex + 1) {
      throw new Error(
        `Invalid stage transition: cannot jump from ${currentStatus.currentStage} directly to ${eventType}. Must proceed step-by-step.`
      );
    }

    // Rule 2: GATING PORTAL_HANDOFF. Ensure at least one checklist document is in progress or ready.
    if (eventType === 'PORTAL_HANDOFF') {
      const checklist = await prisma.documentChecklistItem.findMany({
        where: { sessionId },
      });
      const hasReadyDoc = checklist.some(
        (item) => item.status === 'AVAILABLE' || item.status === 'NEEDS_VERIFICATION'
      );
      if (checklist.length > 0 && !hasReadyDoc) {
        throw new Error(
          'HANDOFF GATING FAILED: You cannot proceed to official portal handoff until at least one required document has been reviewed in your checklist.'
        );
      }
    }

    // Rule 3: GATING SUBMISSION. A user CANNOT reach SUBMITTED merely by tapping a button or entering sample/dummy tokens!
    if (eventType === 'SUBMITTED') {
      if (currentStatus.currentStage !== 'PORTAL_HANDOFF') {
        throw new Error(
          `Invalid stage transition: cannot jump from ${currentStatus.currentStage} directly to SUBMITTED. Must reach PORTAL_HANDOFF first.`
        );
      }
      this.validateSubmissionEvidence(evidenceType, evidenceReference);
    }

    // Rule 4: GATING OUTCOME_RECORDED.
    if (eventType === 'OUTCOME_RECORDED') {
      if (currentStatus.currentStage !== 'SUBMITTED') {
        throw new Error(
          'OUTCOME RECORDING FAILED: An official outcome can only be recorded after an application has been verified as SUBMITTED.'
        );
      }
      this.validateOutcomeEvidence(evidenceReference);
    }

    const created = await prisma.journeyEvent.create({
      data: {
        sessionId,
        eventType,
        evidenceType: evidenceType || null,
        evidenceReference: evidenceReference || null,
      },
    });

    return {
      id: created.id,
      sessionId: created.sessionId,
      eventType: created.eventType as JourneyStage,
      evidenceType: (created.evidenceType as JourneyEvidenceType) || undefined,
      evidenceReference: created.evidenceReference || undefined,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
