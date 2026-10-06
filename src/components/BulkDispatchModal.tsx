import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  SkipForward, 
  ExternalLink, 
  AlertCircle,
  Play,
  Pause,
  PartyPopper
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmployeeRecord, MessageTemplate } from '../types/payroll';
import { renderMessage, formatINR } from '../lib/columnDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeRecord[];
  template: MessageTemplate;
  companyName: string;
  month: string;
  onMarkSent: (empId: string, channel: 'whatsapp' | 'email') => void;
}

export const BulkDispatchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employees,
  template,
  companyName,
  month,
  onMarkSent,
}) => {
  // Only target employees who haven't received whatsapp or all pending
  const targetEmployees = employees.filter((e) => e.phone && e.cleanPhone);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Find first pending employee
      const firstPending = targetEmployees.findIndex((e) => e.whatsappStatus !== 'sent');
      setCurrentIndex(firstPending !== -1 ? firstPending : 0);
      setIsFinished(firstPending === -1 && targetEmployees.length > 0);
    }
  }, [isOpen, employees]);

  if (!isOpen) return null;

  const currentEmp = targetEmployees[currentIndex];

  const getMessageForEmp = (emp: EmployeeRecord) => {
    return renderMessage(template.body, {
      name: emp.name,
      salary: emp.formattedSalary,
      month: month || emp.month,
      company: companyName,
      empId: emp.empId,
      dept: emp.department,
      account: emp.account,
      rawRow: emp.rawRow,
    });
  };

  const handleSendCurrent = () => {
    if (!currentEmp) return;

    const messageText = getMessageForEmp(currentEmp);
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${currentEmp.cleanPhone}?text=${encoded}`;

    // Open WhatsApp in new tab / app
    window.open(whatsappUrl, '_blank');

    // Mark as sent
    onMarkSent(currentEmp.id, 'whatsapp');

    // Move to next
    if (currentIndex + 1 < targetEmployees.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleSkipCurrent = () => {
    if (currentIndex + 1 < targetEmployees.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sequential WhatsApp Dispatch Queue
              </h3>
              <p className="text-xs text-slate-500">
                Browser pop-up block se bachne ke liye har employee ko 1-click me direct send karein
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

        {/* Body */}
        <div className="p-6">
          {targetEmployees.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No employees found with valid mobile/WhatsApp numbers.
            </div>
          ) : isFinished ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <PartyPopper className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                All Salary Notifications Processed! 🎉
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Sabhi employees ki salary details WhatsApp queue dwara bhej di gayi hain aur dashboard status update ho gaya hai.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md"
              >
                Back to Dashboard
              </button>
            </div>
          ) : currentEmp ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1.5">
                  <span>
                    Queue Progress: Employee {currentIndex + 1} of {targetEmployees.length}
                  </span>
                  <span>
                    {Math.round(((currentIndex) / targetEmployees.length) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${((currentIndex) / targetEmployees.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Employee Highlight Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Next in Queue
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {currentEmp.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentEmp.department || 'Staff'} • {currentEmp.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Net Salary
                    </span>
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {currentEmp.formattedSalary}
                    </span>
                  </div>
                </div>

                {/* Message Preview */}
                <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                  {getMessageForEmp(currentEmp)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSkipCurrent}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip this Employee</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendCurrent}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold flex items-center space-x-2 shadow-md transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send on WhatsApp ({currentEmp.name.split(' ')[0]})</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
