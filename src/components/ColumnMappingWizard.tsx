import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  User, 
  IndianRupee, 
  Phone, 
  Mail, 
  Calendar, 
  ChevronRight, 
  ChevronDown, 
  Briefcase, 
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ColumnMapping } from '../types/payroll';
import { formatINR, cleanPhoneNumber, parseSalaryNumber } from '../lib/columnDetector';

interface Props {
  headers: string[];
  sampleRows: Record<string, string | number>[];
  initialMapping: ColumnMapping;
  confidence: Partial<Record<keyof ColumnMapping, 'high' | 'medium' | 'low' | 'none'>>;
  fileName: string;
  onConfirm: (mapping: ColumnMapping, defaultMonth: string) => void;
  onCancel?: () => void;
}

export const ColumnMappingWizard: React.FC<Props> = ({
  headers = [],
  sampleRows = [],
  initialMapping,
  confidence = {},
  fileName,
  onConfirm,
  onCancel,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const base = { ...initialMapping };
    if (!base.nameCol && headers.length > 0) base.nameCol = headers[0];
    if (!base.salaryCol && headers.length > 1) base.salaryCol = headers[1];
    return base;
  });
  const [useCustomMonth, setUseCustomMonth] = useState(!initialMapping?.monthCol);
  const [customMonth, setCustomMonth] = useState('October 2026');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplateCols, setSelectedTemplateCols] = useState<string[]>(
    initialMapping?.selectedTemplateColumns || []
  );

  // Toggle a column for template
  const handleToggleTemplateCol = (col: string) => {
    setSelectedTemplateCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSelectAllTemplateCols = () => {
    // Select all headers except primary name, phone, email
    const nonCore = headers.filter(
      (h) => h !== mapping.nameCol && h !== mapping.phoneCol && h !== mapping.emailCol
    );
    setSelectedTemplateCols(nonCore);
  };

  const handleClearTemplateCols = () => {
    setSelectedTemplateCols([]);
  };

  // Check validity
  const isNameSelected = !!mapping.nameCol;
  const isSalarySelected = !!mapping.salaryCol;
  const isPhoneSelected = !!mapping.phoneCol;
  const isEmailSelected = !!mapping.emailCol;
  const isMonthValid = useCustomMonth ? !!customMonth.trim() : !!mapping.monthCol;

  // Name and Salary are strictly required; Phone & Email are recommended
  const canProceed = isNameSelected && isSalarySelected;

  const handleChange = (field: keyof ColumnMapping, val: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  // Helper to extract preview value from sample rows
  const getPreviewValue = (colName: string): string => {
    if (!colName || sampleRows.length === 0) return '—';
    const val = sampleRows[0]?.[colName];
    return val !== undefined && val !== null ? String(val) : '—';
  };

  const getSecondPreview = (colName: string): string => {
    if (!colName || sampleRows.length < 2) return '';
    const val = sampleRows[1]?.[colName];
    return val !== undefined && val !== null ? String(val) : '';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-w-4xl mx-auto my-6 transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium mb-2 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Column Auto-Detection Active</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Excel Column Mapping Wizard
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Aapki file <span className="font-semibold text-white">"{fileName}"</span> me kul <span className="font-bold text-white">{headers.length} columns</span> hain. Kripya niche diye gaye 5 zaroori columns verify karein.
            </p>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-white/10 rounded-lg text-xs font-mono">
            {sampleRows.length} sample rows analyzed
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Core Required Columns Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <span>Required Primary Columns (अनिवार्य कॉलम्स)</span>
              <span className="text-xs font-normal normal-case text-amber-600 dark:text-amber-400">
                *Salary, Name aur Mobile/Email zaroori hain
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. EMPLOYEE NAME */}
            <div className={`p-4 rounded-lg border transition ${
              mapping.nameCol ? 'bg-slate-50 dark:bg-slate-800/60 border-blue-200 dark:border-blue-900/50' : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>1. Employee Name (कर्मचारी का नाम)</span>
                </label>
                {confidence?.nameCol === 'high' && mapping.nameCol && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Auto-Matched</span>
                  </span>
                )}
              </div>
              <select
                value={mapping.nameCol}
                onChange={(e) => handleChange('nameCol', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Select Employee Name Column --</option>
                {headers.map((h, idx) => (
                  <option key={`${h}_${idx}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              {mapping.nameCol && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2 truncate">
                  <span className="font-semibold text-slate-400">Sample:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {getPreviewValue(mapping.nameCol)}
                  </span>
                  {getSecondPreview(mapping.nameCol) && (
                    <span className="text-slate-400 truncate">
                      , {getSecondPreview(mapping.nameCol)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 2. NET SALARY / AMOUNT */}
            <div className={`p-4 rounded-lg border transition ${
              mapping.salaryCol ? 'bg-slate-50 dark:bg-slate-800/60 border-blue-200 dark:border-blue-900/50' : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>2. Net Salary / In-Hand (सैलरी की राशि)</span>
                </label>
                {confidence?.salaryCol === 'high' && mapping.salaryCol && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Auto-Matched</span>
                  </span>
                )}
              </div>
              <select
                value={mapping.salaryCol}
                onChange={(e) => handleChange('salaryCol', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Select Net Salary Column --</option>
                {headers.map((h, idx) => (
                  <option key={`${h}_${idx}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              {mapping.salaryCol && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2 truncate">
                  <span className="font-semibold text-slate-400">Sample:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {formatINR(parseSalaryNumber(getPreviewValue(mapping.salaryCol)))}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    (Raw: {getPreviewValue(mapping.salaryCol)})
                  </span>
                </div>
              )}
            </div>

            {/* 3. PHONE / WHATSAPP NUMBER */}
            <div className={`p-4 rounded-lg border transition ${
              mapping.phoneCol ? 'bg-slate-50 dark:bg-slate-800/60 border-blue-200 dark:border-blue-900/50' : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>3. Mobile / WhatsApp (व्हाट्सएप्प नंबर)</span>
                </label>
                {confidence?.phoneCol === 'high' && mapping.phoneCol && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Auto-Matched</span>
                  </span>
                )}
              </div>
              <select
                value={mapping.phoneCol}
                onChange={(e) => handleChange('phoneCol', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Select Phone / Mobile Column --</option>
                {headers.map((h, idx) => (
                  <option key={`${h}_${idx}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              {mapping.phoneCol && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2 truncate">
                  <span className="font-semibold text-slate-400">Sample:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {getPreviewValue(mapping.phoneCol)}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                    (Cleaned: +{cleanPhoneNumber(getPreviewValue(mapping.phoneCol)).clean})
                  </span>
                </div>
              )}
            </div>

            {/* 4. EMAIL ADDRESS */}
            <div className={`p-4 rounded-lg border transition ${
              mapping.emailCol ? 'bg-slate-50 dark:bg-slate-800/60 border-blue-200 dark:border-blue-900/50' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span>4. Official Email (ईमेल पता)</span>
                </label>
                {confidence?.emailCol === 'high' && mapping.emailCol && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Auto-Matched</span>
                  </span>
                )}
              </div>
              <select
                value={mapping.emailCol}
                onChange={(e) => handleChange('emailCol', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Select Email Column (Optional) --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              {mapping.emailCol && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2 truncate">
                  <span className="font-semibold text-slate-400">Sample:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {getPreviewValue(mapping.emailCol)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. SALARY MONTH / CYCLE */}
        <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-slate-800/40 border border-blue-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-sm font-semibold flex items-center space-x-2 text-slate-800 dark:text-slate-200">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>5. Salary Month / Cycle (सैलरी का महीना)</span>
            </label>
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setUseCustomMonth(false)}
                className={`px-2.5 py-1 rounded transition ${
                  !useCustomMonth
                    ? 'bg-blue-600 text-white font-medium shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                }`}
              >
                Pick from Sheet Column
              </button>
              <button
                type="button"
                onClick={() => setUseCustomMonth(true)}
                className={`px-2.5 py-1 rounded transition ${
                  useCustomMonth
                    ? 'bg-blue-600 text-white font-medium shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                }`}
              >
                Custom Month (Manual)
              </button>
            </div>
          </div>

          {!useCustomMonth ? (
            <div>
              <select
                value={mapping.monthCol}
                onChange={(e) => handleChange('monthCol', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Select Month Column from Sheet --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              {mapping.monthCol && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-2">
                  <span className="font-semibold text-slate-400">Sample Month:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {getPreviewValue(mapping.monthCol)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                placeholder="e.g. October 2026, Diwali Bonus, etc."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <span className="text-xs text-slate-500">
                (Sabhi employees ko is month ka notification jayega)
              </span>
            </div>
          )}
        </div>

        {/* Collapsible: Optional Additional Columns */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <span>Optional Details (Emp ID, Department, Bank Account, Gross Salary)</span>
              <span className="text-slate-400 font-normal">
                — Salary slip aur detailed WhatsApp message ke liye
              </span>
            </div>
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900">
              {/* Emp ID */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Employee ID / Code
                </label>
                <select
                  value={mapping.empIdCol || ''}
                  onChange={(e) => handleChange('empIdCol', e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                >
                  <option value="">-- None --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Department
                </label>
                <select
                  value={mapping.deptCol || ''}
                  onChange={(e) => handleChange('deptCol', e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                >
                  <option value="">-- None --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Designation / Role
                </label>
                <select
                  value={mapping.designationCol || ''}
                  onChange={(e) => handleChange('designationCol', e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                >
                  <option value="">-- None --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Account / UPI */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Bank Account / UPI
                </label>
                <select
                  value={mapping.accountCol || ''}
                  onChange={(e) => handleChange('accountCol', e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5"
                >
                  <option value="">-- None --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 6. SELECT USEFUL COLUMNS FOR MESSAGE TEMPLATE */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-indigo-900/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Template me add karne ke liye kaam ke columns chunein</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Sheet me se jo jo columns message me employees ko bhejne hain (jaise Basic Pay, Deductions, Days Present, Incentive) unhe tick karein:
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSelectAllTemplateCols}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-50 transition cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearTemplateCols}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Checkbox Grid for all columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 pt-1">
            {headers.map((h) => {
              const isSelected = selectedTemplateCols.includes(h);
              const isCore = h === mapping.nameCol || h === mapping.salaryCol || h === mapping.phoneCol || h === mapping.emailCol;
              const preview = getPreviewValue(h);
              return (
                <label
                  key={h}
                  className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition text-xs select-none ${
                    isSelected
                      ? 'bg-blue-100/70 dark:bg-blue-950/70 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleTemplateCol(h)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="truncate flex-1">
                    <div className="font-semibold truncate flex items-center space-x-1">
                      <span>{h}</span>
                      {isCore && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">(Core)</span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 truncate block">
                      Sample: {preview}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {selectedTemplateCols.length > 0 && (
            <div className="text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-between">
              <span>
                ✓ <strong>{selectedTemplateCols.length} columns</strong> selected for message template ({selectedTemplateCols.map(c => `{${c}}`).join(', ')})
              </span>
            </div>
          )}
        </div>

        {/* Live Mapping Preview Table */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Preview with Sample Row #1:
            </span>
            <span className="text-[11px] text-slate-400">
              Isi data ke aadhar par message aur dashboard banega
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Employee Name:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {getPreviewValue(mapping.nameCol)}
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Net Salary:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                {formatINR(parseSalaryNumber(getPreviewValue(mapping.salaryCol)))}
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Mobile / WhatsApp:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                {getPreviewValue(mapping.phoneCol)}
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Salary Month:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 truncate block">
                {useCustomMonth ? customMonth : getPreviewValue(mapping.monthCol)}
              </span>
            </div>
          </div>
        </div>

        {/* Validation warning if something is missing */}
        {!canProceed ? (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Kripya kam se kam <strong>Employee Name</strong> aur <strong>Net Salary</strong> column select karein.
            </span>
          </div>
        ) : (!isPhoneSelected && !isEmailSelected) ? (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Tip: Mobile/WhatsApp ya Email column nahi chuna gaya hai. Aap dashboard aur salary slip dekh sakenge, par direct WhatsApp/Email message dispatch ke liye phone/email column select karein.
            </span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Cancel
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={!canProceed}
            onClick={() => onConfirm(
              { ...mapping, selectedTemplateColumns: selectedTemplateCols },
              useCustomMonth ? customMonth : (getPreviewValue(mapping.monthCol) || 'Current Month')
            )}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 shadow-md transition ${
              canProceed
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Confirm & Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
