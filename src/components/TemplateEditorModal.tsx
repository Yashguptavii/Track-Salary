import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Smartphone, 
  Copy, 
  Check, 
  Sparkles, 
  Send, 
  Settings2,
  HelpCircle
} from 'lucide-react';
import { MessageTemplate } from '../types/payroll';
import { DEFAULT_TEMPLATES, renderMessage, generateTemplateFromSelectedColumns } from '../lib/columnDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: MessageTemplate;
  companyName: string;
  selectedColumns?: string[];
  availableHeaders?: string[];
  sampleRow?: Record<string, string | number>;
  onSave: (template: MessageTemplate, companyName: string) => void;
}

export const TemplateEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTemplate,
  companyName: initialCompanyName,
  selectedColumns = [],
  availableHeaders = [],
  sampleRow,
  onSave,
}) => {
  const [template, setTemplate] = useState<MessageTemplate>(currentTemplate);
  const [company, setCompany] = useState(initialCompanyName || 'TechCorp Pvt Ltd');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sampleRender = renderMessage(template.body, {
    name: 'Aarav Sharma',
    salary: '₹85,500',
    month: 'October 2026',
    company: company,
    empId: 'EMP-1001',
    dept: 'Engineering',
    account: '•••• 8912',
    rawRow: sampleRow,
  });

  const insertVariable = (token: string) => {
    setTemplate((prev) => ({
      ...prev,
      body: prev.body + ' ' + token,
    }));
  };

  const handleAutoBuildFromColumns = (lang: 'hinglish' | 'hi' | 'en') => {
    const generated = generateTemplateFromSelectedColumns(
      selectedColumns.length > 0 ? selectedColumns : availableHeaders.slice(0, 6),
      company,
      lang
    );
    setTemplate(generated);
  };

  const handleApplyPreset = (t: MessageTemplate) => {
    setTemplate({ ...t });
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleRender);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customize Salary Notification Message
              </h3>
              <p className="text-xs text-slate-500">
                WhatsApp, Email aur SMS ke liye message format customize karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Editor */}
          <div className="lg:col-span-7 space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Organization Name (कंपनी का नाम):
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Industries Ltd"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quick Template Presets:
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleApplyPreset(t)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                      template.id === t.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject for Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Subject Line (ईमेल विषय):
              </label>
              <input
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message Content (WhatsApp / Email Body):
                </label>
                <span className="text-[11px] text-slate-400">
                  Supports emojis & formatting (*bold*)
                </span>
              </div>
              <textarea
                rows={8}
                value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* Variable Tags to Click & Insert */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Standard Smart Tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{name}', label: 'Employee Name' },
                  { tag: '{salary}', label: 'Net Salary' },
                  { tag: '{month}', label: 'Month' },
                  { tag: '{company}', label: 'Company' },
                  { tag: '{empId}', label: 'Emp ID' },
                  { tag: '{dept}', label: 'Dept' },
                  { tag: '{account}', label: 'Bank A/C' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertVariable(item.tag)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    + {item.tag} <span className="opacity-70">({item.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Sheet Column Tags */}
            {selectedColumns && selectedColumns.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Aapki Sheet Ke Kaam Ke Columns (Click to insert):</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutoBuildFromColumns('hinglish')}
                      className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition cursor-pointer"
                      title="Auto build Hinglish template with these columns"
                    >
                      ⚡ Auto-Format Hinglish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoBuildFromColumns('hi')}
                      className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition cursor-pointer"
                      title="Auto build Hindi template with these columns"
                    >
                      ⚡ Auto-Format Hindi
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {selectedColumns.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => insertVariable(`{${col}}`)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition shadow-xs cursor-pointer"
                    >
                      + {'{' + col + '}'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Live Phone Simulator Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-[320px] bg-slate-900 rounded-[32px] p-3 shadow-2xl border-4 border-slate-700 text-white">
              {/* Phone Top Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mr-2" />
                <div className="w-2 h-2 rounded-full bg-slate-900" />
              </div>

              {/* WhatsApp Chat Bar */}
              <div className="bg-[#075E54] text-white px-3 py-2 rounded-t-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-300 text-emerald-950 font-bold flex items-center justify-center text-[10px]">
                    {company ? company[0] : 'C'}
                  </div>
                  <div>
                    <p className="font-bold leading-tight">{company || 'Company Payroll'}</p>
                    <p className="text-[10px] text-emerald-200">Official Salary Bot</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Message Bubble Area */}
              <div className="bg-[#E5DDD5] dark:bg-[#0b141a] p-3 rounded-b-xl min-h-[300px] flex flex-col justify-end text-slate-900 dark:text-white">
                <div className="bg-white dark:bg-[#202c33] rounded-lg p-3 text-xs shadow-md border-l-4 border-emerald-500 whitespace-pre-wrap leading-relaxed relative">
                  {sampleRender}
                  <div className="text-[9px] text-slate-400 text-right mt-1.5 flex items-center justify-end space-x-1">
                    <span>10:30 AM</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopySample}
              className="mt-3 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Sample Copied!' : 'Copy Sample Text'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(template, company);
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition"
          >
            Save Template Changes
          </button>
        </div>
      </div>
    </div>
  );
};
