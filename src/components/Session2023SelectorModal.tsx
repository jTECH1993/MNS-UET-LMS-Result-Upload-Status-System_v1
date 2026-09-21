import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Check, X, SlidersHorizontal, AlertCircle, Sparkles, RotateCcw, Sun, Moon } from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { AcademicShift } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  sessionName?: string;
  onRosterUpdated: (activePrograms: string[]) => void;
}

export const Session2023SelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  departmentName,
  sessionName = '2023',
  onRosterUpdated,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>(departmentName);
  const [currentConfigSession, setCurrentConfigSession] = useState<string>(sessionName);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [programShiftsMap, setProgramShiftsMap] = useState<Record<string, AcademicShift[]>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const availableSessions = StorageService.getAvailableSessions();

  useEffect(() => {
    setSelectedDept(departmentName);
  }, [departmentName]);

  useEffect(() => {
    setCurrentConfigSession(sessionName);
  }, [sessionName]);

  useEffect(() => {
    if (selectedDept && isOpen) {
      const active = StorageService.getSessionPrograms(selectedDept, currentConfigSession);
      setSelectedPrograms(active);

      const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === selectedDept);
      const progs = deptObj ? deptObj.programs : [];
      const shiftsMap: Record<string, AcademicShift[]> = {};
      progs.forEach((p) => {
        shiftsMap[p.name] = StorageService.getProgramShifts(selectedDept, p.name);
      });
      setProgramShiftsMap(shiftsMap);
      setSavedSuccess(false);
    }
  }, [selectedDept, currentConfigSession, isOpen]);

  if (!isOpen) return null;

  const currentDeptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === selectedDept);
  const allDeptPrograms = currentDeptObj ? currentDeptObj.programs : [];

  const handleToggleShift = (progName: string, shiftToToggle: AcademicShift, active: boolean) => {
    setSavedSuccess(false);
    setProgramShiftsMap((prev) => {
      const currentShifts = prev[progName] || StorageService.getProgramShifts(selectedDept, progName);
      let updated: AcademicShift[] = [];
      if (active) {
        updated = Array.from(new Set([...currentShifts, shiftToToggle]));
      } else {
        updated = currentShifts.filter((s) => s !== shiftToToggle);
      }
      // Ensure at least one shift remains if program is checked
      if (updated.length === 0) {
        updated = shiftToToggle === 'Morning' ? ['Evening'] : ['Morning'];
      }
      return { ...prev, [progName]: updated };
    });
  };

  const handleToggle = (progName: string) => {
    setSavedSuccess(false);
    const normTarget = StorageService.normalizeProgramName(progName, selectedDept);
    const exists = selectedPrograms.some((p) => {
      const normP = StorageService.normalizeProgramName(p, selectedDept);
      return normP === normTarget || p.trim().toLowerCase() === progName.trim().toLowerCase();
    });
    if (exists) {
      setSelectedPrograms(
        selectedPrograms.filter((p) => {
          const normP = StorageService.normalizeProgramName(p, selectedDept);
          return normP !== normTarget && p.trim().toLowerCase() !== progName.trim().toLowerCase();
        })
      );
    } else {
      setSelectedPrograms([...selectedPrograms, progName]);
    }
  };

  const handleSelectAll = () => {
    setSavedSuccess(false);
    setSelectedPrograms(allDeptPrograms.map((p) => p.name));
  };

  const handleSelectDefaults = () => {
    setSavedSuccess(false);
    const defaults =
      currentConfigSession === '2023'
        ? allDeptPrograms.filter((p) => p.session2023).map((p) => p.name)
        : allDeptPrograms.map((p) => p.name);
    setSelectedPrograms(defaults);
  };

  const handleClear = () => {
    setSavedSuccess(false);
    setSelectedPrograms([]);
  };

  const handleSave = () => {
    StorageService.setSessionPrograms(selectedDept, selectedPrograms, currentConfigSession);
    Object.entries(programShiftsMap).forEach(([pName, shifts]) => {
      StorageService.setProgramShifts(selectedDept, pName, shifts);
    });
    onRosterUpdated(selectedPrograms);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      id="session-program-selector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="session-selector-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-emerald-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Select Session {currentConfigSession} Enrolled Programs</h2>
              <p className="text-xs text-emerald-200">
                Accurate Dashboard Tracking • Configure programs actively offered in Session {currentConfigSession}
              </p>
            </div>
          </div>
          <button
            id="btn-close-session-selector"
            type="button"
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Session Switcher & Department Switcher Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Session Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Configured Academic Session
              </label>
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-300">
                {availableSessions.map((sess) => (
                  <button
                    key={sess}
                    type="button"
                    onClick={() => setCurrentConfigSession(sess)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      currentConfigSession === sess
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Session {sess}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Switcher */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department / School
              </label>
              <select
                id="session-selector-dept"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              >
                {UNIVERSITY_DEPARTMENTS.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Explanation banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-semibold">
                Dynamic Program Enrollment for Session {currentConfigSession}:
              </p>
              <p>
                The department coordinator selects which degree programs are active in Session {currentConfigSession}.
                The VC Dashboard and navigation filters will strictly show these offerings when Session {currentConfigSession} is selected.
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-bold text-slate-600">
              Active Programs in Session {sessionName}:{' '}
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                {selectedPrograms.length} of {allDeptPrograms.length} Selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-select-defaults"
                type="button"
                onClick={handleSelectDefaults}
                className="text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title={`Reset to default programs for Session ${sessionName}`}
              >
                <RotateCcw className="w-3 h-3" />
                Defaults
              </button>
              <button
                id="btn-select-all"
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                id="btn-clear-selection"
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Program Checkbox List */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-xs">
            {allDeptPrograms.map((prog) => {
              const normProg = StorageService.normalizeProgramName(prog.name, selectedDept);
              const isChecked = selectedPrograms.some(
                (p) =>
                  StorageService.normalizeProgramName(p, selectedDept) === normProg ||
                  p.trim().toLowerCase() === prog.name.trim().toLowerCase()
              );
              const progShifts = programShiftsMap[prog.name] || StorageService.getProgramShifts(selectedDept, prog.name);
              return (
                <div
                  key={prog.name}
                  onClick={() => handleToggle(prog.name)}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isChecked ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 text-emerald-700 mt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 fill-emerald-600 text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                        <span>{prog.name}</span>
                        <span className="text-2xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {prog.degreeLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isChecked
                          ? `Active in Session ${sessionName} • Tracked in VC Dashboard`
                          : `Excluded from Session ${sessionName} metrics`}
                      </p>

                      {/* Active Shift Toggles */}
                      {isChecked && (
                        <div
                          className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-200/60"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Offered Shifts:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50/80 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={progShifts.includes('Morning')}
                                onChange={(e) => handleToggleShift(prog.name, 'Morning', e.target.checked)}
                                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <Sun className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Morning</span>
                            </label>

                            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={progShifts.includes('Evening')}
                                onChange={(e) => handleToggleShift(prog.name, 'Evening', e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <Moon className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>Evening</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {isChecked ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full whitespace-nowrap">
                        Active ({progShifts.join(', ') || 'Evening'})
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded-full border border-dashed border-slate-300 whitespace-nowrap">
                        Excluded
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {savedSuccess ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" /> Roster applied successfully for Session {sessionName}!
              </span>
            ) : (
              <span>Changes apply to HOD dropdown and Vice Chancellor Roster immediately.</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              id="btn-cancel-roster"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-roster"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save & Apply Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

