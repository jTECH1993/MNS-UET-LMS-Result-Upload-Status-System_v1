import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SubjectRow, AcademicShift, LMSStatus } from '../types';
import {
  BulkCSVImportService,
  BulkValidationSummary,
  ValidatedCSVRow,
  ImportContext,
} from '../services/bulkCSVImportService';
import { StorageService } from '../services/storageService';
import {
  UNIVERSITY_DEPARTMENTS,
  ACADEMIC_SEMESTERS,
  ACADEMIC_SHIFTS,
  DEFAULT_ACADEMIC_SESSIONS,
} from '../data/departmentsData';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Sparkles,
  Download,
  Database,
  Layers,
  Filter,
  Search,
  RotateCcw,
  Check,
  CheckCheck,
  Building2,
  Calendar,
  Clock,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  Info,
  FileText,
} from 'lucide-react';

export interface BulkCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Context defaults (optional if opened from VC Dashboard or specific HOD Program)
  departmentName?: string;
  programName?: string;
  degreeLevel?: string;
  currentShift?: AcademicShift;
  currentSemester?: string;
  currentSection?: string;
  currentSession?: string;
  availableSections?: string[];
  // Callback when import is committed directly to database or parent sheet
  onCommitSuccess?: (summary: {
    committedCount: number;
    skippedCount: number;
    affectedProgramsCount: number;
  }) => void;
  // Legacy / Direct sheet callbacks if used within HOD form
  onImportCourses?: (
    courses: Partial<SubjectRow>[],
    mode: 'replace' | 'append',
    targetSection?: string
  ) => void;
  onImportDirectToSections?: (
    sectionData: Record<string, Partial<SubjectRow>[]>,
    mode: 'replace' | 'append'
  ) => void;
  currentCount?: number;
}

