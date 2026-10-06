import React from 'react';
import { ActivityLog } from '../types/payroll';
import { 
  X, 
  Clock, 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  History,
  Trash2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onClearLogs: () => void;
}

export const ActivityLogDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Dispatch & Update Activity Log
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No activity recorded yet. Send a WhatsApp or email message to see tracking here.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    {log.channel === 'whatsapp' ? (
                      <span className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                        <MessageSquare className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-600">
                        <Mail className="w-3 h-3" />
                      </span>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {log.employeeName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/40">
          Showing real-time audit trail of all outgoing salary updates
        </div>
      </div>
    </div>
  );
};
