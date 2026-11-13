import { prisma } from '../prisma';
import { ApplicationTaskItem, DocumentAnalysisResult } from '@haq/shared';

export class ApplicationIntelligenceService {
  /**
   * Analyse uploaded or scanned document text (e.g. Form-V or Aadhaar)
   */
  static async analyzeDocument(params: {
    sessionId: string;
    documentType: string;
    textContent?: string;
  }): Promise<DocumentAnalysisResult> {
    const text = params.textContent || '';
    const hasWorkerName = text.length > 5;
    const mentions90Days = text.includes('90') || text.includes('९०') || text.toLowerCase().includes('days');
    const hasContractorSignature = text.toLowerCase().includes('contractor') || text.includes('कंत्राटदार') || text.includes('सही');

    const extractedFields: Record<string, any> = {};
    const matchedRequirements: string[] = [];
    const missingElements: string[] = [];

    if (params.documentType === 'FORM_V') {
      if (mentions90Days) {
        extractedFields['daysWorked'] = 90;
        matchedRequirements.push('90_DAYS_WORK_CLAUSE');
      } else {
        missingElements.push('९० दिवस कामाचा स्पष्ट उल्लेख (Mention of 90 days of work)');
      }

      if (hasContractorSignature) {
        extractedFields['isCertified'] = true;
        matchedRequirements.push('CONTRACTOR_SIGNATURE');
      } else {
        missingElements.push('कंत्राटदार अथवा ग्रामसेवकाची स्वाक्षरी व शिक्का (Signature & Stamp)');
      }
    }

    const isReadable = text.trim().length > 10;
    const confidenceScore = isReadable && missingElements.length === 0 ? 0.95 : 0.65;

    return {
      documentType: params.documentType,
      isReadable,
      confidenceScore,
      extractedFields,
      matchedRequirements,
      missingElements,
      guidanceMessage: {
        en: missingElements.length === 0
          ? 'Document contains all required statutory clauses.'
          : `Please ensure the following are complete: ${missingElements.join(', ')}`,
        mr: missingElements.length === 0
          ? 'कागदपत्रात सर्व आवश्यक कायदेशीर अटी आढळल्या आहेत.'
          : `कृपया खालील गोष्टी तपासा: ${missingElements.join(', ')}`,
        hi: missingElements.length === 0
          ? 'दस्तावेज में सभी आवश्यक शर्तें पूरी पाई गई हैं।'
          : `कृपया निम्नलिखित की जांच करें: ${missingElements.join(', ')}`,
      },
      officialDisclaimer: 'This analysis provides preliminary format validation only. Final verification is conducted by the MAHABOCW Board / Labour Officer.',
    };
  }

  /**
   * Application Task Management
   */
  static async listTasks(sessionId: string): Promise<ApplicationTaskItem[]> {
    const tasks = await prisma.applicationTask.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
    return tasks as any;
  }

  static async createTask(params: {
    sessionId: string;
    title: string;
    description?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    dueCategory?: string;
    actionKey?: string;
  }): Promise<ApplicationTaskItem> {
    const task = await prisma.applicationTask.create({
      data: {
        sessionId: params.sessionId,
        title: params.title,
        description: params.description || '',
        priority: params.priority || 'MEDIUM',
        dueCategory: params.dueCategory,
        actionKey: params.actionKey,
        status: 'PENDING',
      },
    });
    return task as any;
  }

  static async updateTask(
    taskId: string,
    sessionId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED',
    userNotes?: string
  ): Promise<ApplicationTaskItem> {
    const task = await prisma.applicationTask.findFirst({
      where: { id: taskId, sessionId },
    });
    if (!task) {
      throw new Error('Task not found or access denied');
    }

    const updated = await prisma.applicationTask.update({
      where: { id: taskId },
      data: {
        status,
        userNotes: userNotes !== undefined ? userNotes : task.userNotes,
      },
    });
    return updated as any;
  }
}

