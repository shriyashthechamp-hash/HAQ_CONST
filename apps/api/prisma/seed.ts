import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const KNOWLEDGE_SOURCES = [
  {
    id: 'MAHABOCW-SRC-REG-01',
    title: 'MAHABOCW Official Worker Registration Criteria',
    url: 'https://mahabocw.in/en/workers-registration/',
    sourceType: 'OFFICIAL_PORTAL',
    checkedAt: new Date('2024-10-01T00:00:00Z'),
    version: '2024.1',
    reviewStatus: 'REVIEWED' as const,
    excerpt:
      'A building or other construction worker who has completed eighteen (18) years of age, but has not completed sixty (60) years of age, and who has been engaged in any building or other construction work for not less than ninety (90) days during the preceding twelve (12) months, shall be eligible for registration as a beneficiary of the Board.',
    reviewerNotes:
      'Verified directly against Section 12 of Building and Other Construction Workers (RECS) Act, 1996 and Maharashtra Rules on mahabocw.in.',
  },
  {
    id: 'MAHABOCW-SRC-FORM-05',
    title: 'MAHABOCW Form-V (Certificate of 90 Days Work)',
    url: 'https://mahabocw.in/en/download/',
    sourceType: 'OFFICIAL_FORM',
    checkedAt: new Date('2024-10-01T00:00:00Z'),
    version: '2024.1',
    reviewStatus: 'REVIEWED' as const,
    excerpt:
      'Form-V: Certificate of employment for 90 days. Can be issued by a registered contractor/employer, Gramsevak (in rural areas), Chief Officer/Municipal authority (in urban areas), or registered trade union.',
    reviewerNotes:
      'Crucial document. Workers lacking direct contractor access can seek certification through local Gramsevak or designated labour inspector.',
  },
  {
    id: 'MAHABOCW-SRC-PORTAL-01',
    title: 'Maharashtra BOCW Portal & Citizen Services Guidelines',
    url: 'https://mahabocw.in/en/home/',
    sourceType: 'OFFICIAL_PORTAL',
    checkedAt: new Date('2024-10-01T00:00:00Z'),
    version: '2024.1',
    reviewStatus: 'REVIEWED' as const,
    excerpt:
      'Online citizen workflow requires document upload, biometric verification/Aadhaar OTP, payment of Rs 25 registration fee (and Rs 12 annual subscription), and generation of 14-digit BOCW registration card.',
    reviewerNotes:
      'HAQ is an advisory and preparation tool. Final submission must occur on the official portal mahabocw.in or at citizen facilitation centres (CSC/Aaple Sarkar).',
  },
  {
    id: 'MAHABOCW-SRC-HELP-PUNE',
    title: 'MAHABOCW Pune District Executive Labour Office & Helpline',
    url: 'https://mahabocw.in/en/help-page/',
    sourceType: 'HELPLINE_DIRECTORY',
    checkedAt: new Date('2024-10-01T00:00:00Z'),
    version: '2024.1',
    reviewStatus: 'REVIEWED' as const,
    excerpt:
      'Statewide Toll-Free Helpline: 1800-889-2816 / 022-26573832. Pune Office: Office of Deputy Labour Commissioner, PMT Building, 4th Floor, Swargate, Pune - 411042. Email: dy.lc.pune@mahabocw.in.',
    reviewerNotes:
      'Physical facilitation is available at Swargate Labour Office or authorized Aaple Sarkar Seva Kendras in Pune district.',
  },
];

