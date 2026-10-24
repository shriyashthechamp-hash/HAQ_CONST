import { prisma } from '../prisma';
import { DocumentChecklistItem, DocumentStatus, KnowledgeSourceCitation } from '@haq/shared';
import { KnowledgeService } from './knowledgeService';

export interface ChecklistResponse {
  sessionId: string;
  items: (DocumentChecklistItem & {
    requirement: {
      id: string;
      benefitType: string;
      documentKey: string;
      title: { en: string; mr: string; hi: string };
      description: { en: string; mr: string; hi: string };
      ruleVersion: string;
      sourceId: string;
      reviewStatus: string;
      acceptedAlternatives: { en: string[]; mr: string[]; hi: string[] };
      formDownloadUrl?: string;
      sourceCitation?: KnowledgeSourceCitation;
    };
  })[];
  progressPercent: number;
  availableCount: number;
  totalCount: number;
  needsVerificationCount: number;
  missingCount: number;
}

export class DocumentService {
  /**
   * Initialize or retrieve checklist items for a given session.
   */
  static async getOrCreateChecklist(sessionId: string): Promise<ChecklistResponse> {
    const requirements = await prisma.documentRequirement.findMany({
      orderBy: { id: 'asc' },
    });

    // Check if session has items already
    let items = await prisma.documentChecklistItem.findMany({
      where: { sessionId },
      include: { requirement: true },
      orderBy: { requirement: { id: 'asc' } },
    });

    if (items.length === 0) {
      // Seed default items for this session
      for (const req of requirements) {
        // Initial state: 90-day cert is ACTION_REQUIRED, Identity is NEEDS_VERIFICATION, Photos is MISSING
        let initialStatus: DocumentStatus = 'MISSING';
        if (req.documentKey === 'DOC_90_DAYS_CERT') {
          initialStatus = 'ACTION_REQUIRED';
        } else if (req.documentKey === 'DOC_IDENTITY_PROOF' || req.documentKey === 'DOC_AGE_PROOF') {
          initialStatus = 'NEEDS_VERIFICATION';
        }

        await prisma.documentChecklistItem.create({
          data: {
            sessionId,
            requirementId: req.id,
            status: initialStatus,
            userNotes: '',
          },
        });
      }

      items = await prisma.documentChecklistItem.findMany({
        where: { sessionId },
        include: { requirement: true },
        orderBy: { requirement: { id: 'asc' } },
      });
    }

    // Attach citations
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const citation = await KnowledgeService.getCitation(item.requirement.sourceId);
        return {
          id: item.id,
          sessionId: item.sessionId,
          requirementId: item.requirementId,
          status: item.status as DocumentStatus,
          userNotes: item.userNotes,
          updatedAt: item.updatedAt.toISOString(),
          requirement: {
            id: item.requirement.id,
            benefitType: item.requirement.benefitType,
            documentKey: item.requirement.documentKey,
            title: item.requirement.title as any,
            description: item.requirement.description as any,
            ruleVersion: item.requirement.ruleVersion,
            sourceId: item.requirement.sourceId,
            reviewStatus: item.requirement.reviewStatus,
            acceptedAlternatives: item.requirement.acceptedAlternatives as any,
            formDownloadUrl: item.requirement.formDownloadUrl || undefined,
            sourceCitation: citation,
          },
        };
      })
    );

    const totalCount = enrichedItems.length;
    const availableCount = enrichedItems.filter((i) => i.status === 'AVAILABLE').length;
    const needsVerificationCount = enrichedItems.filter((i) => i.status === 'NEEDS_VERIFICATION').length;
    const missingCount = enrichedItems.filter(
      (i) => i.status === 'MISSING' || i.status === 'ACTION_REQUIRED'
    ).length;

    const progressPercent = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

    return {
      sessionId,
      items: enrichedItems,
      progressPercent,
      availableCount,
      totalCount,
      needsVerificationCount,
      missingCount,
    };
  }

  /**
   * Update an individual checklist item status and/or user notes with session ownership validation.
   */
  static async updateItem(
    itemId: string,
    sessionId: string,
    status?: DocumentStatus,
    userNotes?: string
  ): Promise<DocumentChecklistItem> {
    let existing = await prisma.documentChecklistItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      // Allow fallback lookup by requirementId or offline placeholder map
      const PLACEHOLDER_REQ_MAP: Record<string, string> = {
        'item-1': 'req-90-days-cert',
        'item-2': 'req-identity-proof',
        'item-3': 'req-age-proof',
        'item-4': 'req-residence-proof',
        'item-5': 'req-passport-photos',
        'item-6': 'req-bank-passbook',
      };
      const resolvedReqId = PLACEHOLDER_REQ_MAP[itemId] || itemId;
      existing = await prisma.documentChecklistItem.findUnique({
        where: {
          sessionId_requirementId: {
            sessionId,
            requirementId: resolvedReqId,
          },
        },
      });
    }

    if (!existing) {
      const err = new Error('Document checklist item not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (existing.sessionId !== sessionId) {
      const err = new Error(
        'Session Access Denied: You do not have permission to modify document records belonging to another session.'
      );
      (err as any).statusCode = 403;
      throw err;
    }

    const updated = await prisma.documentChecklistItem.update({
      where: { id: existing.id },
      data: {
        ...(status ? { status } : {}),
        ...(userNotes !== undefined ? { userNotes } : {}),
      },
      include: { requirement: true },
    });

    return {
      id: updated.id,
      sessionId: updated.sessionId,
      requirementId: updated.requirementId,
      status: updated.status as DocumentStatus,
      userNotes: updated.userNotes,
      updatedAt: updated.updatedAt.toISOString(),
      requirement: {
        id: updated.requirement.id,
        benefitType: updated.requirement.benefitType,
        documentKey: updated.requirement.documentKey,
        title: updated.requirement.title as any,
        description: updated.requirement.description as any,
        ruleVersion: updated.requirement.ruleVersion,
        sourceId: updated.requirement.sourceId,
        reviewStatus: updated.requirement.reviewStatus as any,
        acceptedAlternatives: updated.requirement.acceptedAlternatives as any,
        formDownloadUrl: updated.requirement.formDownloadUrl || undefined,
      },
    };
  }
}
