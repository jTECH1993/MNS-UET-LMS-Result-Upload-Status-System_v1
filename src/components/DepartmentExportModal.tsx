import React, { useState, useMemo } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { SubmissionRecord, SubjectRow } from '../types';
import { StorageService } from '../services/storageService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import {
  Printer,
  X,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Layers,
  GraduationCap,
  ShieldCheck,
  Award,
} from 'lucide-react';

export type ExportScope = 'CURRENT_OFFERING' | 'CURRENT_PROGRAM' | 'ENTIRE_DEPARTMENT';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  department: string;
  program: string;
  degreeLevel: string;
  shift: string;
  section: string;
  session: string;
  semester: string;
  hodCoordinator: string;
  submissionDate: string;
  currentSubjects: SubjectRow[];
  currentRecord?: SubmissionRecord | null;
  currentUser?: { name?: string; role?: string; designation?: string } | null;
}

export const DepartmentExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  department,
  program,
  degreeLevel,
  shift,
  section,
  session,
  semester,
  hodCoordinator,
  submissionDate,
  currentSubjects,
  currentRecord,
  currentUser,
}) => {
  const [exportScope, setExportScope] = useState<ExportScope>('ENTIRE_DEPARTMENT');
  const [includeBlankRows, setIncludeBlankRows] = useState<boolean>(false);
  const [reportTitle, setReportTitle] = useState<string>(
    'Official LMS Result Upload Status & Academic Compliance Report'
  );

  // Retrieve records based on selected scope
  const targetRecords = useMemo(() => {
    const allStore = StorageService.getAllSubmissions();
    const currentVirtualRec: SubmissionRecord = {
      id: currentRecord?.id || 'current-virtual',
      department,
      program,
      degreeLevel,
      shift: shift as any,
      section,
      session,
      semester,
      hodCoordinator,
      submissionDate,
      subjects: currentSubjects,
      accessedBy: currentUser?.name || hodCoordinator || 'Head of Department',
      userDesignation: currentUser?.designation || 'HOD',
      createdAt: currentRecord?.createdAt || new Date().toISOString(),
      updatedAt: currentRecord?.updatedAt || new Date().toISOString(),
    };

    if (exportScope === 'CURRENT_OFFERING') {
      return [currentVirtualRec];
    }

    if (exportScope === 'CURRENT_PROGRAM') {
      const progMatches = allStore.filter(
        (r) =>
          StorageService._isDeptMatch(department, r.department) &&
          StorageService._isProgMatch(program, r.program) &&
          String(r.session || '2023').trim() === String(session).trim()
      );

      const hasCurrent = progMatches.some(
        (r) =>
          String(r.semester) === String(semester) &&
          String(r.shift) === String(shift) &&
          String(r.section || 'A') === String(section)
      );

      let mergedList: SubmissionRecord[] = [];
      if (hasCurrent) {
        mergedList = progMatches.map((r) => {
          if (
            String(r.semester) === String(semester) &&
            String(r.shift) === String(shift) &&
            String(r.section || 'A') === String(section)
          ) {
            return currentVirtualRec;
          }
          return r;
        });
      } else if (currentSubjects.some((s) => s.courseCode || s.subjectTitle)) {
        mergedList = [currentVirtualRec, ...progMatches];
      } else {
        mergedList = progMatches.length > 0 ? progMatches : [currentVirtualRec];
      }

      return mergedList.sort((a, b) => {
        if (a.shift !== b.shift) {
          if (a.shift === 'Morning') return -1;
          if (b.shift === 'Morning') return 1;
        }
        if (a.semester !== b.semester) return String(a.semester).localeCompare(String(b.semester));
        return (a.section || 'A').localeCompare(b.section || 'A');
      });
    }

    // ENTIRE_DEPARTMENT
    const deptMatches = allStore.filter(
      (r) =>
        StorageService._isDeptMatch(department, r.department) &&
        String(r.session || '2023').trim() === String(session).trim()
    );

    const hasCurrent = deptMatches.some(
      (r) =>
        StorageService._isProgMatch(program, r.program) &&
        String(r.semester) === String(semester) &&
        String(r.shift) === String(shift) &&
        String(r.section || 'A') === String(section)
    );

    let mergedDeptList: SubmissionRecord[] = [];
    if (hasCurrent) {
      mergedDeptList = deptMatches.map((r) => {
        if (
          StorageService._isProgMatch(program, r.program) &&
          String(r.semester) === String(semester) &&
          String(r.shift) === String(shift) &&
          String(r.section || 'A') === String(section)
        ) {
          return currentVirtualRec;
        }
        return r;
      });
    } else if (currentSubjects.some((s) => s.courseCode || s.subjectTitle)) {
      mergedDeptList = [currentVirtualRec, ...deptMatches];
    } else {
      mergedDeptList = deptMatches.length > 0 ? deptMatches : [currentVirtualRec];
    }

    return mergedDeptList.sort((a, b) => {
      if (a.program !== b.program) return a.program.localeCompare(b.program);
      if (a.shift !== b.shift) {
        if (a.shift === 'Morning') return -1;
        if (b.shift === 'Morning') return 1;
      }
      if (a.semester !== b.semester) return String(a.semester).localeCompare(String(b.semester));
      return (a.section || 'A').localeCompare(b.section || 'A');
    });
  }, [
    exportScope,
    department,
    program,
    degreeLevel,
    shift,
    section,
    session,
    semester,
    hodCoordinator,
    submissionDate,
    currentSubjects,
    currentRecord,
    currentUser,
  ]);

  // Compute aggregate statistics
  const aggregateStats = useMemo(() => {
    let totalCourses = 0;
    let uploaded = 0;
    let pending = 0;
    let inProgress = 0;
    let notApplicable = 0;

    targetRecords.forEach((rec) => {
      const activeRows = rec.subjects.filter(
        (s) => includeBlankRows || (s.courseCode && s.courseCode.trim()) || (s.subjectTitle && s.subjectTitle.trim()) || s.status
      );
      activeRows.forEach((s) => {
        totalCourses++;
        if (s.status === 'Uploaded') uploaded++;
        else if (s.status === 'Pending') pending++;
        else if (s.status === 'In Progress') inProgress++;
        else if (s.status === 'Not Applicable') notApplicable++;
      });
    });

    const complianceRate = totalCourses > 0 ? Math.round((uploaded / totalCourses) * 100) : 0;

    return {
      totalOfferings: targetRecords.length,
      totalCourses,
      uploaded,
      pending,
      inProgress,
      notApplicable,
      complianceRate,
    };
  }, [targetRecords, includeBlankRows]);

  if (!isOpen) return null;

  // Handle CSV Download
  const handleDownloadCSV = () => {
    const filename = `MNS_UET_${department.replace(/[^a-zA-Z0-9]/g, '_')}_${exportScope}_Session_${session}_${new Date().toISOString().slice(0, 10)}.csv`;
    StorageService.exportCSV(targetRecords, filename);
  };

  // Handle Print / PDF Generation
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div
      id="department-export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls Header (Hidden during browser printing) */}
        <div className="print:hidden bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/40">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Official Department Result Export &amp; Record Sheet
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Download verified academic results as CSV or print official signed PDF records for institutional archiving.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-pdf-top"
              type="button"
              onClick={handlePrintPDF}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              id="btn-download-csv-top"
              type="button"
              onClick={handleDownloadCSV}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              id="btn-close-export-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope and Filter Selector (Hidden during printing) */}
        <div className="print:hidden bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Export Target Scope:
              </span>
              <div className="inline-flex bg-white rounded-lg border border-slate-300 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setExportScope('ENTIRE_DEPARTMENT')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    exportScope === 'ENTIRE_DEPARTMENT'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Entire Department ({department})
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('CURRENT_PROGRAM')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    exportScope === 'CURRENT_PROGRAM'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Program: {program}
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('CURRENT_OFFERING')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    exportScope === 'CURRENT_OFFERING'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Current Offering ({shift} - Sem {semester} Sec {section})
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 text-xs bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
              <span className="text-slate-500">
                Offerings: <strong className="text-slate-800">{aggregateStats.totalOfferings}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                Courses: <strong className="text-slate-800">{aggregateStats.totalCourses}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-bold">
                {aggregateStats.complianceRate}% Uploaded
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Official Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-white flex-1 space-y-6 print:p-0 print:m-0 print:overflow-visible text-slate-900">
          {/* Institutional Header Banner */}
          <div className="border-b-2 border-emerald-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <MnsUetLogo className="w-16 h-16 shrink-0" />
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-emerald-950 uppercase">
                  Muhammad Nawaz Sharif University of Engineering &amp; Technology (MNS-UET) Multan
                </h1>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">
                  Directorate of Academics &amp; Quality Enhancement Cell (QEC)
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Official Verification &amp; Result Upload Compliance Audit Record
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 border-l sm:border-l-0 pl-3 sm:pl-0 border-slate-200">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 font-mono font-bold text-[11px] px-2.5 py-0.5 rounded border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>CONFIDENTIAL &amp; OFFICIAL</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Ref ID: MNSUET-LMS-{session}-{Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center py-1 bg-slate-50 border border-slate-200 rounded-md">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              {reportTitle}
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Academic Session {session} • Academic Record &amp; Accreditation Evidence
            </p>
          </div>

          {/* Department & Program Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Department</span>
              <span className="font-bold text-slate-900">{department}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Scope</span>
              <span className="font-bold text-emerald-800">
                {exportScope === 'ENTIRE_DEPARTMENT'
                  ? 'All Departmental Programs'
                  : exportScope === 'CURRENT_PROGRAM'
                  ? `${program} (${degreeLevel})`
                  : `${program} (${shift} - Sem ${semester} Sec ${section})`}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Head of Department / Coordinator</span>
              <span className="font-bold text-slate-900">{currentUser?.name || hodCoordinator || 'HOD'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Compliance Status</span>
              <span className="font-black text-emerald-700">
                {aggregateStats.complianceRate}% Uploaded ({aggregateStats.uploaded}/{aggregateStats.totalCourses} Courses)
              </span>
            </div>
          </div>

          {/* Statistical Compliance KPI Summary */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Uploaded to LMS</span>
              <span className="text-base font-black text-emerald-900">{aggregateStats.uploaded}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Verification</span>
              <span className="text-base font-black text-amber-900">{aggregateStats.pending}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">In Progress</span>
              <span className="text-base font-black text-blue-900">{aggregateStats.inProgress}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Total Active Courses</span>
              <span className="text-base font-black text-slate-900">{aggregateStats.totalCourses}</span>
            </div>
          </div>

          {/* Tabular Course Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>Detailed Course Marks &amp; LMS Upload Status Table</span>
              <span className="text-[11px] font-normal text-slate-500">
                {targetRecords.length} Offering Record(s) Evaluated
              </span>
            </h3>

            {targetRecords.map((rec, rIdx) => {
              const activeRows = rec.subjects.filter(
                (s) => includeBlankRows || (s.courseCode && s.courseCode.trim()) || (s.subjectTitle && s.subjectTitle.trim()) || s.status
              );

              return (
                <div key={rec.id || rIdx} className="space-y-1.5">
                  <div className="bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-t flex items-center justify-between">
                    <span>
                      {rec.program} ({rec.degreeLevel}) • {rec.shift || 'Morning'} Shift • Semester {rec.semester} (Section {rec.section || 'A'})
                    </span>
                    <span className="font-mono text-[10px] text-slate-300">
                      Coordinator: {rec.hodCoordinator || 'Unassigned'} • Submitted: {rec.submissionDate || 'N/A'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-b overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="py-1.5 px-2 border-r border-slate-200 w-8 text-center">#</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 w-24">Course Code</th>
                          <th className="py-1.5 px-2 border-r border-slate-200">Course / Subject Title</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 w-14 text-center">Cr. Hrs</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 w-28 text-center">LMS Status</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 w-24">Upload Date</th>
                          <th className="py-1.5 px-2 border-r border-slate-200 w-28">Uploaded By</th>
                          <th className="py-1.5 px-2">Remarks / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-3 px-2 text-center text-slate-400 italic text-[11px]">
                              No active course entries recorded for this section yet.
                            </td>
                          </tr>
                        ) : (
                          activeRows.map((sub, sIdx) => (
                            <tr key={sub.id || sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500">
                                {sIdx + 1}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 font-mono font-bold text-slate-800">
                                {sub.courseCode || '-'}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 font-medium text-slate-900">
                                {sub.subjectTitle || '-'}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                                {sub.creditHours || '-'}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                    sub.status === 'Uploaded'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : sub.status === 'Pending'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : sub.status === 'In Progress'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {sub.status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-[11px] font-mono text-slate-600">
                                {sub.dateUploaded || '-'}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-[11px] text-slate-700 truncate max-w-[110px]" title={sub.uploadedBy}>
                                {sub.uploadedBy || '-'}
                              </td>
                              <td className="py-1.5 px-2 text-[11px] text-slate-600 italic">
                                {sub.remarks || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official Sign-Off and Certification Block */}
          <div className="pt-6 border-t border-slate-300 mt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-900">Program Coordinator</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Signature &amp; Date</p>
              <div className="h-10 mt-2 border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400 italic">
                Verified Marks Log
              </div>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-900">Head of Department (HOD)</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Signature &amp; Official Seal</p>
              <div className="h-10 mt-2 border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-emerald-800 font-semibold">
                {currentUser?.name || hodCoordinator || 'HOD Approved'}
              </div>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-900">Controller of Examinations</p>
              <p className="text-[10px] text-slate-500 mt-0.5">MNS-UET Multan Secretariat</p>
              <div className="h-10 mt-2 border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400 italic">
                Institutional Archive Stamp
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions (Hidden during printing) */}
        <div className="print:hidden p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={includeBlankRows}
              onChange={(e) => setIncludeBlankRows(e.target.checked)}
              className="rounded text-emerald-700 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            <span>Include unpopulated placeholder rows in export</span>
          </label>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              id="btn-download-csv-bottom"
              type="button"
              onClick={handleDownloadCSV}
              className="px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download CSV</span>
            </button>
            <button
              id="btn-print-pdf-bottom"
              type="button"
              onClick={handlePrintPDF}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
