import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FormVParams, FormVParamsSchema } from '@haq/shared';

export interface FormVGenerationResult {
  success: boolean;
  html: string;
  pdfUri?: string;
  isWeb: boolean;
  error?: string;
}

export class FormVGeneratorService {
  /**
   * Validate parameters using shared Zod schema.
   */
  static validate(params: FormVParams): { valid: boolean; errors: string[] } {
    const result = FormVParamsSchema.safeParse(params);
    if (!result.success) {
      const errMsgs: string[] = [];
      const formatted = result.error.format();
      Object.entries(formatted).forEach(([key, val]: [string, any]) => {
        if (key !== '_errors' && val?._errors?.length) {
          errMsgs.push(`${key}: ${val._errors.join(', ')}`);
        }
      });
      return { valid: false, errors: errMsgs };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Produce printable Marathi HTML for Form-V Certificate (नमुना ५) or Worker Request Letter.
   */
  static generateHtml(params: FormVParams): string {
    const isCertificate = params.documentType === 'FORM_V_CERTIFICATE';

    const certifierTypeLabels: Record<string, string> = {
      CONTRACTOR: 'नोंदणीकृत कंत्राटदार / बिल्डर (Registered Contractor)',
      GRAMSEVAK: 'ग्रामसेवक / ग्रामविकास अधिकारी (Gramsevak / VDO)',
      MUNICIPAL_OFFICER: 'महानगरपालिका वॉर्ड अधिकारी / मुख्याधिकारी (Municipal Officer)',
      TRADE_UNION: 'नोंदणीकृत बांधकाम कामगार संघटना (Registered Trade Union)',
    };

    const certifierTitle = certifierTypeLabels[params.certifierType] || params.certifierType;

    if (isCertificate) {
      return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="utf-8">
  <title>नमुना क्रमांक ५ - ९० दिवस कामाचे प्रमाणपत्र (MAHABOCW)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Mangal", sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
      font-size: 13pt;
      margin: 0;
      padding: 0;
    }
    .document-box {
      border: 2px solid #0f172a;
      padding: 24px;
      min-height: 95vh;
      box-sizing: border-box;
      position: relative;
    }
    .draft-badge {
      display: inline-block;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
      padding: 4px 12px;
      font-size: 10pt;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .header h2 {
      margin: 0 0 6px 0;
      font-size: 17pt;
      color: #0f172a;
      font-weight: 800;
    }
    .header h3 {
      margin: 0 0 4px 0;
      font-size: 14pt;
      color: #1e3a8a;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 10pt;
      color: #64748b;
    }
    .content {
      text-align: justify;
      margin-bottom: 24px;
    }
    .field-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
    }
    .field-table td {
      padding: 8px 10px;
      vertical-align: top;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 12pt;
    }
    .field-table td.label {
      width: 38%;
      font-weight: bold;
      color: #334155;
    }
    .field-table td.value {
      width: 62%;
      color: #0f172a;
    }
    .declaration {
      background: #f8fafc;
      border-left: 4px solid #1e3a8a;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 11pt;
      color: #334155;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      border-top: 1px solid #475569;
      padding-top: 8px;
      text-align: center;
      font-size: 11pt;
    }
    .footer-note {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #64748b;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="document-box">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="draft-badge">अधिकृत स्वाक्षरीसाठी मसुदा / DRAFT FOR OFFICIAL ATTESTATION</span>
      <span style="font-size: 10pt; color: #64748b;">दिनांक: ${params.issueDate}</span>
    </div>

    <div class="header">
      <h2>महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळ</h2>
      <h3>नमुना क्रमांक ५ (फॉर्म-५)</h3>
      <p>महाराष्ट्र इमारत व इतर बांधकाम कामगार (रोजगार नियमन व सेवाशर्ती) नियम २००७, नियम २८२ अन्वये</p>
      <p style="font-weight: bold; margin-top: 4px; color: #0f172a;">९० दिवस काम केल्याचे अधिकृत प्रमाणपत्र</p>
    </div>

    <div class="content">
      <p>
        प्रमाणित करण्यात येते की, खाली नमूद केलेले बांधकाम कामगार हे माझ्या देखरेखीखाली / कार्यक्षेत्रात इमारत व इतर बांधकाम कामावर कार्यरत होते.
      </p>

      <table class="field-table">
        <tr>
          <td class="label">१. कामगाराचे पूर्ण नाव:</td>
          <td class="value"><strong>${params.workerName}</strong></td>
        </tr>
        <tr>
          <td class="label">२. वडिलांचे / पतीचे नाव:</td>
          <td class="value">${params.fatherOrHusbandName}</td>
        </tr>
        <tr>
          <td class="label">३. वय / जन्मतारीख:</td>
          <td class="value">${params.age} वर्षे</td>
        </tr>
        <tr>
          <td class="label">४. राहण्याचा पूर्ण पत्ता:</td>
          <td class="value">${params.address}</td>
        </tr>
        <tr>
          <td class="label">५. मोबाईल क्रमांक:</td>
          <td class="value">${params.mobileNumber || 'उपलब्ध नाही'}</td>
        </tr>
        ${
          params.aadhaarNumber
            ? `<tr>
          <td class="label">६. आधार क्रमांक (शेवटचे ४ अंक):</td>
          <td class="value">XXXX-XXXX-${params.aadhaarNumber.slice(-4)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td class="label">७. कामाचे स्वरूप (Trade):</td>
          <td class="value"><strong>${params.tradeType}</strong></td>
        </tr>
        <tr>
          <td class="label">८. काम केलेल्या साइटचे नाव व पत्ता:</td>
          <td class="value">${params.siteNameAndLocation}</td>
        </tr>
        <tr>
          <td class="label">९. कामाचा कालावधी:</td>
          <td class="value">दिनांक <strong>${params.workStartDate}</strong> पासून दिनांक <strong>${params.workEndDate}</strong> पर्यंत</td>
        </tr>
        <tr>
          <td class="label">१०. मागील १२ महिन्यांतील एकूण कामाचे दिवस:</td>
          <td class="value"><strong>${params.daysWorked} दिवस</strong> (किमान ९० दिवस पूर्ण)</td>
        </tr>
        <tr>
          <td class="label">११. प्रमाणपत्र देणारा प्राधिकारी / कंत्राटदार:</td>
          <td class="value">${certifierTitle}<br><strong>${params.certifierName}</strong> ${
        params.certifierRegistrationNo ? `(नोंदणी क्र.: ${params.certifierRegistrationNo})` : ''
      }</td>
        </tr>
      </table>

      <div class="declaration">
        <strong>वैधानिक हमीपत्र / Declaration:</strong><br>
        मी याद्वारे प्रमाणित करतो/करते की, वरील कामगार यांनी वर नमूद केलेल्या कालावधीत किमान ९० दिवस प्रत्यक्ष बांधकाम कामगार म्हणून काम केले आहे. वरील दिलेली माहिती माझ्या माहितीनुसार व कागदपत्रांनुसार खरी व बिनचूक आहे.
      </div>

      <div style="margin-top: 15px; font-size: 11pt;">
        <strong>ठिकाण:</strong> ${params.issuePlace}<br>
        <strong>दिनांक:</strong> ${params.issueDate}
      </div>

      <div class="signatures-row">
        <div class="signature-box">
          <br><br><br>
          <strong>कामगाराची स्वाक्षरी / अंगठा</strong><br>
          (${params.workerName})
        </div>
        <div class="signature-box">
          <br><br><br>
          <strong>कंत्राटदार / ग्रामसेवक / अधिकारी यांची सही व शिक्का</strong><br>
          (${params.certifierName})
        </div>
      </div>
    </div>

    <div class="footer-note">
      <strong>महत्त्वाची सूचना (MAHABOCW Guidelines):</strong><br>
      १. हे प्रमाणपत्र MAHABOCW पोर्टलवर (mahabocw.in) किंवा नागरी सुविधा केंद्रात (आपले सरकार / CSC) कामगार नोंदणीसाठी आवश्यक आहे.<br>
      २. या पत्रावर अधिकृत कंत्राटदार, ग्रामसेवक किंवा सक्षम प्राधिकाऱ्याची सही व शिक्का असल्याशिवाय हा अधिकृत पुरावा मानला जात नाही.<br>
      ३. अधिकृत पडताळणी: उप कामगार आयुक्त कार्यालय, पीएमटी बिल्डिंग, स्वारगेट, पुणे - ४११०४२. हेल्पलाइन: १८००-८८९-२८१६.
    </div>
  </div>
</body>
</html>`;
    }

    // FORM_V_REQUEST_LETTER
    return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="utf-8">
  <title>कंत्राटदाराकडे फॉर्म-५ साठी विनंती अर्ज</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Mangal", sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.7;
      font-size: 13pt;
      margin: 0;
      padding: 0;
    }
    .document-box {
      border: 1px solid #cbd5e1;
      padding: 28px;
      min-height: 95vh;
      box-sizing: border-box;
    }
    .draft-badge {
      display: inline-block;
      background: #e0f2fe;
      border: 1px solid #0284c7;
      color: #0369a1;
      padding: 4px 12px;
      font-size: 10pt;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .to-section {
      margin-bottom: 24px;
    }
    .subject-line {
      font-weight: bold;
      background: #f1f5f9;
      padding: 8px 12px;
      border-left: 4px solid #0284c7;
      margin: 18px 0;
    }
    .body-p {
      text-indent: 24px;
      text-align: justify;
      margin-bottom: 14px;
    }
    .details-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px 18px;
      margin: 16px 0;
      border-radius: 6px;
    }
    .signature-section {
      margin-top: 50px;
      float: right;
      text-align: right;
      width: 50%;
    }
  </style>
</head>
<body>
  <div class="document-box">
    <span class="draft-badge">कामगाराचा अर्ज / WORKER REQUEST APPLICATION</span>
    <div style="float: right; font-size: 11pt; color: #475569;">
      दिनांक: ${params.issueDate}<br>
      ठिकाण: ${params.issuePlace}
    </div>
    <div style="clear: both;"></div>

    <div class="to-section">
      <strong>प्रति,</strong><br>
      माननीय <strong>${params.certifierName}</strong>,<br>
      ${certifierTitle},<br>
      साइट/पत्ता: ${params.siteNameAndLocation}
    </div>

    <div class="subject-line">
      विषय: महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळासाठी (MAHABOCW) ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) मिळण्याबाबत अर्ज.
    </div>

    <p class="body-p">
      महोदय / महोदया,
    </p>

    <p class="body-p">
      मी, <strong>${params.workerName}</strong> (वय: ${params.age} वर्षे, रा. ${params.address}), आपल्या नियंत्रणाखालील बांधकाम प्रकल्पावर <strong>${params.tradeType}</strong> म्हणून कार्यरत होतो/आहे.
    </p>

    <p class="body-p">
      माझ्या कामाचा तपशील खालीलप्रमाणे आहे:
    </p>

    <div class="details-box">
      • <strong>साइटचे नाव व ठिकाण:</strong> ${params.siteNameAndLocation}<br>
      • <strong>कामाचे स्वरूप:</strong> ${params.tradeType}<br>
      • <strong>कामाचा कालावधी:</strong> ${params.workStartDate} ते ${params.workEndDate}<br>
      • <strong>एकूण कामाचे दिवस:</strong> ${params.daysWorked} दिवस (मागील १२ महिन्यांत ९० दिवसांपेक्षा जास्त)
    </div>

    <p class="body-p">
      महाराष्ट्र शासनाच्या इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळाकडे (MAHABOCW) नोंदणी करण्यासाठी नियमानुसार कंत्राटदाराचे ९० दिवस कामाचे प्रमाणपत्र (फॉर्म-५) सादर करणे अनिवार्य आहे. या नोंदणीमुळे मला व माझ्या कुटुंबाला शासनाच्या शैक्षणिक, आरोग्य व सामाजिक कल्याण योजनांचा लाभ मिळू शकेल.
    </p>

    <p class="body-p">
      तरी कृपया माझी कामावरील हजेरी तपासून मला अधिकृत स्वाक्षरी व शिक्का असलेले फॉर्म-५ प्रमाणपत्र देण्याची कृपा करावी, ही नम्र विनंती.
    </p>

    <div class="signature-section">
      आपला नम्र कामगार,<br><br><br>
      <strong>(${params.workerName})</strong><br>
      मोबाईल: ${params.mobileNumber || '____________'}<br>
      पत्ता: ${params.address}
    </div>
    <div style="clear: both;"></div>
  </div>
</body>
</html>`;
  }

  /**
   * Export or Share the generated document.
   * On Web: Triggers printAsync / browser print dialog, and returns data URI.
   * On Native: Generates PDF file via printToFileAsync and invokes native share sheet.
   */
  static async exportOrSharePdf(params: FormVParams): Promise<FormVGenerationResult> {
    const validation = this.validate(params);
    if (!validation.valid) {
      return {
        success: false,
        html: '',
        isWeb: Platform.OS === 'web',
        error: validation.errors.join('; '),
      };
    }

    const html = this.generateHtml(params);

    try {
      if (Platform.OS === 'web') {
        // Web: use Print.printAsync which opens system print/save-as-pdf
        await Print.printAsync({ html });

        return {
          success: true,
          html,
          isWeb: true,
        };
      }

      // Native iOS / Android: Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Share via system share sheet if available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle:
            params.documentType === 'FORM_V_CERTIFICATE'
              ? 'फॉर्म-५ ९० दिवस प्रमाणपत्र (PDF)'
              : 'कंत्राटदार अर्ज पत्र (PDF)',
          UTI: 'com.adobe.pdf',
        });
      }

      return {
        success: true,
        html,
        pdfUri: uri,
        isWeb: false,
      };
    } catch (err: any) {
      console.error('[FormVGenerator] PDF Export failed:', err);
      return {
        success: false,
        html,
        isWeb: Platform.OS === 'web',
        error: err?.message || 'PDF निर्मिती अयशस्वी झाली.',
      };
    }
  }
}
