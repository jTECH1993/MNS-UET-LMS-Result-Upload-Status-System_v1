import React, { useState, useEffect, useMemo } from 'react';
import {
  DepartmentGroup,
  UNIVERSITY_DEPARTMENTS,
  ACADEMIC_SHIFTS,
  createEmptySubjectRow,
  createInitialBlankRows,
} from '../data/departmentsData';
import { SubjectRow, SubmissionRecord, LMSStatus, ActiveUserSession, AcademicShift } from '../types';
import { StorageService } from '../services/storageService';
import { ExecutiveSummaryCards } from './ExecutiveSummaryCards';
import { DeleteModal } from './DeleteModal';
import { Session2023SelectorModal } from './Session2023SelectorModal';
import { AcademicSessionModal } from './AcademicSessionModal';
import {
  Save,
  Trash2,
  RotateCcw,
  Plus,
  Minus,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Calendar,
  User,
  Building2,
  GraduationCap,
  Layers,
  ArrowRight,
  ShieldCheck,
  Filter,
  SlidersHorizontal,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  onRecordSavedOrDeleted?: () => void;
  selectedDepartmentProp?: string;
  selectedProgramProp?: string;
  selectedShiftProp?: AcademicShift;
  selectedSessionProp?: string;
  currentUser?: ActiveUserSession;
  onOpenUserModal?: () => void;
  onSessionChangedProp?: (session: string) => void;
}

