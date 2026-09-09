import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Check, X, SlidersHorizontal, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  onRosterUpdated: (activePrograms: string[]) => void;
}

export const Session2023SelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  departmentName,
  onRosterUpdated,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>(departmentName);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSelectedDept(departmentName);
  }, [departmentName]);

  useEffect(() => {
    if (selectedDept) {
      const active = StorageService.getSession2023Programs(selectedDept);
      setSelectedPrograms(active);
      setSavedSuccess(false);
    }
  }, [selectedDept, isOpen]);

  if (!isOpen) return null;

  const currentDeptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === selectedDept);
  const allDeptPrograms = currentDeptObj ? currentDeptObj.programs : [];

  const handleToggle = (progName: string) => {
    setSavedSuccess(false);
    if (selectedPrograms.includes(progName)) {
      setSelectedPrograms(selectedPrograms.filter((p) => p !== progName));
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
    const defaults = allDeptPrograms.filter((p) => p.session2023).map((p) => p.name);
    setSelectedPrograms(defaults);
  };

  const handleClear = () => {
    setSavedSuccess(false);
    setSelectedPrograms([]);
  };

  const handleSave = () => {
    StorageService.setSession2023Programs(selectedDept, selectedPrograms);
    onRosterUpdated(selectedPrograms);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      id="session-2023-selector-modal"
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
              <h2 className="text-lg font-bold">Select Session 2023 Enrolled Programs</h2>
              <p className="text-xs text-emerald-200">
                Ensure 100% Genuine VC Dashboard Status • Choose only programs that actually enrolled in 2023
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
          {/* Department Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Department / School
            </label>
            <select
              id="session-selector-dept"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            >
              {UNIVERSITY_DEPARTMENTS.map((dept) => (
                <option key={dept.name} value={dept.name}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Genuine status explanation banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Why this selection matters for the Vice Chancellor Dashboard:</p>
              <p>
                If your department had only <strong>2 programs</strong> enrolled in Session 2023 (e.g. BS Computer
                Science & BS Software Engineering), select only those 2.
              </p>
              <p className="text-amber-800">
                The VC Dashboard will track only those 2 programs as required. When both are uploaded, your department will
                achieve <strong>100% genuine completion</strong>!
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-bold text-slate-600">
              Active Programs in Session 2023:{' '}
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                {selectedPrograms.length} of {allDeptPrograms.length} Selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-select-defaults"
                type="button"
                onClick={handleSelectDefaults}
                className="text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md border border-slate-200 transition-colors flex items-center gap-1"
                title="Reset to 2023 established programs (2 programs)"
              >
                <RotateCcw className="w-3 h-3" />
                Defaults (2023)
              </button>
              <button
                id="btn-select-all"
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                Select All
              </button>
              <button
                id="btn-clear-selection"
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Program Checkbox List */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-xs">
            {allDeptPrograms.map((prog) => {
              const isChecked = selectedPrograms.includes(prog.name);
              return (
                <div
                  key={prog.name}
                  onClick={() => handleToggle(prog.name)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 text-emerald-700">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 fill-emerald-600 text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span>{prog.name}</span>
                        <span className="text-2xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {prog.degreeLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {isChecked
                          ? 'Enrolled for Session 2023 • Tracked in VC Dashboard'
                          : 'Not enrolled in 2023 • Excluded from VC Dashboard calculations'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isChecked ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        Active 2023
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium px-2.5 py-0.5 rounded-full border border-dashed border-slate-300 whitespace-nowrap">
                        Not in 2023
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
                <Check className="w-4 h-4 text-emerald-600" /> Roster applied successfully!
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
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-roster"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
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
