import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Eye, Check, ChevronDown, Sparkles } from 'lucide-react';
import { AppTheme, ActiveUserSession } from '../types';
import { AuthService } from '../services/authService';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  dotClass: string;
  badgeClass: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Day',
    shortLabel: 'Day',
    icon: Sun,
    dotClass: 'bg-emerald-400 ring-emerald-300',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Daylight green & slate canvas for crisp readability',
  },
  {
    id: 'midnight',
    name: 'Midnight Dark',
    shortLabel: 'Dark',
    icon: Moon,
    dotClass: 'bg-indigo-400 ring-indigo-300',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    description: 'Deep midnight slate canvas for low-light environments',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    shortLabel: 'Contrast',
    icon: Eye,
    dotClass: 'bg-amber-300 ring-amber-200',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Stark monochrome with bold borders for projector & accessibility',
  },
];

interface ThemeSwitcherProps {
  currentUser?: ActiveUserSession | null;
  variant?: 'header-segmented' | 'header-dropdown' | 'mobile' | 'compact';
  className?: string;
  onThemeChanged?: (theme: AppTheme) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentUser,
  variant = 'header-segmented',
  className = '',
  onThemeChanged,
}) => {
  const [activeTheme, setActiveTheme] = useState<AppTheme>(() => {
    return AuthService.getUserTheme(currentUser?.id, currentUser?.username);
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when current user changes or custom event fires
  useEffect(() => {
    const userTheme = AuthService.getUserTheme(currentUser?.id, currentUser?.username);
    setActiveTheme(userTheme);
  }, [currentUser?.id, currentUser?.username]);

  useEffect(() => {
    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: AppTheme; userId?: string }>;
      if (customEvent.detail?.theme) {
        setActiveTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener('mnsuet_theme_changed', handleThemeEvent);
    return () => {
      window.removeEventListener('mnsuet_theme_changed', handleThemeEvent);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (themeId: AppTheme) => {
    const applied = AuthService.setTheme(themeId, currentUser?.id);
    setActiveTheme(applied);
    setIsDropdownOpen(false);

    const targetOpt = THEME_OPTIONS.find((t) => t.id === applied);
    const userIdentifier = currentUser?.name || currentUser?.username || 'You';
    const msg = `Theme set to ${targetOpt?.name || applied} (Saved for ${userIdentifier})`;
    setToastMessage(msg);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);

    if (onThemeChanged) {
      onThemeChanged(applied);
    }
  };

  const currentOption = THEME_OPTIONS.find((t) => t.id === activeTheme) || THEME_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  // 1. MOBILE DRAWER VARIANT
  if (variant === 'mobile') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Display Theme
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Saved per user
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeTheme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectTheme(opt.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-600 shadow-sm ring-1 ring-emerald-400'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title={`${opt.name}: ${opt.description}`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-slate-600 dark:text-slate-400'}`} />
                  {isSelected && <Check className="w-3 h-3 text-emerald-200" />}
                </div>
                <span className="text-[11px] font-bold leading-tight">{opt.name}</span>
                <span className="text-[9px] opacity-75 mt-0.5">{opt.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {toastMessage && (
          <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center animate-in fade-in">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // 2. HEADER DROPDOWN VARIANT
  if (variant === 'header-dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 bg-emerald-950/90 hover:bg-emerald-800/90 text-emerald-100 px-2.5 py-1 rounded-full border border-emerald-600/70 text-xs font-semibold shadow-2xs transition-all cursor-pointer select-none"
          title={`Active Theme: ${currentOption.name}. Click to switch themes.`}
        >
          <span className={`w-2 h-2 rounded-full ${currentOption.dotClass} shadow-[0_0_6px_currentColor]`} />
          <CurrentIcon className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline font-bold">{currentOption.name}</span>
          <ChevronDown className={`w-3 h-3 text-emerald-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Select UI Theme</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 lowercase font-medium">persists locally</span>
            </div>

            <div className="py-1 space-y-1">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = activeTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTheme(opt.id)}
                    className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold leading-tight">{opt.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 px-2 py-1 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Individually saved for <strong>{currentUser?.name || 'this user'}</strong></span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. DEFAULT: HEADER SEGMENTED TOGGLE (Emerald Day | Midnight Dark | High Contrast)
  return (
    <div className={`relative flex items-center ${className}`}>
      {/* 3-way Segmented Control */}
      <div
        className="inline-flex items-center p-0.5 rounded-full bg-emerald-950/90 border border-emerald-600/70 shadow-inner backdrop-blur-xs select-none"
        role="group"
        aria-label="Theme switcher: Emerald Day, Midnight Dark, High Contrast"
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = activeTheme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectTheme(opt.id)}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm ring-1 ring-emerald-300'
                  : 'text-emerald-200/80 hover:text-white hover:bg-emerald-900/60'
              }`}
              title={`${opt.name} - ${opt.description} (Saved for ${currentUser?.name || 'current user'})`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                  isSelected ? 'text-amber-300 drop-shadow-xs' : 'text-emerald-300/70'
                }`}
              />
              <span className="hidden md:inline whitespace-nowrap">{opt.name}</span>
              <span className="inline md:hidden whitespace-nowrap">{opt.shortLabel}</span>
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.9)] animate-pulse hidden lg:inline" />
              )}
            </button>
          );
        })}
      </div>

      {/* Ephemeral Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-1.5 z-50 whitespace-nowrap bg-slate-900/95 text-white text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-500/60 shadow-xl backdrop-blur-md flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
