import Groq from 'groq-sdk';
import { prisma } from '../prisma';
import {
  AssistantChatResponse,
  KnowledgeSourceCitation,
  Language,
} from '@haq/shared';
import { KnowledgeService } from './knowledgeService';

export interface DraftRequestParams {
  workerName: string;
  contractorName: string;
  siteLocation: string;
  tradeType: string;
  workDatesDescription: string;
  language: Language;
}

export class GroqAssistantService {
  private static groqClient: Groq | null = null;

  private static getClient(): Groq | null {
    const key = process.env.GROQ_API_KEY;
    if (!key || key.trim() === '' || key.startsWith('your_groq_api_key')) {
      return null;
    }
    if (!this.groqClient) {
      this.groqClient = new Groq({ apiKey: key });
    }
    return this.groqClient;
  }

  /**
   * Main conversational assistant grounded in reviewed MAHABOCW sources.
   */
  static async chat(
    sessionId: string,
    userMessage: string,
    language: Language = 'mr'
  ): Promise<AssistantChatResponse> {
    // 1. Log user message in session
    await prisma.conversationMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: userMessage,
      },
    });

    // 2. Retrieve reviewed knowledge base excerpts
    const kbExcerpts = await KnowledgeService.getContextExcerpts();
    const availableSources = await KnowledgeService.getAllSources();

    // 3. Check for Groq client
    const client = this.getClient();
    const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

    if (!client) {
      // Deterministic Demo Fallback
      return this.handleFallback(sessionId, userMessage, language, 'NO_KEY_CONFIGURED');
    }

    try {
      // Fetch recent 4 messages for conversation memory
      const recentHistory = await prisma.conversationMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 4,
      });

      const conversationContext = recentHistory
        .reverse()
        .map((m) => `${m.role === 'user' ? 'Worker' : 'HAQ'}: ${m.content}`)
        .join('\n');

      const systemPrompt = `You are HAQ, an empathetic, respectful, and authoritative benefits assistant for building and construction workers in Pune, Maharashtra.
You guide workers on welfare schemes under the Maharashtra Building and Other Construction Workers Welfare Board (MAHABOCW).

CRITICAL DIRECTIVES:
1. Language: Always respond directly in the user's selected language: ${language === 'mr' ? 'Marathi (मराठी)' : language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}. Keep vocabulary simple, warm, respectful, and easy to understand for workers.
2. Grounding: You must STRICTLY base all factual eligibility rules, documentation requirements, and processes on the verified MAHABOCW source excerpts provided below.
3. Anti-Hallucination: NEVER invent government requirements, portal URLs, fees, or automatic approvals.
4. If a condition is not covered in the excerpts, clearly say "This needs official verification" and recommend contacting the Pune District Labour Office at Swargate or calling the official toll-free helpline 1800-889-2816.
5. In your response, explicitly cite one or more valid Source IDs:
   - MAHABOCW-SRC-REG-01 (for age 18-60, 90-day requirement)
   - MAHABOCW-SRC-FORM-05 (for 90-day Form-V work certificate from contractor/Gramsevak)
   - MAHABOCW-SRC-PORTAL-01 (for mahabocw.in online portal guidelines)
   - MAHABOCW-SRC-HELP-PUNE (for Pune Labour Office at Swargate / Helpline)

VERIFIED MAHABOCW EXCERPTS:
${kbExcerpts}

Format your reply cleanly with helpful bullet points. At the very end of your response, output a single JSON line on its own line:
SOURCES:[{"sourceId":"MAHABOCW-SRC-xxx"}]`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Recent conversation:\n${conversationContext}\n\nCurrent question: ${userMessage}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      const rawResponse = completion.choices[0]?.message?.content || '';

      // Parse citations from model response
      const citations: KnowledgeSourceCitation[] = [];
      let cleanReply = rawResponse;

      const sourcesMatch = rawResponse.match(/SOURCES:(\[.*?\])/);
      if (sourcesMatch && sourcesMatch[1]) {
        try {
          const parsed = JSON.parse(sourcesMatch[1]) as { sourceId: string }[];
          for (const item of parsed) {
            const foundSrc = availableSources.find((s) => s.id === item.sourceId);
            if (foundSrc) {
              citations.push({
                sourceId: foundSrc.id,
                title: foundSrc.title,
                url: foundSrc.url,
                excerpt: foundSrc.excerpt,
              });
            }
          }
        } catch {
          // ignore json parse error
        }
        cleanReply = rawResponse.replace(/SOURCES:\[.*?\]/, '').trim();
      }

      // Default fallback citation if none matched
      if (citations.length === 0) {
        citations.push({
          sourceId: 'MAHABOCW-SRC-REG-01',
          title: 'MAHABOCW Official Registration Criteria',
          url: 'https://mahabocw.in/en/workers-registration/',
          excerpt: 'Official worker criteria: Age 18–60 years and minimum 90 days construction work in past 12 months.',
        });
      }

      // Save assistant message in session
      await prisma.conversationMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: cleanReply,
          citations: citations as any,
        },
      });

      // Suggested follow-ups based on language
      const suggestedFollowUps =
        language === 'mr'
          ? [
              '९० दिवस कामाचे प्रमाणपत्र कसे मिळवायचे?',
              'कंत्राटदारासाठी अर्ज कसा लिहायचा?',
              'पुण्यातील कामगार कार्यालय कुठे आहे?',
            ]
          : language === 'hi'
          ? [
              '९० दिन का कार्य प्रमाण पत्र कैसे प्राप्त करें?',
              'ठेकेदार के लिए आवेदन पत्र कैसे लिखें?',
              'पुणे श्रम कार्यालय कहाँ है?',
            ]
          : [
              'How to get 90-day work certificate?',
              'Draft request for my contractor',
              'Where is the Pune Labour Office located?',
            ];

      return {
        reply: cleanReply,
        language,
        citations,
        isDemoFallback: false,
        modelUsed: model,
        suggestedFollowUps,
      };
    } catch (err: any) {
      console.error('[GroqAssistantService] Groq inference error:', err?.message || err);
      return this.handleFallback(sessionId, userMessage, language, err?.message || 'INFERENCE_ERROR');
    }
  }

  /**
   * Deterministic Fallback using reviewed source material.
   */
  private static async handleFallback(
    sessionId: string,
    userMessage: string,
    language: Language,
    _reason: string
  ): Promise<AssistantChatResponse> {
    const lower = userMessage.toLowerCase();
    let reply = '';
    const citations: KnowledgeSourceCitation[] = [];

    const regCitation: KnowledgeSourceCitation = {
      sourceId: 'MAHABOCW-SRC-REG-01',
      title: 'MAHABOCW Official Registration Criteria',
      url: 'https://mahabocw.in/en/workers-registration/',
      excerpt: 'Age 18 to 60 years and minimum 90 days construction work in preceding 12 months.',
    };

    const form5Citation: KnowledgeSourceCitation = {
      sourceId: 'MAHABOCW-SRC-FORM-05',
      title: 'MAHABOCW Form-V 90-Day Work Certificate',
      url: 'https://mahabocw.in/en/download/',
      excerpt: 'Certificate of 90 days work issued by contractor, Gramsevak, or Municipal authority.',
    };

    const helpCitation: KnowledgeSourceCitation = {
      sourceId: 'MAHABOCW-SRC-HELP-PUNE',
      title: 'MAHABOCW Pune Labour Office & Helpline',
      url: 'https://mahabocw.in/en/help-page/',
      excerpt: 'Swargate PMT Building 4th floor, Pune 411042. Toll-Free: 1800-889-2816.',
    };

    if (lower.includes('90') || lower.includes('काम') || lower.includes('work') || lower.includes('certificate') || lower.includes('प्रमाणपत्र')) {
      citations.push(form5Citation, regCitation);
      if (language === 'mr') {
        reply = `**९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) कसे मिळवावे:**\n\n1. **कंत्राटदाराकडून:** तुम्ही काम केलेल्या साइटवरील नोंदणीकृत कंत्राटदार किंवा विकासक यांच्या लेटरहेडवर फॉर्म-५ प्रमाणित करून घ्या.\n2. **पर्यायी मार्ग (कंत्राटदार उपलब्ध नसल्यास):**\n   - **ग्रामीण भाग:** तुमच्या गावातील **ग्रामसेवक** किंवा ग्रामपंचायत अधिकारी.\n   - **शहरी भाग (पुणे):** पुणे महानगरपालिका (PMC/PCMC) क्षेत्रीय कार्यालय किंवा वॉर्ड अधिकारी.\n   - **नोंदणीकृत कामगार संघटना.**\n3. **आवश्यक माहिती:** अर्जात कामाचे दिवस, साइटचे नाव व स्वरूप स्पष्ट नमूद असावे.`;
      } else if (language === 'hi') {
        reply = `**९० दिन का कार्य प्रमाण पत्र (फॉर्म-५) कैसे प्राप्त करें:**\n\n1. **ठेकेदार से:** जिस साइट पर आपने काम किया है, वहां के पंजीकृत ठेकेदार से फॉर्म-५ पर हस्ताक्षर व मुहर करवाएं।\n2. **वैकल्पिक स्रोत (यदि ठेकेदार उपलब्ध न हो):**\n   - **ग्रामीण क्षेत्र:** स्थानीय **ग्रामसेवक** या ग्राम पंचायत।\n   - **शहरी क्षेत्र (पुणे):** नगर निगम वार्ड अधिकारी / क्षेत्रीय कार्यालय।\n   - **पंजीकृत श्रमिक यूनियन।**\n3. **महत्वपूर्ण:** पत्र में कार्य दिवस (न्यूनतम ९० दिन) और निर्माण का प्रकार स्पष्ट होना चाहिए।`;
      } else {
        reply = `**How to Obtain the 90-Day Work Certificate (Form-V):**\n\n1. **From Contractor/Employer:** Request Form-V signed and stamped on their official letterhead.\n2. **Official Alternatives (if contractor is unavailable):**\n   - **Rural areas:** Local **Gramsevak** or Gram Panchayat.\n   - **Pune Urban areas:** Municipal Ward Officer (PMC/PCMC).\n   - **Registered Construction Trade Unions.**\n3. **Key requirement:** Must confirm at least 90 days of construction work within the past 12 months.`;
      }
    } else if (lower.includes('pune') || lower.includes('swargate') || lower.includes('office') || lower.includes('helpline') || lower.includes('कार्यालय') || lower.includes('मदत')) {
      citations.push(helpCitation);
      if (language === 'mr') {
        reply = `**पुणे जिल्हा कामगार कार्यालय व अधिकृत हेल्पलाइन:**\n\n- **पत्ता:** उप कामगार आयुक्त कार्यालय, पीएमटी बिल्डिंग, ४ था मजला, स्वारगेट, पुणे - ४११०४२.\n- **टोल-फ्री हेल्पलाइन:** १८००-८८९-२८१६ / ०२२-२६५७३८३२\n- **ईमेल:** dy.lc.pune@mahabocw.in\n- **सुविधा:** तुम्ही थेट स्वारगेट कार्यालयातील कामगार मदत कक्षाला भेट देऊ शकता किंवा जवळच्या 'आपले सरकार' केंद्रावर जाऊन मदत घेऊ शकता.`;
      } else if (language === 'hi') {
        reply = `**पुणे जिला श्रम कार्यालय एवं आधिकारिक हेल्पलाइन:**\n\n- **पता:** उप श्रम आयुक्त कार्यालय, पीएमटी बिल्डिंग, चौथी मंजिल, स्वारगेट, पुणे - ४११०४२।\n- **टोल-फ्री हेल्पलाइन:** १८००-८८९-२८१६ / ०२२-२६५७३८३२\n- **ईमेल:** dy.lc.pune@mahabocw.in\n- **सुविधा:** आप स्वारगेट कार्यालय के हेल्पडेस्क या नजदीकी आपले सरकार सेवा केंद्र पर जा सकते हैं।`;
      } else {
        reply = `**Pune District Labour Office & Helpline Information:**\n\n- **Location:** Office of Deputy Labour Commissioner, PMT Building, 4th Floor, Swargate, Pune - 411042.\n- **Toll-Free Helpline:** 1800-889-2816 / 022-26573832.\n- **Assistance:** Walk-in assistance is available at the Swargate Labour Desk or at authorized Aaple Sarkar Seva Kendras in Pune.`;
      }
    } else {
      citations.push(regCitation, form5Citation);
      if (language === 'mr') {
        reply = `**MAHABOCW नोंदणीची मुख्य माहिती:**\n\n- **वयाची मर्यादा:** १८ ते ६० वर्षे.\n- **कामाचा निकष:** मागील १२ महिन्यांत किमान ९० दिवस बांधकाम कामाचा अनुभव.\n- **मुख्य कागदपत्रे:** ९० दिवस प्रमाणपत्र (फॉर्म-५), आधार कार्ड, वयाचा पुरावा, वास्तव्याचा पुरावा आणि बँक पासबुक प्रत.\n- **अधिकृत पोर्टल:** mahabocw.in\n\nतुम्हाला ९० दिवस प्रमाणपत्रासाठी अर्ज तयार करायचा असल्यास मला सांगा!`;
      } else if (language === 'hi') {
        reply = `**MAHABOCW पंजीकरण के मुख्य नियम:**\n\n- **आयु सीमा:** १८ से ६० वर्ष।\n- **कार्य शर्त:** पिछले १२ महीनों में कम से कम ९० दिन निर्माण कार्य।\n- **प्रमुख दस्तावेज:** ९० दिन प्रमाण पत्र (फॉर्म-५), आधार कार्ड, आयु प्रमाण, निवास प्रमाण और बैंक पासबुक।\n- **आधिकारिक पोर्टल:** mahabocw.in\n\nयदि आप ठेकेदार से प्रमाण पत्र मांगने के लिए आवेदन तैयार करना चाहते हैं, तो बताएं!`;
      } else {
        reply = `**Key MAHABOCW Registration Guidelines:**\n\n- **Age Bracket:** 18 to 60 years.\n- **Work Requirement:** Minimum 90 days of construction work during the preceding 12 months.\n- **Primary Documents:** 90-day certificate (Form-V), Aadhaar/ID proof, Age proof, Residence proof, and Bank Passbook copy.\n- **Official Portal:** mahabocw.in\n\nAsk me to draft a request letter to your contractor for Form-V anytime!`;
      }
    }

    // Save fallback response in db
    await prisma.conversationMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: reply,
        citations: citations as any,
      },
    });

    return {
      reply,
      language,
      citations,
      isDemoFallback: true,
      modelUsed: 'demo-fallback-reviewed-kb',
      suggestedFollowUps:
        language === 'mr'
          ? ['९० दिवस प्रमाणपत्र कसे मिळवायचे?', 'पुणे कामगार कार्यालय कुठे आहे?']
          : language === 'hi'
          ? ['९० दिन प्रमाण पत्र कैसे मिलेगा?', 'पुणे श्रम कार्यालय कहाँ है?']
          : ['How to get Form-V?', 'Where is the Pune Labour Office?'],
    };
  }

  /**
   * Generate a professional draft request letter to a contractor for Form-V 90-day certificate.
   */
  static async draftContractorRequest(params: DraftRequestParams): Promise<{
    draftText: string;
    language: Language;
    instructions: string;
  }> {
    const { workerName, contractorName, siteLocation, tradeType, workDatesDescription, language } = params;

    let draftText = '';
    let instructions = '';

    if (language === 'mr') {
      draftText = `प्रति,\nमाननीय ${contractorName || 'कंत्राटदार / साइट इन-चार्ज'},\n${siteLocation || 'पुणे'}.\n\nविषय: महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळासाठी (MAHABOCW) ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) मिळण्याबाबत.\n\nमहोदय,\n\nमी, ${workerName || '[आपले नाव]'}, आपल्या नियंत्रणाखालील बांधकाम साइटवर (${siteLocation || '[साइटचे नाव]'}) ${tradeType || 'बांधकाम कामगार'} म्हणून काम केले आहे.\n\nमी आपल्याकडे ${workDatesDescription || 'मागील १२ महिन्यांत ९० दिवसांपेक्षा जास्त कालावधीत'} प्रामाणिकपणे काम पूर्ण केले आहे. महाराष्ट्र शासनाच्या MAHABOCW कल्याणकारी मंडळाकडे अधिकृत नोंदणी करण्यासाठी नियमानुसार ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) आवश्यक आहे.\n\nकृपया मला अधिकृत फॉर्म-५ वर सही व शिक्का देऊन प्रमाणपत्र देण्याची कृपा करावी, जेणेकरून मला शासकीय कामगार योजनांचा लाभ घेता येईल.\n\nआपला नम्र,\nस्वाक्षरी: ____________\nनाव: ${workerName || '[आपले नाव]'}\nमोबाईल: ____________\nतारीख: ${new Date().toLocaleDateString('mr-IN')}`;

      instructions =
        'हा मसुदा कॉपी करा, कंत्राटदाराला द्या किंवा व्हॉट्सअॅपवर पाठवा. कंत्राटदाराची स्वाक्षरी व शिक्का घेणे आवश्यक आहे.';
    } else if (language === 'hi') {
      draftText = `सेवा में,\nश्रीमान ${contractorName || 'ठेकेदार / साइट प्रभारी'},\n${siteLocation || 'पुणे'}.\n\nविषय: महाराष्ट्र भवन एवं अन्य सन्निर्माण कर्मकार कल्याण बोर्ड (MAHABOCW) हेतु ९० दिन कार्य प्रमाण पत्र (फॉर्म-५) प्रदान करने बाबत।\n\nमहोदय,\n\nसविनय निवेदन है कि मैं, ${workerName || '[आपका नाम]'}, आपके निर्माण स्थल (${siteLocation || '[साइट का नाम]'}) पर ${tradeType || 'निर्माण श्रमिक'} के रूप में कार्यरत रहा हूँ।\n\nमैंने ${workDatesDescription || 'पिछले १२ महीनों में ९० दिनों से अधिक'} कार्य किया है। महाराष्ट्र सरकार के MAHABOCW बोर्ड में आधिकारिक श्रमिक पंजीकरण के लिए ९० दिन के कार्य प्रमाण पत्र (फॉर्म-५) की आवश्यकता है।\n\nअतः आपसे विनम्र अनुरोध है कि मुझे फॉर्म-५ पर हस्ताक्षर एवं मुहर सहित प्रमाण पत्र प्रदान करने की कृपा करें।\n\nभवदीय,\nहस्ताक्षर: ____________\nनाम: ${workerName || '[आपका नाम]'}\nमोबाइल: ____________\nदिनांक: ${new Date().toLocaleDateString('hi-IN')}`;

      instructions =
        'इस ड्राफ्ट को कॉपी करें और अपने ठेकेदार को दें या व्हाट्सएप पर भेजें। ठेकेदार के हस्ताक्षर व मुहर अनिवार्य हैं।';
    } else {
      draftText = `To,\nMr./Ms. ${contractorName || 'Contractor / Site Engineer'},\n${siteLocation || 'Pune'}.\n\nSubject: Request for 90-Day Construction Work Certificate (Form-V) for MAHABOCW Registration.\n\nDear Sir/Madam,\n\nI, ${workerName || '[Worker Name]'}, worked as a ${tradeType || 'Construction Worker'} at your construction site (${siteLocation || '[Site Location]'}).\n\nDuring this period (${workDatesDescription || 'over the past 12 months, completing more than 90 working days'}), I performed building construction work under your supervision. Under the rules of the Maharashtra Building and Other Construction Workers Welfare Board (MAHABOCW), a 90-day work certificate (Form-V) is required for official registration.\n\nI kindly request you to issue and certify Form-V with your signature and stamp so that I may complete my official registration.\n\nSincerely,\nSignature: ____________\nName: ${workerName || '[Worker Name]'}\nContact: ____________\nDate: ${new Date().toLocaleDateString('en-IN')}`;

      instructions =
        'Copy this text and share it with your contractor or site supervisor to request the signed Form-V certificate.';
    }

    return {
      draftText,
      language,
      instructions,
    };
  }
}
