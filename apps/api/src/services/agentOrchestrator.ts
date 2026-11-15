import { prisma } from '../prisma';
import { GroqProvider } from '../providers/groqProvider';
import { SarvamVoiceProvider } from '../providers/sarvamVoiceProvider';
import { AGENT_TOOLS_DEFINITIONS, AgentToolExecutor } from './agentTools';
import { KnowledgeService } from './knowledgeService';
import {
  AgentResponse,
  KnowledgeSourceCitation,
  Language,
} from '@haq/shared';

export class HaqAgentOrchestrator {
  private static groq = new GroqProvider();
  private static sarvam = new SarvamVoiceProvider();

  static async processMessage(params: {
    sessionId: string;
    message: string;
    language?: Language;
    voiceEnabled?: boolean;
  }): Promise<AgentResponse> {
    const { sessionId, message, voiceEnabled } = params;
    const language: Language = params.language || 'mr';

    // 1. Record incoming user message
    await prisma.conversationMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
      },
    });

    // 2. Load context: Worker profile, session details, and recent messages
    const profile = await prisma.workerProfile.findUnique({
      where: { sessionId },
    });

    const recentHistory = await prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const kbExcerpts = await KnowledgeService.getContextExcerpts();
    const availableSources = await KnowledgeService.getAllSources();

    const systemPrompt = `You are HAQ 2.0, the premier voice-first AI Benefits Companion for construction workers in Maharashtra under the Maharashtra Building and Other Construction Workers Welfare Board (MAHABOCW).
Your mission: Help workers understand their rights, verify their eligibility, prepare Form-V certificates, and guide them step-by-step.

LANGUAGE DIRECTIVE:
Always respond directly in ${language === 'mr' ? 'Marathi (मराठी)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}.
Keep your tone warm, respectful, empowering, and simple.

CURRENT WORKER CONTEXT:
${profile ? JSON.stringify(profile) : 'No saved profile yet. You may collect worker details respectfully.'}

VERIFIED MAHABOCW EXCERPTS:
${kbExcerpts}

RULES & SAFETY:
1. Grounding: All facts must strictly align with MAHABOCW rules (e.g. 18-60 age, 90 days work in last 12 months, Form-V from contractor/Gramsevak).
2. Actionable Planning: When the worker asks about welfare schemes (e.g. children education, scholarship, tools kit), use 'searchSchemes' or evaluate their profile.
3. Suggest concrete next steps (e.g. "Get Form-V signed", "Check Aadhaar linkage").
4. Never promise official government sanction or claim you are the government.
5. If the user mentions age, trade, or work days, use 'updateWorkerProfile' or 'evaluateEligibility' tools.

Cite verified source IDs in your reply whenever applicable (MAHABOCW-SRC-REG-01, MAHABOCW-SRC-FORM-05, MAHABOCW-SRC-PORTAL-01, MAHABOCW-SRC-HELP-PUNE).`;

    const chatMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.reverse().map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let finalContent = '';
    const proposedActions: any[] = [];

    if (this.groq.isConfigured()) {
      try {
        let response = await this.groq.chat(chatMessages, AGENT_TOOLS_DEFINITIONS);

        // Handle tool calls loop (up to 2 rounds)
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Push assistant message with tool calls
          chatMessages.push({
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.rawToolCalls || response.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          });

          for (const tc of response.toolCalls) {
            console.log(`[HAQ Agent] Executing Tool: ${tc.name}`, tc.arguments);
            try {
              const toolResult = await AgentToolExecutor.execute(tc.name, tc.arguments, sessionId, language);
              chatMessages.push({
                role: 'tool',
                content: JSON.stringify(toolResult),
                tool_call_id: tc.id,
              });

              proposedActions.push({
                toolName: tc.name,
                parameters: tc.arguments,
                explanation: {
                  en: `Executed ${tc.name}`,
                  mr: `${tc.name} यशस्वीरीत्या चालवले`,
                  hi: `${tc.name} निष्पादित किया`,
                },
                requiresExplicitApproval: false,
                approved: true,
              });
            } catch (err: any) {
              console.warn(`[HAQ Agent Tool Error]: ${tc.name}`, err?.message || err);
              chatMessages.push({
                role: 'tool',
                content: JSON.stringify({ error: err?.message || 'Tool execution error' }),
                tool_call_id: tc.id,
              });
            }
          }

          // Follow-up chat completion with tool results incorporated
          response = await this.groq.chat(chatMessages);
        }

        finalContent = response.content;
      } catch (err: any) {
        console.error('[HAQ Agent LLM Error]:', err?.message || err);
        finalContent = this.getFallbackMessage(message, language);
      }
    } else {
      finalContent = this.getFallbackMessage(message, language);
    }

    // Determine relevant citations
    const citations: KnowledgeSourceCitation[] = [];
    for (const src of availableSources) {
      if (
        finalContent.includes(src.id) ||
        (src.id === 'MAHABOCW-SRC-REG-01' && (finalContent.includes('९० दिवस') || finalContent.includes('90'))) ||
        (src.id === 'MAHABOCW-SRC-FORM-05' && (finalContent.includes('फॉर्म-५') || finalContent.includes('Form-V')))
      ) {
        citations.push({
          sourceId: src.id,
          title: src.title,
          url: src.url,
          excerpt: src.excerpt,
        });
      }
    }

    if (citations.length === 0 && availableSources.length > 0) {
      citations.push({
        sourceId: availableSources[0].id,
        title: availableSources[0].title,
        url: availableSources[0].url,
        excerpt: availableSources[0].excerpt,
      });
    }

    // Record assistant message
    await prisma.conversationMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: finalContent,
        citations: citations as any,
      },
    });

    // Optional Sarvam Voice synthesis if voiceEnabled requested
    let audioBase64: string | undefined;
    let audioFormat: string | undefined;
    if (voiceEnabled && this.sarvam.isConfigured()) {
      try {
        const langCode = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
        const synthRes = await this.sarvam.synthesize(finalContent, langCode);
        audioBase64 = synthRes.audioBase64;
        audioFormat = synthRes.format;
      } catch (vErr) {
        console.warn('[HAQ Agent Sarvam Synthesis Warning]:', vErr);
      }
    }

    const updatedProfile = await prisma.workerProfile.findUnique({
      where: { sessionId },
    });

    const safeWorkerProfile = updatedProfile
      ? {
          name: updatedProfile.name || undefined,
          age: updatedProfile.age || undefined,
          state: updatedProfile.state,
          district: updatedProfile.district,
          occupation: updatedProfile.occupation || undefined,
          yearsOfConstructionWork: updatedProfile.yearsOfConstructionWork || undefined,
          isRegistered: updatedProfile.isRegistered,
          registrationNumber: updatedProfile.registrationNumber || undefined,
          hasAadhaar: updatedProfile.hasAadhaar,
          hasBankPassbook: updatedProfile.hasBankPassbook,
          has90DaysCertificate: updatedProfile.has90DaysCertificate,
          preferredLanguage: updatedProfile.preferredLanguage,
          consentedAt: updatedProfile.consentedAt.toISOString(),
        }
      : undefined;

    return {
      sessionId,
      message: finalContent,
      language,
      citations,
      proposedActions,
      workerProfile: safeWorkerProfile,
      audioBase64,
      audioFormat,
    };
  }

  private static getFallbackMessage(userQuery: string, language: Language): string {
    const qLower = userQuery.toLowerCase();
    const isEducation = qLower.includes('शिक्षण') || qLower.includes('मुलांच्या') || qLower.includes('education');

    if (language === 'mr') {
      if (isEducation) {
        return `महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळाअंतर्गत (MAHABOCW) नोंदणीकृत कामगारांच्या मुलांसाठी शैक्षणिक सहाय्य योजना उपलब्ध आहे.
• पहिली ते सातवी: प्रतिवर्षी ₹२,५००
• आठवी ते दहावी: प्रतिवर्षी ₹५,०००
• ११वी-१२वी व उच्च शिक्षण: ₹१०,००० ते ₹१,००,००० पर्यंत सहाय्य

पात्रतेसाठी अट:
१. तुमचे वय १८ ते ६० दरम्यान असणे आवश्यक आहे.
२. मागील १२ महिन्यांत किमान ९० दिवस बांधकाम काम केलेले असणे व त्याचे कंत्राटदाराकडून फॉर्म-५ प्रमाणपत्र असणे बंधनकारक आहे.

तुम्हाला फॉर्म-५ प्रमाणपत्र तयार करण्यात किंवा पात्रता तपासण्यात मदत हवी आहे का?`;
      }
      return `हक (HAQ) मध्ये आपले स्वागत आहे! मी तुमचा कल्याणकारी योजना मार्गदर्शक आहे.
बांधकाम कामगार नोंदणीसाठी मागील १२ महिन्यांत किमान ९० दिवस काम पूर्ण असणे आणि वय १८ ते ६० दरम्यान असणे आवश्यक आहे.
आपण आपली पात्रता तपासू शकता किंवा आवश्यक कागदपत्रांची चेकलिस्ट पाहू शकता.`;
    }

    return `Welcome to HAQ! I am your AI Welfare Benefits Companion for MAHABOCW construction workers.
Under official rules, you must be aged 18-60 and have worked at least 90 days in the last 12 months on a building site to register and claim educational or safety benefits.`;
  }
}
