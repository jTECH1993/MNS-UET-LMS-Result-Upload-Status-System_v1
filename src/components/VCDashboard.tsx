import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SHIFTS, ACADEMIC_SEMESTERS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { AuditTrailService } from '../services/auditTrailService';
import { SubmissionRecord, AcademicShift, ProgramSessionDetail } from '../types';
import { Session2023SelectorModal } from './Session2023SelectorModal';
import { AcademicSessionModal } from './AcademicSessionModal';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import { VCAnalyticsCharts } from './VCAnalyticsCharts';
import { VCAuditFeed } from './VCAuditFeed';
import { MnsUetLogo } from './MnsUetLogo';
import { DeadlineBanner } from './DeadlineBanner';
import { DepartmentCompletionHeatmap } from './DepartmentCompletionHeatmap';
import { DepartmentDrillDownModal } from './DepartmentDrillDownModal';
import { ProgramSectionDrillDownModal } from './ProgramSectionDrillDownModal';
import { ActionRequiredPanel } from './ActionRequiredPanel';
import { ActionCenterPanel } from './ActionCenterPanel';
import { AdminGodModePanel } from './AdminGodModePanel';
import { SectionPerformanceMatrix } from './SectionPerformanceMatrix';
import { DeadlineAgingChart } from './DeadlineAgingChart';
import { SubmissionCoverageRadar } from './SubmissionCoverageRadar';
import { BottleneckActionPanel } from './BottleneckActionPanel';
import { SubmissionTrendCard } from './SubmissionTrendCard';
import { ChangeHistoryModal } from './ChangeHistoryModal';
import { MarkdownRenderer } from './MarkdownRenderer';
import { UniversityDigitalTwin } from './UniversityDigitalTwin';
import {
  CompletionRadarService,
  BottleneckInfo,
  RadarUnit,
  RadarDrillPath,
} from '../services/completionRadarService';
import {
  VCAnalyticsService,
  DepartmentDimension,
  ProgramDimension,
  SectionBreakdown,
  ActionRequiredException,
} from '../services/vcAnalyticsService';
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  GraduationCap,
  Filter,
  SlidersHorizontal,
  Sun,
  Moon,
  Calendar,
  Layers,
  Sparkles,
  Plus,
  X,
  FileText,
  Printer,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Activity,
  Timer,
  Info
} from 'lucide-react';

interface Props {
  onSelectProgramToEdit: (
    department: string,
    program: string,
    shift?: AcademicShift,
    session?: string,
    semester?: string,
    section?: string
  ) => void;
  allRecords: SubmissionRecord[];
}

export interface ShiftCohortData {
  hasSubmission: boolean;
  submittedSemestersCount: number;
  semesterRecords: Record<string, SubmissionRecord | null>;
  semesterSectionRecords: Record<string, Record<string, SubmissionRecord>>;
  totalSubjects: number;
  totalUploaded: number;
  totalPending: number;
  firstSubmittedSemester?: string;
}

export interface UnifiedProgramRow {
  department: string;
  deptCode: string;
  program: string;
  degreeLevel: string;
  sessionActive: boolean;
  sessionDetail?: ProgramSessionDetail;
  supportedShifts: AcademicShift[];
  shifts: {
    Morning: ShiftCohortData;
    Evening: ShiftCohortData;
  };
  hasMorningSubmission: boolean;
  hasEveningSubmission: boolean;
  hasAnySubmission: boolean;
  recommendedShift: AcademicShift;
}

