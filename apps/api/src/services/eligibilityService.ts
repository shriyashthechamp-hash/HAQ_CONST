import { prisma } from '../prisma';
import {
  AssessmentStatus,
  EligibilityAssessmentResult,
  EligibilityCheckResult,
  QuestionnaireAnswers,
} from '@haq/shared';
import { KnowledgeService } from './knowledgeService';

export class EligibilityService {
  static async evaluateEligibility(
    sessionId: string,
    answers: QuestionnaireAnswers,
    benefitType = 'MAHABOCW_REGISTRATION'
  ): Promise<EligibilityAssessmentResult> {
    const satisfiedChecks: EligibilityCheckResult[] = [];
    const unresolvedChecks: EligibilityCheckResult[] = [];
    const failedChecks: EligibilityCheckResult[] = [];

    const regCitation = await KnowledgeService.getCitation('MAHABOCW-SRC-REG-01');
    const form5Citation = await KnowledgeService.getCitation('MAHABOCW-SRC-FORM-05');
    const portalCitation = await KnowledgeService.getCitation('MAHABOCW-SRC-PORTAL-01');

    // 1. AGE CHECK (18 to 60)
    const ageVal = answers.age !== undefined && answers.age !== '' ? Number(answers.age) : NaN;
    if (!isNaN(ageVal)) {
      if (ageVal >= 18 && ageVal <= 60) {
        satisfiedChecks.push({
          ruleKey: 'RULE_AGE_RANGE',
          title: {
            en: 'Age Eligibility (18–60 Years)',
            mr: 'वयाची पात्रता (१८ ते ६० वर्षे)',
            hi: 'आयु पात्रता (१८ से ६० वर्ष)',
          },
          status: 'SATISFIED',
          explanation: {
            en: `Your reported age (${ageVal} years) satisfies the official requirement of 18 to 60 years.`,
            mr: `तुमचे वय (${ageVal} वर्षे) १८ ते ६० वर्षे या अधिकृत अटीची पूर्तता करते.`,
            hi: `आपकी आयु (${ageVal} वर्ष) १८ से ६० वर्ष की आधिकारिक शर्त पूरी करती है।`,
          },
          sourceCitation: regCitation,
          nextStepRecommendation: {
            en: 'Prepare proof of age (School LC, Birth Certificate, or Aadhaar with full birthdate).',
            mr: 'वयाचा पुरावा (शाळा सोडल्याचा दाखला, जन्म दाखला किंवा पूर्ण जन्मतारीख असलेले आधार) तयार ठेवा.',
            hi: 'आयु प्रमाण पत्र (स्कूल टीसी, जन्म प्रमाण पत्र या पूर्ण जन्मतिथि वाला आधार) तैयार रखें।',
          },
        });
      } else {
        failedChecks.push({
          ruleKey: 'RULE_AGE_RANGE',
          title: {
            en: 'Age Eligibility (18–60 Years)',
            mr: 'वयाची पात्रता (१८ ते ६० वर्षे)',
            hi: 'आयु पात्रता (१८ से ६० वर्ष)',
          },
          status: 'FAILED',
          explanation: {
            en: `Reported age (${ageVal}) falls outside the official eligibility bracket of 18–60 years.`,
            mr: `नोंदवलेले वय (${ageVal}) १८ ते ६० या अधिकृत वयोगटाबाहेर आहे.`,
            hi: `दर्ज की गई आयु (${ageVal}) १८ से ६० वर्ष के आधिकारिक दायरे से बाहर है।`,
          },
          sourceCitation: regCitation,
          nextStepRecommendation: {
            en: 'Verify the birthdate on your legal documents or consult the Pune Labour Office for exceptions.',
            mr: 'तुमच्या अधिकृत कागदपत्रांवरील जन्मतारीख तपासा किंवा पुणे कामगार कार्यालयाशी संपर्क साधा.',
            hi: 'अपने आधिकारिक दस्तावेजों पर जन्मतिथि सत्यापित करें या पुणे श्रम कार्यालय से परामर्श लें।',
          },
        });
      }
    } else {
      unresolvedChecks.push({
        ruleKey: 'RULE_AGE_RANGE',
        title: {
          en: 'Age Verification Needed',
          mr: 'वय पडताळणी आवश्यक',
          hi: 'आयु सत्यापन आवश्यक',
        },
        status: 'UNRESOLVED',
        explanation: {
          en: 'Age was not provided or could not be determined.',
          mr: 'वय नमूद केलेले नाही किंवा निश्चित करता आले नाही.',
          hi: 'आयु दर्ज नहीं की गई है या निर्धारित नहीं हो सकी।',
        },
        sourceCitation: regCitation,
        nextStepRecommendation: {
          en: 'Confirm you are between 18 and 60 years old with a government proof of age.',
          mr: 'सरकारी वयाच्या पुराव्याद्वारे तुमचे वय १८ ते ६० वर्षांच्या दरम्यान असल्याचे तपासा.',
          hi: 'सरकारी आयु प्रमाण के माध्यम से पुष्टि करें कि आपकी आयु १८ से ६० वर्ष के बीच है।',
        },
      });
    }

    // 2. 90 DAYS CONSTRUCTION WORK CHECK
    const daysVal =
      answers.workedDaysLast12Months !== undefined && answers.workedDaysLast12Months !== ''
        ? Number(answers.workedDaysLast12Months)
        : NaN;

    if (!isNaN(daysVal)) {
      if (daysVal >= 90) {
        satisfiedChecks.push({
          ruleKey: 'RULE_90_DAYS_WORK',
          title: {
            en: '90-Day Construction Work Requirement',
            mr: '९० दिवस बांधकाम कामाची अट',
            hi: '९० दिन निर्माण कार्य की आवश्यकता',
          },
          status: 'SATISFIED',
          explanation: {
            en: `You reported ${daysVal} days of work in the preceding 12 months, which meets or exceeds the 90-day threshold.`,
            mr: `तुम्ही मागील १२ महिन्यांत ${daysVal} दिवस काम केल्याचे नमूद केले आहे, जे ९० दिवसांच्या निकषाची पूर्तता करते.`,
            hi: `आपने पिछले १२ महीनों में ${daysVal} दिन काम की जानकारी दी है, जो ९० दिन की न्यूनतम शर्त पूरी करता है।`,
          },
          sourceCitation: form5Citation,
          nextStepRecommendation: {
            en: 'Obtain a signed Form-V 90-day certificate from your contractor, Gramsevak, or Municipal authority.',
            mr: 'कंत्राटदार, ग्रामसेवक किंवा महानगरपालिकेकडून स्वाक्षरी केलेले फॉर्म-५ प्रमाणपत्र मिळवा.',
            hi: 'अपने ठेकेदार, ग्रामसेवक या नगर पालिका से हस्ताक्षरित फॉर्म-५ प्रमाण पत्र प्राप्त करें।',
          },
        });
      } else {
        failedChecks.push({
          ruleKey: 'RULE_90_DAYS_WORK',
          title: {
            en: 'Minimum 90-Day Work Requirement',
            mr: 'किमान ९० दिवस कामाची अट',
            hi: 'न्यूनतम ९० दिन कार्य आवश्यकता',
          },
          status: 'FAILED',
          explanation: {
            en: `Current reported work (${daysVal} days) is less than the mandatory 90 days required by MAHABOCW within the last 12 months.`,
            mr: `सध्या नोंदवलेले काम (${daysVal} दिवस) मागील १२ महिन्यांतील बंधनकारक ९० दिवसांपेक्षा कमी आहे.`,
            hi: `वर्तमान कार्य (${daysVal} दिन) पिछले १२ महीनों में आवश्यक ९० दिनों से कम है।`,
          },
          sourceCitation: form5Citation,
          nextStepRecommendation: {
            en: 'Continue building work until you reach 90 cumulative days across active sites, then request a certificate.',
            mr: 'एकूण ९० दिवस पूर्ण होईपर्यंत बांधकाम काम सुरू ठेवा, त्यानंतर कामाचे प्रमाणपत्र मिळवा.',
            hi: 'कुल ९० दिन पूरे होने तक निर्माण कार्य जारी रखें, फिर कार्य प्रमाण पत्र का अनुरोध करें।',
          },
        });
      }
    } else {
      unresolvedChecks.push({
        ruleKey: 'RULE_90_DAYS_WORK',
        title: {
          en: '90-Day Work Evidence Verification',
          mr: '९० दिवस कामाच्या पुराव्याची पडताळणी आवश्यक',
          hi: '९० दिन कार्य प्रमाण का सत्यापन आवश्यक',
        },
        status: 'UNRESOLVED',
        explanation: {
          en: 'Work duration in the preceding 12 months needs confirmation through contractor or site records.',
          mr: 'मागील १२ महिन्यांतील कामाचे दिवस कंत्राटदार किंवा साइट नोंदींद्वारे निश्चित करणे बाकी आहे.',
          hi: 'पिछले १२ महीनों में कार्य दिवसों की संख्या ठेकेदार या साइट रिकॉर्ड द्वारा पुष्ट की जानी है।',
        },
        sourceCitation: form5Citation,
        nextStepRecommendation: {
          en: 'Count your working days across all sites in the last 12 months and prepare to request Form-V.',
          mr: 'मागील १२ महिन्यांत सर्व साइट्सवरील कामाच्या दिवसांची मोजणी करा आणि फॉर्म-५ ची तयारी करा.',
          hi: 'पिछले १२ महीनों में सभी साइटों पर अपने कार्य दिवसों की गणना करें और फॉर्म-५ का अनुरोध तैयार करें।',
        },
      });
    }

    // 3. MAHARASHTRA RESIDENCY CHECK
    const isResident =
      answers.isMaharashtraResident === true ||
      answers.isMaharashtraResident === 'true' ||
      answers.isMaharashtraResident === 'yes';

    if (answers.isMaharashtraResident !== undefined && answers.isMaharashtraResident !== '') {
      if (isResident) {
        satisfiedChecks.push({
          ruleKey: 'RULE_MAHARASHTRA_RESIDENCY',
          title: {
            en: 'Maharashtra State / Pune Jurisdiction',
            mr: 'महाराष्ट्र राज्य / पुणे कार्यक्षेत्र',
            hi: 'महाराष्ट्र राज्य / पुणे कार्यक्षेत्र',
          },
          status: 'SATISFIED',
          explanation: {
            en: 'You are resident and working within Maharashtra state jurisdiction.',
            mr: 'तुम्ही महाराष्ट्र राज्याच्या कार्यक्षेत्रात वास्तव्यास आहात आणि काम करत आहात.',
            hi: 'आप महाराष्ट्र राज्य के अधिकार क्षेत्र में निवास और कार्य कर रहे हैं।',
          },
          sourceCitation: portalCitation,
          nextStepRecommendation: {
            en: 'Keep your local Pune address proof ready (ration card, light bill, or rental agreement).',
            mr: 'पुण्यातील वास्तव्याचा पुरावा (रेशन कार्ड, वीज बिल किंवा भाडे करार) तयार ठेवा.',
            hi: 'पुणे का स्थानीय पता प्रमाण (राशन कार्ड, बिजली बिल या किराया अनुबंध) तैयार रखें।',
          },
        });
      } else {
        unresolvedChecks.push({
          ruleKey: 'RULE_MAHARASHTRA_RESIDENCY',
          title: {
            en: 'Interstate / Migrant Worker Verification',
            mr: 'आंतरराज्य / स्थलांतरित कामगार पडताळणी',
            hi: 'अंतरराज्यीय / प्रवासी श्रमिक सत्यापन',
          },
          status: 'UNRESOLVED',
          explanation: {
            en: 'Migrant construction workers working in Maharashtra can register if site work in Maharashtra exceeds 90 days.',
            mr: 'महाराष्ट्रात काम करणारे स्थलांतरित कामगार ९० दिवसांचे काम पूर्ण असल्यास नोंदणी करू शकतात.',
            hi: 'महाराष्ट्र में काम करने वाले प्रवासी श्रमिक ९० दिन पूरे होने पर पंजीकरण करा सकते हैं।',
          },
          sourceCitation: portalCitation,
          nextStepRecommendation: {
            en: 'Obtain work proof from your Pune site contractor confirming work performed in Maharashtra.',
            mr: 'पुण्यातील कामाच्या साइटवरील कंत्राटदाराकडून महाराष्ट्रात काम केल्याचे प्रमाणपत्र मिळवा.',
            hi: 'पुणे साइट ठेकेदार से महाराष्ट्र में कार्य करने का प्रमाण प्राप्त करें।',
          },
        });
      }
    } else {
      unresolvedChecks.push({
        ruleKey: 'RULE_MAHARASHTRA_RESIDENCY',
        title: {
          en: 'Residency Verification',
          mr: 'वास्तव्याची पडताळणी',
          hi: 'निवास सत्यापन',
        },
        status: 'UNRESOLVED',
        explanation: {
          en: 'Current residential status or site location in Maharashtra requires verification.',
          mr: 'महाराष्ट्रातील सध्याच्या वास्तव्याची किंवा कामाच्या ठिकाणाची पडताळणी आवश्यक आहे.',
          hi: 'महाराष्ट्र में वर्तमान निवास या कार्यस्थल की पुष्टि आवश्यक है।',
        },
        sourceCitation: portalCitation,
        nextStepRecommendation: {
          en: 'Ensure you have documentation showing your current Pune stay or site employment.',
          mr: 'तुमच्याकडे पुण्यात राहण्याचा किंवा कामाचा पत्ता दर्शवणारा पुरावा असल्याची खात्री करा.',
          hi: 'सुनिश्चित करें कि आपके पास पुणे में रहने या काम करने का पता प्रमाण है।',
        },
      });
    }

    // 4. CONSTRUCTION TRADE CHECK
    if (answers.tradeType && answers.tradeType.trim() !== '') {
      satisfiedChecks.push({
        ruleKey: 'RULE_CONSTRUCTION_TRADE',
        title: {
          en: 'Eligible Construction Trade',
          mr: 'पात्र बांधकाम व्यवसाय श्रेणी',
          hi: 'पात्र निर्माण कार्य श्रेणी',
        },
        status: 'SATISFIED',
        explanation: {
          en: `Selected trade (${answers.tradeType}) falls under the building and other construction worker schedules.`,
          mr: `निवडलेली व्यवसाय श्रेणी (${answers.tradeType}) इमारत व इतर बांधकाम कामगार कक्षेत येते.`,
          hi: `चुनी गई कार्य श्रेणी (${answers.tradeType}) भवन और अन्य निर्माण श्रमिक अनुसूची के अंतर्गत आती है।`,
        },
        sourceCitation: regCitation,
        nextStepRecommendation: {
          en: 'Ensure your 90-day certificate explicitly mentions this trade role.',
          mr: 'तुमच्या ९० दिवस प्रमाणपत्रात हा व्यवसाय स्पष्ट नमूद असल्याची खात्री करा.',
          hi: 'सुनिश्चित करें कि आपके ९० दिन के प्रमाण पत्र में यह कार्य स्पष्ट रूप से लिखा हो।',
        },
      });
    }

    // OVERALL ASSESSMENT STATUS
    let assessmentStatus: AssessmentStatus = 'NEEDS_VERIFICATION';
    if (failedChecks.length > 0) {
      assessmentStatus = 'INELIGIBLE';
    } else if (
      satisfiedChecks.some((c) => c.ruleKey === 'RULE_AGE_RANGE') &&
      satisfiedChecks.some((c) => c.ruleKey === 'RULE_90_DAYS_WORK') &&
      unresolvedChecks.length === 0
    ) {
      assessmentStatus = 'PRELIMINARY_SATISFIED';
    } else {
      assessmentStatus = 'NEEDS_VERIFICATION';
    }

    const disclaimer = {
      en: 'HAQ provides preliminary guidance based on reviewed MAHABOCW rules (v2024.1). This is NOT an official government approval or guaranteed grant. Official registration is determined solely by the Maharashtra BOCW Welfare Board upon formal application.',
      mr: 'HAQ हे MAHABOCW अधिकृत नियमांवर आधारित प्राथमिक मार्गदर्शन देते. ही कोणतीही अधिकृत सरकारी मंजुरी किंवा हमी नाही. अंतिम नोंदणीचा निर्णय केवळ महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळाद्वारे घेतला जातो.',
      hi: 'HAQ आधिकारिक MAHABOCW नियमों के आधार पर प्रारंभिक मार्गदर्शन प्रदान करता है। यह कोई आधिकारिक सरकारी स्वीकृति नहीं है। अंतिम निर्णय केवल महाराष्ट्र बीओसीडब्ल्यू कल्याण बोर्ड द्वारा लिया जाता है।',
    };

    // Save in database
    const saved = await prisma.eligibilityAssessment.create({
      data: {
        sessionId,
        benefitType,
        answers: answers as any,
        assessmentStatus,
        ruleVersion: 'v2024.1',
        satisfiedChecks: satisfiedChecks as any,
        unresolvedChecks: unresolvedChecks as any,
        failedChecks: failedChecks as any,
      },
    });

    return {
      id: saved.id,
      sessionId,
      benefitType,
      assessmentStatus,
      ruleVersion: 'v2024.1',
      satisfiedChecks,
      unresolvedChecks,
      failedChecks,
      disclaimer,
      evaluatedAt: saved.createdAt.toISOString(),
    };
  }
}