export const HODEntryForm: React.FC<Props> = ({
  onRecordSavedOrDeleted,
  selectedDepartmentProp,
  selectedProgramProp,
  selectedShiftProp,
  selectedSessionProp,
  currentUser,
  onOpenUserModal,
  onSessionChangedProp,
}) => {
  // Master Selections
  const [department, setDepartment] = useState<string>(
    selectedDepartmentProp || UNIVERSITY_DEPARTMENTS[0].name
  );

  // Generic Session State
  const [session, setSession] = useState<string>(
    selectedSessionProp || StorageService.getSelectedSession()
  );
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);

  // Filter to show only programs that belong to the selected session
  const [onlySessionFilter, setOnlySessionFilter] = useState<boolean>(true);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterVersion, setRosterVersion] = useState<number>(0);

  // Available programs for current department
  const currentDeptPrograms = useMemo(() => {
    const dept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === department);
    if (!dept) return [];
    if (onlySessionFilter) {
      const activeNames = StorageService.getSessionPrograms(department, session);
      const filtered = dept.programs.filter((p) => activeNames.includes(p.name));
      return filtered.length > 0 ? filtered : dept.programs;
    }
    return dept.programs;
  }, [department, session, onlySessionFilter, rosterVersion]);

  const [program, setProgram] = useState<string>(
    selectedProgramProp || (currentDeptPrograms[0]?.name || '')
  );

  // Auto-filled Degree Level
  const degreeLevel = useMemo(() => {
    const progInfo = currentDeptPrograms.find((p) => p.name === program);
    return progInfo?.degreeLevel || 'BS';
  }, [currentDeptPrograms, program]);

  // Shift selection (Morning vs Evening) - strictly isolated hierarchy level
  const [shift, setShift] = useState<AcademicShift>(selectedShiftProp || 'Morning');

  // Semester fixed to institutional cycle
  const [semester, setSemester] = useState<string>('1');

  // Metadata manual fields - initialized with current user name & designation
  const [hodCoordinator, setHodCoordinator] = useState<string>(() => {
    if (currentUser?.name) {
      return `${currentUser.name} (${currentUser.designation})`;
    }
    return 'Dr. Muhammad Tariq (HOD CS)';
  });
  const [submissionDate, setSubmissionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Update hodCoordinator if currentUser changes and not editing an existing locked record
  useEffect(() => {
    if (currentUser?.name && !isExistingRecord) {
      setHodCoordinator(`${currentUser.name} (${currentUser.designation})`);
    }
  }, [currentUser]);

  // Rows state: starts with only active rows (not forced 8 rows)
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => createInitialBlankRows(1, 'Morning'));

  // State flags
  const [isExistingRecord, setIsExistingRecord] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Sync props if changed externally (e.g. from VC Dashboard "Inspect Record")
  useEffect(() => {
    if (selectedDepartmentProp && selectedDepartmentProp !== department) {
      setDepartment(selectedDepartmentProp);
    }
  }, [selectedDepartmentProp]);

  useEffect(() => {
    if (selectedProgramProp && selectedProgramProp !== program) {
      setProgram(selectedProgramProp);
    }
  }, [selectedProgramProp]);

  useEffect(() => {
    if (selectedShiftProp && selectedShiftProp !== shift) {
      setShift(selectedShiftProp);
    }
  }, [selectedShiftProp]);

  useEffect(() => {
    if (selectedSessionProp && selectedSessionProp !== session) {
      setSession(selectedSessionProp);
    }
  }, [selectedSessionProp]);

  // When department changes, update program to the first program of that department
  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    const targetDept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDept);
    if (targetDept && targetDept.programs.length > 0) {
      const activeNames = StorageService.getSessionPrograms(newDept, session);
      const available = onlySessionFilter
        ? targetDept.programs.filter((p) => activeNames.includes(p.name))
        : targetDept.programs;
      const pick = available[0] || targetDept.programs[0];
      setProgram(pick ? pick.name : '');
    } else {
      setProgram('');
    }
  };

  // LOAD / CHECK EXISTING RECORD whenever Department, Program, Degree Level, Shift, or Session changes
  useEffect(() => {
    if (!department || !program) return;

    const existing = StorageService.getSubmission(
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester
    );

    if (existing) {
      // Existing record exists -> LOAD EXACT SAVED ROWS ONLY
      setIsExistingRecord(true);
      setLastSavedTime(existing.updatedAt);
      if (existing.hodCoordinator) setHodCoordinator(existing.hodCoordinator);
      if (existing.submissionDate) setSubmissionDate(existing.submissionDate);

      // Filter to existing non-empty rows, or if empty start with 1 row
      const validRows = existing.subjects.filter(
        (r) => r.courseCode.trim() || r.subjectTitle.trim() || r.status
      );
      setSubjects(validRows.length > 0 ? validRows : createInitialBlankRows(1, shift));

      showFeedback(
        'info',
        `Database record loaded for ${program} [${shift} Shift]: ${validRows.length} subject(s) retrieved.`
      );
    } else {
      // No record exists -> Start with 1 clean row
      setIsExistingRecord(false);
      setLastSavedTime(null);
      setSubjects(createInitialBlankRows(1, shift));
      showFeedback(
        'info',
        `New form initialized for ${program} (${shift} Shift). Click '+ Add Course Row' to add courses.`
      );
    }
  }, [department, program, degreeLevel, shift, session, semester]);

  const showFeedback = (type: 'success' | 'info' | 'warning', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Executive Summary calculation
  const summary = useMemo(() => {
    return StorageService.calculateSummary(subjects);
  }, [subjects]);

  // Field change handler
  const handleRowChange = (index: number, field: keyof SubjectRow, value: string) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  // Add extra row (up to 20 rows maximum)
  const handleAddRow = () => {
    if (subjects.length >= 20) {
      showFeedback('warning', 'Maximum 20 subject rows reached for this sheet.');
      return;
    }
    const newRow = createEmptySubjectRow(subjects.length + 1, shift);
    if (currentUser?.name) {
      newRow.uploadedBy = currentUser.name;
    }
    setSubjects((prev) => [...prev, newRow]);
    showFeedback('info', `Added subject row #${subjects.length + 1}.`);
  };

  // Delete a specific row
  const handleDeleteRow = (index: number) => {
    setSubjects((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    showFeedback('info', `Removed row #${index + 1}.`);
  };

  // Save / Update handler
  const handleSave = () => {
    if (!department || !program) {
      showFeedback('warning', 'Please select both Department and Program before saving.');
      return;
    }

    // Filter out rows that are completely empty before saving
    const activeRows = subjects.filter(
      (s) => s.courseCode.trim() || s.subjectTitle.trim() || s.status
    );

    if (activeRows.length === 0) {
      showFeedback('warning', 'Please add and fill at least one course before saving.');
      return;
    }

    setIsSaving(true);
    const recordToSave: SubmissionRecord = {
      id: '', // Generated in service
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester,
      hodCoordinator,
      submissionDate,
      subjects: activeRows,
      accessedBy: currentUser?.name || 'University HOD',
      userDesignation: currentUser?.designation || 'HOD / Coordinator',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = StorageService.saveSubmission(recordToSave);
    setIsSaving(false);

    if (result.success) {
      setIsExistingRecord(true);
      setLastSavedTime(new Date().toISOString());
      setSubjects(activeRows);
      showFeedback(
        'success',
        result.isUpdate
          ? `Record updated successfully for ${program} [${shift} Shift] (${activeRows.length} subjects). Changes saved to database.`
          : `New record saved successfully for ${program} [${shift} Shift] (${activeRows.length} subjects) in database.`
      );
      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
    }
  };

  // Clear Form (Requirement 11: Clear Form clears screen ONLY, does NOT delete database data)
  const handleClearForm = () => {
    setSubjects(createInitialBlankRows(1, shift));
    showFeedback(
      'info',
      `Visible form cleared on screen for ${shift} shift. Previously saved database records remain untouched.`
    );
  };

  // Delete Record (Requirement 10: Prompts confirmation, then deletes only that shift program)
  const handleDeleteConfirm = () => {
    const success = StorageService.deleteSubmission(
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester
    );

    setIsDeleteModalOpen(false);

    if (success) {
      setIsExistingRecord(false);
      setLastSavedTime(null);
      setSubjects(createInitialBlankRows(1, shift));
      showFeedback('success', `Record permanently deleted from database for ${program} [${shift} Shift].`);
      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
    } else {
      showFeedback('warning', 'No saved database record was found to delete.');
    }
  };

  // Export current program CSV
  const handleExportCurrent = () => {
    const currentRec: SubmissionRecord = {
      id: 'current',
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester,
      hodCoordinator,
      submissionDate,
      subjects,
      accessedBy: currentUser?.name || 'HOD / Coordinator',
      userDesignation: currentUser?.designation || 'HOD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.exportCSV([currentRec]);
    showFeedback('success', `Exported CSV sheet for ${program} [${shift} Shift].`);
  };

  const handleSessionChangeFromModal = (newSess: string) => {
    setSession(newSess);
    if (onSessionChangedProp) onSessionChangedProp(newSess);
  };

  return (
    <div id="hod-entry-interface" className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          id="status-feedback-banner"
          className={`px-4 py-3 rounded-lg border text-sm flex items-center justify-between shadow-xs transition-all animate-in fade-in slide-in-from-top-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            {feedbackMessage.type === 'warning' && (
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            {feedbackMessage.type === 'info' && (
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Database State Pill & Record Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Record Status:</span>
          {isExistingRecord ? (
            <span
              id="record-status-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Saved Record in Database
              {lastSavedTime && (
                <span className="text-emerald-700 font-normal">
                  (Updated: {new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </span>
          ) : (
            <span
              id="record-status-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              New Record (Unsaved Template)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <span className="hidden sm:inline">
            Active Target: <strong className="text-slate-800">{program}</strong> ({degreeLevel})
          </span>
          <span className="text-slate-300">|</span>
          <span>{summary.totalSubjects} subjects entered</span>
        </div>
      </div>

      {/* SECTION 01: SUBMISSION DETAILS */}
      <div id="submission-details-card" className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase bg-emerald-700 px-2 py-0.5 rounded text-white">
              Section 01
            </span>
            <h3 className="font-semibold text-sm tracking-wide">SUBMISSION DETAILS &amp; ACADEMIC HIERARCHY</h3>
          </div>
          <span className="text-xs text-slate-300 hidden sm:inline">
            Department → Program → Level → Shift → LMS Result Status
          </span>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 text-xs text-emerald-900 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Academic Hierarchy: <strong>Department</strong> → <strong>Program</strong> → <strong>Degree Level</strong> → <strong>Shift (Morning / Evening)</strong>.
              Morning and Evening datasets remain strictly isolated for the same program.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold text-[11px]">Academic Session:</span>
            <button
              id="btn-switch-academic-session"
              type="button"
              onClick={() => setIsSessionModalOpen(true)}
              className="px-2.5 py-1 bg-white border border-emerald-400 hover:border-emerald-600 text-emerald-950 font-bold rounded text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Click to switch or create a different Academic Session"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Session {session}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">Switch</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Primary Dropdowns Row - 4 Hierarchy Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 01: Department / School */}
            <div>
              <label
                htmlFor="select-department"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                01 DEPARTMENT <span className="text-rose-600">*</span>
              </label>
              <select
                id="select-department"
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
              >
                {UNIVERSITY_DEPARTMENTS.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 02: Program (Dependent) */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label
                  htmlFor="select-program"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  02 PROGRAM <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-open-session-roster"
                    type="button"
                    onClick={() => setIsRosterModalOpen(true)}
                    className="text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors shadow-2xs"
                    title={`Select which programs were enrolled in Session ${session} for this department`}
                  >
                    <SlidersHorizontal className="w-3 h-3 text-emerald-700" />
                    <span>Roster</span>
                  </button>
                  <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-slate-700 font-semibold bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={onlySessionFilter}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOnlySessionFilter(checked);
                        const dept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === department);
                        if (dept) {
                          const activeNames = StorageService.getSessionPrograms(department, session);
                          const valid = checked
                            ? dept.programs.filter((p) => activeNames.includes(p.name))
                            : dept.programs;
                          if (valid.length > 0 && !valid.some((p) => p.name === program)) {
                            setProgram(valid[0].name);
                          }
                        }
                      }}
                      className="rounded text-emerald-700 focus:ring-emerald-600 w-3 h-3"
                    />
                    <span>{session} Only</span>
                  </label>
                </div>
              </div>
              <select
                id="select-program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full bg-slate-50 border border-emerald-500 rounded-md px-3 py-2 text-sm font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
              >
                {currentDeptPrograms.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-emerald-800 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{currentDeptPrograms.length}</strong> active in {session}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsRosterModalOpen(true)}
                  className="text-emerald-700 hover:text-emerald-900 hover:underline font-semibold text-[11px]"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* 03: Degree Level (Fills Automatically) */}
            <div>
              <label
                htmlFor="input-degree-level"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                03 DEGREE LEVEL
              </label>
              <div
                id="input-degree-level"
                className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm font-bold text-slate-800 flex items-center justify-between cursor-not-allowed select-none"
              >
                <span>{degreeLevel}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  Auto-Filled
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Derived from program credentials</p>
            </div>

            {/* 04: Shift Selection (Morning vs Evening) */}
            <div>
              <label
                htmlFor="select-shift"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
              >
                {shift === 'Morning' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                )}
                04 ACADEMIC SHIFT <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 rounded-md border border-slate-300">
                <button
                  id="btn-shift-morning"
                  type="button"
                  onClick={() => setShift('Morning')}
                  className={`py-1.5 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    shift === 'Morning'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Morning</span>
                </button>
                <button
                  id="btn-shift-evening"
                  type="button"
                  onClick={() => setShift('Evening')}
                  className={`py-1.5 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    shift === 'Evening'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Evening</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {shift === 'Morning' ? '☀️ Morning roster (separate data)' : '🌙 Evening roster (separate data)'}
              </p>
            </div>
          </div>

          {/* Secondary Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Session / Semester */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-session-semester"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  SESSION / SEMESTER
                </label>
                <button
                  id="btn-change-session-inline"
                  type="button"
                  onClick={() => setIsSessionModalOpen(true)}
                  className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline decoration-emerald-500 cursor-pointer"
                >
                  Change Session
                </button>
              </div>
              <div
                id="input-session-semester"
                className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm font-semibold text-slate-800 flex items-center justify-between"
              >
                <span>Session {session} – Semester {semester}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {shift} Shift
                </span>
              </div>
            </div>

            {/* HOD / Program Coordinator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-hod-coordinator"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  HOD / PROGRAM COORDINATOR
                </label>
                {onOpenUserModal && (
                  <button
                    type="button"
                    onClick={onOpenUserModal}
                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline decoration-emerald-500 cursor-pointer"
                  >
                    Change User
                  </button>
                )}
              </div>
              <input
                id="input-hod-coordinator"
                type="text"
                value={hodCoordinator}
                onChange={(e) => setHodCoordinator(e.target.value)}
                placeholder="Enter HOD or Coordinator Name"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Date of Submission */}
            <div>
              <label
                htmlFor="input-submission-date"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                DATE OF SUBMISSION
              </label>
              <input
                id="input-submission-date"
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 02: EXECUTIVE SUMMARY */}
      <ExecutiveSummaryCards summary={summary} />

      {/* SECTION 03: SUBJECT-WISE LMS RESULT UPLOAD STATUS */}
      <div id="subject-table-card" className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase bg-emerald-700 px-2 py-0.5 rounded text-white">
              Section 03
            </span>
            <h3 className="font-semibold text-sm tracking-wide">
              SUBJECT-WISE LMS RESULT UPLOAD STATUS
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">
              Total Courses: <strong className="text-white">{subjects.length}</strong> (
              <strong className="text-emerald-400">{summary.totalSubjects}</strong> active)
            </span>
            <button
              id="btn-add-subject-row"
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Add a new subject course row"
            >
              <Plus className="w-3.5 h-3.5" /> Add Course Row
            </button>
          </div>
        </div>

        {/* Legend / Status Key Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700 uppercase tracking-wider">Status Key:</span>
            <span className="inline-flex items-center gap-1 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <strong>Uploaded:</strong> Result fully entered on LMS
            </span>
            <span className="inline-flex items-center gap-1 text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <strong>Pending:</strong> Not yet entered
            </span>
            <span className="inline-flex items-center gap-1 text-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <strong>In Progress:</strong> Partly entered
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <strong>Not Applicable:</strong> Not offered in Sem 1
            </span>
          </div>
          <span className="italic text-slate-500">
            Click <strong>+ Add Course Row</strong> to enable additional courses. Click trash icon to remove.
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table id="lms-result-sheet-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold tracking-wider border-b border-slate-300 text-[11px] uppercase">
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">#</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">Course Code</th>
                <th className="py-2.5 px-3 min-w-[200px] border-r border-slate-300">
                  Subject / Course Title
                </th>
                <th className="py-2.5 px-2 w-20 text-center border-r border-slate-300">Cr. Hrs</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">Section / Shift</th>
                <th className="py-2.5 px-3 w-40 border-r border-slate-300 bg-emerald-50 text-emerald-900">
                  LMS Result Status *
                </th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-300">Date Uploaded</th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-300">Uploaded By</th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-300">Remarks</th>
                <th className="py-2.5 px-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 bg-slate-50/50">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      No courses currently added for {program}
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      Click the button below to enable the first course entry row.
                    </p>
                    <button
                      id="btn-add-first-subject-row"
                      type="button"
                      onClick={handleAddRow}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Course
                    </button>
                  </td>
                </tr>
              ) : (
                subjects.map((row, idx) => {
                  const isBlank = !row.courseCode.trim() && !row.subjectTitle.trim() && !row.status;

                  return (
                    <tr
                      key={row.id || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBlank ? 'bg-slate-50/20' : 'bg-white'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-2 px-2 text-center font-bold text-slate-400 border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Course Code (Manual Entry) */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          id={`input-course-code-${idx + 1}`}
                          type="text"
                          value={row.courseCode}
                          onChange={(e) => handleRowChange(idx, 'courseCode', e.target.value)}
                          placeholder="e.g. CS-301"
                          className="w-full px-2 py-1.5 text-xs font-mono font-medium rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* Subject Title (Manual Entry) */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          id={`input-subject-title-${idx + 1}`}
                          type="text"
                          value={row.subjectTitle}
                          onChange={(e) => handleRowChange(idx, 'subjectTitle', e.target.value)}
                          placeholder="e.g. Database Systems"
                          className="w-full px-2 py-1.5 text-xs font-medium rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* Credit Hours (Manual Entry) */}
                      <td className="py-1 px-1 border-r border-slate-200 text-center">
                        <input
                          id={`input-credit-hours-${idx + 1}`}
                          type="text"
                          value={row.creditHours}
                          onChange={(e) => handleRowChange(idx, 'creditHours', e.target.value)}
                          placeholder="3"
                          className="w-full px-1 py-1.5 text-xs text-center font-medium rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* Section / Shift (Manual Entry) */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          id={`input-section-shift-${idx + 1}`}
                          type="text"
                          value={row.sectionShift}
                          onChange={(e) => handleRowChange(idx, 'sectionShift', e.target.value)}
                          placeholder="e.g. Sec A / Morning"
                          className="w-full px-2 py-1.5 text-xs rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* LMS Result Status (DROPDOWN ONLY) */}
                      <td className="py-1 px-2 border-r border-slate-200 bg-emerald-50/20">
                        <select
                          id={`select-status-${idx + 1}`}
                          value={row.status}
                          onChange={(e) =>
                            handleRowChange(idx, 'status', e.target.value as LMSStatus)
                          }
                          className={`w-full px-2 py-1.5 text-xs font-semibold rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
                            row.status === 'Uploaded'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : row.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : row.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : row.status === 'Not Applicable'
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white text-slate-400 border-slate-300'
                          }`}
                        >
                          <option value="">-- Select Status --</option>
                          <option value="Uploaded">Uploaded</option>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Not Applicable">Not Applicable</option>
                        </select>
                      </td>

                      {/* Date Uploaded (Manual Entry) */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          id={`input-date-uploaded-${idx + 1}`}
                          type="text"
                          value={row.dateUploaded}
                          onChange={(e) => handleRowChange(idx, 'dateUploaded', e.target.value)}
                          placeholder="DD-MM-YYYY"
                          className="w-full px-2 py-1.5 text-xs font-mono rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* Uploaded By (Manual Entry) */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          id={`input-uploaded-by-${idx + 1}`}
                          type="text"
                          value={row.uploadedBy}
                          onChange={(e) => handleRowChange(idx, 'uploadedBy', e.target.value)}
                          placeholder="e.g. HOD / Teacher"
                          className="w-full px-2 py-1.5 text-xs rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* Remarks (Manual Entry) */}
                      <td className="py-1 px-2 border-r border-slate-200">
                        <input
                          id={`input-remarks-${idx + 1}`}
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                          placeholder="Optional remarks"
                          className="w-full px-2 py-1.5 text-xs rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </td>

                      {/* Action: Delete Row */}
                      <td className="py-1 px-2 text-center">
                        <button
                          id={`btn-delete-row-${idx + 1}`}
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title={`Delete row #${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Add Row Bottom Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button
            id="btn-add-subject-row-bottom"
            type="button"
            onClick={handleAddRow}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Course Row
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>
              Configured for <strong>Session {session} – Semester {semester}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-emerald-800">
              Active in Summary: {summary.totalSubjects} course(s)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 04: ACTION BUTTONS (Save / Update, Clear Form, Delete Record) */}
      <div
        id="hod-action-bar"
        className="bg-white p-4 rounded-lg border border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* SAVE / UPDATE BUTTON */}
          <button
            id="btn-save-record"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-lg shadow-xs flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            {isExistingRecord ? 'UPDATE RECORD' : 'SAVE RECORD'}
          </button>

          {/* CLEAR FORM BUTTON (Clears screen ONLY, does NOT delete database) */}
          <button
            id="btn-clear-form"
            type="button"
            onClick={handleClearForm}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 flex items-center gap-2 transition-all"
            title="Clear what is currently shown on screen without deleting saved database record"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            CLEAR FORM
          </button>

          {/* DELETE RECORD BUTTON (Only appears if record exists or when requested) */}
          <button
            id="btn-delete-record"
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={!isExistingRecord}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all border ${
              isExistingRecord
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
            }`}
            title="Permanently remove saved record for this program from database"
          >
            <Trash2 className="w-4 h-4" />
            DELETE RECORD
          </button>
        </div>

        {/* CSV Export for this program */}
        <div className="flex items-center gap-2">
          <button
            id="btn-export-program-csv"
            type="button"
            onClick={handleExportCurrent}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Program CSV
          </button>
        </div>
      </div>

      {/* SECTION 05: OFFICIAL SIGNATURES FOOTER (From MNS-UET Sheet) */}
      <div
        id="official-signatures-footer"
        className="bg-white p-6 rounded-lg border border-slate-300 shadow-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          <div className="text-center">
            <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center text-xs text-slate-400 italic">
              {hodCoordinator || 'Signature & Stamp'}
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Program Coordinator
            </p>
            <p className="text-[11px] text-slate-500">{program}</p>
          </div>

          <div className="text-center">
            <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center text-xs text-slate-400 italic">
              Signature & Stamp
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Head of Department
            </p>
            <p className="text-[11px] text-slate-500">{department}</p>
          </div>

          <div className="text-center">
            <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center text-xs text-slate-400 italic">
              Official Seal
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Office of Examinations
            </p>
            <p className="text-[11px] text-slate-500">MNS-UET Multan</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        department={department}
        program={program}
        shift={shift}
        session={session}
        semester={semester}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Dynamic Academic Session Selector & Creator Modal */}
      <AcademicSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        currentSession={session}
        onSessionSelect={handleSessionChangeFromModal}
      />

      {/* Program Roster Selector Modal for current Academic Session */}
      <Session2023SelectorModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        departmentName={department}
        sessionName={session}
        onRosterUpdated={(activeProgs) => {
          setRosterVersion((v) => v + 1);
          if (activeProgs.length > 0 && !activeProgs.includes(program)) {
            setProgram(activeProgs[0]);
          }
          if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
        }}
      />
    </div>
  );
};