export const BENEFIT_RULES = [
  {
    id: 'rule-age-18-60',
    benefitType: 'MAHABOCW_REGISTRATION',
    ruleKey: 'RULE_AGE_RANGE',
    condition: 'Age must be between 18 and 60 years old at registration date',
    applicableWhen: 'All construction worker registration applicants',
    sourceId: 'MAHABOCW-SRC-REG-01',
    version: 'v2024.1',
    reviewStatus: 'REVIEWED' as const,
  },
  {
    id: 'rule-90-days-work',
    benefitType: 'MAHABOCW_REGISTRATION',
    ruleKey: 'RULE_90_DAYS_WORK',
    condition: 'Worked minimum 90 days in building/construction during past 12 months',
    applicableWhen: 'All construction worker registration applicants',
    sourceId: 'MAHABOCW-SRC-REG-01',
    version: 'v2024.1',
    reviewStatus: 'REVIEWED' as const,
  },
  {
    id: 'rule-mh-resident',
    benefitType: 'MAHABOCW_REGISTRATION',
    ruleKey: 'RULE_MAHARASHTRA_RESIDENCY',
    condition: 'Resident of Maharashtra or working in Maharashtra on construction sites',
    applicableWhen: 'Registration under Maharashtra state board',
    sourceId: 'MAHABOCW-SRC-PORTAL-01',
    version: 'v2024.1',
    reviewStatus: 'REVIEWED' as const,
  },
  {
    id: 'rule-trade-eligible',
    benefitType: 'MAHABOCW_REGISTRATION',
    ruleKey: 'RULE_CONSTRUCTION_TRADE',
    condition: 'Employed in recognized building or other construction activities (mason, carpenter, bar-bender, electrician, plumber, helper, etc.)',
    applicableWhen: 'Building and construction workers definition',
    sourceId: 'MAHABOCW-SRC-REG-01',
    version: 'v2024.1',
    reviewStatus: 'REVIEWED' as const,
  },
];

