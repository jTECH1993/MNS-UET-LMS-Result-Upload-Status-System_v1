import React, { useState, useEffect } from 'react';
import { X, Check, Palette, Sparkles, Sun, Moon, Shield, Eye, BookmarkCheck } from 'lucide-react';
import { AuthService, INSTITUTIONAL_THEMES, ThemeDefinition } from '../services/authService';
import { AppTheme, ActiveUserSession } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: ActiveUserSession | null;
  onThemeSelected?: (theme: AppTheme) => void;
}

export const ThemeSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onThemeSelected,
}) => {
  const [activeTheme, setActiveTheme] = useState<AppTheme>(() => AuthService.getCurrentTheme());
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTheme(AuthService.getCurrentTheme());
      setSuccessToast(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: AppTheme }>;
      if (customEvent.detail?.theme) {
        setActiveTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('mnsuet_theme_changed', handleThemeEvent);
    return () => {
      window.removeEventListener('mnsuet_theme_changed', handleThemeEvent);
    };
  }, []);

  if (!isOpen) return null;

  const handleApplyTheme = (themeId: AppTheme) => {
    const applied = AuthService.setTheme(themeId, currentUser?.id);
    setActiveTheme(applied);
    const def = AuthService.getThemeDefinition(applied);
    setSuccessToast(`Switched to "${def.name}"`);
    if (onThemeSelected) {
      onThemeSelected(applied);
    }
    setTimeout(() => {
      setSuccessToast(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/70 flex items-center justify-center text-emerald-200 shadow-xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm leading-tight text-white">Visual Workspace Themes</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-800/80 text-emerald-200 border border-emerald-700/60">
                  Day &amp; Night Modes
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Select your preferred university interface skin, night mode, or high-contrast palette
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-in slide-in-from-top-1">
            <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successToast} &mdash; theme is saved and applied across all views.</span>
          </div>
        )}

        {/* Scrollable Theme Gallery */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            Customize how data tables, dashboards, and audit sheets appear on your display. Selected themes automatically persist in your local profile and apply across the portal.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {INSTITUTIONAL_THEMES.map((theme: ThemeDefinition) => {
              const isCurrent = activeTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => handleApplyTheme(theme.id)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Visual Theme Preview Swatch */}
                    <div className="w-12 h-12 rounded-lg p-1 border border-slate-300 dark:border-slate-700 shrink-0 flex flex-col justify-between shadow-2xs overflow-hidden relative" style={{
                      backgroundColor: theme.id === 'midnight' ? '#0b1320' : theme.id === 'sunset' ? '#faf8f5' : theme.id === 'oxford' ? '#f1f5f9' : '#ffffff'
                    }}>
                      <div className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-full ${theme.primaryPreview} shadow-xs`}></span>
                        <span className="w-4 h-1.5 rounded-xs bg-slate-400 dark:bg-slate-600"></span>
                      </div>
                      <div className="w-full h-2 rounded-xs bg-slate-200 dark:bg-slate-700"></div>
                      <div className="w-3/4 h-1.5 rounded-xs bg-slate-300 dark:bg-slate-600"></div>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {theme.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          theme.isDark
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : theme.id === 'oxford'
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : theme.id === 'sunset'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : theme.id === 'contrast'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {theme.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-extrabold bg-emerald-600 text-white uppercase tracking-wider shadow-2xs">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        {theme.description}
                      </p>
                    </div>
                  </div>

                  {/* Selection Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTheme(theme.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>Activate</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Instant System Synchronization
              </span>
              <span>
                Switching themes takes effect immediately without reloading the page and automatically synchronizes with your user account profile settings.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {activeTheme === 'midnight' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Current: <strong>{AuthService.getThemeDefinition(activeTheme).name}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
