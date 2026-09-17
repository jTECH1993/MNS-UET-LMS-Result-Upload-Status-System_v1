const fs = require('fs');
let code = fs.readFileSync('src/components/VCDashboard.tsx', 'utf8');

const sessionFilterJSX = `
          {/* Session Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              id="filter-session"
              value={currentSession}
              onChange={(e) => {
                const newSess = e.target.value;
                setCurrentSession(newSess);
                // Also set this as the only active session for strict dashboard filtering
                StorageService.setActiveSessions([newSess]);
                setActiveSessions([newSess]);
              }}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {StorageService.getAvailableSessions().map((s) => (
                <option key={s} value={s}>
                  Session {s}
                </option>
              ))}
            </select>
          </div>
`;

code = code.replace(/<div className="flex flex-wrap items-center gap-3">\n\s*\{\/\* Department Filter \*\/\}/, '<div className="flex flex-wrap items-center gap-3">\n' + sessionFilterJSX + '\n          {/* Department Filter */}');

fs.writeFileSync('src/components/VCDashboard.tsx', code);
