import React from 'react';
import { X, Calendar, Database, FileSpreadsheet, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatINR } from '../lib/columnDetector';

interface BatchSummary {
  id: string;
  month: string;
  fileName: string;
  totalAmount: number;
  employeeCount: number;
  uploadedAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batches: BatchSummary[];
  activeBatchId?: string;
  onSelectBatch: (batchId: string) => void;
  isLoading: boolean;
}

export const BatchHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  batches,
  activeBatchId,
  onSelectBatch,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Cloud Payroll Records & History</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  Firestore Active
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pichhle sabhi mahino ke salary sheets aur dispatch records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">Loading records from Cloud Firestore...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Abhi tak koi pichhla record nahi hai
              </p>
              <p className="text-xs">
                Aap jo bhi Excel sheet upload karenge, wo automatic is cloud database me save hoti jayegi.
              </p>
            </div>
          ) : (
            batches.map((b) => {
              const isActive = b.id === activeBatchId;
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {b.month}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Currently Active</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-3">
                      <span>📄 {b.fileName}</span>
                      <span>•</span>
                      <span>👥 {b.employeeCount} Employees</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(b.totalAmount)}
                      </span>
                    </div>
                    {b.uploadedAt && (
                      <span className="text-[10px] text-slate-400 block">
                        Saved: {b.uploadedAt}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectBatch(b.id);
                      onClose();
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{isActive ? 'View Dashboard' : 'Open This Month'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
          <span>Total Saved Cycles: {batches.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