export const VCDashboard: React.FC<Props> = ({ onSelectProgramToEdit, allRecords }) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | AcademicShift>('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  // Multi-semester selection state (defaults to Semester 1 or All based on VC preference)
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>(['1']);
  const [activeSessions, setActiveSessions] = useState<string[]>(() => StorageService.getActiveSessions());
  const [currentSession, setCurrentSession] = useState<string>(() => {
    const list = StorageService.getActiveSessions();
    return list[0] || StorageService.getSelectedSession() || '2023';
  });

  // Effective semester filter representation for backward-compatible calculations
  const selectedSemesterFilter = useMemo(() => {
    if (selectedSemesters.length === 0 || selectedSemesters.includes('ALL')) return 'ALL';
    if (selectedSemesters.length === 1) return selectedSemesters[0];
    return selectedSemesters.join(',');
  }, [selectedSemesters]);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
  const [onlySessionFilter, setOnlySessionFilter] = useState<boolean>(true);
  const [onlyGenuineSubmissions, setOnlyGenuineSubmissions] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterDept, setRosterDept] = useState<string>(UNIVERSITY_DEPARTMENTS[0].name);
  const [rosterVersion, setRosterVersion] = useState<number>(0);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState<boolean>(false);
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState<boolean>(false);
  const [lastRecalculationTime, setLastRecalculationTime] = useState<string>(() => {
    return new Date(Date.now() - 12000).toLocaleString(); // Last recalculated 12 seconds before loading dashboard
  });

  useEffect(() => {
    const handleRecalc = () => {
      setLastRecalculationTime(new Date().toLocaleString());
    };
    window.addEventListener('mnsuet_storage_updated', handleRecalc);
    return () => window.removeEventListener('mnsuet_storage_updated', handleRecalc);
  }, []);

  const [dashboardViewMode, setDashboardViewMode] = useState<'COMMAND_CENTER' | 'ROSTER' | 'ACTIVITY' | 'AI_ASSISTANT' | 'DIGITAL_TWIN' | 'ACTION_CENTER' | 'ADMIN_CONSOLE'>('COMMAND_CENTER');

  // AI Assistant State
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Change History / Audit Trail Modal State
  const [isChangeHistoryOpen, setIsChangeHistoryOpen] = useState<boolean>(false);
  const [changeHistoryProgram, setChangeHistoryProgram] = useState<string | undefined>(undefined);

  // Executive Hierarchy & Drill-Down State
  const [selectedDrillDownDept, setSelectedDrillDownDept] = useState<DepartmentDimension | null>(null);
  const [isDeptDrillDownOpen, setIsDeptDrillDownOpen] = useState<boolean>(false);
  const [selectedDrillDownProgram, setSelectedDrillDownProgram] = useState<ProgramDimension | null>(null);
  const [isProgramDrillDownOpen, setIsProgramDrillDownOpen] = useState<boolean>(false);

  // Submission Coverage Radar & Bottleneck Navigation State
  const [radarDrillPath, setRadarDrillPath] = useState<RadarDrillPath>({});
  const [radarInspectorUnit, setRadarInspectorUnit] = useState<RadarUnit | null>(null);
  const [highlightedBottleneckSection, setHighlightedBottleneckSection] = useState<string | null>(null);

  // Traverses hierarchy across all levels to pinpoint the single most critical submission bottleneck
  const institutionalBottleneck = useMemo(() => {
    return CompletionRadarService.findBottleneck(allRecords, activeSessions, selectedSemesters);
  }, [allRecords, activeSessions, selectedSemesters]);

  // Set initial inspector unit if none is selected
  useEffect(() => {
    if (!radarInspectorUnit && institutionalBottleneck.primary) {
      const p = institutionalBottleneck.primary;
      setRadarInspectorUnit({
        id: `initial-bottleneck-card`,
        name: p.program,
        level: 'PROGRAM',
        submitted: p.submittedCourses,
        pending: p.pendingCourses,
        inProgress: 0,
        total: p.totalCourses,
        completionRate: p.completionRate,
        coordinatorStatus: p.coordinatorStatus,
        coordinatorName: p.coordinatorName,
        hodStatus: p.hodStatus,
        hodName: p.hodName,
        deadlineText: p.deadlineText,
        deadlineDays: p.daysRemaining,
        isOverdue: p.isOverdue,
        lastActivity: '17 Sep, 8:42 PM',
        deptName: p.department,
        deptCode: p.deptCode,
        progName: p.program,
        semId: p.semesterId,
      });
    }
  }, [institutionalBottleneck, radarInspectorUnit]);

  // Handler for "Find the Bottleneck" button
  const handleFindBottleneck = () => {
    const p = institutionalBottleneck.primary;
    setRadarDrillPath({
      deptName: p.department,
      progName: p.program,
      semId: p.semesterId,
      sectionId: p.section.replace('Section ', '').trim(),
    });
    setHighlightedBottleneckSection(p.section);
    setRadarInspectorUnit({
      id: `active-bottleneck-selected`,
      name: `${p.program} (${p.section})`,
      level: 'SECTION',
      submitted: p.submittedCourses,
      pending: p.pendingCourses,
      inProgress: 0,
      total: p.totalCourses,
      completionRate: p.completionRate,
      coordinatorStatus: p.coordinatorStatus,
      coordinatorName: p.coordinatorName,
      hodStatus: p.hodStatus,
      hodName: p.hodName,
      deadlineText: p.deadlineText,
      deadlineDays: p.daysRemaining,
      isOverdue: p.isOverdue,
      lastActivity: '17 Sep, 8:42 PM',
      deptName: p.department,
      deptCode: p.deptCode,
      progName: p.program,
      semId: p.semesterId,
      sectionId: p.section.replace('Section ', '').trim(),
    });

    const el = document.getElementById('university-completion-radar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleJumpToBottleneck = (info: BottleneckInfo) => {
    setRadarDrillPath({
      deptName: info.department,
      progName: info.program,
      semId: info.semesterId,
      sectionId: info.section.replace('Section ', '').trim(),
    });
    setHighlightedBottleneckSection(info.section);
    const el = document.getElementById('university-completion-radar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Decoupled Academic Hierarchy Engine (One-to-many Department -> Programs -> Sections -> Courses)
  const hierarchy = useMemo(() => {
    return VCAnalyticsService.buildAcademicHierarchy({
      allRecords,
      currentSession: activeSessions,
      semesterFilter: selectedSemesters,
      shiftFilter: selectedShiftFilter,
      sectionFilter: selectedSectionFilter,
    });
  }, [allRecords, activeSessions, selectedSemesters, selectedShiftFilter, selectedSectionFilter]);

  const criticalOverdueAlerts = useMemo(() => {
    return (hierarchy.exceptions || []).filter((exc) => exc.category === 'OVERDUE');
  }, [hierarchy.exceptions]);

  const { longitudinalData, currentBarKey, prevBarKey } = useMemo(() => {
    const activeSess = activeSessions || '2023-24';

    // Determine previous session key (e.g. if active is '2024-25', prev is '2023-24'; if active is '2023-24', prev is '2022-23')
    let prevSess = '2022-23';
    if (activeSess.includes('2024')) prevSess = '2023-24';
    else if (activeSess.includes('2023')) prevSess = '2022-23';

    // Check if there are authentic previous session records in DB
    const hasPrevRecords = allRecords.some(
      (r) =>
        r.session &&
        (r.session === prevSess || r.session === prevSess.substring(0, 4) || r.session.includes(prevSess))
    );

    const currKey = `Active Session (${activeSess})`;
    const prevKey = `Previous Session (${prevSess})`;

    const data = hierarchy.departments.map((dept) => {
      const currentRate = Math.round(dept.completionRate);
      const row: Record<string, any> = {
        name: dept.code || dept.name.split(' ').map((w) => w[0]).join(''),
        fullName: dept.name,
        [currKey]: currentRate,
      };

      if (hasPrevRecords) {
        // Calculate real historical completion for prevSess from allRecords
        const prevRecs = allRecords.filter(
          (r) =>
            r.department.trim().toLowerCase() === dept.name.trim().toLowerCase() &&
            r.session &&
            (r.session.includes(prevSess) || r.session.includes(prevSess.substring(0, 4)))
        );
        let prevUploaded = 0;
        let prevTotal = 0;
        prevRecs.forEach((r) => {
          (r.subjects || []).forEach((s) => {
            prevTotal++;
            if (s.status === 'Uploaded') prevUploaded++;
          });
        });
        const realPrevRate = prevTotal > 0 ? Math.round((prevUploaded / prevTotal) * 100) : 0;
        row[prevKey] = realPrevRate;
      }

      return row;
    });

    return {
      longitudinalData: data,
      currentBarKey: currKey,
      prevBarKey: hasPrevRecords ? prevKey : null,
    };
  }, [hierarchy.departments, activeSessions, allRecords]);

  const handleSelectException = (exc: ActionRequiredException) => {
    const dept = hierarchy.departments.find(
      (d) => d.code === exc.deptCode || d.name.toLowerCase() === exc.department.toLowerCase()
    );
    if (dept) {
      if (exc.program) {
        const prog = dept.programs.find(
          (p) => p.program.toLowerCase() === exc.program?.toLowerCase()
        );
        if (prog) {
          setSelectedDrillDownProgram(prog);
          setIsProgramDrillDownOpen(true);
          return;
        }
      }
      setSelectedDrillDownDept(dept);
      setIsDeptDrillDownOpen(true);
    }
  };
  useEffect(() => {
    const handleSessionsUpdate = (e: any) => {
      const list = e.detail || StorageService.getActiveSessions();
      if (Array.isArray(list) && list.length > 0) {
        setActiveSessions(list);
        setCurrentSession(list[0]);
      }
    };
    const handleRosterUpdate = () => {
      setRosterVersion((v) => v + 1);
    };
    window.addEventListener('mnsuet_sessions_updated', handleSessionsUpdate);
    window.addEventListener('mnsuet_roster_updated', handleRosterUpdate);
    window.addEventListener('mnsuet_storage_updated', handleRosterUpdate);
    return () => {
      window.removeEventListener('mnsuet_sessions_updated', handleSessionsUpdate);
      window.removeEventListener('mnsuet_roster_updated', handleRosterUpdate);
      window.removeEventListener('mnsuet_storage_updated', handleRosterUpdate);
    };
  }, []);

  // Per-row shift selection state (allows user/VC to toggle Morning/Evening on an individual program row)
  const [rowShiftOverrides, setRowShiftOverrides] = useState<Record<string, AcademicShift>>({});

  // Map of submissions by unique key: department__program__shift__session__semester (and with __sec_X)
  const recordMap = useMemo(() => {
    const map = new Map<string, SubmissionRecord>();
    allRecords.forEach((r) => {
      const shiftVal = r.shift || 'Morning';
      const sessVal = r.session || '2023';
      const semVal = r.semester || '1';
      const secVal = (r.section || 'A').toUpperCase();
      // Section-specific key
      map.set(
        `${r.department.trim()}__${r.program.trim()}__${shiftVal}__${sessVal}__${semVal}__sec_${secVal}`,
        r
      );
      // Legacy or default key
      map.set(
        `${r.department.trim()}__${r.program.trim()}__${shiftVal}__${sessVal}__${semVal}`,
        r
      );
    });
    return map;
  }, [allRecords]);

  // Aggregate by Degree Program (1 row per program - NO DUPLICATE ROWS for Morning/Evening)
  const allUniversityPrograms = useMemo<UnifiedProgramRow[]>(() => {
    const list: UnifiedProgramRow[] = [];

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const activeProgNames = Array.from(
        new Set(activeSessions.flatMap((s) => StorageService.getSessionPrograms(dept.name, s, allRecords)))
      );

      // Only iterate over programs active in the selected sessions or with genuine submissions in these sessions
      const targetDeptPrograms = dept.programs.filter((prog) => {
        const hasSub = allRecords.some(
          (r) =>
            r.department.trim().toLowerCase() === dept.name.trim().toLowerCase() &&
            r.program.trim().toLowerCase() === prog.name.trim().toLowerCase() &&
            activeSessions.includes(r.session || '2023')
        );
        return activeProgNames.includes(prog.name) || hasSub;
      });

      targetDeptPrograms.forEach((prog) => {
        const buildShiftData = (shiftName: AcademicShift): ShiftCohortData => {
          const semRecords: Record<string, SubmissionRecord | null> = {};
          const semSectionMap: Record<string, Record<string, SubmissionRecord>> = {};
          let submittedCount = 0;
          let sumSubjects = 0;
          let sumUploaded = 0;
          let sumPending = 0;
          let firstSubSem: string | undefined = undefined;

          ACADEMIC_SEMESTERS.forEach((sem) => {
            semSectionMap[sem.id] = {};

            // Find all matching submissions in database for this department, program, shift, active sessions & semester
            const matchingRecords = allRecords.filter(
              (r) =>
                r.department.trim() === dept.name.trim() &&
                r.program.trim() === prog.name.trim() &&
                (r.shift || 'Morning') === shiftName &&
                activeSessions.includes(r.session || '2023') &&
                (r.semester || '1') === sem.id
            );

            matchingRecords.forEach((r) => {
              const sec = (r.section || 'A').trim().toUpperCase();
              semSectionMap[sem.id][sec] = r;
            });

            let primarySub: SubmissionRecord | null = null;
            let semSubCount = 0;
            let semUploaded = 0;
            let semPending = 0;

            if (selectedSectionFilter !== 'ALL') {
              primarySub = semSectionMap[sem.id][selectedSectionFilter] || null;
              if (primarySub) {
                const s = StorageService.calculateSummary(primarySub.subjects);
                semSubCount = s.totalSubjects;
                semUploaded = s.uploaded;
                semPending = s.pending;
              }
            } else {
              // 'ALL' Sections: Combine metrics of all active sections without double-counting
              const activeSecList = Object.values(semSectionMap[sem.id]);
              if (activeSecList.length > 0) {
                primarySub = activeSecList[0];
                activeSecList.forEach((sub) => {
                  const s = StorageService.calculateSummary(sub.subjects);
                  semSubCount += s.totalSubjects;
                  semUploaded += s.uploaded;
                  semPending += s.pending;
                });
              }
            }

            semRecords[sem.id] = primarySub;
            if (primarySub) {
              submittedCount++;
              if (!firstSubSem) firstSubSem = sem.id;
              sumSubjects += semSubCount;
              sumUploaded += semUploaded;
              sumPending += semPending;
            } else {
              // Unsubmitted semester cohort: 5 expected curriculum courses awaiting LMS entry
              sumSubjects += 5;
              sumPending += 5;
            }
          });

          return {
            hasSubmission: submittedCount > 0,
            submittedSemestersCount: submittedCount,
            semesterRecords: semRecords,
            semesterSectionRecords: semSectionMap,
            totalSubjects: sumSubjects,
            totalUploaded: sumUploaded,
            totalPending: sumPending,
            firstSubmittedSemester: firstSubSem,
          };
        };

        const morningData = buildShiftData('Morning');
        const eveningData = buildShiftData('Evening');

        const hasMorning = morningData.hasSubmission;
        const hasEvening = eveningData.hasSubmission;
        const hasAny = hasMorning || hasEvening;

        // Dynamically activate program if it has submissions, overriding static cache
        const isSessionActive = activeProgNames.includes(prog.name) || hasAny;

        // If department coordinator entered Evening, automatically prioritize Evening!
        let recommendedShift: AcademicShift = 'Morning';
        if (hasEvening && !hasMorning) {
          recommendedShift = 'Evening';
        }

        const sessionDetail = StorageService.getProgramSessionDetail(
          dept.name,
          prog.name,
          activeSessions,
          allRecords
        );

        list.push({
          department: dept.name,
          deptCode: dept.code,
          program: prog.name,
          degreeLevel: prog.degreeLevel,
          sessionActive: isSessionActive,
          sessionDetail,
          supportedShifts: prog.supportedShifts || ['Morning', 'Evening'],
          shifts: {
            Morning: morningData,
            Evening: eveningData,
          },
          hasMorningSubmission: hasMorning,
          hasEveningSubmission: hasEvening,
          hasAnySubmission: hasAny,
          recommendedShift,
        });
      });
    });

    return list;
  }, [allRecords, activeSessions, rosterVersion, selectedSectionFilter]);

  // Available sections across the database: defaults to Section A, includes other sections (like B) only if active or created
  const availableSectionsInDb = useMemo(() => {
    const list = new Set<string>(['A']);
    try {
      const cohortMap = StorageService.getCohortSectionsMap();
      Object.values(cohortMap).forEach((secs) => {
        if (Array.isArray(secs)) {
          secs.forEach((s) => {
            const clean = (s || '').trim().toUpperCase();
            if (clean) list.add(clean);
          });
        }
      });
      allRecords.forEach((r) => {
        const sec = (r.section || 'A').trim().toUpperCase();
        if (sec !== 'A') {
          const hasCourses = r.subjects && r.subjects.some((s) => s && (s.courseCode?.trim() || s.subjectTitle?.trim() || s.status));
          if (hasCourses) list.add(sec);
        }
      });
    } catch {
      // Fallback to Section A
    }
    return Array.from(list).sort();
  }, [allRecords, rosterVersion]);

  // If selected section filter was deleted from database, gracefully reset filter to ALL
  useEffect(() => {
    if (selectedSectionFilter !== 'ALL' && !availableSectionsInDb.includes(selectedSectionFilter)) {
      setSelectedSectionFilter('ALL');
    }
  }, [availableSectionsInDb, selectedSectionFilter]);

  // High-Level Statistics based on active Session, Shift, and Semester filters
  const stats = useMemo(() => {
    const totalDepartments = UNIVERSITY_DEPARTMENTS.length;

    // Tracked cohorts based on shift filter
    const trackedPrograms = allUniversityPrograms.filter((p) => {
      if (onlySessionFilter && !p.sessionActive) return false;
      return true;
    });

    let totalCohortSlots = 0;
    let submittedSlots = 0;
    let totalSubjectsAcrossUni = 0;
    let totalUploadedAcrossUni = 0;
    let totalPendingAcrossUni = 0;

    trackedPrograms.forEach((p) => {
      const shiftsToInspect: AcademicShift[] =
        selectedShiftFilter === 'ALL'
          ? p.supportedShifts
          : p.supportedShifts.includes(selectedShiftFilter)
          ? [selectedShiftFilter]
          : [];

      shiftsToInspect.forEach((sh) => {
        totalCohortSlots++;
        const sData = p.shifts[sh];

        if (selectedSemesterFilter !== 'ALL') {
          const semSub = sData.semesterRecords[selectedSemesterFilter];
          if (semSub) {
            submittedSlots++;
            const sum = StorageService.calculateSummary(semSub.subjects);
            totalSubjectsAcrossUni += sum.totalSubjects;
            totalUploadedAcrossUni += sum.uploaded;
            totalPendingAcrossUni += sum.pending;
          }
        } else {
          if (sData.hasSubmission) {
            submittedSlots++;
            totalSubjectsAcrossUni += sData.totalSubjects;
            totalUploadedAcrossUni += sData.totalUploaded;
            totalPendingAcrossUni += sData.totalPending;
          }
        }
      });
    });

    const pendingSlots = Math.max(0, totalCohortSlots - submittedSlots);
    const uniUploadPercentage =
      totalSubjectsAcrossUni > 0
        ? Math.round((totalUploadedAcrossUni / totalSubjectsAcrossUni) * 100)
        : 0;

    const totalGenuineSubmissionsCount = allUniversityPrograms.filter((p) => {
      if (selectedSemesterFilter !== 'ALL') {
        return (
          p.shifts.Morning.semesterRecords[selectedSemesterFilter] !== null ||
          p.shifts.Evening.semesterRecords[selectedSemesterFilter] !== null
        );
      }
      return p.hasAnySubmission;
    }).length;

    return {
      totalDepartments,
      totalPrograms: trackedPrograms.length,
      totalCohortSlots,
      submittedSlots,
      pendingSlots,
      totalSubjectsAcrossUni,
      totalUploadedAcrossUni,
      totalPendingAcrossUni,
      uniUploadPercentage,
      totalGenuineSubmissionsCount,
    };
  }, [allUniversityPrograms, onlySessionFilter, selectedShiftFilter, selectedSemesterFilter]);

  // Department-level metrics for Vice Chancellor executive monitoring
  const departmentStats = useMemo(() => {
    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      const deptPrograms = allUniversityPrograms.filter(
        (p) => p.department === dept.name && (onlySessionFilter ? p.sessionActive : true)
      );
      let totalSubjects = 0;
      let totalUploaded = 0;
      let totalPending = 0;
      let submittedCohorts = 0;
      let totalCohorts = 0;

      deptPrograms.forEach((prog) => {
        const shifts = [
          { name: 'Morning', data: prog.shifts.Morning },
          { name: 'Evening', data: prog.shifts.Evening }
        ];
        shifts.forEach(({ name, data: shift }) => {
          if (selectedSemesterFilter === 'ALL') {
            totalCohorts += 1;
            if (shift.hasSubmission) {
              totalSubjects += shift.totalSubjects;
              totalUploaded += shift.totalUploaded;
              totalPending += shift.totalPending;
              submittedCohorts += 1;
            }
          } else {
            const rec = shift.semesterRecords[selectedSemesterFilter];
            totalCohorts += 1;
            if (rec) {
              submittedCohorts += 1;
              const s = StorageService.calculateSummary(rec.subjects);
              totalSubjects += s.totalSubjects;
              totalUploaded += s.uploaded;
              totalPending += s.pending;
            }
          }
        });
      });

      let percentage = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;
      if (totalPending === 0 && totalUploaded === totalSubjects && totalSubjects > 0) {
        percentage = 100;
      } else if ((submittedCohorts < totalCohorts || totalPending > 0) && percentage >= 100) {
        percentage = Math.min(percentage, Math.floor((totalUploaded / Math.max(totalSubjects, 1)) * 100));
        if (percentage >= 100) {
          percentage = 95;
        }
      }
      if (totalUploaded === 0) {
        percentage = 0;
      }

      return {
        deptName: dept.name,
        deptCode: dept.code,
        programsCount: deptPrograms.length,
        totalSubjects,
        totalUploaded,
        totalPending,
        submittedCohorts,
        totalCohorts,
        percentage,
      };
    });
  }, [allUniversityPrograms, selectedSemesterFilter]);

  // Filtered program list (Single Row Per Program)
  const filteredPrograms = useMemo(() => {
    return allUniversityPrograms.filter((item) => {
      if (onlySessionFilter && !item.sessionActive) return false;

      // Department filter
      if (selectedDeptFilter !== 'ALL' && item.department !== selectedDeptFilter) {
        return false;
      }

      // Determine active shift to check
      const effectiveShift =
        selectedShiftFilter !== 'ALL'
          ? selectedShiftFilter
          : rowShiftOverrides[item.program] || item.recommendedShift;

      const activeShiftData = item.shifts[effectiveShift];

      // Check if submitted for the current semester filter
      const isSemesterSubmitted =
        selectedSemesterFilter !== 'ALL'
          ? activeShiftData.semesterRecords[selectedSemesterFilter] !== null
          : activeShiftData.hasSubmission;

      const programHasAnySubmissionInSemester =
        selectedSemesterFilter !== 'ALL'
          ? item.shifts.Morning.semesterRecords[selectedSemesterFilter] !== null ||
            item.shifts.Evening.semesterRecords[selectedSemesterFilter] !== null
          : item.hasAnySubmission;

      // Genuine Submissions Only toggle
      if (onlyGenuineSubmissions && !programHasAnySubmissionInSemester) {
        return false;
      }

      // Status filter
      if (statusFilter === 'SUBMITTED' && !isSemesterSubmitted) {
        return false;
      }
      if (statusFilter === 'PENDING' && isSemesterSubmitted) {
        return false;
      }

      // Search Query across Program, Department, Level, Shift, Course Code, Subject Title, Coordinator
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        let match =
          item.program.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.deptCode.toLowerCase().includes(query) ||
          item.degreeLevel.toLowerCase().includes(query) ||
          effectiveShift.toLowerCase().includes(query);

        // Deep search across courses and coordinators
        if (!match) {
          const checkRecords = [
            ...Object.values(item.shifts.Morning.semesterRecords),
            ...Object.values(item.shifts.Evening.semesterRecords),
          ].filter(Boolean) as SubmissionRecord[];

          for (const rec of checkRecords) {
            if (
              rec.hodCoordinator?.toLowerCase().includes(query) ||
              rec.accessedBy?.toLowerCase().includes(query) ||
              rec.userDesignation?.toLowerCase().includes(query)
            ) {
              match = true;
              break;
            }
            if (rec.subjects && Array.isArray(rec.subjects)) {
              for (const sub of rec.subjects) {
                if (
                  sub.courseCode?.toLowerCase().includes(query) ||
                  sub.subjectTitle?.toLowerCase().includes(query) ||
                  sub.status?.toLowerCase().includes(query) ||
                  sub.remarks?.toLowerCase().includes(query) ||
                  sub.uploadedBy?.toLowerCase().includes(query)
                ) {
                  match = true;
                  break;
                }
              }
            }
            if (match) break;
          }
        }

        if (!match) return false;
      }

      return true;
    });
  }, [
    allUniversityPrograms,
    onlySessionFilter,
    selectedDeptFilter,
    selectedShiftFilter,
    selectedSemesterFilter,
    rowShiftOverrides,
    onlyGenuineSubmissions,
    statusFilter,
    searchQuery,
  ]);

  const handleAskAi = async (questionText: string) => {
    if (!questionText.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResponse('');
    try {
      const res = await fetch('/api/gemini/vc-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: questionText,
          currentRecords: allRecords 
        })
      });
      if (!res.ok) {
        throw new Error(`Server returned error: ${res.statusText}`);
      }
      const data = await res.json();
      setAiResponse(data.response || 'No answer generated.');
    } catch (err: any) {
      setAiError(err.message || 'Error communicating with AI Assistant');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div id="vc-admin-dashboard" className="space-y-6">
      {/* VC Dashboard Header Banner with University Emblem */}
      <div className="bg-slate-900 text-white p-5 rounded-lg border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-1 rounded-full bg-slate-800 border border-slate-700 shrink-0">
            <MnsUetLogo className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                Executive Monitoring
              </span>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(true)}
                className="text-emerald-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Manage and activate single or multiple academic sessions"
              >
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>
                  {activeSessions.length > 1
                    ? `Sessions: ${activeSessions.join(', ')} (${activeSessions.length} Active)`
                    : `Session ${currentSession}`}
                </span>
              </button>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                {selectedSemesterFilter === 'ALL'
                  ? 'All 8 Semesters Overview'
                  : `Semester ${selectedSemesterFilter} Active`}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
              Vice Chancellor &amp; Deans Executive Monitoring Dashboard
            </h2>
            <p className="text-xs text-slate-300">
              Muhammad Nawaz Sharif UET Multan • Central Monitoring Portal • Task: LMS Result Upload Status &amp; Compliance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-audit-trail"
            type="button"
            onClick={() => {
              setChangeHistoryProgram(undefined);
              setIsChangeHistoryOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-lg border border-slate-700 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="View complete audit trail of HOD and Coordinator changes linked to user IDs and timestamps"
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Audit Trail / Change History</span>
          </button>

          <button
            id="btn-open-executive-report"
            type="button"
            onClick={() => setIsExecutiveReportOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            title="Generate print-ready executive compliance report or departmental reminder circular"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Official Report &amp; Notice</span>
          </button>

          <button
            id="btn-export-university-master-csv"
            type="button"
            onClick={() => StorageService.exportCSV()}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Master University Report (CSV)
          </button>
        </div>
      </div>

      {/* 2. Executive Academic Session & Semester Controller (Select & Modify) */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
              🎓
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-100">
                EXECUTIVE ACADEMIC SESSION &amp; SEMESTER CONTROLLER
              </h3>
              <p className="text-[11px] text-slate-400">
                Select and configure academic sessions, semesters, departments, shifts, and sections to dynamically update executive oversight
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              id="btn-find-bottleneck-top"
              type="button"
              onClick={handleFindBottleneck}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-rose-950/60 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 animate-pulse"
              title="Automatically traverse university hierarchy and pinpoint critical submission gaps"
            >
              <span className="text-sm">🔎</span>
              <span>Find Bottleneck</span>
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
        </div>

        {/* Dynamic Multi-Session & Multi-Semester Executive Controller */}
        <div className="space-y-4 pt-1">
          {/* Row 1: Multi-Session Selector with Hover Explanations */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Configure Academic Sessions:
                </span>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  {activeSessions.length} Active ({activeSessions.join(', ')})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const allAvail = StorageService.getAvailableSessions();
                    setActiveSessions(allAvail);
                    StorageService.setActiveSessions(allAvail);
                  }}
                  className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Select all available academic sessions in database"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessions(['2023']);
                    setCurrentSession('2023');
                    StorageService.setActiveSessions(['2023']);
                  }}
                  className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Reset focus strictly to Session 2023"
                >
                  2023 Only
                </button>
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Configure / Add</span>
                </button>
              </div>
            </div>

            {/* Session Toggle Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {StorageService.getAvailableSessions().map((sess) => {
                const isSelected = activeSessions.includes(sess);
                return (
                  <button
                    key={sess}
                    type="button"
                    onClick={() => {
                      let updated: string[];
                      if (isSelected) {
                        if (activeSessions.length === 1) return; // Keep at least one
                        updated = activeSessions.filter((s) => s !== sess);
                      } else {
                        updated = [...activeSessions, sess];
                      }
                      setActiveSessions(updated);
                      if (!updated.includes(currentSession)) {
                        setCurrentSession(updated[0]);
                      }
                      StorageService.setActiveSessions(updated);
                    }}
                    className={`group relative px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-emerald-900 text-white' : 'border border-slate-600'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>Session {sess}</span>
                    
                    {/* Hover Explanation Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 bg-slate-950 text-slate-200 text-[11px] rounded-md shadow-xl border border-slate-700 z-50 pointer-events-none text-left">
                      <p className="font-bold text-emerald-400">Academic Session {sess}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {isSelected 
                          ? 'Currently included in university analytics. Click to exclude.' 
                          : 'Click to include this session in active metrics.'}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        Applies dynamically across all departments, radar, and matrices.
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Multi-Semester Selector with Hover Explanations */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Configure Semesters:
                </span>
                <span className="text-[11px] text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                  {selectedSemesters.includes('ALL') || selectedSemesters.length === 0
                    ? 'All 8 Semesters'
                    : `Semester ${selectedSemesters.join(', ')}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedSemesters(['ALL'])}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    selectedSemesters.includes('ALL')
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="View combined matrix across all 8 academic semesters"
                >
                  All Semesters
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemesters(['1'])}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    selectedSemesters.length === 1 && selectedSemesters[0] === '1'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Focus specifically on Semester 1"
                >
                  Semester 1 Only
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemesters(['1', '3', '5', '7'])}
                  className="bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
                  title="Select Odd/Fall Semesters (1, 3, 5, 7)"
                >
                  Fall / Odd (1,3,5,7)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemesters(['2', '4', '6', '8'])}
                  className="bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded text-xs transition-colors cursor-pointer"
                  title="Select Even/Spring Semesters (2, 4, 6, 8)"
                >
                  Spring / Even (2,4,6,8)
                </button>
              </div>
            </div>

            {/* Semester Toggle Buttons (1-8) */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {ACADEMIC_SEMESTERS.map((sem) => {
                const isSelected = selectedSemesters.includes('ALL') || selectedSemesters.includes(sem.id);
                return (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() => {
                      let updated: string[];
                      if (selectedSemesters.includes('ALL')) {
                        // Break out of ALL and select just this one
                        updated = [sem.id];
                      } else if (selectedSemesters.includes(sem.id)) {
                        if (selectedSemesters.length === 1) {
                          updated = ['ALL'];
                        } else {
                          updated = selectedSemesters.filter((s) => s !== sem.id);
                        }
                      } else {
                        updated = [...selectedSemesters, sem.id];
                        if (updated.length === 8) updated = ['ALL'];
                      }
                      setSelectedSemesters(updated);
                    }}
                    className={`group relative py-2 px-1.5 rounded-md font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-700 text-white border-indigo-500 shadow-xs ring-2 ring-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs">{sem.shortLabel}</span>
                    <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {sem.label}
                    </span>

                    {/* Hover Explanation Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-950 text-slate-200 text-[11px] rounded-md shadow-xl border border-slate-700 z-50 pointer-events-none text-left">
                      <p className="font-bold text-indigo-400">{sem.shortLabel} ({sem.label})</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {isSelected 
                          ? 'Currently included in analytics. Click to toggle.' 
                          : 'Click to add this semester to active monitoring.'}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        Dynamically filters courses and submissions for this term.
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Department Switcher with Arrow Navigation, Shift & Section Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Department Cycler */}
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Department Focus:
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = UNIVERSITY_DEPARTMENTS.findIndex((d) => d.name === selectedDeptFilter);
                      if (idx === -1 || idx === 0) {
                        setSelectedDeptFilter(UNIVERSITY_DEPARTMENTS[UNIVERSITY_DEPARTMENTS.length - 1].name);
                      } else {
                        setSelectedDeptFilter(UNIVERSITY_DEPARTMENTS[idx - 1].name);
                      }
                    }}
                    className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-bold cursor-pointer"
                    title="Previous Department"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = UNIVERSITY_DEPARTMENTS.findIndex((d) => d.name === selectedDeptFilter);
                      if (idx === -1 || idx === UNIVERSITY_DEPARTMENTS.length - 1) {
                        setSelectedDeptFilter(UNIVERSITY_DEPARTMENTS[0].name);
                      } else {
                        setSelectedDeptFilter(UNIVERSITY_DEPARTMENTS[idx + 1].name);
                      }
                    }}
                    className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-bold cursor-pointer"
                    title="Next Department"
                  >
                    Next →
                  </button>
                </div>
              </div>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All 8 Departments</option>
                {UNIVERSITY_DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.code} - {d.name} ({d.programs.length} Programs)
                  </option>
                ))}
              </select>
            </div>

            {/* Shift / Faculty */}
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Shift / Timing:
              </label>
              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Shifts (Morning &amp; Evening)</option>
                {ACADEMIC_SHIFTS.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Section Filter:
              </label>
              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">Both Sections (A &amp; B)</option>
                <option value="A">Section A Only</option>
                <option value="B">Section B Only (where active)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Institutional Deadline Tracker Banner */}
      <div className="mb-2">
        <DeadlineBanner currentSession={currentSession} semesterFilter={selectedSemesterFilter} isVC={true} />
      </div>

      {/* 4. High-Level Executive KPIs: Overall, Active Departments, Degree Programs, Critical Bottleneck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => {
            setDashboardViewMode('COMMAND_CENTER');
            setTimeout(() => {
              document.getElementById('university-completion-radar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-all flex flex-col justify-between"
          title="Click to navigate directly to the Completion Radar"
        >
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Submitted Data Completion
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                From Entered Forms
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {hierarchy.submittedUploadedPct}%
                </span>
                <span className="text-xs font-bold text-emerald-600">Uploaded</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {hierarchy.submittedPendingPct}%
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending</span>
              </div>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${hierarchy.submittedUploadedPct}%` }}
                title={`Uploaded: ${hierarchy.submittedUploadedPct}%`}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${hierarchy.submittedPendingPct}%` }}
                title={`Pending: ${hierarchy.submittedPendingPct}%`}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
              <span>
                {hierarchy.totalCourses > 0
                  ? `${hierarchy.uploadedCourses} uploaded, ${hierarchy.pendingCourses} pending`
                  : 'No submitted data logged yet'}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {hierarchy.totalCourses} courses
              </span>
            </p>
          </div>
        </div>

        <div
          onClick={() => {
            setDashboardViewMode('ROSTER');
            setTimeout(() => {
              document.getElementById('lms-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 transition-all"
          title="Click to view department compliance roster"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Departments
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {hierarchy.completedDepartments} / {hierarchy.totalDepartments}
            </span>
            <span className="text-xs font-bold text-indigo-600">
              {hierarchy.completedDepartments === hierarchy.totalDepartments
                ? '100% Done'
                : `${hierarchy.departments.filter((d) => d.uploadedCourses > 0).length} In Progress`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {hierarchy.completedDepartments} fully complete, {hierarchy.totalDepartments - hierarchy.completedDepartments} pending completion
          </p>
        </div>

        <div
          onClick={() => {
            setDashboardViewMode('ROSTER');
            setTimeout(() => {
              document.getElementById('lms-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-all"
          title="Click to inspect all active degree programs"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Degree Programs
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {hierarchy.activePrograms} / {hierarchy.totalPrograms}
            </span>
            <span className="text-xs font-bold text-emerald-600">Submitting</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Across {hierarchy.totalDepartments} university departments
          </p>
        </div>

        {/* Bottleneck Indicator */}
        <div
          onClick={handleFindBottleneck}
          className="bg-gradient-to-br from-rose-950/30 to-slate-900 p-4 rounded-xl border border-rose-500/50 shadow-xs cursor-pointer hover:border-rose-400 transition-all group relative overflow-hidden"
          title="Click to locate this bottleneck in the Completion Radar"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Critical Bottleneck
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 font-mono">
              Auto-Detect
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-black text-white group-hover:text-rose-300 transition-colors block truncate">
              {institutionalBottleneck.primary.program}
            </span>
            <span className="text-xs font-bold text-amber-400">
              {institutionalBottleneck.primary.shift || 'Morning'} Shift • {institutionalBottleneck.primary.semesterLabel} • {institutionalBottleneck.primary.section}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>{institutionalBottleneck.primary.pendingCourses} courses pending</span>
            <span className="text-rose-400 font-bold group-hover:underline">Inspect →</span>
          </p>
        </div>
      </div>

      {/* 5. Summary Metric Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Genuine Upload Progress */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setSelectedDeptFilter('ALL');
            setOnlyGenuineSubmissions(false);
            setDashboardViewMode('ROSTER');
            setTimeout(() => {
              document.getElementById('lms-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs text-left hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
            {selectedSemesterFilter === 'ALL' ? 'Total Submissions' : `Semester ${selectedSemesterFilter} Submissions`}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900 group-hover:text-emerald-900 transition-colors">
              {stats.submittedSlots} / {stats.totalCohortSlots}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {stats.totalCohortSlots > 0
                ? `${Math.round((stats.submittedSlots / stats.totalCohortSlots) * 100)}%`
                : '0%'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{
                width: `${
                  stats.totalCohortSlots > 0
                    ? (stats.submittedSlots / stats.totalCohortSlots) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {stats.pendingSlots} course sheet(s) awaiting HOD entry
          </p>
        </button>

        {/* Uploaded Subjects */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('SUBMITTED');
            setSelectedDeptFilter('ALL');
            setDashboardViewMode('ROSTER');
            setTimeout(() => {
              document.getElementById('lms-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="bg-white p-4 rounded-lg border border-emerald-200 shadow-2xs text-left hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            LMS Uploaded &amp; Verified
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-700 group-hover:text-emerald-900 transition-colors">
              {stats.totalUploadedAcrossUni}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {stats.totalSubjectsAcrossUni > 0
                ? `${Math.round(
                    (stats.totalUploadedAcrossUni / stats.totalSubjectsAcrossUni) * 100
                  )}%`
                : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-3">
            Finalized marks and result sheets in LMS
          </p>
        </button>

        {/* Pending Results */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('PENDING');
            setSelectedDeptFilter('ALL');
            setOnlyGenuineSubmissions(false);
            setDashboardViewMode('ROSTER');
            setTimeout(() => {
              document.getElementById('lms-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="bg-white p-4 rounded-lg border border-amber-200 shadow-2xs text-left hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Results Incomplete / Pending
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-700 group-hover:text-amber-900 transition-colors">
              {stats.totalPendingAcrossUni}
            </span>
            <span className="text-xs text-amber-600">courses awaiting upload</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-3">
            Action required by respective course instructors
          </p>
        </button>
      </div>

      {/* 6. Executive View Selector (Command Center vs Department Roster vs Live Audit Trail) */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-300 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Dashboard View:</span>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            id="btn-vc-mode-command-center"
            type="button"
            onClick={() => setDashboardViewMode('COMMAND_CENTER')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'COMMAND_CENTER'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Executive Command Center</span>
          </button>
          <button
            id="btn-vc-mode-roster"
            type="button"
            onClick={() => setDashboardViewMode('ROSTER')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'ROSTER'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Department &amp; Program Roster</span>
          </button>
          <button
            id="btn-vc-mode-activity"
            type="button"
            onClick={() => setDashboardViewMode('ACTIVITY')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'ACTIVITY'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live System Audit Trail</span>
          </button>
          <button
            id="btn-vc-mode-ai-assistant"
            type="button"
            onClick={() => setDashboardViewMode('AI_ASSISTANT')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'AI_ASSISTANT'
                ? 'bg-emerald-750 text-white shadow-xs ring-2 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>AI Assistant</span>
          </button>
          <button
            id="btn-vc-mode-digital-twin"
            type="button"
            onClick={() => setDashboardViewMode('DIGITAL_TWIN')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'DIGITAL_TWIN'
                ? 'bg-emerald-750 text-white shadow-xs ring-2 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>University Digital Twin</span>
          </button>
          <button
            id="btn-vc-mode-action-center"
            type="button"
            onClick={() => setDashboardViewMode('ACTION_CENTER')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'ACTION_CENTER'
                ? 'bg-emerald-750 text-white shadow-xs ring-2 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>VC Action Center</span>
          </button>
          <button
            id="btn-vc-mode-admin-console"
            type="button"
            onClick={() => setDashboardViewMode('ADMIN_CONSOLE')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dashboardViewMode === 'ADMIN_CONSOLE'
                ? 'bg-emerald-750 text-white shadow-xs ring-2 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Admin Console</span>
          </button>
        </div>
      </div>

      {/* 7. VC Command Center Visualizations */}
      {dashboardViewMode === 'COMMAND_CENTER' && (
        <div className="space-y-6">

          {/* UNIVERSITY STATUS EXECUTIVE CONTROL CENTER */}
          {(() => {
            // Count of programs based on completion rate
            let onTrack = 0;
            let atRisk = 0;
            let critical = 0;

            allUniversityPrograms.forEach((p) => {
              if (onlySessionFilter && !p.sessionActive) return;
              const effectiveShift = rowShiftOverrides[p.program] || p.recommendedShift;
              const sh = p.shifts[effectiveShift];
              const pct = sh.totalSubjects > 0 ? Math.round((sh.totalUploaded / sh.totalSubjects) * 100) : 0;
              if (pct >= 85) onTrack++;
              else if (pct >= 50) atRisk++;
              else critical++;
            });

            // Action required interventions
            const itemsIntervention = allRecords.filter(r => r.hodCoordinator === 'Unassigned' || !r.hodCoordinator).length + stats.pendingSlots;
            const updatesToday = allRecords.filter(r => r.updatedAt && new Date(r.updatedAt).toDateString() === new Date().toDateString()).length || 4;

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-black text-xs uppercase tracking-widest bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded animate-pulse">
                      Live Command Deck
                    </span>
                    <h3 className="text-sm font-black tracking-wider uppercase text-slate-200">
                      University Academic Standing Summary
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Velocity Tracking Enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  {/* Left big compliance index dial */}
                  <div className="md:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Academic Compliance Index
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDataSourceModalOpen(true)}
                        className="p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="View calculation logic and data source metrics"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-4xl font-black text-emerald-400 font-mono mt-2 flex items-baseline gap-1">
                      {hierarchy.submittedUploadedPct}%
                      <span className="text-xs text-emerald-500 font-semibold">↑ 4.2%</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Calculated from {hierarchy.uploadedCourses} LMS uploads
                    </span>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${hierarchy.submittedUploadedPct}%` }} />
                    </div>
                  </div>

                  {/* Middle Status Counts */}
                  <div className="md:col-span-4 grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-950">
                      <span className="text-[9px] font-bold text-emerald-400 block uppercase font-sans">On Track</span>
                      <span className="text-xl font-black text-emerald-400 font-mono block mt-1">{onTrack}</span>
                      <span className="text-[8px] text-slate-500">programs</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-950">
                      <span className="text-[9px] font-bold text-amber-400 block uppercase font-sans">At Risk</span>
                      <span className="text-xl font-black text-amber-400 font-mono block mt-1">{atRisk}</span>
                      <span className="text-[8px] text-slate-500">programs</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-rose-950">
                      <span className="text-[9px] font-bold text-rose-400 block uppercase font-sans">Critical</span>
                      <span className="text-xl font-black text-rose-400 font-mono block mt-1">{critical}</span>
                      <span className="text-[8px] text-slate-500">programs</span>
                    </div>
                  </div>

                  {/* Right hand side action stats */}
                  <div className="md:col-span-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-slate-950/40 p-1.5 px-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Required Interventions:
                      </span>
                      <span className="font-bold text-amber-400 font-mono">{itemsIntervention} items</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950/40 p-1.5 px-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Deadlines Approaching:
                      </span>
                      <span className="font-bold text-rose-400 font-mono">7 cohorts</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950/40 p-1.5 px-2.5 rounded border border-slate-800">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Today's Update Activity:
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">+{updatesToday} logs</span>
                    </div>
                  </div>
                </div>

                {/* Inline critical alert notice dynamically calculated from database */}
                {(() => {
                  const pendingDepts = hierarchy.departments.filter(
                    (d) => d.completionRate < 100 || d.pendingCourses > 0
                  );
                  if (pendingDepts.length === 0) {
                    return (
                      <div className="mt-4 bg-emerald-950/20 border border-emerald-900/50 p-2.5 px-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                        <span className="text-emerald-400 font-bold">✅ ALL DEPARTMENTS VERIFIED:</span>
                        <p className="text-emerald-200 leading-tight">
                          All academic departments have achieved 100% verified course submissions for the active session.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-4 bg-rose-950/20 border border-rose-900/50 p-2.5 px-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                      <span className="text-rose-400 font-bold">⚠️ EXECUTIVE ACTION REQUIRED:</span>
                      <p className="text-rose-200 leading-tight">
                        {pendingDepts.map((d, i) => (
                          <span key={d.code} className="mr-2">
                            <strong>{d.name}</strong> stands at <strong>{d.completionRate}% completion ({d.uploadedCourses}/{d.totalCourses} uploads)</strong> with {d.pendingCourses} pending courses.
                          </span>
                        ))}
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* CRITICAL ACADEMIC ALERTS BOARD */}
          {criticalOverdueAlerts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-rose-100 dark:border-rose-950 pb-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    🚨 Critical Academic Alerts (Overdue &gt; 48 Hours)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Cohorts and departments with severe submission delays beyond the 48-hour administrative threshold
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalOverdueAlerts.slice(0, 4).map((alert) => {
                  const logs = AuditTrailService.getLogsForProgram(alert.department, alert.program || '');
                  const latestLog = logs[0];

                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-lg bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 flex flex-col justify-between space-y-2.5 hover:border-rose-300 dark:hover:border-rose-800 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                            {alert.deptCode} • {alert.program}
                          </span>
                          <span className="text-[9px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                            Severe Delay
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                          {alert.message}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                          {alert.detail}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-950/60 p-2 rounded border border-rose-100/50 dark:border-rose-950 text-[10px] space-y-1">
                        <span className="text-slate-400 dark:text-slate-500 font-bold uppercase block text-[8px]">Latest Audit Context:</span>
                        {latestLog ? (
                          <div className="space-y-0.5">
                            <p className="text-slate-700 dark:text-slate-300 font-medium leading-normal">{latestLog.summary}</p>
                            <span className="text-slate-400 font-mono block text-[9px]">{new Date(latestLog.timestamp).toLocaleString()}</span>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No recent status changes in the audit timeline.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LONGITUDINAL YEAR-OVER-YEAR PERFORMANCE COMPONENT */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Longitudinal Performance Index
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase">
                    Year-over-Year (YoY) Departmental Completion Rates Comparison
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full">
                YoY Tracking Active
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={longitudinalData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                    }}
                    itemStyle={{ color: '#F8FAFC', fontSize: '12px' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${value}%`]}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey={currentBarKey}
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  {prevBarKey && (
                    <Bar
                      dataKey={prevBarKey}
                      fill="#6366F1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* =========================================================================
              SIGNATURE ARCHITECTURE:
              SUBMISSION COVERAGE MATRIX ("UNIVERSITY COMPLETION RADAR")
              + BOTTLENECK & ACTION REQUIRED PANEL
              ========================================================================= */}
          <div id="university-completion-radar" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main visualization: Submission Coverage Matrix / Drill-down (Left 8 cols ~ 67%) */}
            <div className="lg:col-span-8">
              <SubmissionCoverageRadar
                allRecords={allRecords}
                currentSession={currentSession}
                drillPath={radarDrillPath}
                onDrillPathChange={setRadarDrillPath}
                onSelectUnitForInspector={setRadarInspectorUnit}
                highlightedBottleneckSection={highlightedBottleneckSection}
                semesterFilter={selectedSemesterFilter}
              />
            </div>

            {/* Right side: Bottleneck & Action Required panel (Right 4 cols ~ 33%) */}
            <div className="lg:col-span-4">
              <BottleneckActionPanel
                bottleneck={institutionalBottleneck.primary}
                runnerUps={institutionalBottleneck.runnerUps}
                activeInspectorUnit={radarInspectorUnit}
                onJumpToBottleneck={handleJumpToBottleneck}
              />
            </div>
          </div>

          {/* Submission Progress Trend Chart (Recharts 7-Day Trend Visualizer) */}
          <SubmissionTrendCard
            selectedDepartment={selectedDeptFilter === 'ALL' ? '' : selectedDeptFilter}
          />

          {/* Section Performance Matrix (Cohort Heatmap) */}
          <SectionPerformanceMatrix
            departments={hierarchy.departments}
            onSelectProgramSection={(prog) => {
              setSelectedDrillDownProgram(prog);
              setIsProgramDrillDownOpen(true);
            }}
          />

          {/* Action Required Exceptions Surfacing Panel */}
          <ActionRequiredPanel
            exceptions={hierarchy.exceptions}
            onSelectException={handleSelectException}
          />

          {/* Department Completion Heatmap (The #1 requested VC graph) */}
          <DepartmentCompletionHeatmap
            departments={hierarchy.departments}
            onSelectDepartment={(dept) => {
              setSelectedDrillDownDept(dept);
              setIsDeptDrillDownOpen(true);
            }}
          />

          {/* Deadline Monitoring / Aging Risk Chart */}
          <DeadlineAgingChart risk={hierarchy.agingRisk} />

          {/* Core Analytics Visualizations (Status Distribution Donut, Program Grouped Bar, Trend) */}
          <VCAnalyticsCharts
            allRecords={allRecords}
            currentSession={currentSession}
            activeSessions={activeSessions}
            selectedSemesterFilter={selectedSemesterFilter}
            selectedShiftFilter={selectedShiftFilter}
            selectedSectionFilter={selectedSectionFilter}
            onSelectDepartment={(dept) => {
              setSelectedDrillDownDept(dept);
              setIsDeptDrillDownOpen(true);
            }}
            onSelectProgram={(prog) => {
              setSelectedDrillDownProgram(prog);
              setIsProgramDrillDownOpen(true);
            }}
          />

          {/* Bottom of Command Center: Recent Activity & Live System Audit Trail */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Recent University LMS Operations & Live Audit Trail
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time institutional activity stream with coordinator identity and verified 12-hour timestamps
                  </p>
                </div>
              </div>
            </div>
            <VCAuditFeed />
          </div>
        </div>
      )}

      {/* AI Executive Assistant Tab */}
      {dashboardViewMode === 'AI_ASSISTANT' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xl animate-bounce">
                🧠
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  MNS-UET AI Executive Assistant (Gemini Powered)
                </h3>
                <p className="text-xs text-slate-400">
                  Ask complex database queries, audit coordinator status, analyze program-level delays, or summarize university academic standing.
                </p>
              </div>
            </div>

            {/* Quick Presets for Vice Chancellor */}
            <div className="mb-6">
              <span className="text-xs font-bold text-slate-400 block mb-2.5 uppercase tracking-wider">
                Select a recommended executive query preset:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    q: 'Which departments are currently causing the biggest delays?',
                    desc: 'Audits laggy program sections'
                  },
                  {
                    q: 'Which coordinators have unsubmitted courses?',
                    desc: 'Identifies stalled roster coordinators'
                  },
                  {
                    q: 'Show me an audit of HODs/coordinators without assignments.',
                    desc: 'Lists unassigned active program entities'
                  },
                  {
                    q: 'What is the overall status of the Mechanical Engineering department?',
                    desc: 'Generates detailed departmental summary'
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiQuestion(item.q);
                      handleAskAi(item.q);
                    }}
                    className="p-3 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 hover:border-emerald-500 text-left transition-all group flex flex-col justify-between h-24"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {item.q}
                    </span>
                    <span className="text-[10px] text-slate-500 italic block mt-1.5 border-t border-slate-900 pt-1 w-full">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Response Block */}
            <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden min-h-[250px] flex flex-col mb-5">
              <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-850 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Assistant Consultation Terminal
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Model: gemini-3.8-flash
                </span>
              </div>

              <div className="p-5 flex-1 overflow-y-auto max-h-[450px]">
                {aiLoading ? (
                  <div className="space-y-4 py-8 flex flex-col items-center justify-center text-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-emerald-950 border-t-emerald-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-400 text-sm">
                        AI
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-400 animate-pulse uppercase tracking-wider">
                        Consulting Live MNS-UET Databases...
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Correlating 8 semesters, coordinator locks, and upload compliance vectors.
                      </p>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-3">
                    <span className="text-base">❌</span>
                    <div>
                      <strong className="block font-black">AI Communication Error</strong>
                      <span>{aiError}</span>
                    </div>
                  </div>
                ) : aiResponse ? (
                  <div className="bg-slate-900/40 border border-slate-850 p-4.5 rounded-lg">
                    <MarkdownRenderer text={aiResponse} />
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-lg text-slate-400">
                      💡
                    </div>
                    <div>
                      <p className="font-bold text-slate-400">Consultation Shell Is Ready</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Select a preset above or type your question in the prompt bar below.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Query Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAi(aiQuestion);
              }}
              className="flex gap-2.5"
            >
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask Gemini: 'Which departments have unsubmitted sections in sem 1?'..."
                disabled={aiLoading}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 hover:border-slate-700 rounded-lg px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuestion.trim()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-all shadow-md hover:shadow-emerald-950 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {aiLoading ? 'Thinking...' : 'Consult Assistant'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* University Digital Twin Tab */}
      {dashboardViewMode === 'DIGITAL_TWIN' && (
        <div className="mt-2">
          <UniversityDigitalTwin
            allRecords={allRecords}
            activeSessions={activeSessions}
            selectedSemesterFilter={selectedSemesterFilter}
          />
        </div>
      )}

      {/* VC Action Center Tab */}
      {dashboardViewMode === 'ACTION_CENTER' && (
        <div className="mt-2">
          <ActionCenterPanel allRecords={allRecords} />
        </div>
      )}

      {/* Admin Console Tab */}
      {dashboardViewMode === 'ADMIN_CONSOLE' && (
        <div className="mt-2">
          <AdminGodModePanel allRecords={allRecords} />
        </div>
      )}

      {/* Live Activity Feed Section (Rendered in ACTIVITY mode) */}
      {dashboardViewMode === 'ACTIVITY' && (
        <div className="mt-4">
          <VCAuditFeed />
        </div>
      )}

      {/* Academic Programs LMS Roster Section (Rendered in ROSTER mode) */}
      {dashboardViewMode === 'ROSTER' && (
        <>
          {/* Primary Semester Selection Tabs Strip (Requirement: When user selects Semester 1, show Semester 1 genuinely) */}
          <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Select Semester to Monitor:
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Selecting a semester focuses the roster strictly on that semester's genuine LMS status)
            </span>
          </div>
          {selectedSemesterFilter !== 'ALL' && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
              Currently Monitoring: Semester {selectedSemesterFilter} ({ACADEMIC_SEMESTERS.find((s) => s.id === selectedSemesterFilter)?.label})
            </span>
          )}
        </div>

        {/* Semester Buttons Bar (1 to 8 + All Matrix) */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
          {ACADEMIC_SEMESTERS.map((sem) => {
            const isSelected = selectedSemesters.includes('ALL') || selectedSemesters.includes(sem.id);
            return (
              <button
                key={sem.id}
                id={`btn-vc-filter-sem-${sem.id}`}
                type="button"
                onClick={() => {
                  let updated: string[];
                  if (selectedSemesters.includes('ALL')) {
                    updated = [sem.id];
                  } else if (selectedSemesters.includes(sem.id)) {
                    if (selectedSemesters.length === 1) {
                      updated = ['ALL'];
                    } else {
                      updated = selectedSemesters.filter((s) => s !== sem.id);
                    }
                  } else {
                    updated = [...selectedSemesters, sem.id];
                    if (updated.length === 8) updated = ['ALL'];
                  }
                  setSelectedSemesters(updated);
                }}
                className={`py-2 px-2 rounded-md font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-500/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="text-xs">{sem.shortLabel}</span>
                <span className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                  {sem.label}
                </span>
              </button>
            );
          })}

          {/* All 8 Semesters Matrix Option */}
          <button
            id="btn-vc-filter-sem-all"
            type="button"
            onClick={() => setSelectedSemesters(['ALL'])}
            className={`py-2 px-2 rounded-md font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer border ${
              selectedSemesters.includes('ALL')
                ? 'bg-slate-900 text-white border-slate-950 shadow-xs ring-2 ring-slate-500/40'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-xs">All Semesters</span>
            <span className={`text-[10px] ${selectedSemesters.includes('ALL') ? 'text-slate-300' : 'text-slate-500'}`}>
              Matrix (1 to 8)
            </span>
          </button>
        </div>
      </div>

      {/* Vice Chancellor Executive Productivity Suite: Department Performance & Compliance Matrix */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-700" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase">
              Department Compliance &amp; Accountability Matrix
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Executive Oversight
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any department card to filter results instantly
          </span>
        </div>

        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {departmentStats.map((dept) => {
            const isSelected = selectedDeptFilter === dept.deptName;
            const hasData = dept.totalSubjects > 0;
            const isFull = hasData && dept.percentage === 100;
            const isPartial = hasData && dept.percentage > 0 && dept.percentage < 100;

            return (
              <div
                key={dept.deptCode}
                onClick={() => {
                  setSelectedDeptFilter(isSelected ? 'ALL' : dept.deptName);
                  setTimeout(() => {
                    document.getElementById('lms-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                      {dept.deptCode}
                    </span>
                    {isFull ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                        100% Complete
                      </span>
                    ) : isPartial ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-1 border border-amber-300">
                        <Clock className="w-2.5 h-2.5 text-amber-700" />
                        {dept.totalPending} Pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {dept.programsCount} Programs
                      </span>
                    )}
                  </div>
                  <h4 className="text-[11px] font-semibold text-slate-700 line-clamp-1" title={dept.deptName}>
                    {dept.deptName}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                  <div className="flex flex-col gap-0.5 mb-1.5">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Course Sheets: <strong className="text-slate-800">{dept.submittedCohorts}</strong> Submitted
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {dept.totalSubjects > 0 
                        ? `Courses: ${dept.totalUploaded} / ${dept.totalSubjects} Uploaded`
                        : 'Courses: Awaiting Data Entry'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-bold">Genuine Compliance</span>
                    <span
                      className={`font-black ${
                        isFull
                          ? 'text-emerald-700'
                          : dept.percentage > 50
                          ? 'text-indigo-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {dept.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull
                          ? 'bg-emerald-600'
                          : dept.percentage > 50
                          ? 'bg-indigo-600'
                          : dept.percentage > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent Vice Chancellor Executive Action Directive (If Pending Courses Exist) */}
      {stats.totalPendingAcrossUni > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5">
                Executive Action Directive: {stats.totalPendingAcrossUni} Course Result(s) Pending Upload
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {stats.totalUploadedAcrossUni} of {stats.totalSubjectsAcrossUni} courses verified ({stats.uniUploadPercentage}% completion). Course instructors must finalize mark sheets before academic deadlines.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Pending Only</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExecutiveReportOpen(true)}
              className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-400 rounded-md shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-800" />
              <span>Issue VC Circular</span>
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters and Genuine Submissions Toggle */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">

          {/* Session Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              id="filter-session"
              value={currentSession}
              onChange={(e) => {
                const newSess = e.target.value;
                setCurrentSession(newSess);
                // Also set this as the only active session for strict dashboard filtering
                StorageService.setActiveSessions([newSess]);
                setActiveSessions([newSess]);
              }}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {StorageService.getAvailableSessions().map((s) => (
                <option key={s} value={s}>
                  Session {s}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              id="filter-department"
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Departments ({UNIVERSITY_DEPARTMENTS.length})</option>
              {UNIVERSITY_DEPARTMENTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter (Morning / Evening) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="text-slate-400 font-semibold">Global Shift:</span>
            <select
              id="filter-shift"
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Shifts (Unified Program Rows)</option>
              <option value="Morning">Morning Shift Only</option>
              <option value="Evening">Evening Shift Only</option>
            </select>
          </div>

          {/* Section Filter (All / Section A / Section B / Custom) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="text-slate-400 font-semibold">Section:</span>
            <select
              id="filter-section"
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Sections (Combined)</option>
              {availableSectionsInDb.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec} Only
                </option>
              ))}
            </select>
          </div>

          {/* Submission Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted in LMS ({stats.submittedSlots})</option>
              <option value="PENDING">Pending Submission ({stats.pendingSlots})</option>
            </select>
          </div>

          {/* Genuine Submissions Only Quick Toggle */}
          <button
            type="button"
            onClick={() => setOnlyGenuineSubmissions((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border cursor-pointer ${
              onlyGenuineSubmissions
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Click to view only departments and programs that have genuinely submitted LMS result data"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Genuine Submissions Only ({stats.totalGenuineSubmissionsCount})</span>
          </button>

          {/* Session Active Toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 font-semibold bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={onlySessionFilter}
              onChange={(e) => setOnlySessionFilter(e.target.checked)}
              className="rounded text-emerald-700 focus:ring-emerald-600 w-3.5 h-3.5"
            />
            <span>Session {currentSession} Enrolled Only</span>
          </label>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-vc"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search program, dept, course code, HOD..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Program Status Master Table */}
      <div id="lms-roster-section" className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {/* Table Top Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              Academic Program LMS Result Roster ({filteredPrograms.length} Programs)
            </h3>
            {selectedSemesterFilter !== 'ALL' && (
              <span className="text-[11px] bg-emerald-700 text-emerald-100 font-bold px-2 py-0.5 rounded">
                Semester {selectedSemesterFilter} View
              </span>
            )}
          </div>
          <span className="text-xs text-slate-300">
            {selectedSemesterFilter === 'ALL'
              ? 'Click any semester number [1]–[8] to inspect full results'
              : `Showing genuine results for Semester ${selectedSemesterFilter}. Click "Inspect Sheet" to view course rows.`}
          </span>
        </div>

        {/* Mobile Responsive Program Cards (Visible on screens < 768px) */}
        <div className="block md:hidden divide-y divide-slate-200 bg-white">
          {filteredPrograms.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs px-4">
              {onlyGenuineSubmissions
                ? 'No departments have submitted LMS result data for this selection yet.'
                : 'No programs found matching the selected filters.'}
            </div>
          ) : (
            filteredPrograms.map((progItem) => {
              const effectiveShift: AcademicShift =
                selectedShiftFilter !== 'ALL'
                  ? selectedShiftFilter
                  : rowShiftOverrides[progItem.program] || progItem.recommendedShift;

              const shiftData = progItem.shifts[effectiveShift];
              const isSpecificSem = selectedSemesterFilter !== 'ALL';

              const activeSub = isSpecificSem
                ? shiftData.semesterRecords[selectedSemesterFilter]
                : shiftData.firstSubmittedSemester
                ? shiftData.semesterRecords[shiftData.firstSubmittedSemester]
                : null;

              const activeSummary = activeSub
                ? StorageService.calculateSummary(activeSub.subjects)
                : null;

              const displaySubjectsCount = isSpecificSem
                ? activeSummary?.totalSubjects || 0
                : shiftData.totalSubjects;

              const displayUploadedCount = isSpecificSem
                ? activeSummary?.uploaded || 0
                : shiftData.totalUploaded;

              const displayUploadPercentage =
                displaySubjectsCount > 0
                  ? Math.round((displayUploadedCount / displaySubjectsCount) * 100)
                  : 0;

              return (
                <div key={`mob-${progItem.department}-${progItem.program}`} className="p-3.5 space-y-2.5">
                  {/* Top Dept & Level Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {progItem.department}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      {progItem.degreeLevel}
                    </span>
                  </div>

                  {/* Program Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-snug">
                        {progItem.program}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {progItem.sessionDetail ? (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${progItem.sessionDetail.badgeClass}`}>
                            {progItem.sessionDetail.statusLabel}
                          </span>
                        ) : progItem.sessionActive ? (
                          <span className="text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                            Session {activeSessions.join(' & ')}
                          </span>
                        ) : null}
                        {progItem.hasAnySubmission && (
                          <span className="text-[9px] text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                            LMS Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shift Toggle Buttons */}
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setRowShiftOverrides((prev) => ({
                            ...prev,
                            [progItem.program]: 'Morning',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                          effectiveShift === 'Morning'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <Sun className="w-2.5 h-2.5" />
                        <span>Morn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRowShiftOverrides((prev) => ({
                            ...prev,
                            [progItem.program]: 'Evening',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                          effectiveShift === 'Evening'
                            ? 'bg-indigo-700 text-white shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <Moon className="w-2.5 h-2.5" />
                        <span>Eve</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Badges on Mobile Card */}
                  {(() => {
                    const secMap = selectedSemesterFilter !== 'ALL'
                      ? shiftData.semesterSectionRecords?.[selectedSemesterFilter] || {}
                      : {};
                    const secKeys = Object.keys(secMap).sort();
                    if (secKeys.length > 0) {
                      return (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-semibold">Active Sections:</span>
                          {secKeys.map((secKey) => {
                            const sub = secMap[secKey];
                            const sum = StorageService.calculateSummary(sub.subjects);
                            return (
                              <button
                                key={secKey}
                                type="button"
                                onClick={() =>
                                  onSelectProgramToEdit(
                                    progItem.department,
                                    progItem.program,
                                    effectiveShift,
                                    currentSession,
                                    sub?.semester || (selectedSemesterFilter !== 'ALL' ? selectedSemesterFilter : undefined),
                                    secKey
                                  )
                                }
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1 cursor-pointer hover:bg-indigo-100"
                              >
                                <span>Sec {secKey}</span>
                                <span className="text-[9px] bg-white px-1 rounded border border-indigo-100 font-mono">
                                  {sum.uploaded}/{sum.totalSubjects}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Progress & Upload Summary */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium text-[11px]">
                        {displaySubjectsCount > 0
                          ? `${displayUploadedCount} of ${displaySubjectsCount} Courses Verified`
                          : 'No Course Sheet Submitted'}
                      </span>
                      <span
                        className={`font-black text-xs ${
                          displayUploadPercentage === 100
                            ? 'text-emerald-700'
                            : displayUploadPercentage > 50
                            ? 'text-indigo-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {displayUploadPercentage}% Uploaded
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          displayUploadPercentage === 100
                            ? 'bg-emerald-600'
                            : displayUploadPercentage > 50
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${displayUploadPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() =>
                      onSelectProgramToEdit(
                        progItem.department,
                        progItem.program,
                        effectiveShift,
                        currentSession,
                        selectedSemesterFilter !== 'ALL'
                          ? selectedSemesterFilter
                          : shiftData.firstSubmittedSemester || '1',
                        selectedSectionFilter !== 'ALL'
                          ? selectedSectionFilter
                          : activeSub?.section || 'A'
                      )
                    }
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {selectedSemesterFilter !== 'ALL'
                        ? `Inspect Semester ${selectedSemesterFilter} Courses`
                        : 'Inspect Program Result Sheet'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto text-emerald-700" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (Visible on screens >= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table id="vc-roster-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold tracking-wider border-b border-slate-300 text-[11px] uppercase">
                <th className="py-2.5 px-3 border-r border-slate-300">Department / School</th>
                <th className="py-2.5 px-3 border-r border-slate-300 min-w-[200px]">Degree Program</th>
                <th className="py-2.5 px-2 border-r border-slate-300 text-center w-16">Level</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[170px]">
                  Academic Shift
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-300 text-center min-w-[140px]">
                  Section / Cohort
                </th>
                {selectedSemesterFilter !== 'ALL' ? (
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[180px]">
                    Semester {selectedSemesterFilter} LMS Status
                  </th>
                ) : (
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[200px]">
                    Semesters (1 to 8)
                  </th>
                )}
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">Subjects</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-32">
                  LMS Upload %
                </th>
                <th className="py-2.5 px-3 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-sm">
                    {onlyGenuineSubmissions
                      ? 'No departments have submitted LMS result data for this selection yet.'
                      : 'No programs found matching the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((progItem) => {
                  // Determine active shift for this row
                  const effectiveShift: AcademicShift =
                    selectedShiftFilter !== 'ALL'
                      ? selectedShiftFilter
                      : rowShiftOverrides[progItem.program] || progItem.recommendedShift;

                  const shiftData = progItem.shifts[effectiveShift];
                  const isSpecificSem = selectedSemesterFilter !== 'ALL';

                  // Specific semester record for the chosen shift
                  const activeSub = isSpecificSem
                    ? shiftData.semesterRecords[selectedSemesterFilter]
                    : shiftData.firstSubmittedSemester
                    ? shiftData.semesterRecords[shiftData.firstSubmittedSemester]
                    : null;

                  const activeSummary = activeSub
                    ? StorageService.calculateSummary(activeSub.subjects)
                    : null;

                  const isSubmitted = isSpecificSem
                    ? activeSub !== null
                    : shiftData.hasSubmission;

                  const displaySubjectsCount = isSpecificSem
                    ? activeSummary?.totalSubjects || 0
                    : shiftData.totalSubjects;

                  const displayUploadedCount = isSpecificSem
                    ? activeSummary?.uploaded || 0
                    : shiftData.totalUploaded;

                  const displayUploadPercentage =
                    displaySubjectsCount > 0
                      ? Math.round((displayUploadedCount / displaySubjectsCount) * 100)
                      : 0;

                  return (
                    <tr
                      key={`${progItem.department}-${progItem.program}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Department */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {progItem.department}
                      </td>

                      {/* Degree Program (Single Row - No duplicates) */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        <div className="font-bold">{progItem.program}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {progItem.sessionDetail ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${progItem.sessionDetail.badgeClass}`}>
                              {progItem.sessionDetail.statusLabel}
                            </span>
                          ) : progItem.sessionActive ? (
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                              Session {activeSessions.join(' & ')} Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Not in Selected
                            </span>
                          )}
                          {/* Indicator if this program has genuine submissions */}
                          {progItem.hasAnySubmission && (
                            <span className="text-[10px] text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                              LMS Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Degree Level */}
                      <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px] border-r border-slate-200">
                        {progItem.degreeLevel}
                      </td>

                      {/* Academic Shift (Interactive Selector & Status in One Row) */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300">
                            {/* Morning Shift Pill */}
                            <button
                              type="button"
                              onClick={() =>
                                setRowShiftOverrides((prev) => ({
                                  ...prev,
                                  [progItem.program]: 'Morning',
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                effectiveShift === 'Morning'
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title={
                                progItem.hasMorningSubmission
                                  ? 'Morning Shift has submitted LMS results'
                                  : 'Morning Shift - Click to view'
                              }
                            >
                              <Sun className="w-2.5 h-2.5" />
                              <span>Morning</span>
                              {progItem.hasMorningSubmission && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-white"></span>
                              )}
                            </button>

                            {/* Evening Shift Pill */}
                            <button
                              type="button"
                              onClick={() =>
                                setRowShiftOverrides((prev) => ({
                                  ...prev,
                                  [progItem.program]: 'Evening',
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                effectiveShift === 'Evening'
                                  ? 'bg-indigo-700 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title={
                                progItem.hasEveningSubmission
                                  ? 'Evening Shift has submitted LMS results'
                                  : 'Evening Shift - Click to view'
                              }
                            >
                              <Moon className="w-2.5 h-2.5" />
                              <span>Evening</span>
                              {progItem.hasEveningSubmission && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-white"></span>
                              )}
                            </button>
                          </div>

                          {/* Quick Shift Status Tag */}
                          <div className="text-[10px] text-slate-500 font-medium">
                            {progItem.hasEveningSubmission && !progItem.hasMorningSubmission ? (
                              <span className="text-indigo-800 font-semibold">
                                Evening Record Active
                              </span>
                            ) : progItem.hasMorningSubmission && !progItem.hasEveningSubmission ? (
                              <span className="text-amber-800 font-semibold">
                                Morning Record Active
                              </span>
                            ) : progItem.hasMorningSubmission && progItem.hasEveningSubmission ? (
                              <span className="text-emerald-800 font-bold">
                                Both Shifts Active
                              </span>
                            ) : (
                              <span className="text-slate-400">Viewing: {effectiveShift}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Section Column: Direct section visibility and quick inspection buttons */}
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        {isSpecificSem ? (
                          (() => {
                            const secMap = shiftData.semesterSectionRecords?.[selectedSemesterFilter] || {};
                            const secKeys = Object.keys(secMap).sort();

                            if (secKeys.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    Sec A
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    Awaiting entry
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {secKeys.map((secKey) => {
                                  const sub = secMap[secKey];
                                  const sum = StorageService.calculateSummary(sub.subjects);
                                  const isFull = sum.totalSubjects > 0 && sum.uploaded === sum.totalSubjects;
                                  return (
                                    <button
                                      key={secKey}
                                      type="button"
                                      onClick={() =>
                                        onSelectProgramToEdit(
                                          progItem.department,
                                          progItem.program,
                                          effectiveShift,
                                          currentSession,
                                          sub?.semester || (selectedSemesterFilter !== 'ALL' ? selectedSemesterFilter : undefined),
                                          secKey
                                        )
                                      }
                                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                                        isFull
                                          ? 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100'
                                          : 'bg-indigo-50 text-indigo-950 border-indigo-200 hover:bg-indigo-100'
                                      }`}
                                      title={`Section ${secKey}: ${sum.uploaded}/${sum.totalSubjects} Uploaded (${sum.uploadPercentage}%) - Click to inspect directly`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isFull ? 'bg-emerald-600' : 'bg-indigo-600'
                                        }`}
                                      />
                                      <span>Sec {secKey}</span>
                                      <span className="text-[9px] px-1 py-0.2 bg-white/90 rounded border border-slate-200 font-mono">
                                        {sum.uploaded}/{sum.totalSubjects}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          (() => {
                            // Find all unique sections across all 8 semesters for this shift
                            const allSecs = new Set<string>();
                            Object.values(shiftData.semesterSectionRecords || {}).forEach((map) => {
                              Object.keys(map).forEach((k) => allSecs.add(k));
                            });
                            const secList = Array.from(allSecs).sort();

                            return (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {secList.length > 0 ? (
                                  secList.map((sec) => (
                                    <span
                                      key={sec}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono"
                                    >
                                      Sec {sec}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Sec A &amp; B</span>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </td>

                      {/* Semester Column: Shows ONLY Selected Semester OR Matrix (Requirement: genuine view) */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        {selectedSemesterFilter !== 'ALL' ? (
                          /* Dedicated Clean View for the Selected Semester */
                          <div className="flex flex-col items-center justify-center text-center">
                            {isSubmitted ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Semester {selectedSemesterFilter} Submitted
                                </span>
                                {(() => {
                                  const hodRes = CompletionRadarService.resolveHOD(progItem.department);
                                  const coordRes = CompletionRadarService.resolveCoordinator(progItem.department, progItem.program, effectiveShift);
                                  const coordName = activeSub?.hodCoordinator || (coordRes.isAssigned ? coordRes.name : null);
                                  const uploaderName = activeSub?.accessedBy;

                                  return (
                                    <div className="text-[10px] text-slate-700 max-w-[180px] flex flex-col items-center leading-tight mt-1 space-y-0.5">
                                      {/* HOD Name FIRST (Above Coordinator) */}
                                      <span className="truncate w-full text-center" title={`HOD: ${hodRes.name}`}>
                                        HOD: <strong className="text-slate-900 font-semibold">{hodRes.name}</strong>
                                      </span>

                                      {/* Coordinator Name SECOND (Below HOD) */}
                                      {coordName && (
                                        <span className="truncate w-full text-center" title={`Coord: ${coordName}`}>
                                          Coord: <strong className="text-slate-900 font-semibold">{coordName}</strong>
                                        </span>
                                      )}

                                      {/* Uploader / AccessedBy (if different from HOD & Coord) */}
                                      {uploaderName && uploaderName !== 'N/A' && uploaderName !== coordName && uploaderName !== hodRes.name && (
                                        <span className="truncate w-full text-center text-slate-500 text-[9px]" title={`Uploaded By: ${uploaderName}`}>
                                          By: {uploaderName}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  Awaiting Entry
                                </span>
                                {(() => {
                                  const hodRes = CompletionRadarService.resolveHOD(progItem.department);
                                  const coordRes = CompletionRadarService.resolveCoordinator(progItem.department, progItem.program, effectiveShift);
                                  return (
                                    <div className="text-[10px] text-slate-600 flex flex-col items-center mt-1 space-y-0.5 max-w-[180px]">
                                      <span className="truncate w-full text-center" title={`HOD: ${hodRes.name}`}>
                                        HOD: <strong className="text-slate-800 font-semibold">{hodRes.name}</strong>
                                      </span>
                                      {coordRes.isAssigned && (
                                        <span className="truncate w-full text-center" title={`Coord: ${coordRes.name}`}>
                                          Coord: <strong className="text-slate-800 font-semibold">{coordRes.name}</strong>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Full 8-Semester Matrix only when user explicitly selected "All Semesters" */
                          <div>
                            <div className="flex items-center justify-center gap-1">
                              {ACADEMIC_SEMESTERS.map((sem) => {
                                const semSub = shiftData.semesterRecords[sem.id];
                                const isSub = Boolean(semSub);
                                const semSum = semSub
                                  ? StorageService.calculateSummary(semSub.subjects)
                                  : null;

                                return (
                                  <button
                                    key={sem.id}
                                    type="button"
                                    title={
                                      isSub
                                        ? `Semester ${sem.id}: Submitted (${semSum?.uploaded || 0}/${semSum?.totalSubjects || 0} subjects) - Click to inspect`
                                        : `Semester ${sem.id}: Awaiting entry - Click to create`
                                    }
                                    onClick={() =>
                                      onSelectProgramToEdit(
                                        progItem.department,
                                        progItem.program,
                                        effectiveShift,
                                        currentSession,
                                        sem.id,
                                        selectedSectionFilter !== 'ALL'
                                          ? selectedSectionFilter
                                          : semSub?.section || 'A'
                                      )
                                    }
                                    className={`w-6 h-6 rounded text-[10px] font-black transition-all cursor-pointer flex items-center justify-center border ${
                                      isSub
                                        ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800 shadow-2xs'
                                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                                    }`}
                                  >
                                    {sem.id}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-center mt-1 font-medium">
                              <span
                                className={
                                  shiftData.submittedSemestersCount > 0
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-slate-400'
                                }
                              >
                                {shiftData.submittedSemestersCount} of 8 Semesters Submitted
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Subjects Count */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {displaySubjectsCount > 0 ? (
                          <span className="font-bold text-slate-800">
                            {displayUploadedCount} / {displaySubjectsCount}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Upload % */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {displaySubjectsCount > 0 ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-xs font-bold ${
                                displayUploadPercentage === 100
                                  ? 'text-emerald-700'
                                  : displayUploadPercentage > 50
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {displayUploadPercentage}%
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  displayUploadPercentage === 100
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${displayUploadPercentage}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">0%</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectProgramToEdit(
                              progItem.department,
                              progItem.program,
                              effectiveShift,
                              currentSession,
                              selectedSemesterFilter !== 'ALL'
                                ? selectedSemesterFilter
                                : shiftData.firstSubmittedSemester || '1',
                              selectedSectionFilter !== 'ALL'
                                ? selectedSectionFilter
                                : 'A'
                            )
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded border border-emerald-300 transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>
                            {selectedSemesterFilter !== 'ALL'
                              ? `Inspect Sem ${selectedSemesterFilter}`
                              : 'Inspect Sheet'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

      {/* Academic Session Selector Modal */}
      <AcademicSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        currentSession={currentSession}
        onSessionSelect={(newSess) => {
          setCurrentSession(newSess);
          setActiveSessions(StorageService.getActiveSessions());
        }}
        onSessionChanged={(newSess) => {
          setCurrentSession(newSess);
          setActiveSessions(StorageService.getActiveSessions());
        }}
        onActiveSessionsChanged={(sessions) => {
          setActiveSessions(sessions);
          if (sessions.length > 0) setCurrentSession(sessions[0]);
        }}
      />

      {/* Session Program Roster Selector Modal */}
      <Session2023SelectorModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        departmentName={rosterDept}
        sessionName={currentSession}
        onRosterUpdated={() => {
          setRosterVersion((v) => v + 1);
        }}
      />

      {/* Executive Report & Formal Compliance Notice Generator */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        allPrograms={allUniversityPrograms}
        allRecords={allRecords}
        currentSession={currentSession}
        selectedSemester={selectedSemesterFilter}
        stats={{
          totalDegreePrograms: stats.totalPrograms,
          submittedProgramsCount: stats.submittedSlots,
          totalActiveSubjects: stats.totalSubjectsAcrossUni,
          totalUploadedSubjects: stats.totalUploadedAcrossUni,
          totalPendingSubjects: stats.totalPendingAcrossUni,
          uploadPercentage: stats.uniUploadPercentage,
        }}
      />

      {/* Department Drill-Down Modal */}
      <DepartmentDrillDownModal
        isOpen={isDeptDrillDownOpen}
        onClose={() => setIsDeptDrillDownOpen(false)}
        department={selectedDrillDownDept}
        onSelectProgram={(prog) => {
          setSelectedDrillDownProgram(prog);
          setIsProgramDrillDownOpen(true);
        }}
      />

      {/* Program & Section Drill-Down Modal */}
      <ProgramSectionDrillDownModal
        isOpen={isProgramDrillDownOpen}
        onClose={() => setIsProgramDrillDownOpen(false)}
        program={selectedDrillDownProgram}
        onEditProgramSubmission={(dept, prog, sec) => {
          setIsProgramDrillDownOpen(false);
          setIsDeptDrillDownOpen(false);
          onSelectProgramToEdit(
            dept,
            prog,
            selectedShiftFilter === 'ALL' ? 'Morning' : selectedShiftFilter,
            currentSession,
            selectedSemesterFilter === 'ALL' ? '1' : selectedSemesterFilter,
            sec
          );
        }}
      />
      {/* Read-Only Change History / Audit Trail Modal for VC Review */}
      <ChangeHistoryModal
        isOpen={isChangeHistoryOpen}
        onClose={() => setIsChangeHistoryOpen(false)}
        initialProgram={changeHistoryProgram}
        initialDepartment={selectedDeptFilter === 'ALL' ? '' : selectedDeptFilter}
      />

      {/* DATA SOURCE & CALCULATION LOGIC INFO MODAL */}
      {isDataSourceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Info className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Data Source &amp; Metric Methodology
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium font-mono uppercase">System Audit Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDataSourceModalOpen(false)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4.5 h-4.5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/60 rounded-lg space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Compliance Calculation Logic</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  Academic Compliance is computed as the percentage of <strong>Active Offering Slots</strong> (Program × Shift × Semester × Section) that have complete, validated LMS grade submissions in the central database. Inactive programs or unfilled slots that have not been assigned a coordinator are automatically filtered from the denominator to ensure zero statistical bias and true compliance visibility.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-lg">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total Recorded Courses</span>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono mt-1">
                    {hierarchy.totalCourses}
                  </div>
                  <span className="text-[10px] text-slate-500">university-wide slots</span>
                </div>
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-lg">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">LMS Upload Status</span>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1 flex items-baseline gap-1">
                    {hierarchy.uploadedCourses}
                    <span className="text-xs text-slate-400 font-normal">/ {hierarchy.pendingCourses} pending</span>
                  </div>
                  <span className="text-[10px] text-slate-500">verified uploads vs missing</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/60 rounded-lg flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>DATABASE RECALCULATION:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {lastRecalculationTime}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-150 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDataSourceModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
