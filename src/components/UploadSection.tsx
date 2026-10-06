import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Sparkles, 
  AlertCircle,
  FolderOpen,
  ClipboardPaste,
  ArrowRight,
  Layers,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { SAMPLE_SALARY_SHEET_DATA } from '../data/sampleSalarySheet';
import { extractSpreadsheetId, fetchSpreadsheetData } from '../lib/googleSheets';
import { cleanCellValue, cleanHeaderValue } from '../lib/columnDetector';
import { User } from 'firebase/auth';

interface Props {
  onDataLoaded: (
    fileName: string, 
    headers: string[], 
    rows: Record<string, string | number>[], 
    sourceType: 'excel' | 'google-sheets' | 'sample'
  ) => void;
  onOpenGoogleSheetsModal: () => void;
  isGoogleConnected: boolean;
  googleUser?: User | null;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
}

export const UploadSection: React.FC<Props> = ({
  onDataLoaded,
  onOpenGoogleSheetsModal,
  isGoogleConnected,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'google' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-sheet workbook state
  const [detectedWorkbook, setDetectedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');

  // Paste table data state
  const [pastedText, setPastedText] = useState('');

  // Direct Google Sheet URL
  const [directGoogleUrl, setDirectGoogleUrl] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Ultra-tolerant and bulletproof parser for any Excel / CSV worksheet
  const parseWorksheetWithSmartHeaders = (
    worksheet: XLSX.WorkSheet,
    fileName: string,
    sourceType: 'excel' | 'google-sheets' | 'sample'
  ) => {
    // 1. Convert sheet to 2D matrix
    const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (!matrix || matrix.length === 0) {
      throw new Error('Sheet khali hai (Sheet is empty). Kripya data wali file upload karein.');
    }

    // Filter out completely blank rows
    const validRows = matrix.filter((row) => 
      Array.isArray(row) && row.some((c) => c !== undefined && c !== null && String(c).trim() !== '')
    );

    if (validRows.length === 0) {
      throw new Error('Sheet me koi data nahi mila.');
    }

    // If only 1 row exists in the entire sheet
    if (validRows.length === 1) {
      const headers = validRows[0].map((h, i) => cleanHeaderValue(h, i));
      const singleRow: Record<string, string | number> = {};
      headers.forEach((h, i) => {
        singleRow[h] = cleanCellValue(validRows[0][i]);
      });
      onDataLoaded(fileName, headers, [singleRow], sourceType);
      return;
    }

    // Locate the header row: Look at the first 15 rows for the row with the most non-empty columns
    let bestHeaderIdx = 0;
    let maxCols = 0;

    for (let r = 0; r < Math.min(validRows.length, 15); r++) {
      const row = validRows[r];
      const count = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length;
      if (count > maxCols) {
        maxCols = count;
        bestHeaderIdx = r;
      }
    }

    const rawHeaders = validRows[bestHeaderIdx] || [];
    const cleanHeaders = rawHeaders.map((h, i) => cleanHeaderValue(h, i));

    // All rows after the header row are data rows
    const dataRows: Record<string, string | number>[] = [];
    for (let r = bestHeaderIdx + 1; r < validRows.length; r++) {
      const row = validRows[r];
      const obj: Record<string, string | number> = {};
      let hasValue = false;

      cleanHeaders.forEach((h, colIdx) => {
        const rawVal = row[colIdx];
        const cleaned = cleanCellValue(rawVal);
        obj[h] = cleaned;
        if (cleaned !== '') {
          hasValue = true;
        }
      });

      if (hasValue) {
        dataRows.push(obj);
      }
    }

    // Fallback: If no rows found after guessed header row, assume Row 0 is header
    if (dataRows.length === 0) {
      const fallbackHeaders = validRows[0].map((h, i) => cleanHeaderValue(h, i));
      for (let r = 1; r < validRows.length; r++) {
        const row = validRows[r];
        const obj: Record<string, string | number> = {};
        let hasValue = false;
        fallbackHeaders.forEach((h, colIdx) => {
          const cleaned = cleanCellValue(row[colIdx]);
          obj[h] = cleaned;
          if (cleaned !== '') hasValue = true;
        });
        if (hasValue) dataRows.push(obj);
      }
      onDataLoaded(fileName, fallbackHeaders, dataRows, sourceType);
      return;
    }

    onDataLoaded(fileName, cleanHeaders, dataRows, sourceType);
  };

  // Modern, multi-strategy async file reader
  const processFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setCurrentFileName(file.name);

    try {
      // Read array buffer using modern web standard
      const arrayBuffer = await file.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('File khali hai ya read nahi ho saki.');
      }

      const uint8 = new Uint8Array(arrayBuffer);
      let workbook: XLSX.WorkBook | null = null;

      // Strategy A: Standard Uint8Array reading (works for 99.9% of XLSX, XLS, and ODS)
      try {
        workbook = XLSX.read(uint8, { type: 'array', cellDates: true });
      } catch (errA) {
        console.warn('Strategy A (array) failed, trying Strategy B (binary string):', errA);
      }

      // Strategy B: Binary string reading (SheetJS legacy fallback)
      if (!workbook) {
        try {
          let binary = '';
          const len = uint8.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          workbook = XLSX.read(binary, { type: 'binary', cellDates: true });
        } catch (errB) {
          console.warn('Strategy B (binary) failed, trying Strategy C (text/csv):', errB);
        }
      }

      // Strategy C: TextDecoder for CSV / TSV files
      if (!workbook) {
        try {
          const text = new TextDecoder('utf-8').decode(arrayBuffer);
          workbook = XLSX.read(text, { type: 'string' });
        } catch (errC) {
          console.error('All 3 read strategies failed:', errC);
          throw new Error('Excel file read nahi ho saki. Kripya check karein ki file valid .xlsx ya .csv hai.');
        }
      }

      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Workbook contains no readable sheets.');
      }

      // Find the best sheet that actually contains rows
      let targetSheet = workbook.SheetNames[0];
      let maxRows = 0;

      for (const sName of workbook.SheetNames) {
        const s = workbook.Sheets[sName];
        if (s) {
          const raw = XLSX.utils.sheet_to_json(s, { header: 1 });
          if (raw.length > maxRows) {
            maxRows = raw.length;
            targetSheet = sName;
          }
        }
      }

      setDetectedWorkbook(workbook);
      setAvailableSheets(workbook.SheetNames);
      setSelectedSheetName(targetSheet);

      const chosenSheet = workbook.Sheets[targetSheet];
      if (!chosenSheet) {
        throw new Error('Selected sheet is empty.');
      }

      parseWorksheetWithSmartHeaders(chosenSheet, file.name, 'excel');
    } catch (err: unknown) {
      console.error('Error parsing sheet:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Excel file load karne me samasya aayi. Kripya .xlsx ya .csv file check karein.'
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSheetTabChange = (sheetName: string) => {
    if (!detectedWorkbook) return;
    try {
      setSelectedSheetName(sheetName);
      const ws = detectedWorkbook.Sheets[sheetName];
      if (ws) {
        parseWorksheetWithSmartHeaders(ws, currentFileName || 'Salary_Sheet.xlsx', 'excel');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Sheet read error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Direct Google Sheet fetch
  const handleDirectGoogleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directGoogleUrl.trim()) return;

    setGoogleLoading(true);
    setErrorMessage(null);

    const spreadsheetId = extractSpreadsheetId(directGoogleUrl);
    if (!spreadsheetId) {
      setErrorMessage('Kripya valid Google Sheets URL ya ID enter karein.');
      setGoogleLoading(false);
      return;
    }

    try {
      // 1. Try Google Workspace API if connected
      if (isGoogleConnected) {
        try {
          const res = await fetchSpreadsheetData(spreadsheetId);
          if (res.rows && res.rows.length > 0) {
            const rawHeaders = res.rows[0].map((h, i) => cleanHeaderValue(h, i));
            const dataRows = res.rows.slice(1).map((row) => {
              const obj: Record<string, string | number> = {};
              rawHeaders.forEach((h, idx) => {
                obj[h] = cleanCellValue(row[idx]);
              });
              return obj;
            });
            onDataLoaded(res.title || 'Google_Salary_Sheet', rawHeaders, dataRows, 'google-sheets');
            return;
          }
        } catch (apiErr) {
          console.warn('API fetch failed, falling back to public export:', apiErr);
        }
      }

      // 2. Fallback: Fetch via Google Sheets public CSV export link
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(
          'Google Sheet access nahi ho pa rahi. Kripya ensure karein ki sheet me "Anyone with the link can view" permission hai ya Google se sign in karein.'
        );
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      parseWorksheetWithSmartHeaders(firstSheet, 'Google_Salary_Sheet.csv', 'google-sheets');
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Google Sheet read nahi ho saki. Kripya link check karein.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle pasted table data (Ctrl+V directly from Excel)
  const handleParsePastedData = () => {
    if (!pastedText.trim()) return;
    try {
      setErrorMessage(null);
      const workbook = XLSX.read(pastedText, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      parseWorksheetWithSmartHeaders(firstSheet, 'Pasted_Excel_Data.xlsx', 'excel');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Pasted data parse karne me error aayi.');
    }
  };

  const loadSampleData = () => {
    const headers = Object.keys(SAMPLE_SALARY_SHEET_DATA[0]);
    onDataLoaded('TechCorp_October_2026_Payroll.xlsx', headers, SAMPLE_SALARY_SHEET_DATA, 'sample');
  };

  return (
    <div className="max-w-4xl mx-auto my-4 px-4">
      {/* Hero Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3 border border-blue-200 dark:border-blue-900/60">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Salary Sheet Importer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Apni Company Ki Salary Sheet Daalein
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto">
          Excel (.xlsx, .xls, .csv) upload karein ya Google Sheet link paste karein. Sheet load hote hi aapke sabhi karmachariyon ka data dashboard par aa jayega.
        </p>
      </div>

      {/* Prominent Error Banner at top if any issue */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-200 text-xs space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Upload Me Error: {errorMessage}</span>
          </div>
          <div className="pl-7 pt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className="px-3 py-1 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition cursor-pointer"
            >
              📋 Excel se copy-paste karke try karein (Ctrl+V)
            </button>
            <button
              type="button"
              onClick={loadSampleData}
              className="px-3 py-1 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              ✨ Demo Sheet load karein
            </button>
          </div>
        </div>
      )}

      {/* 3 Source Tabs: Upload File / Google Sheet / Paste from Excel */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>1. Excel File (.xlsx, .xls, .csv)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('google')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeTab === 'google'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>2. Google Sheets Link</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeTab === 'paste'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ClipboardPaste className="w-4 h-4" />
          <span>3. Paste Table (Ctrl+V)</span>
        </button>
      </div>

      {/* TAB 1: EXCEL FILE UPLOAD */}
      {activeTab === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 hover:border-blue-400 dark:hover:border-blue-500 shadow-lg hover:shadow-xl'
          }`}
        >
          {/* Broad accept attribute so no files are blocked */}
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*, .xlsx, .xls, .csv, .xlsm, .ods"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Click Here to Browse or Drag & Drop Salary Sheet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-4">
              Apne computer se Excel sheet (.xlsx, .xls, .csv) select karein
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition flex items-center space-x-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Choose Excel File</span>
            </button>

            <div className="mt-4 flex items-center space-x-3 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Auto-Header Detection</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Any Columns</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Instant Live Dashboard</span>
              </span>
            </div>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-center rounded-2xl">
              <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Reading columns and employee rows...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GOOGLE SHEETS */}
      {activeTab === 'google' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Enter Google Sheets Link</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Google Sheet ka URL link paste karein (e.g. <code>https://docs.google.com/spreadsheets/d/.../edit</code>)
            </p>
          </div>

          {/* Google Account Status Banner */}
          <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2.5">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {googleUser ? (
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Logged in: {googleUser.displayName || googleUser.email}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                    ✓ Google Workspace Connected — Drive se sheet direct import kar sakte hain
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Google Account Connect Karein
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Apne Google Drive se salary sheets direct 1-click me import karne ke liye
                  </span>
                </div>
              )}
            </div>

            {googleUser ? (
              <button
                type="button"
                onClick={onGoogleSignOut}
                className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer self-start sm:self-auto shrink-0"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="px-4 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold border border-slate-300 dark:border-slate-600 rounded-lg shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
              >
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          <form onSubmit={handleDirectGoogleSheetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Spreadsheet URL:
              </label>
              <input
                type="text"
                value={directGoogleUrl}
                onChange={(e) => setDirectGoogleUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tip: Sheet me "Anyone with the link can view" permission set ho, ya niche Google se Sign in karein.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenGoogleSheetsModal}
                className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>📂 Google Drive se file chunein (Drive Picker) →</span>
              </button>

              <button
                type="submit"
                disabled={googleLoading || !directGoogleUrl.trim()}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {googleLoading ? (
                  <span>Fetching Google Sheet...</span>
                ) : (
                  <>
                    <span>Load Sheet & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PASTE EXCEL TABLE DATA (CTRL+V) */}
      {activeTab === 'paste' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ClipboardPaste className="w-5 h-5 text-indigo-600" />
              <span>Paste from Excel (Copy & Paste Table)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Apni Excel file open karein, data select karke <strong>Ctrl + C</strong> karein, aur niche box me <strong>Ctrl + V</strong> paste kar dein.
            </p>
          </div>

          <textarea
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your copied Excel rows and columns here (headers in first row)..."
            className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!pastedText.trim()}
              onClick={handleParsePastedData}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>Load Pasted Table & Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sheet tab switcher if multi-sheet detected */}
      {availableSheets.length > 1 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              Multiple Sheet Tabs Found in Workbook:
            </span>
          </div>
          <select
            value={selectedSheetName}
            onChange={(e) => handleSheetTabChange(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-blue-300 rounded px-2.5 py-1 text-xs font-semibold"
          >
            {availableSheets.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* 1-Click Demo Option */}
      <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-slate-600 dark:text-slate-400">
            Abhi file ready nahi hai? <strong>20-Column Company Demo Payroll Sheet</strong> se turant test karein.
          </span>
        </div>
        <button
          type="button"
          onClick={loadSampleData}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          Load 20-Column Demo Sheet
        </button>
      </div>
    </div>
  );
};
