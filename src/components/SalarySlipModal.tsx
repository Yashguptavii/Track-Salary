import React, { useRef } from 'react';
import { X, Printer, IndianRupee, Download, Building2, CheckCircle2 } from 'lucide-react';
import { EmployeeRecord } from '../types/payroll';
import { formatINR } from '../lib/columnDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
  companyName: string;
  month: string;
}

export const SalarySlipModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  companyName,
  month,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  // Extract raw details if available
  const gross = employee.gross || employee.salary;
  const deductions = employee.deductions || 0;
  const net = employee.salary;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 print:hidden">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Official Salary Slip / वेतन पर्ची
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Container */}
        <div ref={printRef} className="p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <h1 className="text-xl font-extrabold uppercase tracking-wider text-slate-900">
              {companyName || 'TECHCORP SOLUTIONS PVT LTD'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Corporate Payroll Office • Salary Slip for the Month of {month || employee.month}
            </p>
          </div>

          {/* Employee & Bank Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Employee Name</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{employee.name}</p>

              <div className="mt-2.5">
                <p className="text-slate-500 text-[10px] uppercase font-bold">Employee ID</p>
                <p className="font-semibold text-slate-800">{employee.empId || 'EMP-N/A'}</p>
              </div>

              <div className="mt-2.5">
                <p className="text-slate-500 text-[10px] uppercase font-bold">Department / Role</p>
                <p className="font-medium text-slate-800">
                  {employee.department || 'Operations'} {employee.designation ? `• ${employee.designation}` : ''}
                </p>
              </div>
            </div>

            <div>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Payment Cycle</p>
              <p className="font-bold text-sm text-blue-700 mt-0.5">{month || employee.month}</p>

              <div className="mt-2.5">
                <p className="text-slate-500 text-[10px] uppercase font-bold">Bank A/C / UPI</p>
                <p className="font-semibold text-slate-800">{employee.account || 'Direct Bank Deposit'}</p>
              </div>

              <div className="mt-2.5">
                <p className="text-slate-500 text-[10px] uppercase font-bold">Contact</p>
                <p className="font-medium text-slate-700">{employee.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Salary Breakdown Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6 text-xs">
            <div className="grid grid-cols-2 bg-slate-100 font-bold border-b border-slate-300 py-2 px-3">
              <span>Earnings</span>
              <span className="text-right">Amount (₹)</span>
            </div>
            <div className="divide-y divide-slate-200">
              <div className="grid grid-cols-2 py-2 px-3">
                <span className="text-slate-700">Gross Remuneration / Base</span>
                <span className="text-right font-medium">{formatINR(gross)}</span>
              </div>
              {deductions > 0 && (
                <div className="grid grid-cols-2 py-2 px-3 text-red-600">
                  <span>Statutory Deductions (PF, Tax, ESI)</span>
                  <span className="text-right font-medium">- {formatINR(deductions)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 py-3 px-3 bg-emerald-50 text-emerald-900 font-extrabold text-sm border-t-2 border-emerald-500">
                <span>NET TAKE-HOME SALARY</span>
                <span className="text-right text-emerald-700">{formatINR(net)}</span>
              </div>
            </div>
          </div>

          {/* Verification Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-dashed border-slate-300 text-[11px] text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Payment Status: Processed</p>
              <p className="mt-0.5">This is a system generated salary slip.</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-slate-400 w-36 mb-1" />
              <p className="font-semibold text-slate-700">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
