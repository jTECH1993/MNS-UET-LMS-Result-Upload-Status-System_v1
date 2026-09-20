import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy,
  RefreshCw,
  FileText,
  BarChart2,
  Filter,
  Clock,
  Sparkles,
  Layers,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sun,
  Moon
} from 'lucide-react';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';
import { CompletionRadarService } from '../services/completionRadarService';
import { AcademicShift } from '../types';

interface Props {
  allRecords: any[];
  currentSession?: string;
  selectedSemesterFilter?: string;
  selectedDeptFilter?: string;
  selectedShiftFilter?: string;
}

export type SummaryStyle = 'DETAILED' | 'EXECUTIVE' | 'PENDING_ONLY';
export type SummaryView = 'TEXT' | 'DASHBOARD';

export function VCExecutiveSummaryPanel({
  allRecords,
  currentSession = '2023',
  selectedSemesterFilter = '1',
  selectedDeptFilter = 'ALL',
  selectedShiftFilter = 'ALL',
}: Props) {
  // Filters synchronized with VC Dashboard
  const [sessionFilter, setSessionFilter] = useState<string>(currentSession);
  const [semesterFilter, setSemesterFilter] = useState<string>(selectedSemesterFilter);
  const [deptFilter, setDeptFilter] = useState<string>(selectedDeptFilter);
  const [shiftFilter, setShiftFilter] = useState<string>(selectedShiftFilter);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Keep local filter state synced if parent props update from VC Dashboard controller
  useEffect(() => {
    if (currentSession) setSessionFilter(currentSession);
    if (selectedSemesterFilter) setSemesterFilter(selectedSemesterFilter);
    if (selectedDeptFilter) setDeptFilter(selectedDeptFilter);
    if (selectedShiftFilter) setShiftFilter(selectedShiftFilter);
  }, [currentSession, selectedSemesterFilter, selectedDeptFilter, selectedShiftFilter]);

  // Display Mode & Style
  const [viewMode, setViewMode] = useState<SummaryView>('TEXT');
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>('DETAILED');

  // Toast / Copy Feedback
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Timestamp
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const updateTimestamp = () => {
    const now = new Date();
    setLastUpdated(
      now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    );
  };

  useEffect(() => {
    updateTimestamp();
  }, []);

  // Compute dynamic department/program status matrix strictly for programs part of selected session & semester
  const summaryData = useMemo(() => {
    const activeSess = sessionFilter || currentSession || '2023';
    const activeSem = semesterFilter || selectedSemesterFilter || '1';
    const activeDept = deptFilter || selectedDeptFilter || 'ALL';
    const activeShift = shiftFilter || selectedShiftFilter || 'ALL';
    const accounts = AuthService.getAccounts();

    return UNIVERSITY_DEPARTMENTS.map((dept, deptIdx) => {
      if (activeDept !== 'ALL' && dept.code !== activeDept && dept.name !== activeDept) {
        return null;
      }

      // 1. Retrieve programs enrolled/active in this specific academic session
      const activeProgNames = Array.from(
        new Set(StorageService.getSessionPrograms(dept.name, activeSess, allRecords))
      );

      // 2. Filter programs so ONLY programs part of activeSess or with active submissions in activeSess are included
      const targetPrograms = dept.programs.filter((prog) => {
        const hasSub = allRecords.some(
          (r) =>
            r &&
            r.department &&
            StorageService._isDeptMatch(dept.name, r.department) &&
            StorageService._isProgMatch(prog.name, r.program) &&
            (r.session || '2023').includes(activeSess)
        );
        return activeProgNames.includes(prog.name) || hasSub;
      });

      if (targetPrograms.length === 0) {
        return null;
      }

      const programSummaries = targetPrograms.map((prog) => {
        // Find matching records in allRecords for this program
        const progRecords = allRecords.filter((r) => {
          const matchDept = StorageService._isDeptMatch(dept.name, r.department);
          const matchProg = StorageService._isProgMatch(prog.name, r.program);
          const matchSess = activeSess === 'All' || (r.session || '2023').includes(activeSess) || activeSess.includes(r.session || '2023');
          return matchDept && matchProg && matchSess;
        });

        // Determine active shifts dynamically for this program in this session
        const hasMorningRecs = progRecords.some((r) => (r.shift || 'Morning').trim().toLowerCase() === 'morning');
        const hasEveningRecs = progRecords.some((r) => (r.shift || '').trim().toLowerCase() === 'evening');

        const cleanProg = prog.name.trim().toLowerCase();
        const matchingCoordAccounts = accounts.filter((a) => {
          if (a.role !== 'COORDINATOR' && a.role !== 'LECTURER') return false;
          const assigned = a.assignedPrograms || (a.program ? [a.program] : []);
          return assigned.some((p) => p.trim().toLowerCase() === cleanProg);
        });

        let hasMorningCoord = false;
        let hasEveningCoord = false;

        matchingCoordAccounts.forEach((acc) => {
          let shs: string[] = [];
          if (acc.programShiftAssignments && acc.programShiftAssignments[prog.name]) {
            shs = acc.programShiftAssignments[prog.name];
          } else if (acc.programShiftAssignments) {
            const matchedKey = Object.keys(acc.programShiftAssignments).find((k) =>
              StorageService._isProgMatch(prog.name, k)
            );
            if (matchedKey) shs = acc.programShiftAssignments[matchedKey];
          }
          if (shs.length === 0 && acc.assignedShifts) {
            shs = acc.assignedShifts;
          }
          if (shs.includes('Morning')) hasMorningCoord = true;
          if (shs.includes('Evening')) hasEveningCoord = true;
        });

        let progShifts: string[] = [];
        if (activeShift !== 'ALL') {
          progShifts = [activeShift];
        } else if (prog.supportedShifts && prog.supportedShifts.length === 1) {
          progShifts = [prog.supportedShifts[0]];
        } else {
          const isMorningActive = hasMorningRecs || hasMorningCoord;
          const isEveningActive = hasEveningRecs || hasEveningCoord;

          if (isMorningActive && isEveningActive) {
            progShifts = ['Morning', 'Evening'];
          } else if (isEveningActive) {
            progShifts = ['Evening'];
          } else if (isMorningActive) {
            progShifts = ['Morning'];
          } else {
            if (prog.degreeLevel === 'B.Tech' || prog.name.includes('(B.Tech)')) {
              progShifts = ['Evening'];
            } else {
              progShifts = ['Morning'];
            }
          }
        }

        const shiftsDetail: Record<
          string,
          {
            shift: string;
            uploaded: number;
            total: number;
            coordinator: string;
            missingLab: boolean;
            status: 'COMPLETE' | 'PARTIAL' | 'NOT_SUBMITTED';
          }
        > = {};

        let totalProgUploaded = 0;
        let totalProgExpected = 0;
        let hasProgLabMissing = false;

        progShifts.forEach((sh) => {
          const shiftRecords = progRecords.filter((r) => {
            const rShift = (r.shift || 'Morning').trim().toLowerCase();
            if (rShift !== sh.toLowerCase()) return false;
            if (activeSem !== 'ALL' && activeSem !== 'All') {
              const rSem = String(r.semester || '1').replace(/\D/g, '') || '1';
              if (rSem !== activeSem) return false;
            }
            return true;
          });

          let shiftUploaded = 0;
          let shiftTotal = 0;
          let shiftLabMissing = false;

          let coordName = 'Not Assigned';
          const resolved = CompletionRadarService.resolveCoordinator(dept.name, prog.name, sh as AcademicShift);
          if (resolved.isAssigned) {
            coordName = resolved.name;
          }

          if (shiftRecords.length > 0) {
            shiftRecords.forEach((r) => {
              if (r.hodCoordinator && r.hodCoordinator.trim() && !r.hodCoordinator.includes('HOD / Coordinator')) {
                coordName = r.hodCoordinator.trim();
              }
              if (r.subjects && Array.isArray(r.subjects)) {
                const uploaded = r.subjects.filter((s: any) => s.status === 'Uploaded').length;
                const total = r.subjects.length;
                shiftUploaded += uploaded;
                shiftTotal += total;

                if (total > 0 && uploaded < total && total - uploaded === 1) {
                  shiftLabMissing = true;
                }
              }
            });
          }

          let shiftStatus: 'COMPLETE' | 'PARTIAL' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
          if (shiftTotal === 0) {
            shiftStatus = 'NOT_SUBMITTED';
          } else if (shiftUploaded >= shiftTotal) {
            shiftStatus = 'COMPLETE';
          } else if (shiftUploaded > 0) {
            shiftStatus = 'PARTIAL';
          }

          shiftsDetail[sh] = {
            shift: sh,
            uploaded: shiftUploaded,
            total: shiftTotal,
            coordinator: coordName,
            missingLab: shiftLabMissing,
            status: shiftStatus,
          };

          totalProgUploaded += shiftUploaded;
          totalProgExpected += shiftTotal;
          if (shiftLabMissing) hasProgLabMissing = true;
        });

        let progStatus: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
        if (totalProgExpected === 0) {
          progStatus = 'NOT_SUBMITTED';
        } else if (totalProgUploaded >= totalProgExpected) {
          progStatus = 'COMPLETE';
        } else if (totalProgUploaded > 0) {
          progStatus = totalProgExpected - totalProgUploaded === 1 || hasProgLabMissing ? 'INCOMPLETE' : 'PARTIAL';
        }

        return {
          programName: prog.name,
          degreeLevel: prog.degreeLevel,
          uploadedCount: totalProgUploaded,
          totalExpected: totalProgExpected,
          status: progStatus,
          hasLabMissing: hasProgLabMissing,
          shiftsDetail,
          activeShifts: progShifts,
        };
      }).filter(Boolean);

      if (programSummaries.length === 0) return null;

      const deptUploaded = programSummaries.reduce((acc, p) => acc + (p?.uploadedCount || 0), 0);
      const deptTotal = programSummaries.reduce((acc, p) => acc + (p?.totalExpected || 0), 0);

      let deptStatus: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
      if (deptTotal > 0 && deptUploaded >= deptTotal) {
        deptStatus = 'COMPLETE';
      } else if (deptUploaded > 0 && deptUploaded < deptTotal) {
        deptStatus = 'PARTIAL';
      } else if (deptTotal > 0 && deptUploaded === 0) {
        deptStatus = 'NOT_SUBMITTED';
      }

      if (statusFilter !== 'ALL' && deptStatus !== statusFilter) {
        return null;
      }

      return {
        id: deptIdx + 1,
        code: dept.code,
        name: dept.name,
        shortName: dept.name.replace('Department of ', ''),
        programs: programSummaries,
        deptUploaded,
        deptTotal,
        deptStatus
      };
    }).filter(Boolean) as any[];
  }, [allRecords, sessionFilter, semesterFilter, deptFilter, shiftFilter, statusFilter, currentSession, selectedSemesterFilter, selectedDeptFilter, selectedShiftFilter]);

  // Generate Full Summary Text
  const fullSummaryText = useMemo(() => {
    let headerSession = sessionFilter === 'All' ? `Session ${currentSession}` : `Session ${sessionFilter}`;
    if (semesterFilter !== 'ALL' && semesterFilter !== 'All') {
      headerSession += ` (Semester ${semesterFilter})`;
    } else {
      headerSession += ` (All Semesters)`;
    }

    const shiftLabel =
      shiftFilter === 'ALL'
        ? 'All Shifts (Morning & Evening)'
        : shiftFilter === 'Morning'
        ? 'Morning Shift Only'
        : 'Evening Shift Only';

    let text = `EXAMINATION RESULT UPLOAD SUMMARY\n`;
    text += `${headerSession}\n`;
    text += `Academic Shift Scope: ${shiftLabel}\n`;
    text += `Last updated: ${lastUpdated || 'Recently'}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (!summaryData || summaryData.length === 0) {
      text += `No department records match the selected filter criteria.\n`;
      return text;
    }

    if (summaryStyle === 'DETAILED') {
      summaryData.forEach((dept, idx) => {
        if (!dept) return;
        text += `${idx + 1}. ${dept.shortName}\n`;

        dept.programs.forEach((prog: any, pIdx: number) => {
          if (!prog) return;
          const isLastProg = pIdx === dept.programs.length - 1;
          const branch = isLastProg ? '   └─ ' : '   ├─ ';
          const pipe = isLastProg ? '      ' : '   │  ';

          text += `${branch}${prog.programName}\n`;

          const shifts = Object.keys(prog.shiftsDetail || {});
          if (shifts.length > 0) {
            shifts.forEach((shift, sIdx) => {
              const details = prog.shiftsDetail[shift];
              const isLastShift = sIdx === shifts.length - 1;
              const subBranch = isLastShift ? `${pipe}└─ ` : `${pipe}├─ `;
              
              if (details.total === 0 && details.uploaded === 0) {
                text += `${subBranch}[${shift} Shift]: No results submitted yet 🔴 (Coordinator: ${details.coordinator})\n`;
              } else {
                const icon = details.uploaded >= details.total && details.total > 0 ? '✓' : '⚠';
                const statusTag = details.uploaded >= details.total ? 'Complete' : `${details.total - details.uploaded} pending`;
                text += `${subBranch}[${shift} Shift]: ${details.uploaded} of ${details.total} results uploaded ${icon} (Coord: ${details.coordinator} — ${statusTag})\n`;
                if (details.missingLab) {
                  text += `${pipe}   ⚠ Possible missing laboratory result — verification required\n`;
                }
              }
            });
          } else {
            const icon = prog.status === 'COMPLETE' ? '✓' : prog.status === 'NOT_SUBMITTED' ? '🔴' : '⚠';
            if (prog.status === 'NOT_SUBMITTED') {
              text += `${pipe}└─ No results submitted yet ${icon}\n`;
            } else if (prog.hasLabMissing) {
              text += `${pipe}└─ ${prog.uploadedCount} of ${prog.totalExpected} uploaded — Possible missing laboratory result ${icon}\n`;
            } else {
              text += `${pipe}└─ ${prog.uploadedCount} of ${prog.totalExpected} results uploaded ${icon}\n`;
            }
          }
        });

        const statusBadge =
          dept.deptStatus === 'COMPLETE'
            ? 'COMPLETE ✓'
            : dept.deptStatus === 'NOT_SUBMITTED'
            ? 'NOT SUBMITTED 🔴'
            : `PARTIAL (${dept.deptUploaded}/${dept.deptTotal} uploaded) 🟡`;

        text += `   Status: ${statusBadge}\n\n`;
      });
    } else if (summaryStyle === 'EXECUTIVE') {
      const totalAll = summaryData.reduce((a, b) => a + (b?.deptTotal || 0), 0);
      const uploadedAll = summaryData.reduce((a, b) => a + (b?.deptUploaded || 0), 0);
      const pctAll = totalAll > 0 ? Math.round((uploadedAll / totalAll) * 100) : 0;

      const completeDepts = summaryData.filter((d) => d?.deptStatus === 'COMPLETE');
      const partialDepts = summaryData.filter((d) => d?.deptStatus === 'PARTIAL' || (d?.deptStatus as string) === 'INCOMPLETE');
      const notSubmittedDepts = summaryData.filter((d) => d?.deptStatus === 'NOT_SUBMITTED');

      text += `EXECUTIVE OVERVIEW:\n`;
      text += `Overall Clearance Rate: ${pctAll}% (${uploadedAll} / ${totalAll} results uploaded)\n`;
      text += `Program Shift Scope: ${shiftLabel}\n\n`;

      if (completeDepts.length > 0) {
        text += `• COMPLETED DEPARTMENTS (${completeDepts.length}):\n`;
        completeDepts.forEach((d) => {
          text += `  ✓ ${d?.shortName} (100% complete — ${d?.deptUploaded} results uploaded across active shifts)\n`;
        });
        text += `\n`;
      }

      if (partialDepts.length > 0) {
        text += `• IN PROGRESS / PARTIAL DEPARTMENTS (${partialDepts.length}):\n`;
        partialDepts.forEach((d) => {
          text += `  🟡 ${d?.shortName}: ${d?.deptUploaded} of ${d?.deptTotal} results uploaded (${(d?.deptTotal || 0) - (d?.deptUploaded || 0)} pending)\n`;
          d?.programs?.forEach((p: any) => {
            if (p.status !== 'COMPLETE') {
              const pendingShifts = Object.values(p.shiftsDetail || {}).filter((sh: any) => sh.status !== 'COMPLETE');
              if (pendingShifts.length > 0) {
                pendingShifts.forEach((sh: any) => {
                  text += `     - ${p.programName} [${sh.shift} Shift]: ${sh.uploaded}/${sh.total} uploaded (Coord: ${sh.coordinator})\n`;
                });
              } else {
                text += `     - ${p.programName}: ${p.uploadedCount}/${p.totalExpected} uploaded\n`;
              }
            }
          });
        });
        text += `\n`;
      }

      if (notSubmittedDepts.length > 0) {
        text += `• DEPARTMENTS NOT SUBMITTED (${notSubmittedDepts.length}):\n`;
        notSubmittedDepts.forEach((d) => {
          text += `  🔴 ${d?.shortName}: 0 results uploaded — Urgent executive follow-up required\n`;
        });
        text += `\n`;
      }
    } else if (summaryStyle === 'PENDING_ONLY') {
      const pendingDepts = summaryData.filter((d) => d?.deptStatus !== 'COMPLETE');

      if (pendingDepts.length === 0) {
        text += `ALL DEPARTMENTS ARE 100% COMPLETE! No pending results require attention.\n`;
      } else {
        text += `PENDING EXAMINATION RESULTS & ACTION REQUIRED:\n`;
        text += `Shift Scope: ${shiftLabel}\n\n`;

        pendingDepts.forEach((dept, idx) => {
          if (!dept) return;
          text += `${idx + 1}. ${dept.shortName}\n`;

          dept.programs.forEach((prog: any) => {
            if (!prog || prog.status === 'COMPLETE') return;
            const shifts = Object.values(prog.shiftsDetail || {}) as any[];
            const pendingShifts = shifts.filter((sh: any) => sh.status !== 'COMPLETE');

            if (pendingShifts.length > 0) {
              pendingShifts.forEach((sh: any) => {
                if (sh.status === 'NOT_SUBMITTED' || sh.total === 0) {
                  text += `   └─ ${prog.programName} [${sh.shift} Shift]: No results submitted yet 🔴 (Coord: ${sh.coordinator})\n`;
                } else if (sh.missingLab) {
                  text += `   └─ ${prog.programName} [${sh.shift} Shift]: ${sh.uploaded} of ${sh.total} uploaded — Laboratory result pending ⚠ (Coord: ${sh.coordinator})\n`;
                } else {
                  text += `   └─ ${prog.programName} [${sh.shift} Shift]: ${sh.uploaded} of ${sh.total} uploaded — ${sh.total - sh.uploaded} pending 🟡 (Coord: ${sh.coordinator})\n`;
                }
              });
            } else {
              if (prog.status === 'NOT_SUBMITTED') {
                text += `   └─ ${prog.programName}: No results submitted yet 🔴\n`;
              } else {
                text += `   └─ ${prog.programName}: ${prog.uploadedCount} of ${prog.totalExpected} uploaded — ${prog.totalExpected - prog.uploadedCount} result(s) pending 🟡\n`;
              }
            }
          });

          text += `   Status: ${dept.deptStatus === 'NOT_SUBMITTED' ? 'NOT SUBMITTED 🔴' : 'PARTIAL 🟡'}\n\n`;
        });
      }
    }

    return text;
  }, [summaryData, sessionFilter, semesterFilter, shiftFilter, summaryStyle, lastUpdated, currentSession]);

  // Generate Pending Only Text (For "Copy Pending Summary" button)
  const pendingSummaryText = useMemo(() => {
    const headerSession = sessionFilter === 'All' ? `Session ${currentSession}` : `Session ${sessionFilter}`;
    const semLabel = semesterFilter === 'ALL' || semesterFilter === 'All' ? 'All Semesters' : `Semester ${semesterFilter}`;
    const shiftLabel =
      shiftFilter === 'ALL'
        ? 'All Shifts (Morning & Evening)'
        : shiftFilter === 'Morning'
        ? 'Morning Shift Only'
        : 'Evening Shift Only';

    let text = `PENDING EXAMINATION RESULTS SUMMARY\n`;
    text += `Session: ${headerSession} | ${semLabel}\n`;
    text += `Academic Shift: ${shiftLabel}\n`;
    text += `Last updated: ${lastUpdated || 'Recently'}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const pendingDepts = (summaryData || []).filter((d) => d && d.deptStatus !== 'COMPLETE');

    if (pendingDepts.length === 0) {
      text += `Great news! All departments have 100% completed LMS result uploads.\n`;
    } else {
      pendingDepts.forEach((dept, idx) => {
        if (!dept) return;
        text += `${idx + 1}. ${dept.shortName}\n`;

        dept.programs.forEach((prog: any) => {
          if (!prog || prog.status === 'COMPLETE') return;
          const shifts = Object.values(prog.shiftsDetail || {}) as any[];
          const pendingShifts = shifts.filter((sh: any) => sh.status !== 'COMPLETE');

          if (pendingShifts.length > 0) {
            pendingShifts.forEach((sh: any) => {
              if (sh.status === 'NOT_SUBMITTED' || sh.total === 0) {
                text += `   └─ ${prog.programName} [${sh.shift} Shift]: No results submitted yet 🔴 (Coord: ${sh.coordinator})\n`;
              } else if (sh.missingLab) {
                text += `   └─ ${prog.programName} [${sh.shift} Shift]: ${sh.uploaded} of ${sh.total} uploaded — Laboratory result pending ⚠ (Coord: ${sh.coordinator})\n`;
              } else {
                text += `   └─ ${prog.programName} [${sh.shift} Shift]: ${sh.uploaded} of ${sh.total} uploaded — ${sh.total - sh.uploaded} pending 🟡 (Coord: ${sh.coordinator})\n`;
              }
            });
          } else {
            if (prog.status === 'NOT_SUBMITTED') {
              text += `   └─ ${prog.programName}: No results submitted yet 🔴\n`;
            } else {
              text += `   └─ ${prog.programName}: ${prog.uploadedCount} of ${prog.totalExpected} uploaded — ${prog.totalExpected - prog.uploadedCount} pending 🟡\n`;
            }
          }
        });

        text += `   Action Required: Immediate upload & HOD verification\n\n`;
      });
    }

    return text;
  }, [summaryData, sessionFilter, semesterFilter, shiftFilter, lastUpdated, currentSession]);

  // Copy Handlers
  const handleCopyFull = () => {
    navigator.clipboard.writeText(fullSummaryText);
    setCopiedType('FULL');
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleCopyPending = () => {
    navigator.clipboard.writeText(pendingSummaryText);
    setCopiedType('PENDING');
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleRefresh = () => {
    updateTimestamp();
    setCopiedType('REFRESHED');
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 font-sans space-y-5">
      
      {/* Toast Feedback */}
      {copiedType && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>
            {copiedType === 'FULL'
              ? 'Full Executive Summary copied to clipboard!'
              : copiedType === 'PENDING'
              ? 'Pending Summary copied to clipboard!'
              : 'Summary refreshed with latest live data!'}
          </span>
        </div>
      )}

      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  VC Executive Summary
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Dynamic Text Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate clean, copyable summary statements from live database status for VC executive communication
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right Copy Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyFull}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Full Summary</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPending}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-600/30 active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Copy Pending Summary</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 cursor-pointer"
            title="Refresh with live database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. FILTERS & STYLE SELECTION ROW */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-slate-300 uppercase tracking-wide text-[11px]">
              VC Dashboard Scope Synchronized:
            </span>
            <span className="bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded font-mono font-bold border border-emerald-800/80">
              Session {currentSession}
            </span>
            <span className="bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded font-mono font-bold border border-indigo-800/80">
              Semester {selectedSemesterFilter === 'ALL' ? 'All' : selectedSemesterFilter}
            </span>
            {selectedDeptFilter !== 'ALL' && (
              <span className="bg-sky-950 text-sky-300 px-2.5 py-0.5 rounded font-bold border border-sky-800/80">
                {selectedDeptFilter.replace('Department of ', '')}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            * Automatically showing active programs and DB submissions for Session {currentSession} / Semester {selectedSemesterFilter}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Filter 1: Session */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" />
              Session
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value={currentSession}>Session {currentSession} (Active)</option>
              {StorageService.getAvailableSessions().map((s) => (
                <option key={s} value={s}>
                  Session {s}
                </option>
              ))}
              <option value="All">All Sessions</option>
            </select>
          </div>

          {/* Filter 2: Semester */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              Semester
            </label>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value={selectedSemesterFilter}>Semester {selectedSemesterFilter === 'ALL' ? 'All' : selectedSemesterFilter} (Active)</option>
              <option value="ALL">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">3rd Semester</option>
              <option value="4">4th Semester</option>
              <option value="5">5th Semester</option>
              <option value="6">6th Semester</option>
              <option value="7">7th Semester</option>
              <option value="8">8th Semester</option>
            </select>
          </div>

          {/* Filter 3: Academic Shift */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" />
              Shift Scope
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Shifts (Morning & Evening)</option>
              <option value="Morning">🌅 Morning Shift Only</option>
              <option value="Evening">🌙 Evening Shift Only</option>
            </select>
          </div>

        {/* Filter 4: Department */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-400" />
            Department
          </label>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {UNIVERSITY_DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name.replace('Department of ', '')}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 5: Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3 text-indigo-400" />
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETE">🟢 Complete Only</option>
            <option value="PARTIAL">🟡 In Progress / Partial</option>
            <option value="NOT_SUBMITTED">🔴 Not Submitted Only</option>
          </select>
        </div>

        {/* Style Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Summary Style
          </label>
          <select
            value={summaryStyle}
            onChange={(e) => setSummaryStyle(e.target.value as SummaryStyle)}
            className="w-full p-2 bg-indigo-950/80 border border-indigo-800 rounded-lg text-xs font-extrabold text-indigo-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 cursor-pointer"
          >
            <option value="DETAILED">Detailed Tree Format</option>
            <option value="EXECUTIVE">Executive Overview</option>
            <option value="PENDING_ONLY">Pending Action Items Only</option>
          </select>
        </div>
      </div>
    </div>

      {/* 3. VIEW MODE SWITCHER & TIMESTAMP */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Tabs: Copyable Text View vs Dashboard Table View */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('TEXT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'TEXT'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📋 Copyable Summary View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('DASHBOARD')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'DASHBOARD'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>📊 Dashboard View</span>
          </button>
        </div>

        {/* Timestamp Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last updated: <strong className="text-slate-200">{lastUpdated || '19 September 2026, 4:16 PM'}</strong></span>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {viewMode === 'TEXT' ? (
        /* Copyable Summary View */
        <div className="relative group">
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              Plain Text • Ready to Copy & Paste
            </span>
            <button
              type="button"
              onClick={handleCopyFull}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg border border-slate-700 transition-all cursor-pointer"
              title="Copy text"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <pre className="w-full bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap select-all max-h-96">
            {fullSummaryText}
          </pre>
        </div>
      ) : (
        /* Dashboard View */
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-mono bg-slate-900/60">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-center">Programs</th>
                <th className="py-3 px-3 text-center">Uploaded / Total</th>
                <th className="py-3 px-3">Completion Rate</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {summaryData.map((dept) => {
                if (!dept) return null;
                const pct = dept.deptTotal > 0 ? Math.round((dept.deptUploaded / dept.deptTotal) * 100) : 0;
                return (
                  <tr key={dept.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">{dept.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-200">{dept.name}</td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{dept.programs.length}</td>
                    <td className="py-3 px-3 text-center text-slate-300 font-mono">
                      {dept.deptUploaded} / {dept.deptTotal}
                    </td>
                    <td className="py-3 px-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dept.deptStatus === 'COMPLETE'
                                ? 'bg-emerald-500'
                                : dept.deptStatus === 'NOT_SUBMITTED'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-300">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                          dept.deptStatus === 'COMPLETE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : dept.deptStatus === 'NOT_SUBMITTED'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {dept.deptStatus === 'COMPLETE'
                          ? '🟢 COMPLETE'
                          : dept.deptStatus === 'NOT_SUBMITTED'
                          ? '🔴 NOT SUBMITTED'
                          : '🟡 PARTIAL'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-slate-400">
                      {dept.deptStatus === 'COMPLETE'
                        ? 'All grade sheets uploaded'
                        : dept.deptStatus === 'NOT_SUBMITTED'
                        ? 'No submissions received'
                        : `${dept.deptTotal - dept.deptUploaded} course(s) pending`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. FOOTER QUICK ACTION TIPS */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Tip: Click <strong>Copy Full Summary</strong> or <strong>Copy Pending Summary</strong> then paste directly into WhatsApp, Email, Word, SMS, or official memo notes.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyFull}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Copy & Export</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>

    </div>
  );
}
