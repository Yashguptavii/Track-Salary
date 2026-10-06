import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { User } from 'firebase/auth';
import { 
  PayrollBatch, 
  ColumnMapping, 
  EmployeeRecord, 
  ActivityLog, 
  MessageTemplate,
  DispatchStatus 
} from './types/payroll';
import { 
  autoDetectColumns, 
  parseSalaryNumber, 
  formatINR, 
  cleanPhoneNumber, 
  DEFAULT_TEMPLATES, 
  renderMessage,
  generateTemplateFromSelectedColumns,
  cleanCellValue,
  cleanHeaderValue
} from './lib/columnDetector';
import { SAMPLE_SALARY_SHEET_DATA } from './data/sampleSalarySheet';
import { initAuth, googleSignIn, logout } from './lib/firebase';

import { WindowsTitleBar } from './components/WindowsTitleBar';
import { UploadSection } from './components/UploadSection';
import { ColumnMappingWizard } from './components/ColumnMappingWizard';
import { DashboardStats } from './components/DashboardStats';
import { EmployeeTable } from './components/EmployeeTable';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import { SalarySlipModal } from './components/SalarySlipModal';
import { BulkDispatchModal } from './components/BulkDispatchModal';
import { BulkEmailModal } from './components/BulkEmailModal';
import { GoogleSheetsPickerModal } from './components/GoogleSheetsPickerModal';
import { ActivityLogDrawer } from './components/ActivityLogDrawer';
import { BatchHistoryModal } from './components/BatchHistoryModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { History, Sparkles, FolderOpen, ArrowLeft, Database } from 'lucide-react';
import { 
  testFirestoreConnection,
  savePayrollBatchToCloud,
  loadCloudBatchesList,
  loadFullCloudBatch,
  updateCloudEmployeeStatus,
  saveCloudActivityLog,
  loadCloudActivityLogs
} from './lib/payrollDb';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // App step: 'upload' | 'mapping' | 'dashboard'
  const [step, setStep] = useState<'upload' | 'mapping' | 'dashboard'>('upload');

  // Cloud batches list & modal
  const [cloudBatchesList, setCloudBatchesList] = useState<Array<{ id: string; month: string; fileName: string; totalAmount: number; employeeCount: number; uploadedAt: string }>>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  // Google Auth User
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  // Raw file data prior to mapping
  const [rawFileName, setRawFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string | number>[]>([]);
  const [detectedMapping, setDetectedMapping] = useState<ColumnMapping>({
    nameCol: '',
    salaryCol: '',
    phoneCol: '',
    emailCol: '',
    monthCol: '',
  });
  const [confidence, setConfidence] = useState<Partial<Record<keyof ColumnMapping, 'high' | 'medium' | 'low' | 'none'>>>({
    nameCol: 'none',
    salaryCol: 'none',
    phoneCol: 'none',
    emailCol: 'none',
    monthCol: 'none',
  });

  // Active Processed Payroll Batch
  const [batch, setBatch] = useState<PayrollBatch | null>(null);

  // Company and Templates
  const [companyName, setCompanyName] = useState('TechCorp Solutions Pvt Ltd');
  const [template, setTemplate] = useState<MessageTemplate>(DEFAULT_TEMPLATES[1]); // Hinglish default

  // Modals state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSalarySlipModalOpen, setIsSalarySlipModalOpen] = useState(false);
  const [activeSlipEmployee, setActiveSlipEmployee] = useState<EmployeeRecord | null>(null);
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  // Activity logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Initialize Cloud Firestore connection & load batch history
  useEffect(() => {
    testFirestoreConnection();
    setIsCloudLoading(true);
    loadCloudBatchesList().then((list) => {
      setCloudBatchesList(list);
      setIsCloudLoading(false);
    });
    loadCloudActivityLogs().then((cloudLogs) => {
      if (cloudLogs.length > 0) {
        setLogs(cloudLogs);
      }
    });
  }, []);

  const handleSelectCloudBatch = async (batchId: string) => {
    setIsCloudLoading(true);
    const fullBatch = await loadFullCloudBatch(batchId);
    setIsCloudLoading(false);
    if (fullBatch) {
      setBatch(fullBatch);
      setStep('dashboard');
    }
  };

  const loadInitialDemoData = () => {
    const headers = Object.keys(SAMPLE_SALARY_SHEET_DATA[0]);
    const { mapping, confidence: conf } = autoDetectColumns(headers, SAMPLE_SALARY_SHEET_DATA);
    
    // Explicitly guarantee mappings for the demo data
    mapping.nameCol = 'Employee Full Name';
    mapping.salaryCol = 'Net Take-Home Salary';
    mapping.phoneCol = 'Mobile Number';
    mapping.emailCol = 'Official Email';
    mapping.monthCol = 'Salary Month';
    mapping.empIdCol = 'Emp Code';
    mapping.deptCol = 'Department';
    mapping.designationCol = 'Designation';
    mapping.accountCol = 'Account Number';

    buildBatchAndLaunch(
      'TechCorp_October_2026_Payroll.xlsx',
      headers,
      mapping,
      SAMPLE_SALARY_SHEET_DATA,
      'October 2026',
      'sample'
    );
  };

  const handleDataLoaded = (
    fileName: string,
    headers: string[],
    rows: Record<string, string | number>[],
    sourceType: 'excel' | 'google-sheets' | 'sample'
  ) => {
    // 1. Sanitize all rows and headers to guaranteed primitives
    const safeHeaders = headers.map((h, i) => cleanHeaderValue(h, i));
    const safeRows = rows.map((r) => {
      const obj: Record<string, string | number> = {};
      safeHeaders.forEach((h) => {
        obj[h] = cleanCellValue(r[h]);
      });
      return obj;
    });

    setRawFileName(fileName);
    setRawHeaders(safeHeaders);
    setRawRows(safeRows);

    // 2. Auto-detect columns
    const { mapping, confidence: conf } = autoDetectColumns(safeHeaders, safeRows);

    if (!mapping.nameCol && safeHeaders.length > 0) mapping.nameCol = safeHeaders[0];
    if (!mapping.salaryCol && safeHeaders.length > 1) mapping.salaryCol = safeHeaders[1];
    else if (!mapping.salaryCol && safeHeaders.length > 0) mapping.salaryCol = safeHeaders[0];

    const usefulCols = safeHeaders.filter(
      (h) => h !== mapping.nameCol && h !== mapping.phoneCol && h !== mapping.emailCol
    );

    const initialTemplateCols = mapping.selectedTemplateColumns && mapping.selectedTemplateColumns.length > 0
      ? mapping.selectedTemplateColumns
      : usefulCols.slice(0, 8);

    const finalMapping: ColumnMapping = {
      ...mapping,
      selectedTemplateColumns: initialTemplateCols,
    };

    setDetectedMapping(finalMapping);
    setConfidence(conf);

    if (finalMapping.selectedTemplateColumns && finalMapping.selectedTemplateColumns.length > 0) {
      const generated = generateTemplateFromSelectedColumns(
        finalMapping.selectedTemplateColumns,
        companyName,
        'hinglish'
      );
      setTemplate(generated);
    }

    // DIRECTLY BUILD AND LAUNCH DASHBOARD!
    // The user immediately sees their uploaded salary sheet data!
    buildBatchAndLaunch(
      fileName,
      safeHeaders,
      finalMapping,
      safeRows,
      'October 2026',
      sourceType
    );
  };

  const handleConfirmMapping = (confirmedMapping: ColumnMapping, defaultMonth: string) => {
    // If user selected specific template columns, automatically build template with them!
    if (confirmedMapping.selectedTemplateColumns && confirmedMapping.selectedTemplateColumns.length > 0) {
      const generated = generateTemplateFromSelectedColumns(
        confirmedMapping.selectedTemplateColumns,
        companyName,
        'hinglish'
      );
      setTemplate(generated);
    }

    buildBatchAndLaunch(
      rawFileName,
      rawHeaders,
      confirmedMapping,
      rawRows,
      defaultMonth,
      'excel'
    );
  };

  const buildBatchAndLaunch = (
    fileName: string,
    headers: string[],
    mapping: ColumnMapping,
    rows: Record<string, string | number>[],
    fallbackMonth: string,
    sourceType: 'excel' | 'google-sheets' | 'sample'
  ) => {
    let total = 0;

    const employees: EmployeeRecord[] = rows.map((row, idx) => {
      const name = String(row[mapping.nameCol] ?? `Employee ${idx + 1}`).trim();
      const rawSalary = row[mapping.salaryCol];
      const salary = parseSalaryNumber(rawSalary);
      total += salary;

      const rawPhone = String(row[mapping.phoneCol] ?? '').trim();
      const { clean } = cleanPhoneNumber(rawPhone);

      const email = String(row[mapping.emailCol] ?? '').trim();
      const month = mapping.monthCol ? String(row[mapping.monthCol] ?? fallbackMonth) : fallbackMonth;
      const empId = mapping.empIdCol ? String(row[mapping.empIdCol] ?? '') : `EMP-${1000 + idx + 1}`;
      const department = mapping.deptCol ? String(row[mapping.deptCol] ?? '') : '';
      const designation = mapping.designationCol ? String(row[mapping.designationCol] ?? '') : '';
      const account = mapping.accountCol ? String(row[mapping.accountCol] ?? '') : '';

      return {
        id: `emp-${idx + 1}`,
        originalRowIndex: idx,
        empId,
        name,
        salary,
        formattedSalary: formatINR(salary),
        phone: rawPhone,
        cleanPhone: clean,
        email,
        month: month || fallbackMonth,
        department,
        designation,
        account,
        rawRow: row,
        whatsappStatus: (idx === 0 || idx === 1) && sourceType === 'sample' ? 'sent' : 'pending',
        emailStatus: idx === 0 && sourceType === 'sample' ? 'sent' : 'pending',
        smsStatus: 'pending',
      };
    });

    const newBatch: PayrollBatch = {
      id: `batch-${Date.now()}`,
      fileName,
      sourceType,
      uploadedAt: new Date().toLocaleDateString(),
      month: fallbackMonth,
      headers,
      mapping,
      employees,
      totalAmount: total,
      dispatchedCount: employees.filter((e) => e.whatsappStatus === 'sent' || e.emailStatus === 'sent').length,
      pendingCount: employees.filter((e) => e.whatsappStatus !== 'sent' && e.emailStatus !== 'sent').length,
    };

    setBatch(newBatch);
    setStep('dashboard');

    // Automatically save to Cloud Firestore for permanent history!
    savePayrollBatchToCloud(newBatch);
    loadCloudBatchesList().then(setCloudBatchesList);

    // Add log
    addLog(
      'System',
      'whatsapp',
      'sent',
      `Loaded "${fileName}" with ${employees.length} employees. Total Payroll: ${formatINR(total)}.`
    );
  };

  const addLog = (
    employeeName: string,
    channel: 'whatsapp' | 'email' | 'sms',
    status: DispatchStatus,
    details: string
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      employeeName,
      channel,
      status,
      details,
    };
    setLogs((prev) => [newLog, ...prev]);

    // Persist to Cloud Firestore
    saveCloudActivityLog(newLog, batch?.id);
  };

  // Dispatch Actions
  const handleSendWhatsApp = (emp: EmployeeRecord) => {
    if (!emp.cleanPhone) {
      alert(`No valid phone number for ${emp.name}`);
      return;
    }

    const message = renderMessage(template.body, {
      name: emp.name,
      salary: emp.formattedSalary,
      month: batch?.month || emp.month,
      company: companyName,
      empId: emp.empId,
      dept: emp.department,
      account: emp.account,
      rawRow: emp.rawRow,
    });

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${emp.cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');

    // Update status to sent
    handleUpdateStatus(emp.id, 'whatsapp', 'sent');

    addLog(
      emp.name,
      'whatsapp',
      'sent',
      `WhatsApp message launched for ${emp.name} (${emp.formattedSalary})`
    );
  };

  const handleSendEmail = (emp: EmployeeRecord) => {
    if (!emp.email) {
      alert(`No email address found for ${emp.name}`);
      return;
    }

    const subject = renderMessage(template.subject, {
      name: emp.name,
      salary: emp.formattedSalary,
      month: batch?.month || emp.month,
      company: companyName,
      empId: emp.empId,
      dept: emp.department,
      account: emp.account,
      rawRow: emp.rawRow,
    });

    const body = renderMessage(template.body, {
      name: emp.name,
      salary: emp.formattedSalary,
      month: batch?.month || emp.month,
      company: companyName,
      empId: emp.empId,
      dept: emp.department,
      account: emp.account,
      rawRow: emp.rawRow,
    });

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      emp.email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, '_blank');
    handleUpdateStatus(emp.id, 'email', 'sent');

    addLog(
      emp.name,
      'email',
      'sent',
      `Email drafted in Gmail for ${emp.email} (${emp.formattedSalary})`
    );
  };

  const handleViewSalarySlip = (emp: EmployeeRecord) => {
    setActiveSlipEmployee(emp);
    setIsSalarySlipModalOpen(true);
  };

  const handleUpdateStatus = (
    empId: string,
    channel: 'whatsapp' | 'email',
    status: DispatchStatus
  ) => {
    if (!batch) return;

    setBatch((prev) => {
      if (!prev) return prev;
      const updated = prev.employees.map((e) => {
        if (e.id === empId) {
          return {
            ...e,
            [channel === 'whatsapp' ? 'whatsappStatus' : 'emailStatus']: status,
            lastUpdated: new Date().toLocaleTimeString(),
          };
        }
        return e;
      });

      return {
        ...prev,
        employees: updated,
      };
    });

    // Update in Cloud Firestore
    updateCloudEmployeeStatus(batch.id, empId, channel, status);
  };

  const handleBatchUpdateStatus = (
    empIds: string[],
    channel: 'whatsapp' | 'email',
    status: DispatchStatus
  ) => {
    if (!batch) return;
    setBatch((prev) => {
      if (!prev) return prev;
      const updated = prev.employees.map((e) => {
        if (empIds.includes(e.id)) {
          return {
            ...e,
            [channel === 'whatsapp' ? 'whatsappStatus' : 'emailStatus']: status,
          };
        }
        return e;
      });
      return { ...prev, employees: updated };
    });

    // Update in Cloud Firestore
    empIds.forEach((id) => updateCloudEmployeeStatus(batch.id, id, channel, status));

    addLog(
      'Bulk Action',
      channel,
      status,
      `Updated ${channel} status to "${status}" for ${empIds.length} employee(s).`
    );
  };

  // Export to Excel with dispatch statuses
  const handleExportReport = () => {
    if (!batch) return;

    const exportRows = batch.employees.map((emp) => ({
      'Employee Code': emp.empId,
      'Employee Name': emp.name,
      'Department': emp.department || '',
      'Designation': emp.designation || '',
      'Net Salary (INR)': emp.salary,
      'Formatted Salary': emp.formattedSalary,
      'Salary Month': emp.month,
      'Mobile / WhatsApp': emp.phone,
      'Official Email': emp.email,
      'Bank Account': emp.account || '',
      'WhatsApp Status': emp.whatsappStatus.toUpperCase(),
      'Email Status': emp.emailStatus.toUpperCase(),
      'Last Update': emp.lastUpdated || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary_Dispatch_Report');

    const outFileName = `Salary_Dispatch_${(batch.month || 'Month').replace(/\s+/g, '_')}_Report.xlsx`;
    XLSX.writeFile(workbook, outFileName);

    addLog(
      'System',
      'whatsapp',
      'sent',
      `Exported salary dispatch report to "${outFileName}".`
    );
  };

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setGoogleUser(res.user);
        addLog(
          res.user.displayName || 'Google User',
          'email',
          'sent',
          'Google Workspace connected successfully.'
        );
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setGoogleUser(null);
  };

  // Counts for dashboard
  const whatsappSentCount = batch?.employees.filter((e) => e.whatsappStatus === 'sent').length || 0;
  const emailSentCount = batch?.employees.filter((e) => e.emailStatus === 'sent').length || 0;
  const pendingCount = batch?.employees.filter((e) => e.whatsappStatus !== 'sent' && e.emailStatus !== 'sent').length || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Windows 11 Desktop Title Bar */}
      <WindowsTitleBar
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        fileName={batch?.fileName}
        totalEmployees={batch?.employees.length}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onOpenNewSheet={() => setStep('upload')}
        onResetToSample={loadInitialDemoData}
      />

      {/* Step Navigation Bar */}
      <nav aria-label="Workflow Navigation" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between overflow-x-auto text-xs gap-3">
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setStep('upload')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              step === 'upload'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>📥 1. Upload Salary Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => rawHeaders.length > 0 && setStep('mapping')}
            disabled={rawHeaders.length === 0}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              step === 'mapping'
                ? 'bg-blue-600 text-white shadow-xs'
                : rawHeaders.length > 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'opacity-40 cursor-not-allowed text-slate-400'
            }`}
          >
            <span>⚙️ 2. Select Columns & Template</span>
            {batch?.mapping.selectedTemplateColumns && batch.mapping.selectedTemplateColumns.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-[10px]">
                {batch.mapping.selectedTemplateColumns.length} cols
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => batch && setStep('dashboard')}
            disabled={!batch}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              step === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : batch
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'opacity-40 cursor-not-allowed text-slate-400'
            }`}
          >
            <span>📊 3. Salary Dashboard & Dispatch</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 hover:bg-blue-100 text-blue-800 dark:text-blue-300 flex items-center space-x-1.5 transition cursor-pointer"
            title="View Past Months Cloud Records in Firestore"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>☁️ Past Cycles ({cloudBatchesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5 transition cursor-pointer"
            title="Customize WhatsApp / Email Message Template"
          >
            <span>📝 Message Template</span>
          </button>

          {googleUser ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="truncate max-w-[110px]">{googleUser.displayName?.split(' ')[0] || googleUser.email?.split('@')[0]}</span>
              <button 
                type="button" 
                onClick={handleGoogleSignOut} 
                title="Sign out"
                className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <ErrorBoundary onReset={() => setStep('upload')}>
          {/* Step: Upload Section */}
          {step === 'upload' && (
            <div>
              {batch && (
                <button
                  type="button"
                  onClick={() => setStep('dashboard')}
                  className="mb-4 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Active Dashboard</span>
                </button>
              )}
              <UploadSection
                onDataLoaded={handleDataLoaded}
                onOpenGoogleSheetsModal={() => setIsGoogleModalOpen(true)}
                isGoogleConnected={!!googleUser}
                googleUser={googleUser}
                onGoogleSignIn={handleGoogleSignIn}
                onGoogleSignOut={handleGoogleSignOut}
              />
            </div>
          )}

          {/* Step: Column Mapping Wizard */}
          {step === 'mapping' && (
            <div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="mb-4 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Upload a Different Sheet</span>
              </button>
              <ColumnMappingWizard
                headers={rawHeaders}
                sampleRows={rawRows.slice(0, 10)}
                initialMapping={detectedMapping}
                confidence={confidence}
                fileName={rawFileName}
                onConfirm={handleConfirmMapping}
                onCancel={batch ? () => setStep('dashboard') : undefined}
              />
            </div>
          )}

          {/* Step: Dashboard & Employee Table */}
          {step === 'dashboard' && batch && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <DashboardStats
                totalPayroll={batch.totalAmount}
                totalEmployees={batch.employees.length}
                whatsappSentCount={whatsappSentCount}
                emailSentCount={emailSentCount}
                pendingCount={pendingCount}
                month={batch.month}
                onUploadNewSheet={() => setStep('upload')}
                onOpenTemplateEditor={() => setIsTemplateModalOpen(true)}
                onStartBulkWhatsApp={() => setIsBulkWhatsAppOpen(true)}
                onStartBulkEmail={() => setIsBulkEmailOpen(true)}
                onExportReport={handleExportReport}
              />

              {/* Quick Column & Template Customization Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-800 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Sheet Loaded: {batch.fileName} ({batch.employees.length} Employees)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                      {batch.mapping.selectedTemplateColumns?.length || 0} Template Columns Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Active Columns in Message: {batch.mapping.selectedTemplateColumns?.map(c => `{${c}}`).join(', ') || 'Standard Salary'}
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep('mapping')}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <span>⚙️ Select Kaam Ke Columns</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <span>📝 Preview / Edit Message</span>
                  </button>
                </div>
              </div>

              {/* Employee Records Table */}
              <EmployeeTable
                employees={batch.employees}
                onSendWhatsApp={handleSendWhatsApp}
                onSendEmail={handleSendEmail}
                onViewSalarySlip={handleViewSalarySlip}
                onUpdateStatus={handleUpdateStatus}
                onBatchUpdateStatus={handleBatchUpdateStatus}
              />
            </div>
          )}
        </ErrorBoundary>
      </main>

      {/* Floating Activity Log Button */}
      <button
        type="button"
        onClick={() => setIsLogDrawerOpen(true)}
        className="fixed bottom-4 right-4 z-40 px-3.5 py-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl text-xs font-bold flex items-center space-x-2 border border-slate-700 hover:scale-105 active:scale-95 transition cursor-pointer"
        title="View Real-time Audit Trail"
      >
        <History className="w-3.5 h-3.5 text-blue-400" />
        <span>Activity Log ({logs.length})</span>
      </button>

      {/* Modals */}
      <TemplateEditorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentTemplate={template}
        companyName={companyName}
        selectedColumns={batch?.mapping.selectedTemplateColumns || []}
        availableHeaders={batch?.headers || []}
        sampleRow={batch?.employees[0]?.rawRow}
        onSave={(newT, newC) => {
          setTemplate(newT);
          setCompanyName(newC);
          addLog('System', 'whatsapp', 'sent', `Updated message template and company name to "${newC}".`);
        }}
      />

      <SalarySlipModal
        isOpen={isSalarySlipModalOpen}
        onClose={() => {
          setIsSalarySlipModalOpen(false);
          setActiveSlipEmployee(null);
        }}
        employee={activeSlipEmployee}
        companyName={companyName}
        month={batch?.month || 'October 2026'}
      />

      {batch && (
        <BulkDispatchModal
          isOpen={isBulkWhatsAppOpen}
          onClose={() => setIsBulkWhatsAppOpen(false)}
          employees={batch.employees}
          template={template}
          companyName={companyName}
          month={batch.month}
          onMarkSent={(empId) => handleUpdateStatus(empId, 'whatsapp', 'sent')}
        />
      )}

      {batch && (
        <BulkEmailModal
          isOpen={isBulkEmailOpen}
          onClose={() => setIsBulkEmailOpen(false)}
          employees={batch.employees}
          template={template}
          companyName={companyName}
          month={batch.month}
          onMarkSent={(empId) => handleUpdateStatus(empId, 'email', 'sent')}
        />
      )}

      <GoogleSheetsPickerModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onSheetSelected={(name, headers, rows) => {
          handleDataLoaded(name, headers, rows, 'google-sheets');
        }}
      />

      <ActivityLogDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />

      <BatchHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        batches={cloudBatchesList}
        activeBatchId={batch?.id}
        onSelectBatch={handleSelectCloudBatch}
        isLoading={isCloudLoading}
      />
    </div>
  );
}