export const DOCUMENT_REQUIREMENTS = [
  {
    id: 'req-90-days-cert',
    benefitType: 'MAHABOCW_REGISTRATION',
    documentKey: 'DOC_90_DAYS_CERT',
    title: {
      en: '90-Day Work Certificate (Form-V)',
      mr: '९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५)',
      hi: '९० दिन कार्य प्रमाणपत्र (फॉर्म-५)',
    },
    description: {
      en: 'Proof that you worked at least 90 days in construction in the last 12 months. Signed by your contractor, Gramsevak, or Municipal authority.',
      mr: 'मागील १२ महिन्यांत बांधकाम क्षेत्रात किमान ९० दिवस काम केल्याचा पुरावा. कंत्राटदार, ग्रामसेवक किंवा महानगरपालिका अधिकाऱ्याची स्वाक्षरी.',
      hi: 'पिछले १२ महीनों में निर्माण कार्य में कम से कम ९० दिन काम करने का प्रमाण। ठेकेदार, ग्रामसेवक या नगर पालिका द्वारा हस्ताक्षरित।',
    },
    ruleVersion: 'v2024.1',
    sourceId: 'MAHABOCW-SRC-FORM-05',
    reviewStatus: 'REVIEWED' as const,
    acceptedAlternatives: {
      en: [
        'Contractor/Developer Certificate on Letterhead',
        'Gramsevak/Gram Panchayat Certificate (rural areas)',
        'Chief Officer / Municipal ward officer certificate',
        'Registered Trade Union Certificate',
      ],
      mr: [
        'कंत्राटदाराच्या लेटरहेडवर प्रमाणपत्र',
        'ग्रामसेवक / ग्रामपंचायत प्रमाणपत्र (ग्रामीण भागासाठी)',
        'मुख्याधिकारी / वॉर्ड अधिकारी प्रमाणपत्र (शहरी भागासाठी)',
        'नोंदणीकृत कामगार संघटनेचे प्रमाणपत्र',
      ],
      hi: [
        'ठेकेदार के लेटरहेड पर कार्य प्रमाण',
        'ग्रामसेवक / ग्राम पंचायत प्रमाण पत्र',
        'नगर पालिका अधिकारी प्रमाण पत्र',
        'पंजीकृत श्रमिक संघ प्रमाण पत्र',
      ],
    },
    formDownloadUrl: 'https://mahabocw.in/en/download/',
  },
  {
    id: 'req-identity-proof',
    benefitType: 'MAHABOCW_REGISTRATION',
    documentKey: 'DOC_IDENTITY_PROOF',
    title: {
      en: 'Official Identity Proof',
      mr: 'अधिकृत ओळख पुरावा',
      hi: 'आधिकारिक पहचान प्रमाण',
    },
    description: {
      en: 'Government-issued photo identification to verify your name and legal identity.',
      mr: 'आपले नाव आणि ओळख प्रमाणित करणारा सरकारी फोटो ओळख पुरावा.',
      hi: 'आपका नाम और पहचान सत्यापित करने वाला सरकारी फोटो पहचान पत्र।',
    },
    ruleVersion: 'v2024.1',
    sourceId: 'MAHABOCW-SRC-REG-01',
    reviewStatus: 'REVIEWED' as const,
    acceptedAlternatives: {
      en: ['Aadhaar Card', 'Voter ID Card (Election Card)', 'PAN Card', 'Driving Licence'],
      mr: ['आधार कार्ड', 'मतदान ओळखपत्र', 'पॅन कार्ड', 'वाहन चालवण्याचा परवाना'],
      hi: ['आधार कार्ड', 'मतदाता पहचान पत्र', 'पैन कार्ड', 'ड्राइविंग लाइसेंस'],
    },
    formDownloadUrl: undefined,
  },
  {
    id: 'req-age-proof',
    benefitType: 'MAHABOCW_REGISTRATION',
    documentKey: 'DOC_AGE_PROOF',
    title: {
      en: 'Proof of Age (18–60 Years)',
      mr: 'वयाचा पुरावा (१८ ते ६० वर्षे)',
      hi: 'आयु का प्रमाण (१८ से ६० वर्ष)',
    },
    description: {
      en: 'Document verifying you are between 18 and 60 years old at the time of application.',
      mr: 'अर्जाच्या वेळी आपले वय १८ ते ६० वर्षांच्या दरम्यान असल्याचे प्रमाणित करणारा पुरावा.',
      hi: 'आवेदन के समय आपकी आयु १८ से ६० वर्ष के बीच होने का प्रमाण।',
    },
    ruleVersion: 'v2024.1',
    sourceId: 'MAHABOCW-SRC-REG-01',
    reviewStatus: 'REVIEWED' as const,
    acceptedAlternatives: {
      en: [
        'School Leaving Certificate (TC)',
        'Birth Certificate',
        'Aadhaar Card (with full DOB)',
        'Government Hospital Medical Officer Age Certificate',
      ],
      mr: [
        'शाळा सोडल्याचा दाखला (TC)',
        'जन्म दाखला',
        'आधार कार्ड (पूर्ण जन्मतारीख असलेले)',
        'सरकारी वैद्यकीय अधिकाऱ्याचे वय प्रमाणपत्र',
      ],
      hi: [
        'स्कूल छोड़ने का प्रमाण पत्र',
        'जन्म प्रमाण पत्र',
        'आधार कार्ड (पूर्ण जन्मतिथि सहित)',
        'सरकारी चिकित्सा अधिकारी आयु प्रमाण पत्र',
      ],
    },
    formDownloadUrl: undefined,
  },
  {
    id: 'req-residence-proof',
    benefitType: 'MAHABOCW_REGISTRATION',
    documentKey: 'DOC_RESIDENCE_PROOF',
    title: {
      en: 'Maharashtra Residence Proof',
      mr: 'महाराष्ट्रातील वास्तव्याचा पुरावा',
      hi: 'महाराष्ट्र में निवास का प्रमाण',
    },
    description: {
      en: 'Proof of address showing current residence or stay in Pune/Maharashtra.',
      mr: 'पुणे किंवा महाराष्ट्रातील सध्याच्या वास्तव्याचा पत्ता दर्शवणारा पुरावा.',
      hi: 'पुणे या महाराष्ट्र में वर्तमान निवास का पता दर्शाने वाला प्रमाण।',
    },
    ruleVersion: 'v2024.1',
    sourceId: 'MAHABOCW-SRC-PORTAL-01',
    reviewStatus: 'PROVISIONAL' as const, // Illustrative requirement; interstate workers on MH sites can register with site employment proof
    acceptedAlternatives: {
      en: ['Ration Card', 'Electricity Bill (recent)', 'Voter ID Address', 'Domicile Certificate', 'Rental Agreement with Police NOC'],
      mr: ['रेशन कार्ड', 'वीज बिल', 'मतदान ओळखपत्र पत्ता', 'अधिवास प्रमाणपत्र', 'भाडे करारनामा'],
      hi: ['राशन कार्ड', 'बिजली बिल', 'मतदाता पहचान पत्र पता', 'मूल निवास प्रमाण पत्र', 'किराया अनुबंध'],
    },
    formDownloadUrl: undefined,
  },
  {
    id: 'req-passport-photos',
    benefitType: 'MAHABOCW_REGISTRATION',
    documentKey: 'DOC_PASSPORT_PHOTOS',
    title: {
      en: '3 Passport Size Photographs',
      mr: '३ पासपोर्ट साईझ फोटो',
      hi: '३ पासपोर्ट साइज फोटो',
    },
    description: {
      en: 'Recent passport-sized color photos for the BOCW smart identity card and registration register.',
      mr: 'कामगार स्मार्ट ओळखपत्र आणि नोंदणी पुस्तकासाठी अलिकडील पासपोर्ट आकाराचे रंगीत फोटो.',
      hi: 'श्रमिक स्मार्ट पहचान पत्र और पंजीकरण के लिए हालिया पासपोर्ट साइज रंगीन फोटो।',
    },
    ruleVersion: 'v2024.1',
    sourceId: 'MAHABOCW-SRC-REG-01',
    reviewStatus: 'REVIEWED' as const,
    acceptedAlternatives: {
      en: ['3 Color passport photos (recent, clear face)'],
      mr: ['३ रंगीत पासपोर्ट फोटो (स्पष्ट चेहरा)'],
      hi: ['३ रंगीन पासपोर्ट फोटो (स्पष्ट चेहरा)'],
    },
    formDownloadUrl: undefined,
  },
  {
    id: 'req-bank-passbook',
    benefitType: 'MAHABOCW_REGISTRATION',
    documentKey: 'DOC_BANK_PASSBOOK',
    title: {
      en: 'Bank Passbook Copy (for DBT Benefits)',
      mr: 'बँक पासबुक प्रत (थेट लाभासाठी)',
      hi: 'बैंक पासबुक प्रति (डीबीटी लाभ के लिए)',
    },
    description: {
      en: 'Copy of bank passbook for direct welfare financial assistance disbursals (scholarships, maternity, safety kit grants).',
      mr: 'थेट आर्थिक लाभासाठी खाते क्रमांक आणि IFSC कोड स्पष्ट दिसणारी बँक पासबुक प्रत.',
      hi: 'प्रत्यक्ष वित्तीय सहायता के लिए खाता संख्या और IFSC कोड वाली बैंक पासबुक की प्रति।',
    },
    ruleVersion: 'v2024.1',
    sourceId: 'MAHABOCW-SRC-PORTAL-01',
    reviewStatus: 'PROVISIONAL' as const, // Scheme disbursal prerequisite rather than statutory registration barrier
    acceptedAlternatives: {
      en: ['First page of Bank Passbook', 'Cancelled Cheque leaf with account holder name', 'Official Bank Statement with seal'],
      mr: ['बँक पासबुकचे पहिले पान', 'खातेदाराचे नाव असलेला कॅन्सल्ड चेक', 'बँक स्टेटमेंट'],
      hi: ['बैंक पासबुक का पहला पृष्ठ', 'खाताधारक के नाम वाला कैंसिल्ड चेक', 'बैंक स्टेटमेंट'],
    },
    formDownloadUrl: undefined,
  },
];

async function main() {
  console.log('--- Seeding MAHABOCW Verified Knowledge Base ---');

  for (const src of KNOWLEDGE_SOURCES) {
    await prisma.knowledgeSource.upsert({
      where: { id: src.id },
      update: src,
      create: src,
    });
  }
  console.log(`✓ Seeded ${KNOWLEDGE_SOURCES.length} reviewed Knowledge Sources.`);

  for (const rule of BENEFIT_RULES) {
    await prisma.benefitRule.upsert({
      where: { id: rule.id },
      update: rule,
      create: rule,
    });
  }
  console.log(`✓ Seeded ${BENEFIT_RULES.length} versioned Benefit Rules.`);

  for (const req of DOCUMENT_REQUIREMENTS) {
    await prisma.documentRequirement.upsert({
      where: { documentKey: req.documentKey },
      update: req,
      create: req,
    });
  }
  console.log(`✓ Seeded ${DOCUMENT_REQUIREMENTS.length} official Document Requirements.`);

  console.log('--- MAHABOCW Seed Complete ---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
