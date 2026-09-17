const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// The mobile menu dropdown starts with:
// {/* Mobile Drawer Dropdown Menu */}
//       {mobileMenuOpen && (

const startIdx = content.indexOf('{/* Mobile Drawer Dropdown Menu */}');
if (startIdx !== -1) {
  content = content.substring(0, startIdx);
  const mobileMenu = `
      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-xs">
                  {getInitials(currentUser.name)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {currentUser.department}{' '}
                  {currentUser.assignedPrograms && currentUser.assignedPrograms.length > 1
                    ? \`• \${currentUser.assignedPrograms.join(', ')}\`
                    : currentUser.program
                    ? \`• \${currentUser.program}\`
                    : ''}
                </p>
              </div>
            </div>
            <span className={\`text-[9px] px-2 py-0.5 rounded-full font-bold \${badgeInfo.cls}\`}>
              {badgeInfo.label}
            </span>
          </div>

          {/* Quick session info */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1 font-medium">
            <span>Session: <strong>{currentSession}</strong></span>
            <span>Semester: <strong>{currentSemester}</strong></span>
            <span>Saved Records: <strong>{savedCount}</strong></span>
          </div>

          {/* Mobile Actions Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onOpenProfileModal} className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
              <User className="w-3.5 h-3.5" /> Edit Profile
            </button>
            <button type="button" onClick={handleToggleTheme} className="py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
              {isDark ? (<><Sun className="w-3.5 h-3.5 text-amber-500" /><span>Day Mode</span></>) : (<><Moon className="w-3.5 h-3.5 text-indigo-500" /><span>Night Mode</span></>)}
            </button>
          </div>

          <button type="button" onClick={handleLogoutClick} className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out Session
          </button>
        </div>
      )}
    </header>
  );
};
`;
  content += mobileMenu;
  fs.writeFileSync('src/components/Header.tsx', content);
}
