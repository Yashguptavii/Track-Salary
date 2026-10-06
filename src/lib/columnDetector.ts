import { ColumnMapping, MessageTemplate } from '../types/payroll';

export function cleanCellValue(val: any): string | number {
  if (val === undefined || val === null) return '';
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toLocaleDateString('en-IN');
  }
  if (typeof val === 'object') {
    if (val.w !== undefined) return String(val.w).trim();
    if (val.v !== undefined) return cleanCellValue(val.v);
    return JSON.stringify(val);
  }
  return String(val).trim();
}

export function cleanHeaderValue(h: any, fallbackIdx: number): string {
  if (h === undefined || h === null) return `Column_${fallbackIdx + 1}`;
  if (typeof h === 'object') {
    if (h.w !== undefined) return String(h.w).trim();
    if (h.v !== undefined) return String(h.v).trim();
  }
  const str = String(h).trim();
  return str && !str.startsWith('__EMPTY') ? str : `Column_${fallbackIdx + 1}`;
}

export function normalizeHeader(h: any): string {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function autoDetectColumns(
  headers: string[],
  sampleRows: Record<string, string | number>[] = []
): {
  mapping: ColumnMapping;
  confidence: Partial<Record<keyof ColumnMapping, 'high' | 'medium' | 'low' | 'none'>>;
} {
  const mapping: ColumnMapping = {
    nameCol: '',
    salaryCol: '',
    phoneCol: '',
    emailCol: '',
    monthCol: '',
    empIdCol: '',
    deptCol: '',
    designationCol: '',
    accountCol: '',
    selectedTemplateColumns: [],
  };

  const confidence: Partial<Record<keyof ColumnMapping, 'high' | 'medium' | 'low' | 'none'>> = {
    nameCol: 'none',
    salaryCol: 'none',
    phoneCol: 'none',
    emailCol: 'none',
    monthCol: 'none',
    empIdCol: 'none',
    deptCol: 'none',
    designationCol: 'none',
    accountCol: 'none',
    deductionsCol: 'none',
    grossCol: 'none',
  };

  const patterns = {
    name: [
      { rx: /^(employee|emp|staff|worker)?[\s_-]*(name|naam|fullname|person)$/i, conf: 'high' },
      { rx: /name|naam|karmachari/i, conf: 'medium' },
    ],
    salary: [
      { rx: /^(net[\s_-]*)?(salary|pay|payable|inhand|takehome|amount|vetan)$/i, conf: 'high' },
      { rx: /net[\s_-]*salary|net[\s_-]*pay|payout|total[\s_-]*salary/i, conf: 'high' },
      { rx: /salary|vetan|remuneration|wage|total[\s_-]*pay/i, conf: 'medium' },
      { rx: /gross/i, conf: 'low' },
    ],
    phone: [
      { rx: /^(mobile|phone|contact|whatsapp|cell|tel)[\s_-]*(no|num|number)?$/i, conf: 'high' },
      { rx: /mobile|phone|whatsapp|contact|durvash/i, conf: 'high' },
      { rx: /cell|tel/i, conf: 'medium' },
    ],
    email: [
      { rx: /^(employee|emp|work|official)?[\s_-]*(email|mail|e[\s_-]*mail)[\s_-]*(id|address)?$/i, conf: 'high' },
      { rx: /email|mail|patra/i, conf: 'medium' },
    ],
    month: [
      { rx: /^(salary[\s_-]*)?(month|maheena|period|cycle|pay[\s_-]*month|pay[\s_-]*period)$/i, conf: 'high' },
      { rx: /month|maheena|period|billing[\s_-]*cycle/i, conf: 'medium' },
    ],
    empId: [
      { rx: /^(emp|employee|staff|worker)[\s_-]*(id|code|no|num)$/i, conf: 'high' },
      { rx: /emp[\s_-]*id|employee[\s_-]*code|id/i, conf: 'medium' },
    ],
    dept: [
      { rx: /^(dept|department|division|team|vibhag)$/i, conf: 'high' },
      { rx: /dept|department|division/i, conf: 'medium' },
    ],
    designation: [
      { rx: /^(designation|role|position|post|title)$/i, conf: 'high' },
      { rx: /designation|role|position/i, conf: 'medium' },
    ],
    account: [
      { rx: /^(bank[\s_-]*)?(acc|account|ac)[\s_-]*(no|num|number)?$/i, conf: 'high' },
      { rx: /account|khata|bank|upi/i, conf: 'medium' },
    ],
  };

  // Inspect headers first
  for (const h of headers) {
    const clean = h.trim();

    // Name detection
    if (!mapping.nameCol) {
      for (const p of patterns.name) {
        if (p.rx.test(clean)) {
          mapping.nameCol = clean;
          confidence.nameCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Salary detection
    if (!mapping.salaryCol) {
      for (const p of patterns.salary) {
        if (p.rx.test(clean)) {
          mapping.salaryCol = clean;
          confidence.salaryCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Phone detection
    if (!mapping.phoneCol) {
      for (const p of patterns.phone) {
        if (p.rx.test(clean)) {
          mapping.phoneCol = clean;
          confidence.phoneCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Email detection
    if (!mapping.emailCol) {
      for (const p of patterns.email) {
        if (p.rx.test(clean)) {
          mapping.emailCol = clean;
          confidence.emailCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Month detection
    if (!mapping.monthCol) {
      for (const p of patterns.month) {
        if (p.rx.test(clean)) {
          mapping.monthCol = clean;
          confidence.monthCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Emp ID
    if (!mapping.empIdCol) {
      for (const p of patterns.empId) {
        if (p.rx.test(clean)) {
          mapping.empIdCol = clean;
          confidence.empIdCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Dept
    if (!mapping.deptCol) {
      for (const p of patterns.dept) {
        if (p.rx.test(clean)) {
          mapping.deptCol = clean;
          confidence.deptCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Designation
    if (!mapping.designationCol) {
      for (const p of patterns.designation) {
        if (p.rx.test(clean)) {
          mapping.designationCol = clean;
          confidence.designationCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }

    // Account
    if (!mapping.accountCol) {
      for (const p of patterns.account) {
        if (p.rx.test(clean)) {
          mapping.accountCol = clean;
          confidence.accountCol = p.conf as 'high' | 'medium';
          break;
        }
      }
    }
  }

  // Second pass: If not matched by header alone, inspect sample rows values!
  if (sampleRows.length > 0) {
    for (const h of headers) {
      const sampleVals = sampleRows.map((r) => String(r[h] ?? '').trim()).filter(Boolean);

      // Email value inspection (contains @ and .)
      if (!mapping.emailCol && sampleVals.some((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        mapping.emailCol = h;
        confidence.emailCol = 'high';
      }

      // Phone value inspection (10-13 digits)
      if (!mapping.phoneCol && sampleVals.some((v) => /^[+]?[0-9\s-]{10,14}$/.test(v))) {
        mapping.phoneCol = h;
        confidence.phoneCol = 'high';
      }

      // Salary value inspection (numbers, perhaps formatted with currency or commas)
      if (!mapping.salaryCol && sampleVals.every((v) => /^[₹$Rs.\s0-9,.-]+$/.test(v) && /[0-9]{3,}/.test(v))) {
        mapping.salaryCol = h;
        confidence.salaryCol = 'medium';
      }
    }
  }

  return { mapping, confidence };
}

export function parseSalaryNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;
  if (typeof val === 'object') {
    if (val.v !== undefined && typeof val.v === 'number') return Math.round(val.v);
    val = String(val.w || val.v || '');
  }
  let str = String(val).trim();
  // Remove currency words like Rs., INR, ₹, $, etc.
  str = str.replace(/^(rs\.?|inr|₹|\$)\s*/gi, '');
  // Remove commas
  str = str.replace(/,/g, '');
  // Extract number pattern
  const match = str.match(/-?[0-9]+(?:\.[0-9]+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

export function formatINR(val: any): string {
  const num = typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${Math.round(num)}`;
  }
}

export function cleanPhoneNumber(phone: any): { clean: string; isValid: boolean } {
  if (phone === undefined || phone === null) return { clean: '', isValid: false };
  const str = String(phone).trim();
  if (!str || str === '—' || str === '-') return { clean: '', isValid: false };
  // Remove non-numeric characters except leading '+'
  const raw = str.replace(/[^0-9+]/g, '');
  const digitsOnly = raw.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    // Standard 10 digit Indian number -> default country code 91
    return { clean: `91${digitsOnly}`, isValid: true };
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return { clean: digitsOnly, isValid: true };
  } else if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return { clean: digitsOnly, isValid: true };
  }
  return { clean: digitsOnly, isValid: digitsOnly.length >= 7 };
}

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'hindi_professional',
    name: 'Hindi - Namaste & Salary Update (हिंदी)',
    language: 'hi',
    subject: '{company} - {month} माह का वेतन विवरण',
    body: `नमस्ते {name} जी,\n\nसूचित किया जाता है कि कंपनी द्वारा आपका {month} का वेतन (Salary) प्रोसेस कर दिया गया है।\n\n📌 विवरण:\n• कर्मचारी नाम: {name}\n• कुल देय वेतन: {salary}\n• माह: {month}\n• बैंक खाता: {account}\n\nयदि आपके कोई प्रश्न हैं तो कृपया एचआर/अकाउंट्स विभाग से संपर्क करें।\nधन्यवाद!\n- {company}`,
  },
  {
    id: 'hinglish_friendly',
    name: 'Hinglish - Direct WhatsApp Update',
    language: 'hinglish',
    subject: 'Salary Processed for {month} - {company}',
    body: `Hi {name}! 👋\n\nAapki {month} ki salary process ho gayi hai.\n\n💰 Net Salary: {salary}\n🗓️ Month: {month}\n🏦 Account: {account}\n\nYeh amount jaldi aapke account me credit ho jayega. Kisi query ke liye Accounts team se contact karein.\nThank you! - {company}`,
  },
  {
    id: 'english_official',
    name: 'English - Official Salary Advisory',
    language: 'en',
    subject: 'Salary Credit Intimation for {month} - {company}',
    body: `Dear {name},\n\nWe are pleased to inform you that your net salary for the month of {month} has been processed.\n\nSummary:\n- Employee Name: {name}\n- Employee ID: {empId}\n- Net Payable: {salary}\n- Pay Period: {month}\n- Bank / Transfer Ref: {account}\n\nPlease check your bank statement. For any discrepancies, please reach out to HR/Payroll within 2 working days.\n\nWarm regards,\nPayroll Team - {company}`,
  },
];

export function renderMessage(
  templateText: string,
  vars: {
    name: string;
    salary: string;
    month: string;
    company: string;
    empId?: string;
    dept?: string;
    account?: string;
    rawRow?: Record<string, string | number>;
  }
): string {
  let res = templateText;
  res = res.replace(/\{name\}/gi, vars.name || 'Employee');
  res = res.replace(/\{salary\}/gi, vars.salary || '₹0');
  res = res.replace(/\{month\}/gi, vars.month || 'Current Month');
  res = res.replace(/\{company\}/gi, vars.company || 'Our Company');
  res = res.replace(/\{empId\}/gi, vars.empId || 'N/A');
  res = res.replace(/\{dept\}/gi, vars.dept || 'General');
  res = res.replace(/\{account\}/gi, vars.account || 'Registered Account');

  // Replace any dynamic column tag: {Column Name}
  if (vars.rawRow) {
    for (const [colName, val] of Object.entries(vars.rawRow)) {
      const escaped = colName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`\\{${escaped}\\}`, 'gi');
      res = res.replace(rx, val !== undefined && val !== null ? String(val) : '');
    }
  }
  return res;
}

export function generateTemplateFromSelectedColumns(
  selectedCols: string[],
  companyName: string,
  language: 'hi' | 'hinglish' | 'en' = 'hinglish'
): MessageTemplate {
  if (language === 'hi') {
    const bullets = selectedCols.map((c) => `• ${c}: {${c}}`).join('\n');
    return {
      id: 'custom_hindi_generated',
      name: 'Custom Hindi Template (चुने हुए कॉलम्स)',
      language: 'hi',
      subject: `${companyName || 'कंपनी'} - {month} वेतन विवरण`,
      body: `नमस्ते {name} जी,\n\nकंपनी द्वारा आपका {month} का वेतन प्रोसेस कर दिया गया है।\n\n📌 आपके वेतन का विवरण:\n• कुल देय वेतन (Net Salary): {salary}\n${bullets}\n\nकिसी भी प्रश्न के लिए अकाउंट्स विभाग से संपर्क करें।\nधन्यवाद!\n- ${companyName || 'कंपनी'}`,
    };
  }

  if (language === 'en') {
    const bullets = selectedCols.map((c) => `• ${c}: {${c}}`).join('\n');
    return {
      id: 'custom_en_generated',
      name: 'Custom English Template (Selected Columns)',
      language: 'en',
      subject: `Salary Processed for {month} - ${companyName || 'Company'}`,
      body: `Dear {name},\n\nYour salary for {month} has been processed.\n\nSummary:\n• Net Salary: {salary}\n${bullets}\n\nPlease check your bank statement. Reach out to HR for any queries.\n\nBest regards,\n${companyName || 'Payroll Team'}`,
    };
  }

  // Hinglish
  const bullets = selectedCols.map((c) => `• ${c}: {${c}}`).join('\n');
  return {
    id: 'custom_hinglish_generated',
    name: 'Custom Hinglish Template (Selected Columns)',
    language: 'hinglish',
    subject: `Salary Update for {month} - ${companyName || 'Company'}`,
    body: `Hi {name}! 👋\n\nAapki {month} ki salary process ho gayi hai.\n\n💰 Net Payable: {salary}\n${bullets}\n\nYeh amount jaldi aapke account me credit ho jayega. Koi query ho toh Accounts team se sampark karein.\nThank you! - ${companyName || 'Payroll Team'}`,
  };
}

