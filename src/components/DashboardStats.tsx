import React from 'react';
import { 
  Users, 
  IndianRupee, 
  Send, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Mail, 
  Download,
  Settings2,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import { formatINR } from '../lib/columnDetector';

interface Props {
  totalPayroll: number;
  totalEmployees: number;
  whatsappSentCount: number;
  emailSentCount: number;
  pendingCount: number;
  month: string;
  onUploadNewSheet: () => void;
  onOpenTemplateEditor: () => void;
  onStartBulkWhatsApp: () => void;
  onStartBulkEmail: () => void;
  onExportReport: () => void;
}

export const DashboardStats: React.FC<Props> = ({
  totalPayroll,
  totalEmployees,
  whatsappSentCount,
  emailSentCount,
  pendingCount,
  month,
  onUploadNewSheet,
  onOpenTemplateEditor,
  onStartBulkWhatsApp,
  onStartBulkEmail,
  onExportReport,
}) => {
  const avgSalary = totalEmployees > 0 ? Math.round(totalPayroll / totalEmployees) : 0;
  const totalSent = whatsappSentCount + emailSentCount;
  const dispatchProgress = totalEmployees > 0 ? Math.round((totalSent / (totalEmployees * 2)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top Banner with Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
              {month || 'Active Cycle'}
            </span>
            <span className="text-xs text-slate-500">
              Payroll Tracking & Dispatch Center
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Company Salary Dispatch Dashboard
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUploadNewSheet}
            className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-98 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            title="Import another Excel or Google Sheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-200" />
            <span>➕ Upload Sheet (Excel/Google)</span>
          </button>

          <button
            type="button"
            onClick={onStartBulkWhatsApp}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send All via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onStartBulkEmail}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Bulk Email Intimation</span>
          </button>

          <button
            type="button"
            onClick={onOpenTemplateEditor}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Edit message wording and templates"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={onExportReport}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Export updated status report to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Payroll */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Total Monthly Payroll</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatINR(totalPayroll)}
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Avg: {formatINR(avgSalary)} / employee</span>
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Total Employees</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalEmployees}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Across registered departments
          </p>
        </div>

        {/* WhatsApp Dispatched */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>WhatsApp Sent</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {whatsappSentCount} <span className="text-xs font-normal text-slate-400">/ {totalEmployees}</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500">
            {totalEmployees > 0 ? `${Math.round((whatsappSentCount / totalEmployees) * 100)}% notified on mobile` : '0%'}
          </div>
        </div>

        {/* Pending Notifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
            <span>Pending Notifications</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {pendingCount}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Awaiting dispatch or confirmation
          </p>
        </div>
      </div>
    </div>
  );
};
