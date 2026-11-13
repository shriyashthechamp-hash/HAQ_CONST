import { prisma } from '../prisma';
import { KnowledgeService } from './knowledgeService';
import { EligibilityService } from './eligibilityService';
import { DocumentService } from './documentService';
import { ToolDefinition } from '../providers/interfaces';
import { Language } from '@haq/shared';

/**
 * Tool definitions exposed to the LLM.
 * SECURITY: sessionId is intentionally omitted from all tool schemas.
 * The authenticated session is injected directly by the backend orchestrator.
 */
export const AGENT_TOOLS_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getWorkerProfile',
      description: 'Fetch the stored worker profile for the current authenticated worker, including name, age, trade, and available proofs.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateWorkerProfile',
      description: 'Update the worker profile with new details discovered during conversation (age, occupation, trade, etc).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Worker full name' },
          age: { type: 'number', description: 'Worker age (18-60)' },
          occupation: { type: 'string', description: 'Trade or job description' },
          yearsOfConstructionWork: { type: 'number', description: 'Experience in years' },
          hasAadhaar: { type: 'boolean' },
          has90DaysCertificate: { type: 'boolean' },
          hasBankPassbook: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchSchemes',
      description: 'Search official verified welfare schemes and benefit rules under MAHABOCW.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Topic or keyword e.g. "education", "safety kit", "pension", "registration"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluateEligibility',
      description: 'Run deterministic eligibility evaluation based on worker age, worked days in last 12 months, and trade.',
      parameters: {
        type: 'object',
        properties: {
          age: { type: 'number', description: 'Worker age' },
          workedDaysLast12Months: { type: 'number', description: 'Days worked in last 12 months (minimum 90)' },
          tradeType: { type: 'string', description: 'Trade e.g. Mason, Helper, Carpenter' },
        },
        required: ['age', 'workedDaysLast12Months'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createApplicationTask',
      description: 'Create an actionable task in the worker checklist e.g. "Collect Form-V signature from contractor".',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Clear task title' },
          description: { type: 'string', description: 'Helpful guidance notes' },
          priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getDocumentChecklist',
      description: 'Get required document checklist status and completion percentage for the current worker.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

export class AgentToolExecutor {
  /**
   * Executes a tool strictly bound to the authenticated session ID.
   * Any sessionId parameter supplied in args is discarded to prevent Confused Deputy attacks.
   */
  static async execute(
    name: string,
    args: Record<string, any>,
    authenticatedSessionId: string,
    language: Language = 'mr'
  ): Promise<any> {
    if (!authenticatedSessionId || typeof authenticatedSessionId !== 'string') {
      throw new Error('Security Error: authenticatedSessionId is required for tool execution.');
    }

    // Strip any hallucinated or injected sessionId from LLM arguments
    const safeArgs = { ...args };
    delete safeArgs.sessionId;

    switch (name) {
      case 'getWorkerProfile': {
        const profile = await prisma.workerProfile.findUnique({
          where: { sessionId: authenticatedSessionId },
        });
        return profile || { status: 'No profile found. Worker profile can be created with consent.' };
      }

      case 'updateWorkerProfile': {
        const updated = await prisma.workerProfile.upsert({
          where: { sessionId: authenticatedSessionId },
          create: { sessionId: authenticatedSessionId, ...safeArgs },
          update: safeArgs,
        });
        return { success: true, profile: updated };
      }

      case 'searchSchemes': {
        const queryLower = (safeArgs.query || '').toLowerCase();
        const sources = await KnowledgeService.getAllSources();
        const matched = sources.filter((s) => {
          const title = s.title.toLowerCase();
          const excerpt = s.excerpt.toLowerCase();
          return (
            title.includes(queryLower) ||
            excerpt.includes(queryLower) ||
            ((queryLower.includes('educat') || queryLower.includes('शिक्षण')) &&
              (title.includes('educat') || excerpt.includes('educat') || title.includes('form') || title.includes('registration')))
          );
        });

        const results = matched.length > 0 ? matched : sources;
        return {
          count: results.length,
          schemes: results.slice(0, 3).map((s) => ({
            id: s.id,
            title: s.title,
            sourceType: s.sourceType,
            excerpt: s.excerpt,
            url: s.url,
            verifiedAt: s.checkedAt,
          })),
        };
      }

      case 'evaluateEligibility': {
        const assessment = await EligibilityService.evaluateEligibility(
          authenticatedSessionId,
          {
            age: safeArgs.age,
            workedDaysLast12Months: safeArgs.workedDaysLast12Months,
            tradeType: safeArgs.tradeType || 'General Construction',
            isMaharashtraResident: true,
          },
          'MAHABOCW_REGISTRATION'
        );
        return {
          status: assessment.assessmentStatus,
          satisfied: (assessment.satisfiedChecks as any[]).map((c: any) => c.ruleKey),
          unresolved: (assessment.unresolvedChecks as any[]).map((c: any) => c.ruleKey),
          failed: (assessment.failedChecks as any[]).map((c: any) => c.ruleKey),
          guidance:
            assessment.assessmentStatus === 'PRELIMINARY_SATISFIED'
              ? 'Worker meets 18-60 age criteria and 90-day minimum work requirement.'
              : 'Worker requires at least 90 days of certified construction work.',
        };
      }

      case 'createApplicationTask': {
        const task = await prisma.applicationTask.create({
          data: {
            sessionId: authenticatedSessionId,
            title: safeArgs.title,
            description: safeArgs.description || '',
            priority: safeArgs.priority || 'MEDIUM',
            status: 'PENDING',
          },
        });
        return { success: true, task };
      }

      case 'getDocumentChecklist': {
        return await DocumentService.getOrCreateChecklist(authenticatedSessionId);
      }

      default:
        throw new Error(`Unknown tool execution requested: ${name}`);
    }
  }
}
