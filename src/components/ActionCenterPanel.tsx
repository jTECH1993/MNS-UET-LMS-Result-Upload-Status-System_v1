import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  User,
  FileText,
  Send,
  Calendar,
  Filter,
  Download,
  Flame,
  ArrowUpRight,
  Layers,
  Sparkles,
  MessageSquare,
  Building2,
  X,
  Target
} from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { DirectiveService, InstitutionalDirective } from '../services/directiveService';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';
import { VCExecutiveSummaryPanel } from './VCExecutiveSummaryPanel';
import { AcademicShift } from '../types';

interface Props {
  allRecords: any[];
  currentSession?: string;
  selectedSemesterFilter?: string;
  selectedDeptFilter?: string;
  selectedShiftFilter?: string;
}

export function ActionCenterPanel({
  allRecords,
  currentSession = '2023',
  selectedSemesterFilter = '1',
  selectedDeptFilter = 'ALL',
  selectedShiftFilter = 'ALL',
}: Props) {
  // Sub-tab view mode inside Action Center
  const [activeSubTab, setActiveSubTab] = useState<'DASHBOARD' | 'EXECUTIVE_SUMMARY'>('DASHBOARD');

  // Directives State
  const [directives, setDirectives] = useState<InstitutionalDirective[]>([]);
  const [isNewDirectiveModalOpen, setIsNewDirectiveModalOpen] = useState<boolean>(false);
  const [selectedDepartmentForDirective, setSelectedDepartmentForDirective] = useState<string>('');

  // Directive Form State
  const [directiveForm, setDirectiveForm] = useState(() => {
    const session = AuthService.getCurrentSession();
    const userDept = session?.department || 'Department of Computer Science';
    const userProg = session?.program || (session?.assignedPrograms && session.assignedPrograms.length > 0 ? session.assignedPrograms[0] : 'BS Artificial Intelligence');
    return {
      department: userDept,
      program: userProg,
      title: 'Accelerate LMS Grade Sheet Uploads',
      customTitle: '',
      message: 'Kindly ensure all course grade sheets for your department are uploaded and verified without further delay.',
      priority: 'CRITICAL' as 'CRITICAL' | 'HIGH' | 'MEDIUM',
      deadline: 'Today 5:00 PM'
    };
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rosterVersion, setRosterVersion] = useState(0);
  const [expandedDeptCode, setExpandedDeptCode] = useState<string | null>(null);

  const reloadDirectives = () => {
    setDirectives(DirectiveService.getDirectives());
  };

  useEffect(() => {
    reloadDirectives();
    const handleRosterUpdate = () => setRosterVersion((v) => v + 1);
    window.addEventListener('mnsuet_directives_updated', reloadDirectives);
    window.addEventListener('mnsuet_roster_updated', handleRosterUpdate);
    window.addEventListener('mnsuet_sessions_updated', handleRosterUpdate);
    window.addEventListener('mnsuet_storage_updated', handleRosterUpdate);
    return () => {
      window.removeEventListener('mnsuet_directives_updated', reloadDirectives);
      window.removeEventListener('mnsuet_roster_updated', handleRosterUpdate);
      window.removeEventListener('mnsuet_sessions_updated', handleRosterUpdate);
      window.removeEventListener('mnsuet_storage_updated', handleRosterUpdate);
    };
  }, []);

  // Calculate dynamic stats across departments from authentic database records for active session & semester
  const departmentStats = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept, index) => {
      if (selectedDeptFilter !== 'ALL' && dept.name !== selectedDeptFilter && dept.code !== selectedDeptFilter) {
        return null;
      }

      const activeProgNames = Array.from(
        new Set(StorageService.getSessionPrograms(dept.name, currentSession, allRecords))
      );

      const targetPrograms = dept.programs.filter((prog) =>
        activeProgNames.some(
          (p) =>
            StorageService.normalizeProgramName(p, dept.name) ===
              StorageService.normalizeProgramName(prog.name, dept.name) ||
            p.trim().toLowerCase() === prog.name.trim().toLowerCase()
        )
      );

      if (targetPrograms.length === 0) return null;

      let totalSubjects = 0;
      let uploadedCount = 0;
      let pendingCount = 0;

      const programBreakdown: Array<{
        programName: string;
        degreeLevel: string;
        totalSubjects: number;
        uploadedCount: number;
        pendingCount: number;
        progressPct: number;
        status: 'Complete' | 'In Progress' | 'At Risk';
      }> = [];

      targetPrograms.forEach((prog) => {
        let progTotal = 0;
        let progUploaded = 0;
        let progPending = 0;

        const isMasterOrPhd = prog.degreeLevel === 'MS' || prog.degreeLevel === 'PhD';
        const semList =
          selectedSemesterFilter === 'ALL'
            ? isMasterOrPhd
              ? ['1', '2', '3', '4']
              : ['1', '2', '3', '4', '5', '6', '7', '8']
            : [String(selectedSemesterFilter)];

        const allowedShifts = StorageService.getProgramShifts(dept.name, prog.name);
        const evalShifts =
          selectedShiftFilter === 'ALL'
            ? allowedShifts
            : allowedShifts.filter((s) => s.toLowerCase() === selectedShiftFilter.toLowerCase());

        const shiftsToLoop =
          evalShifts.length > 0
            ? evalShifts
            : selectedShiftFilter === 'ALL'
            ? ['Morning']
            : [selectedShiftFilter as AcademicShift];

        shiftsToLoop.forEach((shift) => {
          semList.forEach((sem) => {
            const sections = StorageService.getAvailableSectionsForCohort(
              dept.name,
              prog.name,
              currentSession,
              sem,
              shift
            );
            const sectionsToLoop = sections.length > 0 ? sections : ['A'];

            sectionsToLoop.forEach((sec) => {
              // Find matching database submission for this active cohort
              const rec = allRecords.find((r) => {
                if (!r || !r.department || !r.program) return false;
                const matchDept = StorageService._isDeptMatch(dept.name, r.department);
                const matchProg = StorageService._isProgMatch(prog.name, r.program);
                const matchSess =
                  (r.session || '2023').trim() === currentSession.trim() ||
                  (r.session || '2023').includes(currentSession);
                const matchSem = String(r.semester || '1').trim() === String(sem).trim();
                const matchShift = (r.shift || 'Morning').toLowerCase() === shift.toLowerCase();
                const matchSec = (r.section || 'A').trim().toUpperCase() === sec.trim().toUpperCase();
                return matchDept && matchProg && matchSess && matchSem && matchShift && matchSec;
              });

              const validSubs =
                rec && Array.isArray(rec.subjects)
                  ? rec.subjects.filter(
                      (s: any) => s && (s.courseCode?.trim() || s.subjectTitle?.trim() || s.status)
                    )
                  : [];

              if (validSubs.length > 0) {
                const up = validSubs.filter((s: any) => s.status === 'Uploaded').length;
                const tot = Math.max(validSubs.length, 5);
                const pend = Math.max(0, tot - up);
                progUploaded += up;
                progPending += pend;
                progTotal += tot;
              } else {
                // No submission record yet or 0 valid subjects: standard 5 curriculum subjects are pending
                progTotal += 5;
                progPending += 5;
              }
            });
          });
        });

        const progPct = progTotal > 0 ? Math.round((progUploaded / progTotal) * 100) : 0;
        let progStat: 'Complete' | 'In Progress' | 'At Risk' = 'In Progress';
        if (progPct >= 100 && progPending === 0) progStat = 'Complete';
        else if (progPct >= 50) progStat = 'In Progress';
        else progStat = 'At Risk';

        uploadedCount += progUploaded;
        pendingCount += progPending;
        totalSubjects += progTotal;

        programBreakdown.push({
          programName: prog.name,
          degreeLevel: prog.degreeLevel || 'BS',
          totalSubjects: progTotal,
          uploadedCount: progUploaded,
          pendingCount: progPending,
          progressPct: progPct,
          status: progStat
        });
      });

      const progressPct = totalSubjects > 0 ? Math.round((uploadedCount / totalSubjects) * 100) : 0;

      let status: 'On Track' | 'In Progress' | 'At Risk' | 'Complete' = 'In Progress';
      if (progressPct >= 100 && pendingCount === 0) status = 'Complete';
      else if (progressPct >= 85) status = 'On Track';
      else if (progressPct >= 50) status = 'In Progress';
      else status = 'At Risk';

      const pendingPrograms = programBreakdown.filter(p => p.pendingCount > 0);

      return {
        id: index + 1,
        code: dept.code,
        name: dept.name.replace('Department of ', ''),
        fullName: dept.name,
        programsCount: targetPrograms.length,
        totalSubjects,
        uploadedCount,
        pendingCount,
        progressPct,
        status,
        programBreakdown,
        pendingPrograms
      };
    }).filter(Boolean) as any[];
  }, [allRecords, currentSession, selectedSemesterFilter, selectedDeptFilter, selectedShiftFilter, rosterVersion]);

  // Aggregate Top Bar Metrics from dynamic database calculations
  const aggregatedMetrics = useMemo(() => {
    const totalSubjectsAll = departmentStats.reduce((acc, d) => acc + d.totalSubjects, 0);
    const totalUploadedAll = departmentStats.reduce((acc, d) => acc + d.uploadedCount, 0);
    const overallPct = totalSubjectsAll > 0 ? Math.round((totalUploadedAll / totalSubjectsAll) * 100) : 0;

    const completedDepts = departmentStats.filter(d => d.status === 'Complete').length;
    const inProgressDepts = departmentStats.filter(d => d.status === 'In Progress' || d.status === 'On Track').length;
    const atRiskDepts = departmentStats.filter(d => d.status === 'At Risk').length;

    return {
      uploaded: totalUploadedAll,
      total: totalSubjectsAll,
      pct: overallPct,
      completedDepts,
      inProgressDepts,
      atRiskDepts
    };
  }, [departmentStats]);

  // Open directive modal pre-populated with program-specific pending status
  const openDirectiveModal = (deptFullName: string, targetProg: string = 'ALL') => {
    const deptObj = departmentStats.find(d => d.fullName === deptFullName);
    const pendingProgs = deptObj ? deptObj.pendingPrograms : [];
    const semText = selectedSemesterFilter === 'ALL' ? 'All Semesters' : `Semester ${selectedSemesterFilter}`;

    let generatedMessage = '';
    let generatedTitle = '';

    if (targetProg !== 'ALL' && targetProg) {
      const progInfo = deptObj?.programBreakdown.find((p: any) => p.programName === targetProg);
      const pendingCount = progInfo ? progInfo.pendingCount : 0;
      const uploadedCount = progInfo ? progInfo.uploadedCount : 0;
      const totalCount = progInfo ? progInfo.totalSubjects : 0;

      generatedTitle = `LMS Submissions Review for ${targetProg}`;
      generatedMessage = `Official Executive Directive for ${targetProg} (${deptFullName}):\n\nResult Upload Status for Session ${currentSession} (${semText}):\n• ${pendingCount} course subject(s) currently pending (${uploadedCount}/${totalCount} uploaded).\n\nThe HOD and Program Coordinator for ${targetProg} are directed to immediately complete, verify, and finalize all outstanding LMS course grade sheets without further delay.`;
    } else {
      generatedTitle = `LMS Submissions Review for ${deptFullName.replace('Department of ', '')}`;
      if (pendingProgs.length > 0) {
        const progListText = pendingProgs
          .map((p: any) => `• ${p.programName}: ${p.pendingCount} subject(s) pending (${p.uploadedCount}/${p.totalSubjects} uploaded)`)
          .join('\n');

        generatedMessage = `Reviewing result uploads for ${deptFullName} (Session ${currentSession}, ${semText}).\n\nThe following degree program(s) remain incomplete:\n${progListText}\n\nAll concerned HODs and Program Coordinators are directed to ensure complete upload and verification of LMS grade sheets immediately.`;
      } else {
        generatedMessage = `Reviewing result uploads for ${deptFullName}. All degree program results are 100% uploaded and verified for Session ${currentSession}.`;
      }
    }

    setSelectedDepartmentForDirective(deptFullName);
    setDirectiveForm({
      department: deptFullName,
      program: targetProg,
      title: generatedTitle,
      customTitle: '',
      message: generatedMessage,
      priority: 'CRITICAL',
      deadline: 'Today 5:00 PM'
    });
    setIsNewDirectiveModalOpen(true);
  };

  // Handle Dispatching Directive Order
  const handleDispatchDirective = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = directiveForm.title === 'Custom Directive...' ? directiveForm.customTitle : directiveForm.title;

    DirectiveService.createDirective({
      senderRole: 'VC',
      senderName: 'Prof. Dr. Vice Chancellor',
      targetDepartment: directiveForm.department,
      targetProgram: directiveForm.program,
      targetRole: 'HOD',
      title: finalTitle,
      message: directiveForm.message,
      priority: directiveForm.priority,
      deadline: directiveForm.deadline
    });

    setToastMessage(`Official Executive Directive dispatched to HOD (${directiveForm.department.replace('Department of ', '')})!`);
    setTimeout(() => setToastMessage(null), 4000);
    setIsNewDirectiveModalOpen(false);
  };

  // Bulk reminder to pending departments
  const handleSendBulkReminder = () => {
    const pendingDepts = departmentStats.filter(d => d.pendingCount > 0);
    const semText = selectedSemesterFilter === 'ALL' ? 'All Semesters' : `Semester ${selectedSemesterFilter}`;

    pendingDepts.forEach(dept => {
      const progListText = dept.pendingPrograms
        .map((p: any) => `• ${p.programName}: ${p.pendingCount} subject(s) pending (${p.uploadedCount}/${p.totalSubjects} uploaded)`)
        .join('\n');

      DirectiveService.createDirective({
        senderRole: 'VC',
        senderName: 'Vice Chancellor Office',
        targetDepartment: dept.fullName,
        targetRole: 'HOD',
        title: `URGENT: LMS Result Submissions Pending (${dept.name})`,
        message: `Your department has outstanding course result sheet(s) for Session ${currentSession} (${semText}).\n\nRemaining Pending Programs:\n${progListText}\n\nKindly ensure immediate upload and verification today.`,
        priority: 'CRITICAL',
        deadline: 'Today 5:00 PM'
      });
    });

    setToastMessage(`Official Reminders sent to ${pendingDepts.length} HODs with program-specific pending status!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Dynamic percentages for Top 4 Metric Cards
  const departmentBreakdownPct = useMemo(() => {
    const totalDepts = departmentStats.length;
    if (totalDepts === 0) return { completedPct: 0, inProgressPct: 0, atRiskPct: 0 };
    return {
      completedPct: Math.round((aggregatedMetrics.completedDepts / totalDepts) * 100),
      inProgressPct: Math.round((aggregatedMetrics.inProgressDepts / totalDepts) * 100),
      atRiskPct: Math.round((aggregatedMetrics.atRiskDepts / totalDepts) * 100)
    };
  }, [departmentStats, aggregatedMetrics]);

  // Critical Action Items computed dynamically from database departmentStats
  const criticalActionsList = useMemo(() => {
    return departmentStats
      .filter(d => d.pendingCount > 0)
      .map(d => {
        const progDetail = d.pendingPrograms.length > 0
          ? d.pendingPrograms.map((p: any) => `${p.programName}: ${p.pendingCount} pending`).join(', ')
          : `${d.pendingCount} pending subject(s)`;

        return {
          id: `ca-${d.code}`,
          dept: d.name,
          fullName: d.fullName,
          detail: progDetail,
          pendingPrograms: d.pendingPrograms,
          status: d.uploadedCount === 0 ? 'Overdue' : 'Pending',
          color: d.uploadedCount === 0 ? 'rose' : 'amber',
          urgency: d.uploadedCount === 0 ? 'CRITICAL' : 'HIGH'
        };
      });
  }, [departmentStats]);

  // Recent Activities Stream computed dynamically from database allRecords
  const recentActivitiesList = useMemo(() => {
    const activeRecords = allRecords.filter(r => {
      if (!r || !r.department || !r.program) return false;
      const matchSess = (r.session || '2023').includes(currentSession);
      const matchSem = selectedSemesterFilter === 'ALL' || String(r.semester || '1') === String(selectedSemesterFilter);
      const matchDept = selectedDeptFilter === 'ALL' || StorageService._isDeptMatch(selectedDeptFilter, r.department);
      if (!matchSess || !matchSem || !matchDept) return false;

      // Ensure program is actively registered in this session's roster
      const deptProgs = StorageService.getSessionPrograms(r.department, currentSession, allRecords);
      const matchProg = deptProgs.some(p => StorageService._isProgMatch(p, r.program));
      return matchProg;
    });

    if (activeRecords.length === 0) {
      return [
        {
          id: 'act-init',
          text: `Compliance System Active for Session ${currentSession}`,
          by: 'Database Sync',
          time: 'Active',
          type: 'info'
        }
      ];
    }

    const sorted = [...activeRecords].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return sorted.slice(0, 5).map((r, i) => {
      const validSubs = Array.isArray(r.subjects)
        ? r.subjects.filter((s: any) => s && (s.courseCode?.trim() || s.subjectTitle?.trim() || s.status))
        : [];
      const uploadedSubjects = validSubs.filter((s: any) => s.status === 'Uploaded').length;
      const totalCount = validSubs.length > 0 ? validSubs.length : 5;
      const formattedTime = r.updatedAt ? new Date(r.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded';

      return {
        id: `act-${r.id || i}`,
        text: `${r.program} (${r.shift || 'Morning'}, Sem ${r.semester || '1'}): ${uploadedSubjects}/${totalCount} uploaded`,
        by: `by ${r.submittedBy || 'HOD'} (${(r.department || '').replace('Department of ', '')})`,
        time: formattedTime,
        type: uploadedSubjects === totalCount && totalCount > 0 ? 'success' : uploadedSubjects > 0 ? 'info' : 'alert'
      };
    });
  }, [allRecords, currentSession, selectedSemesterFilter, selectedDeptFilter, rosterVersion]);

  // Active database upload activity count for scope
  const todayUploadedCount = useMemo(() => {
    return departmentStats.reduce((acc, d) => acc + d.uploadedCount, 0);
  }, [departmentStats]);

  // System Deadline from storage
  const systemDeadline = useMemo(() => {
    return StorageService.getSystemDeadline() || 'Active Schedule';
  }, []);

  return (
    <div className="space-y-6 bg-slate-950 text-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-800/80 shadow-2xl font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/40 shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white uppercase">
                Exam Action Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                Central Compliance Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor and ensure timely upload of examination results across all departments
            </p>
          </div>
        </div>

        {/* Header Right Synchronized Scope Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs">
            <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              VC Dashboard Scope:
            </span>
            <span className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-800/80 font-mono">
              Session {currentSession}
            </span>
            <span className="bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-800/80 font-mono">
              {selectedSemesterFilter === 'ALL' ? 'All Semesters' : `Semester ${selectedSemesterFilter}`}
            </span>
            {selectedDeptFilter !== 'ALL' && (
              <span className="bg-sky-950 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-800/80">
                {selectedDeptFilter.replace('Department of ', '')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Center Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2 rounded-2xl border-2 border-indigo-500/50 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('DASHBOARD')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
              activeSubTab === 'DASHBOARD'
                ? 'bg-indigo-600 text-white shadow-xl ring-2 ring-indigo-400 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4 text-indigo-300" />
            <span>1. Compliance Dashboard &amp; Metrics</span>
            {activeSubTab === 'DASHBOARD' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('EXECUTIVE_SUMMARY')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer ${
              activeSubTab === 'EXECUTIVE_SUMMARY'
                ? 'bg-indigo-600 text-white shadow-xl ring-2 ring-indigo-400 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>2. VC Executive Result Summary (Copy &amp; Communication)</span>
            {activeSubTab === 'EXECUTIVE_SUMMARY' && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            )}
          </button>
        </div>

        <div className="px-3.5 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-bold">
          Active Action Sub-Tab: <span className="text-white font-black">{activeSubTab === 'DASHBOARD' ? 'Compliance Dashboard' : 'VC Executive Summary Panel'}</span>
        </div>
      </div>

      {activeSubTab === 'EXECUTIVE_SUMMARY' ? (
        <VCExecutiveSummaryPanel
          allRecords={allRecords}
          currentSession={currentSession}
          selectedSemesterFilter={selectedSemesterFilter}
          selectedDeptFilter={selectedDeptFilter}
          selectedShiftFilter={selectedShiftFilter}
        />
      ) : (
        <>
          {/* 2. TOP EXECUTIVE METRIC CARDS (4 CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Results Uploaded */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500/60 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              {aggregatedMetrics.uploaded} / {aggregatedMetrics.total}
            </span>
          </div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Results Uploaded
          </p>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${aggregatedMetrics.pct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>Progress</span>
            <span className="text-indigo-400 font-bold">{aggregatedMetrics.pct}%</span>
          </div>
        </div>

        {/* Card 2: Departments Complete */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              {aggregatedMetrics.completedDepts}
            </span>
          </div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Departments Complete
          </p>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${departmentBreakdownPct.completedPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>Overall Clearance</span>
            <span className="text-emerald-400 font-bold">{departmentBreakdownPct.completedPct}%</span>
          </div>
        </div>

        {/* Card 3: Departments In Progress */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              {aggregatedMetrics.inProgressDepts}
            </span>
          </div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Departments In Progress
          </p>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${departmentBreakdownPct.inProgressPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>Active Uploading</span>
            <span className="text-amber-400 font-bold">{departmentBreakdownPct.inProgressPct}%</span>
          </div>
        </div>

        {/* Card 4: Departments Not Started */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 hover:border-rose-500/60 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              {aggregatedMetrics.atRiskDepts}
            </span>
          </div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Departments Not Started
          </p>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${departmentBreakdownPct.atRiskPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
            <span>High Lag Risk</span>
            <span className="text-rose-400 font-bold">{departmentBreakdownPct.atRiskPct}%</span>
          </div>
        </div>

      </div>

      {/* 3. MIDDLE ROW: TREND CHART & CRITICAL ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Department Upload Progress Breakdown (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Department Upload Progress Breakdown
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
              Session {currentSession} Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center my-2">
            
            {/* Dynamic Visual Progress Bar Chart */}
            <div className="md:col-span-8 h-48 flex flex-col justify-end px-2 pt-4">
              <div className="flex items-end justify-between gap-2 h-36 border-b border-slate-800 pb-2">
                {departmentStats.slice(0, 7).map((dept, idx) => {
                  const barHeightPct = Math.max(6, dept.progressPct);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer" title={`${dept.name}: ${dept.progressPct}%`}>
                      <div className="relative w-full bg-slate-800/40 rounded-t-lg h-32 flex items-end justify-center">
                        {/* Bar */}
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t group-hover:from-blue-500 group-hover:to-indigo-400 transition-all"
                          style={{ height: `${barHeightPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold truncate max-w-[50px]">{dept.code}</span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 mt-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-indigo-500 rounded-sm" />
                  <span className="text-slate-300 font-semibold">Active Department Progress %</span>
                </div>
              </div>
            </div>

            {/* Database Upload Activity Callout Box */}
            <div className="md:col-span-4 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Database Uploaded
              </span>
              <span className="text-4xl font-black text-emerald-400 tracking-tight">
                {todayUploadedCount}
              </span>
              <span className="text-xs font-bold text-slate-300">
                Subjects Uploaded
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Session {currentSession} Factual Data
              </span>
            </div>

          </div>
        </div>

        {/* Right: Critical Actions Required (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-rose-500 text-base animate-bounce">🚨</span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Critical Actions Required
                </h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-400">
                ({criticalActionsList.length} Pending)
              </span>
            </div>

            {criticalActionsList.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-bold text-center">
                ✓ All departments have completed 100% of result uploads for Session {currentSession}!
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {criticalActionsList.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDepartmentForDirective(item.fullName);
                      setDirectiveForm(prev => ({
                        ...prev,
                        department: item.fullName,
                        title: `Urgent Action Required for ${item.dept}`,
                        message: `Your department has critical upload status: ${item.detail}. Please expedite immediately.`
                      }));
                      setIsNewDirectiveModalOpen(true);
                    }}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                        {item.dept}
                      </h4>
                      <p className="text-[10px] text-slate-400">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        item.color === 'rose' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {item.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsNewDirectiveModalOpen(true)}
            className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-indigo-600/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Issue Direct Executive Order</span>
          </button>
        </div>

      </div>

      {/* 4. LOWER ROW: DEPARTMENT-WISE TABLE & RECENT ACTIVITIES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Department-wise Result Submission Status Table (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Department-wise Result Submission Status
            </h3>
            <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              View All Departments
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-mono">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Department</th>
                  <th className="py-2.5 px-2 text-center">Programs</th>
                  <th className="py-2.5 px-2 text-center">Total Subjects</th>
                  <th className="py-2.5 px-2 text-center">Uploaded</th>
                  <th className="py-2.5 px-2 text-center">Pending</th>
                  <th className="py-2.5 px-2">Progress</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {departmentStats.map(dept => {
                  const isExpanded = expandedDeptCode === dept.code;
                  return (
                    <React.Fragment key={dept.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-2 text-slate-500 font-mono text-[10px]">{dept.id}</td>
                        <td className="py-2.5 px-2 font-bold text-slate-200">
                          <button
                            type="button"
                            onClick={() => setExpandedDeptCode(isExpanded ? null : dept.code)}
                            className="flex items-center gap-1.5 hover:text-indigo-300 text-left cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>{dept.name}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-400 font-mono">
                          <button
                            type="button"
                            onClick={() => setExpandedDeptCode(isExpanded ? null : dept.code)}
                            className="hover:underline hover:text-indigo-300 cursor-pointer"
                          >
                            {dept.programsCount}
                          </button>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{dept.totalSubjects}</td>
                        <td className="py-2.5 px-2 text-center text-slate-300 font-mono">{dept.uploadedCount}</td>
                        <td className={`py-2.5 px-2 text-center font-bold font-mono ${dept.pendingCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                          {dept.pendingCount}
                        </td>
                        <td className="py-2.5 px-2 w-28">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  dept.status === 'Complete' ? 'bg-emerald-500' :
                                  dept.status === 'On Track' ? 'bg-blue-500' :
                                  dept.status === 'In Progress' ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${dept.progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400">{dept.progressPct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            dept.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            dept.status === 'On Track' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            dept.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {dept.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedDeptCode(isExpanded ? null : dept.code)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-md border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                              title="View granular program breakdown for this department"
                            >
                              <GraduationCap className="w-3 h-3 text-indigo-400" />
                              <span>{isExpanded ? 'Hide' : 'Programs'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openDirectiveModal(dept.fullName, 'ALL')}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                              title="Issue executive directive order for this department"
                            >
                              <span>Direct Order</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Program Breakdown Sub-Table */}
                      {isExpanded && (
                        <tr className="bg-slate-900/95 border-b border-indigo-500/30">
                          <td colSpan={9} className="p-4 bg-slate-950/80">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                                  <span className="text-xs font-black text-white uppercase tracking-wide">
                                    Degree Program Compliance Breakdown ({dept.name})
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                                    {dept.pendingPrograms.length} Pending Program(s)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openDirectiveModal(dept.fullName, 'ALL')}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Dispatch Directive for All Pending Programs</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {dept.programBreakdown.map((prog: any, pIdx: number) => (
                                  <div
                                    key={pIdx}
                                    className={`p-3 rounded-xl border transition-all ${
                                      prog.pendingCount > 0
                                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70'
                                        : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-bold text-white">{prog.programName}</span>
                                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-bold">
                                            {prog.degreeLevel}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                          <span>Uploaded: <strong className="text-white">{prog.uploadedCount}/{prog.totalSubjects}</strong></span>
                                          <span>•</span>
                                          <span className={prog.pendingCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {prog.pendingCount > 0 ? `${prog.pendingCount} Subject(s) Pending` : '100% Complete'}
                                          </span>
                                        </div>
                                      </div>
                                      <span
                                        className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                          prog.pendingCount > 0
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        }`}
                                      >
                                        {prog.pendingCount > 0 ? 'Pending' : 'Uploaded'}
                                      </span>
                                    </div>

                                    {prog.pendingCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => openDirectiveModal(dept.fullName, prog.programName)}
                                        className="w-full mt-2.5 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white font-bold text-[10px] rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Send className="w-3 h-3 text-indigo-400" />
                                        <span>Issue Order for {prog.programName}</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Activities (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Recent Activities
              </h3>
            </div>
            <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentActivitiesList.map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                  item.type === 'success' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' :
                  item.type === 'info' ? 'bg-blue-500 ring-4 ring-blue-500/20' :
                  'bg-rose-500 ring-4 ring-rose-500/20'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 leading-tight">
                    {item.text}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.by}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. FOOTER STICKY ACTION BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 bg-indigo-950/80 border border-indigo-700/60 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-200">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Active Scope: <strong className="text-white">Session {currentSession} ({selectedSemesterFilter === 'ALL' ? 'All Semesters' : `Semester ${selectedSemesterFilter}`})</strong></span>
          <span className="text-indigo-300 font-extrabold bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/40">Schedule: {systemDeadline}</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSendBulkReminder}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 uppercase tracking-wider"
          >
            <Send className="w-4 h-4" />
            <span>Send Reminder to Pending Departments</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>
    </>
  )}

      {/* MODAL: DISPATCH EXECUTIVE DIRECTIVE ORDER */}
      {isNewDirectiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white animate-scale-up">
            <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wide">
                  Dispatch Vice Chancellor Directive Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDirectiveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchDirective} className="p-5 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase block">
                    Target Department
                  </label>
                  <select
                    value={directiveForm.department}
                    onChange={e => {
                      const newDept = e.target.value;
                      openDirectiveModal(newDept, 'ALL');
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {UNIVERSITY_DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase block">
                    Target Degree Program
                  </label>
                  <select
                    value={directiveForm.program || 'ALL'}
                    onChange={e => {
                      const newProg = e.target.value;
                      openDirectiveModal(directiveForm.department, newProg);
                    }}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Programs in Department</option>
                    {departmentStats
                      .find(d => d.fullName === directiveForm.department)
                      ?.programBreakdown.map((p: any) => (
                        <option key={p.programName} value={p.programName}>
                          {p.programName} ({p.pendingCount > 0 ? `${p.pendingCount} Pending` : '100% Uploaded'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  Directive Title
                </label>
                <input
                  type="text"
                  value={directiveForm.title}
                  onChange={e => setDirectiveForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase block">Priority</label>
                  <select
                    value={directiveForm.priority}
                    onChange={e => setDirectiveForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white"
                  >
                    <option value="CRITICAL">🔴 Critical Mandate</option>
                    <option value="HIGH">🟡 High Priority</option>
                    <option value="MEDIUM">🔵 Medium Priority</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase block">Execution Deadline</label>
                  <input
                    type="text"
                    value={directiveForm.deadline}
                    onChange={e => setDirectiveForm(prev => ({ ...prev, deadline: e.target.value }))}
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase block">
                    Directive Message Body
                  </label>
                  <button
                    type="button"
                    onClick={() => openDirectiveModal(directiveForm.department, directiveForm.program || 'ALL')}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    🔄 Auto-Generate Text
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={directiveForm.message}
                  onChange={e => setDirectiveForm(prev => ({ ...prev, message: e.target.value }))}
                  required
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewDirectiveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Directive</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
