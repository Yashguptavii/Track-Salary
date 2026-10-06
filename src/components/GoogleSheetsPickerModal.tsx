import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  FileSpreadsheet, 
  Search, 
  Link as LinkIcon, 
  ArrowRight, 
  AlertCircle, 
  Check, 
  Loader2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  DriveSheetFile, 
  fetchDriveSpreadsheets, 
  fetchSpreadsheetData, 
  extractSpreadsheetId 
} from '../lib/googleSheets';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onSheetSelected: (fileName: string, headers: string[], rows: Record<string, string | number>[]) => void;
}

export const GoogleSheetsPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  googleUser,
  onGoogleSignIn,
  onSheetSelected,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'drive'>('url');
  const [sheetUrl, setSheetUrl] = useState('');
  const [driveFiles, setDriveFiles] = useState<DriveSheetFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && googleUser && activeTab === 'drive') {
      loadDriveFiles();
    }
  }, [isOpen, googleUser, activeTab]);

  const loadDriveFiles = async () => {
    setLoadingDrive(true);
    setErrorMessage(null);
    try {
      const files = await fetchDriveSpreadsheets();
      setDriveFiles(files);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Could not fetch Drive sheets');
    } finally {
      setLoadingDrive(false);
    }
  };

  const parseCsvText = (csvText: string, fallbackTitle: string) => {
    const workbook = XLSX.read(csvText, { type: 'string' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawMatrix = XLSX.utils.sheet_to_json<(string | number)[]>(firstSheet, { header: 1 });

    if (!rawMatrix || rawMatrix.length === 0) {
      throw new Error('Spreadsheet contains no data.');
    }

    // Best header detection
    let bestHeaderRowIndex = 0;
    let maxHeaderScore = -1;
    const headerKeywords = /name|emp|salary|pay|mobile|phone|email|amount|month|code|id|basic|hra|pf|total/i;

    for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
      const row = rawMatrix[r] || [];
      const stringCells = row.filter((c) => typeof c === 'string' && c.trim().length > 0);
      const matchingKeywords = stringCells.filter((c) => headerKeywords.test(String(c))).length;
      const score = stringCells.length * 2 + matchingKeywords * 4;
      if (score > maxHeaderScore && stringCells.length >= 2) {
        maxHeaderScore = score;
        bestHeaderRowIndex = r;
      }
    }

    const headers = (rawMatrix[bestHeaderRowIndex] || []).map((h, i) => String(h ?? '').trim() || `Col_${i + 1}`);
    const dataRows: Record<string, string | number>[] = [];

    for (let r = bestHeaderRowIndex + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r] || [];
      if (row.length === 0 || row.every((c) => !c)) continue;
      const obj: Record<string, string | number> = {};
      let hasVal = false;
      headers.forEach((h, idx) => {
        const val = row[idx];
        if (val !== undefined && val !== null && val !== '') {
          hasVal = true;
          obj[h] = val;
        } else {
          obj[h] = '';
        }
      });
      if (hasVal) dataRows.push(obj);
    }

    onSheetSelected(fallbackTitle, headers, dataRows);
    onClose();
  };

  const handleSelectSpreadsheet = async (spreadsheetId: string, sheetTitle?: string) => {
    setLoadingSheet(true);
    setErrorMessage(null);

    // 1. Try Google Workspace API if signed in
    if (googleUser) {
      try {
        const result = await fetchSpreadsheetData(spreadsheetId);
        if (result.rows && result.rows.length > 0) {
          const rawHeaders = result.rows[0].map((h) => String(h || '').trim()).filter(Boolean);
          const dataRows = result.rows.slice(1).map((row) => {
            const obj: Record<string, string | number> = {};
            rawHeaders.forEach((h, idx) => {
              obj[h] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
            });
            return obj;
          });
          onSheetSelected(sheetTitle || result.title, rawHeaders, dataRows);
          onClose();
          return;
        }
      } catch (apiErr) {
        console.warn('API fetch attempt failed, trying export format:', apiErr);
      }
    }

    // 2. Try export CSV link (works seamlessly for shared/public sheets)
    try {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      const res = await fetch(exportUrl);
      if (res.ok) {
        const csv = await res.text();
        parseCsvText(csv, sheetTitle || 'Google_Salary_Sheet');
        return;
      }
      throw new Error('Google Sheet access denied. Kripya check karein ki sheet me "Anyone with the link can view" permission hai.');
    } catch (err: unknown) {
      console.error('Error opening sheet:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Google Sheet load nahi ho saki. Kripya URL check karein ya Google sign-in karein.'
      );
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setErrorMessage('Please enter a valid Google Sheets URL or Spreadsheet ID.');
      return;
    }
    handleSelectSpreadsheet(spreadsheetId);
  };

  if (!isOpen) return null;

  const filteredFiles = driveFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import from Google Sheets
              </h3>
              <p className="text-xs text-slate-500">
                Google Spreadsheet link paste karein ya Drive se browse karein
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

        {/* Modal Body */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Tab Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activeTab === 'url'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                1. Paste Google Sheet Link
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('drive')}
                className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activeTab === 'drive'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                2. Browse Google Drive {googleUser ? `(${googleUser.displayName?.split(' ')[0]})` : ''}
              </button>
            </div>

            {/* TAB 1: PASTE URL */}
            {activeTab === 'url' && (
              <form onSubmit={handleUrlSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Google Sheet Link or Spreadsheet ID:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Public link ya Google account se accessible link paste karein.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loadingSheet || !sheetUrl.trim()}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loadingSheet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching Sheet Columns & Rows...</span>
                    </>
                  ) : (
                    <>
                      <span>Load Sheet & Map Columns</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: BROWSE DRIVE */}
            {activeTab === 'drive' && (
              <div className="space-y-3 pt-2">
                {!googleUser ? (
                  <div className="text-center py-6 border border-dashed rounded-xl p-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                      Google Drive ki files direct browse karne ke liye Google sign-in karein:
                    </p>
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      className="px-5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-white text-xs font-semibold inline-flex items-center space-x-2 shadow-xs cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search spreadsheets in Google Drive..."
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={loadDriveFiles}
                        className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {loadingDrive ? (
                      <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading Google Drive spreadsheets...</span>
                      </div>
                    ) : filteredFiles.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No spreadsheets found in your Drive matching "{searchQuery}".
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                        {filteredFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => handleSelectSpreadsheet(file.id, file.name)}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 cursor-pointer transition text-xs"
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {file.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 ml-2">
                              Select →
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
