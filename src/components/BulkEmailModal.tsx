import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  Users
} from 'lucide-react';
import { EmployeeRecord, MessageTemplate } from '../types/payroll';
import { renderMessage } from '../lib/columnDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeRecord[];
  template: MessageTemplate;
  companyName: string;
  month: string;
  onMarkSent: (empId: string, channel: 'whatsapp' | 'email') => void;
}

export const BulkEmailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employees,
  template,
  companyName,
  month,
  onMarkSent,
}) => {
  const targetEmployees = employees.filter((e) => e.email && e.email.includes('@'));
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const handleSendGmail = (emp: EmployeeRecord) => {
    const subject = renderMessage(template.subject, {
      name: emp.name,
      salary: emp.formattedSalary,
      month: month || emp.month,
      company: companyName,
      empId: emp.empId,
      dept: emp.department,
      account: emp.account,
      rawRow: emp.rawRow,
    });

    const body = renderMessage(template.body, {
      name: emp.name,
      salary: emp.formattedSalary,
      month: month || emp.month,
      company: companyName,
      empId: emp.empId,
      dept: emp.department,
      account: emp.account,
      rawRow: emp.rawRow,
    });

    // Gmail compose URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      emp.email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, '_blank');
    onMarkSent(emp.id, 'email');
  };

  const handleCopyAllEmails = () => {
    const allEmails = targetEmployees.map((e) => e.email).join(', ');
    navigator.clipboard.writeText(allEmails);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Email Salary Intimations ({targetEmployees.length} recipients)
              </h3>
              <p className="text-xs text-slate-500">
                Direct Gmail compose link with personalized salary advisory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Click 'Draft in Gmail' for any employee or copy all email IDs:
          </span>
          <button
            type="button"
            onClick={handleCopyAllEmails}
            className="px-3 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 flex items-center space-x-1.5 transition"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? 'Copied!' : 'Copy All Emails (BCC)'}</span>
          </button>
        </div>

        {/* List of Employees */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {targetEmployees.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No employees have an email address mapped.
            </div>
          ) : (
            targetEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 transition text-xs"
              >
                <div className="truncate pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {emp.name}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {emp.formattedSalary}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] truncate block">
                    {emp.email}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {emp.emailStatus === 'sent' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sent</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSendGmail(emp)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-xs transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Draft in Gmail</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
