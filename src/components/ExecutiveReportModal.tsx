import React, { useState, useMemo, useEffect } from 'react';
import { MnsUetLogo } from './MnsUetLogo';
import { SubmissionRecord, AcademicShift } from '../types';
import { UnifiedProgramRow } from './VCDashboard';
import { StorageService } from '../services/storageService';
import {
  Printer,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Building,
  Calendar,
  Layers,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allPrograms: UnifiedProgramRow[];
  allRecords: SubmissionRecord[];
  currentSession: string;
  selectedSemester: string;
  stats: {
    totalDegreePrograms: number;
    submittedProgramsCount: number;
    totalActiveSubjects: number;
    totalUploadedSubjects: number;
    totalPendingSubjects: number;
    uploadPercentage: number;
  };
}

export const ExecutiveReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  allPrograms,
  allRecords,
  currentSession,
  selectedSemester,
  stats,
}) => {
  const [docType, setDocType] = useState<'REPORT' | 'NOTICE'>('REPORT');
  const [copied, setCopied] = useState<boolean>(false);
  const [systemDeadlineToUse, setSystemDeadlineToUse] = useState<Date>(() => {
    const stored = StorageService.getSystemDeadline();
    if (stored) return new Date(stored);
    const d = new Date();
    d.setHours(d.getHours() + 48);
    return d;
  });

  useEffect(() => {
    const handleDeadlineUpdated = (e: any) => {
      if (e.detail) {
        setSystemDeadlineToUse(new Date(e.detail));
      } else {
        const stored = StorageService.getSystemDeadline();
        if (stored) {
          setSystemDeadlineToUse(new Date(stored));
        }
      }
    };
    window.addEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    return () => window.removeEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
  }, []);

  // Compute dynamic deadline information (day, date, time, window)
  const deadlineDetails = useMemo(() => {
    const target = systemDeadlineToUse;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const totalHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const isPast = diffMs <= 0;

    const dayName = target.toLocaleDateString('en-GB', { weekday: 'long' });
    const formattedDate = target.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = target.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      target,
      dayName,
      formattedDate,
      formattedTime,
      totalHours,
      isPast,
      fullClause: `${dayName}, ${formattedDate} by ${formattedTime}`,
    };
  }, [systemDeadlineToUse]);

  // Generate official reference number based on current date
  const todayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const refNumber = useMemo(() => {
    return `MNSUET/VC-LMS/${currentSession}/S${selectedSemester}-0842`;
  }, [currentSession, selectedSemester]);

  const activePrograms = useMemo(() => {
    return allPrograms.filter((p) => p.sessionActive);
  }, [allPrograms]);

  // Calculate dynamic metrics per active program for the selected semester / supported shifts
  const programMetrics = useMemo(() => {
    return activePrograms.map((prog) => {
      const supportedShifts = prog.supportedShifts && prog.supportedShifts.length > 0
        ? prog.supportedShifts
        : ['Morning'];

      // Find active sections for this program from allRecords
      const matchingRecords = allRecords.filter((r) =>
        StorageService._isDeptMatch(prog.department, r.department) &&
        StorageService._isProgMatch(prog.program, r.program) &&
        (selectedSemester === 'ALL' || String(r.semester || '1').replace(/\D/g, '') === selectedSemester)
      );

      const sectionSet = new Set<string>();
      matchingRecords.forEach((r) => {
        const sec = (r.section || 'A').trim().toUpperCase();
        sectionSet.add(sec);
      });
      if (sectionSet.size === 0) sectionSet.add('A');
      const sectionsList = Array.from(sectionSet).sort();

      const getShiftDetail = (shiftName: 'Morning' | 'Evening') => {
        if (!supportedShifts.includes(shiftName)) {
          return {
            isOffered: false,
            displayText: 'N/A (Not Offered)',
            uploaded: 0,
            total: 0,
            isPending: false,
            hasSubmission: false,
          };
        }

        const shiftData = prog.shifts[shiftName];
        if (!shiftData) {
          return {
            isOffered: true,
            displayText: 'No Entry',
            uploaded: 0,
            total: 5,
            isPending: true,
            hasSubmission: false,
          };
        }

        if (selectedSemester === 'ALL') {
          const uploaded = shiftData.totalUploaded;
          const total = shiftData.totalSubjects;
          const hasSubmission = shiftData.hasSubmission;
          const isPending = !hasSubmission || shiftData.totalPending > 0;
          return {
            isOffered: true,
            displayText: hasSubmission ? `${uploaded}/${total} Uploaded` : 'No Entry',
            uploaded,
            total,
            isPending,
            hasSubmission,
          };
        } else {
          const secMap = shiftData.semesterSectionRecords[selectedSemester] || {};
          const secRecords = Object.values(secMap);
          if (secRecords.length > 0) {
            let sumUploaded = 0;
            let sumTotal = 0;
            secRecords.forEach((rec) => {
              const summary = StorageService.calculateSummary(rec.subjects);
              sumUploaded += summary.uploaded;
              sumTotal += summary.totalSubjects;
            });
            const isPending = sumUploaded < sumTotal;
            return {
              isOffered: true,
              displayText: `${sumUploaded}/${sumTotal} Uploaded`,
              uploaded: sumUploaded,
              total: sumTotal,
              isPending,
              hasSubmission: true,
            };
          } else {
            return {
              isOffered: true,
              displayText: 'No Entry',
              uploaded: 0,
              total: 5,
              isPending: true,
              hasSubmission: false,
            };
          }
        }
      };

      const morningDetail = getShiftDetail('Morning');
      const eveningDetail = getShiftDetail('Evening');

      let totalUploaded = 0;
      let totalSubjects = 0;
      let isPending = false;

      if (morningDetail.isOffered) {
        totalUploaded += morningDetail.uploaded;
        totalSubjects += morningDetail.total;
        if (morningDetail.isPending) isPending = true;
      }

      if (eveningDetail.isOffered) {
        totalUploaded += eveningDetail.uploaded;
        totalSubjects += eveningDetail.total;
        if (eveningDetail.isPending) isPending = true;
      }

      let pct = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;
      if (totalUploaded > 0 && totalUploaded < totalSubjects && pct === 100) {
        pct = 99;
      }
      const isComplete = totalSubjects > 0 && totalUploaded === totalSubjects && !isPending;

      return {
        prog,
        sectionsList,
        morningDetail,
        eveningDetail,
        totalUploaded,
        totalSubjects,
        pct,
        isComplete,
        isPending,
      };
    });
  }, [activePrograms, allRecords, selectedSemester]);

  // Extract non-compliant / pending programs for the notice
  const pendingPrograms = useMemo(() => {
    return programMetrics.filter((m) => m.isPending).map((m) => m.prog);
  }, [programMetrics]);

  // Aggregate high-level summary KPIs directly from the filtered program metrics
  const summaryKPIs = useMemo(() => {
    let totalUploaded = 0;
    let totalSubjects = 0;

    programMetrics.forEach((m) => {
      totalUploaded += m.totalUploaded;
      totalSubjects += m.totalSubjects;
    });

    const pendingSubjects = Math.max(0, totalSubjects - totalUploaded);
    const uploadPercentage = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;

    return {
      totalDegreePrograms: activePrograms.length,
      totalUploadedSubjects: totalUploaded,
      totalActiveSubjects: totalSubjects,
      totalPendingSubjects: pendingSubjects,
      uploadPercentage,
    };
  }, [programMetrics, activePrograms]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyNotice = () => {
    const text = `OFFICE OF THE VICE CHANCELLOR
MUHAMMAD NAWAZ SHARIF UNIVERSITY OF ENGINEERING & TECHNOLOGY, MULTAN
Ref No: ${refNumber}
Date: ${todayDate}

NOTIFICATION: URGENT EXPEDITION OF LMS RESULT UPLOADS
Academic Session: ${currentSession} | Semester: ${selectedSemester}

TO: All Chairpersons / Heads of Academic Departments (HODs) & Program Coordinators

It has been observed through real-time LMS monitoring that several degree programs have pending or incomplete result uploads for Academic Session ${currentSession}.

Pending / Partially Uploaded Programs identified:
${pendingPrograms.map((p, idx) => `${idx + 1}. ${p.program} (${p.deptCode}) - ${p.department}`).join('\n')}

MANDATORY DEADLINE FOR COMPLIANCE:
Day & Date: ${deadlineDetails.dayName}, ${deadlineDetails.formattedDate}
Time: ${deadlineDetails.formattedTime} (${deadlineDetails.totalHours > 0 ? `${deadlineDetails.totalHours} hours remaining` : 'LMS Lockdown in effect'})

All concerned Heads of Departments are hereby directed to ensure 100% completion of result tabulation and LMS verification strictly by ${deadlineDetails.dayName}, ${deadlineDetails.formattedDate} by ${deadlineDetails.formattedTime}. Failure to comply will be reported to the Academic Council.

By Order of the Vice Chancellor,
Director, Academic Affairs & Examination Directorate`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      id="modal-executive-report"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar (hidden on print) */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDocType('REPORT')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  docType === 'REPORT' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive Status Report</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('NOTICE')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  docType === 'NOTICE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Formal Compliance Notice ({pendingPrograms.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {docType === 'NOTICE' && (
              <button
                type="button"
                onClick={handleCopyNotice}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Circular' : 'Copy Notice Text'}</span>
              </button>
            )}

            <button
              id="btn-print-executive-report"
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print document or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable Area) */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:overflow-visible print:text-black">
          {/* Official Letterhead */}
          <div className="border-b-2 border-emerald-900 pb-5 mb-6 text-center relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                <MnsUetLogo className="w-full h-full" />
              </div>
              <div className="flex-1 px-4">
                <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Muhammad Nawaz Sharif University of Engineering & Technology, Multan
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold tracking-wide uppercase mt-0.5">
                  Office of the Vice Chancellor • Directorate of Academic Affairs & Examinations
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  Bahawalpur Road, Multan, Punjab, Pakistan • Website: www.mnsuet.edu.pk
                </p>
              </div>
              <div className="w-16 sm:w-20 text-right text-[10px] text-slate-500">
                <span className="inline-block bg-slate-100 border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-800">
                  OFFICIAL
                </span>
              </div>
            </div>

            {/* Document Metadata Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-700">
              <div>
                <span className="text-slate-500">Ref. No: </span>
                <strong className="font-mono text-slate-900">{refNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500">Academic Session: </span>
                <strong className="text-slate-900">{currentSession}</strong>
                <span className="text-slate-300 mx-1.5">|</span>
                <span className="text-slate-500">Semester: </span>
                <strong className="text-slate-900">
                  {selectedSemester === 'ALL' ? 'All Semesters' : `Semester ${selectedSemester}`}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Issued Date: </span>
                <strong className="text-slate-900">{todayDate}</strong>
              </div>
            </div>
          </div>

          {/* VIEW 1: EXECUTIVE STATUS REPORT */}
          {docType === 'REPORT' && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-block text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full mb-1">
                  Central Academic &amp; Institutional Monitoring Portal
                </span>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-emerald-700 decoration-2 underline-offset-4">
                  Task Report: LMS Result Upload Status &amp; Compliance
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Consolidated Academic Verification Report across all University Departments &amp; Degree Cohorts
                </p>
              </div>

              {/* High-level KPI Summary Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Degree Programs</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{summaryKPIs.totalDegreePrograms}</span>
                  <span className="text-[10px] text-slate-500">Accredited Programs</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">University Upload %</span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">{summaryKPIs.uploadPercentage}%</span>
                  <span className="text-[10px] text-emerald-700">LMS Verified</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-blue-800 block">Uploaded Courses</span>
                  <span className="text-2xl font-black text-blue-800 mt-1 block">{summaryKPIs.totalUploadedSubjects}</span>
                  <span className="text-[10px] text-blue-700">of {summaryKPIs.totalActiveSubjects} Active</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Pending Courses</span>
                  <span className="text-2xl font-black text-amber-800 mt-1 block">{summaryKPIs.totalPendingSubjects}</span>
                  <span className="text-[10px] text-amber-700">Action Required</span>
                </div>
              </div>

              {/* Program Breakdown Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Academic Department &amp; Program Compliance Breakdown
                </h3>
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Department &amp; Program</th>
                        <th className="py-2.5 px-3 text-center">Level</th>
                        <th className="py-2.5 px-3 text-center">Sections</th>
                        <th className="py-2.5 px-3 text-center">Morning Shift</th>
                        <th className="py-2.5 px-3 text-center">Evening Shift</th>
                        <th className="py-2.5 px-3 text-center">Overall Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {programMetrics.map((item, idx) => {
                        const { prog, sectionsList, morningDetail, eveningDetail, pct, isComplete } = item;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block">{prog.program}</span>
                              <span className="text-[10px] text-slate-500">{prog.department}</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                {prog.degreeLevel}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {sectionsList.map((sec) => (
                                  <span
                                    key={sec}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  >
                                    Sec {sec}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {!morningDetail.isOffered ? (
                                <span className="text-slate-400 text-[10px] italic">N/A (Not Offered)</span>
                              ) : morningDetail.hasSubmission ? (
                                <span className="font-semibold text-emerald-800 text-[11px]">
                                  {morningDetail.displayText}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">No Entry</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {!eveningDetail.isOffered ? (
                                <span className="text-slate-400 text-[10px] italic">N/A (Not Offered)</span>
                              ) : eveningDetail.hasSubmission ? (
                                <span className="font-semibold text-emerald-800 text-[11px]">
                                  {eveningDetail.displayText}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">No Entry</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : pct > 0
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {pct}% Completed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Seal Block */}
              <div className="pt-10 mt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs">
                <div>
                  <div className="w-36 h-12 border-b border-slate-400 mx-auto mb-2"></div>
                  <strong className="block text-slate-900">Dean, Faculty of Engineering</strong>
                  <span className="text-slate-500 text-[11px]">MNS-UET Multan</span>
                </div>
                <div>
                  <div className="w-36 h-12 border-b border-slate-400 mx-auto mb-2"></div>
                  <strong className="block text-slate-900">Controller of Examinations</strong>
                  <span className="text-slate-500 text-[11px]">MNS-UET Multan</span>
                </div>
                <div>
                  <div className="w-36 h-12 border-b border-slate-400 mx-auto mb-2"></div>
                  <strong className="block text-slate-900">Prof. Dr. Vice Chancellor</strong>
                  <span className="text-slate-500 text-[11px]">MNS-UET Multan</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: FORMAL COMPLIANCE NOTICE */}
          {docType === 'NOTICE' && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-block bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2">
                  CONFIDENTIAL • OFFICIAL DIRECTIVE
                </span>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                  FORMAL NOTICE: EXPEDITION OF LMS RESULT UPLOADS
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Issued under the Directive of the Vice Chancellor, MNS-UET Multan
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3 text-xs leading-relaxed text-slate-800">
                <p>
                  <strong>TO:</strong> All Chairpersons, Heads of Academic Departments (HODs), &amp; Examination Incharges
                </p>
                <p>
                  <strong>SUBJECT:</strong>{' '}
                  <span className="font-bold underline">
                    IMMEDIATE SUBMISSION &amp; LMS UPLOAD OF SEMESTER RESULTS – SESSION {currentSession}
                  </span>
                </p>
                <p>
                  Pursuant to the decisions of the Academic Council and Examination Regulations of Muhammad Nawaz Sharif
                  University of Engineering &amp; Technology, Multan, all course results must be uploaded and locked on
                  the official LMS portal within the mandated examination timeline.
                </p>
                <p>
                  According to institutional monitoring on <strong>{todayDate}</strong>, the following program cohorts
                  remain <strong>incomplete or pending LMS upload</strong>:
                </p>

                {/* List of Pending Programs */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 my-2 max-h-48 overflow-y-auto">
                  <ol className="list-decimal list-inside space-y-1 font-semibold text-slate-900">
                    {pendingPrograms.map((p, idx) => (
                      <li key={idx} className="text-xs">
                        {p.program} ({p.deptCode}) – <span className="text-slate-600 font-normal">{p.department}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Mandatory Dynamic Deadline Box */}
                <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-3 my-2 text-slate-900 shadow-2xs flex items-start gap-3">
                  <div className="p-2 rounded-md bg-amber-200/70 text-amber-900 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded">
                        Mandatory Compliance Deadline
                      </span>
                      <span className="text-[11px] font-bold text-amber-900">
                        {StorageService.getLockdownDisabled()
                          ? '🔓 Lockdown Off (Unlocked by VC)'
                          : deadlineDetails.totalHours > 0
                          ? `⏳ ${deadlineDetails.totalHours} Hours Remaining`
                          : '⚠️ Lockdown Active'}
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-900">
                      Day &amp; Date: <span className="underline decoration-amber-600 decoration-2">{deadlineDetails.dayName}, {deadlineDetails.formattedDate}</span>
                    </p>
                    <p className="text-xs font-black text-slate-900">
                      Cutoff Time: <span className="text-amber-900 font-mono bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">{deadlineDetails.formattedTime}</span>
                    </p>
                  </div>
                </div>

                <p>
                  All concerned Heads of Departments and course teachers are strictly instructed to finalize grading,
                  complete LMS result entry, and submit verified documentation strictly by{' '}
                  <strong className="text-slate-950 font-black underline decoration-amber-500 decoration-2">
                    {deadlineDetails.dayName}, {deadlineDetails.formattedDate} by {deadlineDetails.formattedTime}
                  </strong>{' '}
                  ({deadlineDetails.totalHours > 0 ? `within ${deadlineDetails.totalHours} hours` : 'Immediate LMS portal lockdown in effect'}) of receipt of this official communication.
                </p>
              </div>

              {/* Signoff */}
              <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-xs">
                <div className="text-slate-500 text-[11px]">
                  <p>Copy forward for information to:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-0.5">
                    <li>P.S. to Vice Chancellor, MNS-UET Multan</li>
                    <li>Registrar, MNS-UET Multan</li>
                    <li>Director IT / LMS Administrator (for server verification)</li>
                    <li>Office Record File</li>
                  </ol>
                </div>
                <div className="text-right">
                  <div className="w-40 h-10 border-b border-slate-400 ml-auto mb-1"></div>
                  <strong className="block text-slate-900">Controller of Examinations</strong>
                  <span className="text-slate-500 text-[11px]">Muhammad Nawaz Sharif UET Multan</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
