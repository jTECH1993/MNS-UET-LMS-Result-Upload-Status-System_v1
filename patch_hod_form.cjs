const fs = require('fs');
let code = fs.readFileSync('src/components/HODEntryForm.tsx', 'utf8');

const effectPatch = `
  const isVC = currentUser?.role === 'VC';
  const isAdmin = currentUser?.role === 'ADMIN';

  const [isDeadlineExpired, setIsDeadlineExpired] = useState<boolean>(() => StorageService.isSystemDeadlineExpired());

  useEffect(() => {
    const handleDeadlineUpdated = () => {
      setIsDeadlineExpired(StorageService.isSystemDeadlineExpired());
    };
    // Re-check periodically just in case it crosses the threshold while they are typing
    const interval = setInterval(handleDeadlineUpdated, 10000);
    window.addEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    };
  }, []);

  // Lock form if readonly, or if VC, or if deadline expired and NOT VC/ADMIN
  const isReadOnly = Boolean(readOnly || isVC || (isDeadlineExpired && !isVC && !isAdmin));
`;

code = code.replace(
  /const isVC = currentUser\?\.role === 'VC';\n\s*const isReadOnly = Boolean\(readOnly \|\| isVC\);/,
  effectPatch
);

// We should also add a banner at the top of the form or near the save buttons if it is locked because of deadline.
code = code.replace(
  "        {/* Content Area */}",
  "        {isDeadlineExpired && !isVC && !isAdmin && (\n          <div className=\"bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg shadow-sm\">\n            <div className=\"flex items-start\">\n              <div className=\"shrink-0\">\n                <AlertTriangle className=\"h-5 w-5 text-rose-600\" />\n              </div>\n              <div className=\"ml-3\">\n                <h3 className=\"text-sm font-bold text-rose-800\">\n                  LMS Portal Lock Deadline Reached\n                </h3>\n                <div className=\"mt-1 text-xs text-rose-700 font-medium leading-relaxed\">\n                  <p>\n                    The submission deadline has expired. The portal is now in lockdown mode and all entries are read-only.\n                    If you need to make urgent changes, please contact the Vice Chancellor to extend the deadline.\n                  </p>\n                </div>\n              </div>\n            </div>\n          </div>\n        )}\n\n        {/* Content Area */}"
);

fs.writeFileSync('src/components/HODEntryForm.tsx', code);
