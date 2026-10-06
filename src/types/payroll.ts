export interface ColumnMapping {
  nameCol: string;        // Employee Name
  salaryCol: string;      // Salary / Net Pay
  phoneCol: string;       // Phone / WhatsApp
  emailCol: string;       // Email
  monthCol: string;       // Month (can be a column or static fallback)
  empIdCol?: string;      // Employee ID
  deptCol?: string;       // Department
  designationCol?: string;// Role / Designation
  accountCol?: string;    // Bank A/C or UPI
  deductionsCol?: string; // Deductions
  grossCol?: string;      // Gross Salary
  selectedTemplateColumns?: string[]; // Extra columns chosen by user to include in message template
}

export type DispatchChannel = 'whatsapp' | 'email' | 'sms';
export type DispatchStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface EmployeeRecord {
  id: string;
  originalRowIndex: number;
  empId: string;
  name: string;
  salary: number;
  formattedSalary: string;
  phone: string;
  cleanPhone: string;
  email: string;
  month: string;
  department?: string;
  designation?: string;
  account?: string;
  deductions?: number;
  gross?: number;
  rawRow: Record<string, string | number>;
  
  // Tracking statuses
  whatsappStatus: DispatchStatus;
  emailStatus: DispatchStatus;
  smsStatus: DispatchStatus;
  lastUpdated?: string;
  notes?: string;
}

export interface PayrollBatch {
  id: string;
  fileName: string;
  sourceType: 'excel' | 'google-sheets' | 'sample';
  uploadedAt: string;
  month: string;
  headers: string[];
  mapping: ColumnMapping;
  employees: EmployeeRecord[];
  totalAmount: number;
  dispatchedCount: number;
  pendingCount: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  employeeName: string;
  channel: DispatchChannel;
  status: DispatchStatus;
  details: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  language: 'hi' | 'en' | 'hinglish';
  subject: string;
  body: string; // supports {name}, {salary}, {month}, {company}, {empId}, {dept}, {account}
}
