import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { AcademicShift } from '../types';
import { StorageService } from '../services/storageService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDataMigrationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [actionType, setActionType] = useState<'move' | 'copy'>('move');
  
  // Source selection state
  const [sourceDept, setSourceDept] = useState<string>('Department of Computer Science');
  const [sourceProg, setSourceProg] = useState<string>('');
  const [sourceShift, setSourceShift] = useState<AcademicShift>('Morning');
  const [sourceSession, setSourceSession] = useState<string>('2023');
  const [sourceSemester, setSourceSemester] = useState<string>(''); // empty means all semesters

  // Destination selection state
  const [destDept, setDestDept] = useState<string>('Department of Computer Science');
  const [destProg, setDestProg] = useState<string>('');
  const [destShift, setDestShift] = useState<AcademicShift>('Morning');
  const [destSession, setDestSession] = useState<string>('2023');
  const [destSemester, setDestSemester] = useState<string>(''); // empty means match source semester

  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  
  // Matching source count
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [sampleRecords, setSampleRecords] = useState<string[]>([]);
  
  // Execution state
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [securityInput, setSecurityInput] = useState<string>('');
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string; count: number } | null>(null);

  // Synchronize available programs for Source Department
  const sourceDeptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === sourceDept);
  const sourcePrograms = sourceDeptObj ? sourceDeptObj.programs.map((p) => p.name) : [];

  // Synchronize available programs for Destination Department
  const destDeptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === destDept);
  const destPrograms = destDeptObj ? destDeptObj.programs.map((p) => p.name) : [];

  // Set default programs when department changes
  useEffect(() => {
    if (sourcePrograms.length > 0 && !sourcePrograms.includes(sourceProg)) {
      setSourceProg(sourcePrograms[0]);
    }
  }, [sourceDept, sourcePrograms, sourceProg]);

  useEffect(() => {
    if (destPrograms.length > 0 && !destPrograms.includes(destProg)) {
      setDestProg(destPrograms[0]);
    }
  }, [destDept, destPrograms, destProg]);

  // Compute matching source records in local state
  const calculateMatchingRecords = () => {
    const store = StorageService.getStore();
    const matched = Object.keys(store).filter((key) => {
      const record = store[key];
      if (!record) return false;
      
      const matchDept = record.department.trim().toLowerCase() === sourceDept.trim().toLowerCase() ||
        StorageService._isDeptMatch(sourceDept, record.department);
      const matchProg = record.program.trim().toLowerCase() === sourceProg.trim().toLowerCase() ||
        StorageService._isProgMatch(sourceProg, record.program);
      const matchShift = String(record.shift || 'Morning').trim().toLowerCase() === sourceShift.trim().toLowerCase();
      const matchSession = String(record.session || '2023').trim() === sourceSession.trim();
      
      let matchSemester = true;
      if (sourceSemester) {
        matchSemester = String(record.semester) === sourceSemester;
      }
      
      return matchDept && matchProg && matchShift && matchSession && matchSemester;
    });

    setMatchingCount(matched.length);
    
    // Create preview names
    const names = matched.slice(0, 3).map((k) => {
      const r = store[k];
      return `Sem ${r.semester} - Section ${r.section || 'A'} (${r.subjects?.length || 0} courses)`;
    });
    setSampleRecords(names);
  };

  useEffect(() => {
    if (isOpen && sourceProg) {
      calculateMatchingRecords();
    }
  }, [isOpen, sourceDept, sourceProg, sourceShift, sourceSession, sourceSemester]);

  if (!isOpen) return null;

  const handleMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (matchingCount === 0) {
      return;
    }

    if (securityInput.toUpperCase() !== 'CONFIRM') {
      alert('Please type CONFIRM to authorize this high-priority administrative operation.');
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    // Give a small optical feedback delay for enterprise system vibe
    setTimeout(() => {
      try {
        const res = StorageService.migrateSubmissions(
          actionType,
          {
            department: sourceDept,
            program: sourceProg,
            shift: sourceShift,
            session: sourceSession,
            semester: sourceSemester || undefined
          },
          {
            department: destDept,
            program: destProg,
            shift: destShift,
            session: destSession,
            semester: destSemester || undefined
          },
          overwriteExisting
        );
        setMigrationResult(res);
        if (res.success) {
          setSecurityInput('');
          // Refresh count after move
          setTimeout(() => {
            calculateMatchingRecords();
          }, 300);
        }
      } catch (err: any) {
        setMigrationResult({
          success: false,
          message: err?.message || 'Unexpected critical failure during batch reallocation.',
          count: 0
        });
      } finally {
        setIsMigrating(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden transition-colors duration-200">
        
        {/* Banner header */}
        <div className="bg-emerald-800 dark:bg-emerald-950 px-6 py-4 flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-black text-white tracking-wide uppercase">Institutional Data Migration Control</h2>
              <p className="text-emerald-200 text-xs font-medium">Re-allocate, shift, or copy submitted OBE course records across academic programs and shifts</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Policy Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/20 px-6 py-3 border-b border-amber-200 dark:border-amber-900/40 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed font-semibold">
            WARNING: This is a secure Administrative privilege. Shifting or copying submission records re-keys the data structure in local database and triggers a bulk synchronization to Google Firebase. Original records will be permanently removed if "Move (Shift)" action is chosen.
          </p>
        </div>

        <form onSubmit={handleMigration} className="p-6 space-y-6">
          
          {/* Action toggle & Overwrite option */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Migration Protocol</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setActionType('move'); setMigrationResult(null); }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    actionType === 'move'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900'
                      : 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Move (Shift / Cut) Data
                </button>
                <button
                  type="button"
                  onClick={() => { setActionType('copy'); setMigrationResult(null); }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    actionType === 'copy'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900'
                      : 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  Copy (Duplicate) Data
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Collision Strategy</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Overwrite Existing Records in Destination if key conflicts
                </span>
              </label>
            </div>
          </div>

          {/* Source and Destination columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
            
            {/* Source Config */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Source Configuration (FROM)
              </h3>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">DEPARTMENT</label>
                <select
                  value={sourceDept}
                  onChange={(e) => setSourceDept(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  {UNIVERSITY_DEPARTMENTS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">ACADEMIC PROGRAM</label>
                <select
                  value={sourceProg}
                  onChange={(e) => setSourceProg(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-400"
                >
                  {sourcePrograms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">SHIFT</label>
                  <select
                    value={sourceShift}
                    onChange={(e) => setSourceShift(e.target.value as AcademicShift)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">SESSION</label>
                  <select
                    value={sourceSession}
                    onChange={(e) => setSourceSession(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">SEMESTER (OPTIONAL)</label>
                <select
                  value={sourceSemester}
                  onChange={(e) => setSourceSemester(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="">All Semesters (Bulk Re-allocate Program)</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </div>

              {/* Status Badge */}
              <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Matching Source Records:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    matchingCount > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {matchingCount} found
                  </span>
                </div>
                {sampleRecords.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Matched Samples:</span>
                    {sampleRecords.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destination Config */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Destination Configuration (TO)
              </h3>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">DEPARTMENT</label>
                <select
                  value={destDept}
                  onChange={(e) => setDestDept(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  {UNIVERSITY_DEPARTMENTS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">ACADEMIC PROGRAM</label>
                <select
                  value={destProg}
                  onChange={(e) => setDestProg(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-400"
                >
                  {destPrograms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">SHIFT</label>
                  <select
                    value={destShift}
                    onChange={(e) => setDestShift(e.target.value as AcademicShift)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">SESSION</label>
                  <select
                    value={destSession}
                    onChange={(e) => setDestSession(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">SEMESTER (OPTIONAL)</label>
                <select
                  value={destSemester}
                  onChange={(e) => setDestSemester(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="">Keep Original Semester (Recommended)</option>
                  <option value="1">Map to Semester 1</option>
                  <option value="2">Map to Semester 2</option>
                  <option value="3">Map to Semester 3</option>
                  <option value="4">Map to Semester 4</option>
                  <option value="5">Map to Semester 5</option>
                  <option value="6">Map to Semester 6</option>
                  <option value="7">Map to Semester 7</option>
                  <option value="8">Map to Semester 8</option>
                </select>
              </div>

              {/* Visual Arrow Indicator */}
              <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-bold h-[104px]">
                <div className="text-center space-y-1">
                  <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Migration Stream</span>
                  <div className="flex items-center gap-2 justify-center py-1">
                    <span className="text-rose-500 font-black">{sourceSession} {sourceShift.substring(0, 4)}</span>
                    <ArrowRight className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span className="text-indigo-500 font-black">{destSession} {destShift.substring(0, 4)}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Ready to re-route keys</span>
                </div>
              </div>
            </div>

          </div>

          {/* Migration result area */}
          {migrationResult && (
            <div className={`p-4 rounded-lg border text-xs font-semibold ${
              migrationResult.success 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50' 
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50'
            }`}>
              <div className="flex items-start gap-2">
                {migrationResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{migrationResult.success ? 'Institutional Execution Succeeded' : 'Administrative Process Blocked'}</p>
                  <p className="opacity-90">{migrationResult.message}</p>
                  {migrationResult.success && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-wide">
                      * Real-time Firebase listeners are broadcasting this change across HOD/VC panels.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Double confirm footer action panel */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {matchingCount > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-center sm:text-left">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Security Authentication Challenge:
                  </label>
                  <span className="text-[11px] text-slate-500 block">
                    To prevent accidental bulk data re-allocation, please type <strong className="text-rose-600 dark:text-rose-400">CONFIRM</strong> below:
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Type CONFIRM here"
                  value={securityInput}
                  onChange={(e) => setSecurityInput(e.target.value)}
                  className="max-w-[180px] w-full text-xs font-black p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-center uppercase focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-slate-800"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isMigrating || matchingCount === 0 || securityInput.toUpperCase() !== 'CONFIRM'}
                className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
                  matchingCount === 0 || securityInput.toUpperCase() !== 'CONFIRM'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-800 shadow-sm shadow-emerald-500/20 active:scale-95'
                }`}
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Migrating Records...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Execute Batch {actionType === 'move' ? 'Move' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
