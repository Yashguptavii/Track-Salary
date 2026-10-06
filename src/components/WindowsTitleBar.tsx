import React from 'react';
import { 
  Building2, 
  Minus, 
  Square, 
  X, 
  Sun, 
  Moon, 
  FileSpreadsheet, 
  Sparkles,
  RefreshCw,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { User } from 'firebase/auth';

interface Props {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  fileName?: string;
  totalEmployees?: number;
  googleUser: User | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onOpenNewSheet: () => void;
  onResetToSample: () => void;
}

export const WindowsTitleBar: React.FC<Props> = ({
  isDarkMode,
  onToggleTheme,
  fileName,
  totalEmployees,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onOpenNewSheet,
  onResetToSample,
}) => {
  return (
    <header className="select-none flex items-center justify-between px-3 h-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors">
      {/* Left: App icon & Title */}
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-600 text-white shadow-sm">
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center space-x-2 font-medium">
          <span className="font-semibold text-slate-900 dark:text-white tracking-tight">PayPulse</span>
          <span className="text-slate-400 dark:text-slate-500">|</span>
          <span className="truncate max-w-[200px] sm:max-w-[320px] text-slate-600 dark:text-slate-300">
            {fileName ? `${fileName} (${totalEmployees} employees)` : 'Company Salary Sheet & Dispatcher'}
          </span>
        </div>
      </div>

      {/* Center: Quick Toolbar */}
      <div className="hidden md:flex items-center space-x-1.5">
        <button
          onClick={onOpenNewSheet}
          className="px-2.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center space-x-1.5 transition text-slate-700 dark:text-slate-200"
          title="Import another Excel or Google Sheet"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Change / Import Sheet</span>
        </button>

        <button
          onClick={onResetToSample}
          className="px-2.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center space-x-1.5 transition text-slate-700 dark:text-slate-200"
          title="Load 20-column Demo Company Salary Sheet"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Demo Sheet</span>
        </button>
      </div>

      {/* Right: User / Theme / Window Controls */}
      <div className="flex items-center space-x-2">
        {googleUser ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs shadow-xs">
            {googleUser.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt="Profile"
                className="w-4 h-4 rounded-full shrink-0"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {googleUser.displayName?.[0] || 'G'}
              </div>
            )}
            <span className="truncate max-w-[120px] text-blue-900 dark:text-blue-200 font-semibold text-[11px]">
              {googleUser.displayName?.split(' ')[0] || googleUser.email?.split('@')[0] || 'Logged In'}
            </span>
            <button
              type="button"
              onClick={onGoogleSignOut}
              title={`Sign out (${googleUser.email || ''})`}
              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition ml-1 p-0.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onGoogleSignIn}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1.5 text-slate-800 dark:text-slate-100 transition shadow-xs cursor-pointer"
            title="Sign in with your Google Account"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Login</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        </button>

        {/* Windows Standard Controls */}
        <div className="flex items-center -mr-1">
          <div className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-default">
            <Minus className="w-3 h-3" />
          </div>
          <div className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-default">
            <Square className="w-2.5 h-2.5" />
          </div>
          <div className="w-7 h-7 flex items-center justify-center hover:bg-red-500 hover:text-white text-slate-500 transition cursor-default">
            <X className="w-3 h-3" />
          </div>
        </div>
      </div>
    </header>
  );
};
