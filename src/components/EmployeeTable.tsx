import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  Building
} from 'lucide-react';
import { EmployeeRecord, DispatchStatus } from '../types/payroll';
import { formatINR } from '../lib/columnDetector';

interface Props {
  employees: EmployeeRecord[];
  onSendWhatsApp: (emp: EmployeeRecord) => void;
  onSendEmail: (emp: EmployeeRecord) => void;
  onViewSalarySlip: (emp: EmployeeRecord) => void;
  onUpdateStatus: (empId: string, channel: 'whatsapp' | 'email', status: DispatchStatus) => void;
  onBatchUpdateStatus?: (empIds: string[], channel: 'whatsapp' | 'email', status: DispatchStatus) => void;
}

export const EmployeeTable: React.FC<Props> = ({
  employees,
  onSendWhatsApp,
  onSendEmail,
  onViewSalarySlip,
  onUpdateStatus,
  onBatchUpdateStatus,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'whatsapp_sent' | 'email_sent'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'salary_desc' | 'salary_asc'>('salary_desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering
  const filtered = employees.filter((emp) => {
    const term = search.toLowerCase();
    const empName = String(emp.name || '').toLowerCase();
    const empPhone = String(emp.phone || '');
    const empEmail = String(emp.email || '').toLowerCase();
    const empId = String(emp.empId || '').toLowerCase();
    const empDept = String(emp.department || '').toLowerCase();

    const matchesSearch =
      empName.includes(term) ||
      empPhone.includes(term) ||
      empEmail.includes(term) ||
      empId.includes(term) ||
      empDept.includes(term);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') {
      return emp.whatsappStatus !== 'sent' && emp.emailStatus !== 'sent';
    }
    if (statusFilter === 'whatsapp_sent') {
      return emp.whatsappStatus === 'sent';
    }
    if (statusFilter === 'email_sent') {
      return emp.emailStatus === 'sent';
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'salary_desc') return (b.salary || 0) - (a.salary || 0);
    if (sortBy === 'salary_asc') return (a.salary || 0) - (b.salary || 0);
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sorted.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchMark = (channel: 'whatsapp' | 'email', status: DispatchStatus) => {
    if (onBatchUpdateStatus && selectedIds.length > 0) {
      onBatchUpdateStatus(selectedIds, channel, status);
      setSelectedIds([]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Employee Name, Phone, Email, Department..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('whatsapp_sent')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                statusFilter === 'whatsapp_sent'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              WhatsApp Sent
            </button>
            <button
              onClick={() => setStatusFilter('email_sent')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                statusFilter === 'email_sent'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Email Sent
            </button>
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="salary_desc">Salary: High to Low</option>
            <option value="salary_asc">Salary: Low to High</option>
            <option value="name">Employee Name: A-Z</option>
          </select>
        </div>
      </div>

      {/* Bulk action floating strip if items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/80 px-4 py-2 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs animate-in fade-in">
          <span className="font-semibold text-blue-900 dark:text-blue-200">
            {selectedIds.length} employee(s) selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBatchMark('whatsapp', 'sent')}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark WhatsApp Sent</span>
            </button>
            <button
              onClick={() => handleBatchMark('email', 'sent')}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Email Sent</span>
            </button>
            <button
              onClick={() => {
                handleBatchMark('whatsapp', 'pending');
                handleBatchMark('email', 'pending');
              }}
              className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-300 font-medium"
            >
              Reset to Pending
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length === sorted.length && sorted.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="py-3 px-4">Employee Information</th>
              <th className="py-3 px-4">Department & Role</th>
              <th className="py-3 px-4">Net Salary Payable</th>
              <th className="py-3 px-4">WhatsApp Status</th>
              <th className="py-3 px-4">Email Status</th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No employees found matching filter criteria.
                </td>
              </tr>
            ) : (
              sorted.map((emp) => (
                <tr
                  key={emp.id}
                  className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition ${
                    selectedIds.includes(emp.id) ? 'bg-blue-50/40 dark:bg-blue-950/40' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={() => handleToggleSelect(emp.id)}
                      className="rounded border-slate-300"
                    />
                  </td>

                  {/* Employee Info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {String(emp.name || 'EM')
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'EM'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{emp.name}</span>
                          {emp.empId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                              {emp.empId}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                          {emp.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>{emp.phone}</span>
                            </span>
                          )}
                          {emp.email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-blue-400" />
                              <span className="truncate max-w-[130px]">{emp.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Department & Role */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {emp.department || 'General Staff'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {emp.designation || 'Employee'}
                    </div>
                  </td>

                  {/* Net Salary */}
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      {emp.formattedSalary}
                    </div>
                    {emp.account && (
                      <div className="text-[10px] text-slate-400">
                        A/C: {emp.account}
                      </div>
                    )}
                  </td>

                  {/* WhatsApp Status */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={emp.whatsappStatus}
                        onChange={(e) => onUpdateStatus(emp.id, 'whatsapp', e.target.value as DispatchStatus)}
                        className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer ${
                          emp.whatsappStatus === 'sent'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : emp.whatsappStatus === 'failed'
                            ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="sent">✅ Sent</option>
                        <option value="failed">❌ Failed</option>
                        <option value="skipped">⏭️ Skipped</option>
                      </select>
                    </div>
                  </td>

                  {/* Email Status */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={emp.emailStatus}
                        onChange={(e) => onUpdateStatus(emp.id, 'email', e.target.value as DispatchStatus)}
                        className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer ${
                          emp.emailStatus === 'sent'
                            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            : emp.emailStatus === 'failed'
                            ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="sent">✅ Sent</option>
                        <option value="failed">❌ Failed</option>
                        <option value="skipped">⏭️ Skipped</option>
                      </select>
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* WhatsApp Button */}
                      {emp.phone && (
                        <button
                          type="button"
                          onClick={() => onSendWhatsApp(emp)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-600 transition"
                          title={`Send WhatsApp to ${emp.name} (${emp.phone})`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Email Button */}
                      {emp.email && (
                        <button
                          type="button"
                          onClick={() => onSendEmail(emp)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-600 transition"
                          title={`Email Salary Intimation to ${emp.email}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Salary Slip */}
                      <button
                        type="button"
                        onClick={() => onViewSalarySlip(emp)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                        title="View Official Salary Slip"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {sorted.length} of {employees.length} employees</span>
        <span>Click WhatsApp / Email icon to launch pre-formatted salary message instantly</span>
      </div>
    </div>
  );
};