export const BulkCSVImportModal: React.FC<BulkCSVImportModalProps> = ({
  isOpen,
  onClose,
  departmentName,
  programName,
  degreeLevel = 'BS',
  currentShift = 'Morning',
  currentSemester = '1',
  currentSection = 'A',
  currentSession = '2023',
  availableSections = ['A', 'B'],
  onCommitSuccess,
  onImportCourses,
  onImportDirectToSections,
}) => {
  // Active Input Mode
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'templates'>('upload');
  const [rawInput, setRawInput] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Selection States (allows tweaking default department/session/shift/semester if CSV lacks them)
  const [selectedDept, setSelectedDept] = useState<string>(departmentName || UNIVERSITY_DEPARTMENTS[0].name);
  const [selectedProg, setSelectedProg] = useState<string>(
    programName || UNIVERSITY_DEPARTMENTS[0].programs[0]?.name || 'BS Computer Science'
  );
  const [selectedShift, setSelectedShift] = useState<AcademicShift>(currentShift);
  const [selectedSession, setSelectedSession] = useState<string>(currentSession);
  const [selectedSemester, setSelectedSemester] = useState<string>(currentSemester);
  const [selectedSection, setSelectedSection] = useState<string>(currentSection);

  // Commit Settings
  const [commitMode, setCommitMode] = useState<'skip-failed' | 'strict'>('skip-failed');
  const [writeMode, setWriteMode] = useState<'merge' | 'replace'>('merge');

  // Review Table Filters
  const [reviewFilterStatus, setReviewFilterStatus] = useState<'ALL' | 'VALID' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Processing & State
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<{
    committedCount: number;
    skippedCount: number;
    affectedProgramsCount: number;
    recordsCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      if (departmentName) setSelectedDept(departmentName);
      if (programName) setSelectedProg(programName);
      if (currentShift) setSelectedShift(currentShift);
      if (currentSemester) setSelectedSemester(currentSemester);
      if (currentSection) setSelectedSection(currentSection);
      if (currentSession) setSelectedSession(currentSession);
      setCommitResult(null);
      setErrorMessage(null);
      setSearchQuery('');
    }
  }, [isOpen, departmentName, programName, currentShift, currentSemester, currentSection, currentSession]);

  // Keep program in sync with department if department changes
  const activeDeptObj = useMemo(() => {
    return (
      UNIVERSITY_DEPARTMENTS.find((d) => d.name === selectedDept) ||
      UNIVERSITY_DEPARTMENTS[0]
    );
  }, [selectedDept]);

  const activeDeptPrograms = useMemo(() => {
    return activeDeptObj.programs || [];
  }, [activeDeptObj]);

  const handleDeptChange = (newDept: string) => {
    setSelectedDept(newDept);
    const matched = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDept);
    if (matched && matched.programs.length > 0) {
      setSelectedProg(matched.programs[0].name);
    }
  };

  // Build Context for Parser & Validator
  const importContext: ImportContext = useMemo(() => {
    return {
      defaultDepartment: selectedDept,
      defaultProgram: selectedProg,
      defaultDegreeLevel: degreeLevel,
      defaultShift: selectedShift,
      defaultSection: selectedSection,
      defaultSession: selectedSession,
      defaultSemester: selectedSemester,
    };
  }, [selectedDept, selectedProg, degreeLevel, selectedShift, selectedSection, selectedSession, selectedSemester]);

  // Handle File Upload
  const processUploadedFile = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setRawInput(content);
      setCommitResult(null);
      setErrorMessage(null);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Live Parsing and Database Validation
  const validationSummary: BulkValidationSummary | null = useMemo(() => {
    if (!rawInput.trim()) return null;
    const rawRows = BulkCSVImportService.parseRawCSV(rawInput, importContext);
    if (rawRows.length === 0) return null;
    return BulkCSVImportService.validateRows(rawRows, importContext);
  }, [rawInput, importContext]);

  // Filtered rows for the interactive inspection table
  const displayedRows = useMemo(() => {
    if (!validationSummary) return [];
    let list = validationSummary.rows;

    if (reviewFilterStatus === 'VALID') {
      list = list.filter((r) => r.isValid);
    } else if (reviewFilterStatus === 'FAILED') {
      list = list.filter((r) => !r.isValid);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const n = r.normalized;
        return (
          n.courseCode.toLowerCase().includes(q) ||
          n.subjectTitle.toLowerCase().includes(q) ||
          n.uploadedBy.toLowerCase().includes(q) ||
          n.program.toLowerCase().includes(q) ||
          n.session.includes(q) ||
          n.semester.includes(q) ||
          n.section.toLowerCase().includes(q) ||
          r.issues.some((iss) => iss.message.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [validationSummary, reviewFilterStatus, searchQuery]);

  // Commit valid rows to the database
  const handleCommit = async () => {
    if (!validationSummary) return;

    if (validationSummary.validRowsCount === 0) {
      setErrorMessage('There are no valid rows to commit. Please resolve errors in your CSV.');
      return;
    }

    if (commitMode === 'strict' && validationSummary.failedRowsCount > 0) {
      setErrorMessage(
        `Strict Mode active: ${validationSummary.failedRowsCount} row(s) failed validation. All rows must be valid before committing.`
      );
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);

    try {
      const activeUser = StorageService.getActiveUser();
      const res = await BulkCSVImportService.commitValidatedRows(
        validationSummary,
        commitMode,
        writeMode,
        activeUser?.name || 'Authorized Academic Coordinator',
        activeUser?.designation || activeUser?.role || 'HOD / Coordinator'
      );

      if (!res.success) {
        setErrorMessage(res.errorMessage || 'Failed to commit records to the database.');
        setIsCommitting(false);
        return;
      }

      setCommitResult({
        committedCount: res.committedCount,
        skippedCount: res.skippedCount,
        affectedProgramsCount: res.affectedProgramsCount,
        recordsCount: res.recordsCount,
      });

      // If parent supplied legacy sheet callbacks, synchronize active view as well
      if (onImportDirectToSections) {
        const sectionMap: Record<string, Partial<SubjectRow>[]> = {};
        validationSummary.rows
          .filter((r) => r.isValid)
          .forEach((r) => {
            const sec = r.normalized.section || selectedSection;
            if (!sectionMap[sec]) sectionMap[sec] = [];
            sectionMap[sec].push({
              courseCode: r.normalized.courseCode,
              subjectTitle: r.normalized.subjectTitle,
              creditHours: r.normalized.creditHours,
              status: r.normalized.status,
              uploadedBy: r.normalized.uploadedBy,
              remarks: r.normalized.remarks,
              sectionShift: `${r.normalized.shift} - Sem ${r.normalized.semester} (Sec ${sec})`,
              dateUploaded: r.normalized.dateUploaded,
            });
          });
        onImportDirectToSections(sectionMap, writeMode === 'replace' ? 'replace' : 'append');
      } else if (onImportCourses) {
        const courses = validationSummary.rows
          .filter((r) => r.isValid && (r.normalized.section === selectedSection || !r.normalized.section))
          .map((r) => ({
            courseCode: r.normalized.courseCode,
            subjectTitle: r.normalized.subjectTitle,
            creditHours: r.normalized.creditHours,
            status: r.normalized.status,
            uploadedBy: r.normalized.uploadedBy,
            remarks: r.normalized.remarks,
            sectionShift: `${r.normalized.shift} - Sem ${r.normalized.semester} (Sec ${r.normalized.section || selectedSection})`,
            dateUploaded: r.normalized.dateUploaded,
          }));
        if (courses.length > 0) {
          onImportCourses(courses, writeMode === 'replace' ? 'replace' : 'append', selectedSection);
        }
      }

      if (onCommitSuccess) {
        onCommitSuccess({
          committedCount: res.committedCount,
          skippedCount: res.skippedCount,
          affectedProgramsCount: res.affectedProgramsCount,
        });
      }

      // Notify entire app of storage change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mnsuet_storage_updated'));
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Unexpected error committing to the database.');
    } finally {
      setIsCommitting(false);
    }
  };

  // Download validation audit report
  const handleExportValidationReport = () => {
    if (!validationSummary) return;
    BulkCSVImportService.exportValidationReportCSV(
      validationSummary,
      `MNS_UET_CSV_Validation_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // Load sample template into input
  const handleLoadSample = (type: 'standard' | 'master') => {
    const sample =
      type === 'standard'
        ? BulkCSVImportService.getSampleStandardCSV()
        : BulkCSVImportService.getSampleMasterCSV();
    setRawInput(sample);
    setUploadedFileName(type === 'standard' ? 'sample_course_results.csv' : 'sample_master_university.csv');
    setActiveTab('paste');
    setCommitResult(null);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-bulk-csv-import"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-800/90 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-500/60">
                  Bulk CSV Importer
                </span>
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-400" /> Database-Grounded Validation
                </span>
                {selectedSession && (
                  <span className="text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700">
                    Session {selectedSession}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
                Import Course Results via CSV &amp; Verify against Catalog Database
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post-Commit Success Screen */}
        {commitResult ? (
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCheck className="w-9 h-9" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                Database Synchronization Complete
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                Successfully Committed {commitResult.committedCount} Course Results!
              </h3>
              <p className="text-sm text-slate-600 max-w-lg mt-1">
                The validated course results have been atomically committed to persistent Firestore
                and indexed storage, with automated audit logs recorded.
              </p>
            </div>

            {/* Summary Statistics Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 uppercase font-bold block">
                  Committed
                </span>
                <span className="text-xl font-black text-emerald-600">
                  {commitResult.committedCount} Courses
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 uppercase font-bold block">
                  Skipped (Failed)
                </span>
                <span className="text-xl font-black text-rose-500">
                  {commitResult.skippedCount} Rows
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 uppercase font-bold block">
                  Offerings Updated
                </span>
                <span className="text-xl font-black text-indigo-600">
                  {commitResult.recordsCount} Records
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 uppercase font-bold block">
                  Programs
                </span>
                <span className="text-xl font-black text-slate-800">
                  {commitResult.affectedProgramsCount} Degree(s)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setCommitResult(null);
                  setRawInput('');
                  setUploadedFileName(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-2 border border-slate-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" /> Import Another CSV
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" /> View Updated Records in Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Main Workflow */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Context Configuration Accordion / Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Default Academic Target &amp; Fallback Context
                </span>
                <span className="text-[11px] text-slate-500">
                  Used if uploaded CSV rows do not explicitly specify department, session, or semester
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
                {/* Department */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Department
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {UNIVERSITY_DEPARTMENTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.code} - {d.name.replace('Department of ', '')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Program
                  </label>
                  <select
                    value={selectedProg}
                    onChange={(e) => setSelectedProg(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {activeDeptPrograms.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Session
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {DEFAULT_ACADEMIC_SESSIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {ACADEMIC_SEMESTERS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Input Navigation Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UploadCloud className="w-4 h-4" /> Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'paste'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" /> Paste Text / LMS String
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'templates'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> Templates &amp; Sample CSVs
              </button>
            </div>

            {/* Tab 1: Upload File */}
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[0.99]'
                    : uploadedFileName
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {uploadedFileName ? (
                    <span className="text-emerald-700 flex items-center gap-1 justify-center">
                      <FileCheck className="w-4 h-4" /> Loaded: {uploadedFileName}
                    </span>
                  ) : (
                    'Click to select or drag and drop your Course Results CSV file'
                  )}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Supports standard CSV, Excel exports with columns (Course Code, Subject Title,
                  Session, Semester, LMS Status, Credit Hours).
                </p>
                {uploadedFileName && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Select Different File
                  </button>
                )}
              </div>
            )}

            {/* Tab 2: Paste Raw Text */}
            {activeTab === 'paste' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Paste comma-separated, tab-separated, or LMS portal lines:</span>
                  {rawInput && (
                    <button
                      type="button"
                      onClick={() => setRawInput('')}
                      className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Clear Content
                    </button>
                  )}
                </div>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  rows={6}
                  placeholder={`Example CSV lines:\nCS-101,Programming Fundamentals,4,A,Morning,1,2023,Uploaded,Dr. Tariq,LMS marks verified\nCS-102,Discrete Structures,3,A,Morning,1,2023,Uploaded,Engr. Usama,Final results submitted\nMTH-114,Calculus & Analytical Geometry,3,A,Morning,1,2023,Uploaded,Prof. Dr. Zahid,Verified`}
                  className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            )}

            {/* Tab 3: Sample Templates */}
            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Program / Section CSV
                    </span>
                    <h5 className="font-bold text-slate-900 mt-1">Standard Course Results CSV</h5>
                    <p className="text-xs text-slate-600 mt-1">
                      Includes Course Code, Title, Credit Hours, Section, Shift, Semester, Session,
                      LMS Status, Instructor, Remarks.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleLoadSample('standard')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Load Standard Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([BulkCSVImportService.getSampleStandardCSV()], {
                          type: 'text/csv',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'MNS_UET_Standard_Results_Template.csv';
                        a.click();
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download .CSV
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      University Master CSV
                    </span>
                    <h5 className="font-bold text-slate-900 mt-1">Multi-Department Master Format</h5>
                    <p className="text-xs text-slate-600 mt-1">
                      Matches the institutional master export containing Department, Program, Shift,
                      Section, Session, Semester, and Courses.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleLoadSample('master')}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Load Master Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([BulkCSVImportService.getSampleMasterCSV()], {
                          type: 'text/csv',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'MNS_UET_Master_University_Template.csv';
                        a.click();
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download .CSV
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Validation Summary Report Section */}
            {validationSummary && (
              <div className="space-y-4 pt-2">
                {/* High-Level Validation KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Rows Parsed
                    </span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {validationSummary.totalRows} Courses
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {validationSummary.programsInvolved.length} Degree Program(s)
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Passed Validation
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xl font-black text-emerald-700 mt-1 block">
                      {validationSummary.validRowsCount} Valid
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Ready to commit to database
                    </span>
                  </div>

                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                        Failed Validation
                      </span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-xl font-black text-rose-700 mt-1 block">
                      {validationSummary.failedRowsCount} Rejected
                    </span>
                    <span className="text-[11px] text-rose-700 font-semibold">
                      {validationSummary.failedRowsCount === 0
                        ? 'Zero database issues'
                        : 'Invalid codes / sessions'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
                        Catalog Compliance
                      </span>
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-xl font-black text-indigo-700 mt-1 block">
                      {validationSummary.passRate}%
                    </span>
                    <span className="text-[11px] text-indigo-700">
                      {validationSummary.warningCount} warning adjustments
                    </span>
                  </div>
                </div>

                {/* Filter and Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReviewFilterStatus('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        reviewFilterStatus === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All Rows ({validationSummary.totalRows})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilterStatus('VALID')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        reviewFilterStatus === 'VALID'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Valid Only ({validationSummary.validRowsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilterStatus('FAILED')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        reviewFilterStatus === 'FAILED'
                          ? 'bg-rose-700 text-white'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      Failed Only ({validationSummary.failedRowsCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search courses or issues..."
                        className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden w-48 sm:w-56"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportValidationReport}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Download validation error report as CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Export Audit Report</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Interactive Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">Row</th>
                        <th className="py-2 px-3 w-28">Validation</th>
                        <th className="py-2 px-3">Subject Code &amp; Title</th>
                        <th className="py-2 px-3">Session &amp; Sem</th>
                        <th className="py-2 px-3">Program &amp; Section</th>
                        <th className="py-2 px-3">Status / Cr</th>
                        <th className="py-2 px-3">Database Verification / Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500">
                            No rows match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r) => {
                          const n = r.normalized;
                          return (
                            <tr
                              key={r.rowNumber}
                              className={`transition-colors ${
                                r.isValid
                                  ? 'hover:bg-emerald-50/40 bg-white'
                                  : 'hover:bg-rose-50/60 bg-rose-50/20'
                              }`}
                            >
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">
                                #{r.rowNumber}
                              </td>

                              <td className="py-2 px-3">
                                {r.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <Check className="w-3 h-3 text-emerald-600" /> VALID
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" /> FAILED
                                  </span>
                                )}
                              </td>

                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900 font-mono">
                                  {n.courseCode || r.rawRow.courseCode || '---'}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate max-w-xs">
                                  {n.subjectTitle || r.rawRow.subjectTitle || 'No Title'}
                                </div>
                              </td>

                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-800">
                                  Session {n.session || '---'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Semester {n.semester || '---'}
                                </div>
                              </td>

                              <td className="py-2 px-3">
                                <div className="font-medium text-slate-800 truncate max-w-[140px]">
                                  {n.program}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Sec {n.section} • {n.shift}
                                </div>
                              </td>

                              <td className="py-2 px-3">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                    n.status === 'Uploaded'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : n.status === 'In Progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {n.status}
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {n.creditHours} CH
                                </div>
                              </td>

                              <td className="py-2 px-3">
                                {r.issues.length === 0 ? (
                                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    {r.matchedExistingInDB
                                      ? 'Verified in University Database Catalog'
                                      : r.catalogSource || 'Compliant with Academic Catalog'}
                                  </span>
                                ) : (
                                  <div className="space-y-1">
                                    {r.issues.map((iss, idx) => (
                                      <div
                                        key={idx}
                                        className={`text-[11px] flex items-start gap-1 ${
                                          iss.severity === 'error'
                                            ? 'text-rose-700 font-medium'
                                            : 'text-amber-700'
                                        }`}
                                      >
                                        {iss.severity === 'error' ? (
                                          <AlertCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                                        ) : (
                                          <Info className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                        )}
                                        <span>{iss.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pre-Commit Configuration Deck */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Validation Policy:</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                          <input
                            type="radio"
                            name="commitPolicy"
                            checked={commitMode === 'skip-failed'}
                            onChange={() => setCommitMode('skip-failed')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Skip Failed &amp; Commit Valid Rows ({validationSummary.validRowsCount})</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium ml-2">
                          <input
                            type="radio"
                            name="commitPolicy"
                            checked={commitMode === 'strict'}
                            onChange={() => setCommitMode('strict')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Strict Mode (Require 100% Pass)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Database Write Mode:</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                          <input
                            type="radio"
                            name="writeMode"
                            checked={writeMode === 'merge'}
                            onChange={() => setWriteMode('merge')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Merge &amp; Update Existing Courses</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium ml-2">
                          <input
                            type="radio"
                            name="writeMode"
                            checked={writeMode === 'replace'}
                            onChange={() => setWriteMode('replace')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Replace Section Roster</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!commitResult && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Atomic save with automated rollback, Firebase sync, and institutional audit trail
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  !validationSummary ||
                  validationSummary.validRowsCount === 0 ||
                  (commitMode === 'strict' && validationSummary.failedRowsCount > 0) ||
                  isCommitting
                }
                onClick={handleCommit}
                className="px-5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isCommitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Committing to Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>
                      Commit{' '}
                      {validationSummary ? validationSummary.validRowsCount : 0}{' '}
                      Validated Course(s) to Database
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
