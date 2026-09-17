const fs = require('fs');
let code = fs.readFileSync('src/components/FirebaseSchemaModal.tsx', 'utf8');

const wipeBtn = `
                <div className="pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Danger Zone: Factory Reset
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    This action will permanently delete all submitted result records across all departments from the database.
                    It will NOT delete user accounts (HODs, Coordinators). Use this to start a fresh academic session.
                  </p>
                  
                  {showConfirmClearDb ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-bold text-red-800 mb-3">Are you absolutely sure? This cannot be undone.</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            await StorageService.wipeAllSubmissions();
                            setShowConfirmClearDb(false);
                            alert('All departmental submission records have been completely wiped.');
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg"
                        >
                          Yes, Delete All Data Records
                        </button>
                        <button
                          onClick={() => setShowConfirmClearDb(false)}
                          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmClearDb(true)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-bold rounded-lg"
                    >
                      Wipe All Data Records (Keep Accounts)
                    </button>
                  )}
                </div>
`;

code = code.replace(/<span className="font-bold text-slate-800 block mb-1">\s*Storage Backend/g, wipeBtn + '\n                  <span className="font-bold text-slate-800 block mb-1">\n                    Storage Backend');

if (!code.includes('AlertTriangle')) {
    code = code.replace(/Activity,/, 'Activity, AlertTriangle,');
}

fs.writeFileSync('src/components/FirebaseSchemaModal.tsx', code);
