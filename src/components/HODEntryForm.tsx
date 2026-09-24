import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DepartmentGroup,
  UNIVERSITY_DEPARTMENTS,
  ACADEMIC_SHIFTS,
  ACADEMIC_SEMESTERS,
  STANDARD_ACADEMIC_SECTIONS,
  DEGREE_LEVEL_OPTIONS,
  createEmptySubjectRow,
  createInitialBlankRows,
  getRecordKey,
} from '../data/departmentsData';
import { SubjectRow, SubmissionRecord, LMSStatus, ActiveUserSession, AcademicShift, UserAccount, ProgramAccessRequest } from '../types';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';
import { AuditTrailService } from '../services/auditTrailService';
import { CompletionRadarService } from '../services/completionRadarService';
import { dispatchSyncEvidence } from './SyncEvidenceToast';
import { ExecutiveSummaryCards } from './ExecutiveSummaryCards';
import { DeadlineBanner } from './DeadlineBanner';
import { LockdownScopeModal } from './LockdownScopeModal';
import { DeleteModal, DeleteScope } from './DeleteModal';
import { Session2023SelectorModal } from './Session2023SelectorModal';
import { AcademicSessionModal } from './AcademicSessionModal';
import { BulkCourseImportModal } from './BulkCourseImportModal';
import { CoordinatorAssignmentModal } from './CoordinatorAssignmentModal';
import { RequestAdditionalProgramModal } from './RequestAdditionalProgramModal';
import { ChangeHistoryModal } from './ChangeHistoryModal';
import { DepartmentExportModal, ExportScope } from './DepartmentExportModal';
import { HODDirectivePanel } from './HODDirectivePanel';
import { CoordinatorDirectivePanel } from './CoordinatorDirectivePanel';
import { SendFacultyReminderModal } from './SendFacultyReminderModal';
import { FacultyReminderBanner } from './FacultyReminderBanner';
import { RecentActivityWidget } from './RecentActivityWidget';
import { HODActiveSearchBar, HODSearchScope, OtherCohortMatch } from './HODActiveSearchBar';
import {
  Save,
  Trash2,
  Copy,
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
  Users,
  UserCheck,
  Building2,
  GraduationCap,
  Layers,
  ArrowRight,
  ArrowLeft,
  Printer,
  ShieldCheck,
  Filter,
  SlidersHorizontal,
  Sun,
  Moon,
  Send,
  Eye,
  BookOpen,
  Search,
  FileText,
  X,
  Lock,
  FileSpreadsheet,
  CheckCheck,
  Wand2,
  MessageSquare,
  Megaphone,
  Edit3,
  CheckSquare,
  Square,
  AlertTriangle,
  XCircle,
  History as HistoryIcon,
  Cloud,
  Loader2,
} from 'lucide-react';

// Standard institutional delay reasons for academic compliance
const STANDARD_DELAY_REASONS = [
  'Exam Moderation Committee Review Ongoing',
  'Practical / Lab Viva Evaluation Ongoing',
  'Awaiting External Examiner Marks Submission',
  'Visiting Faculty Marks Tabulation Delayed',
  'Scrutiny & Re-checking Requests in Process',
  'Extenuating / Medical Cases Under Evaluation',
  'Awaiting Departmental Board of Studies Approval',
  'Grades Under Clarification with Subject Teacher',
];

interface Props {
  onRecordSavedOrDeleted?: () => void;
  selectedDepartmentProp?: string;
  selectedProgramProp?: string;
  selectedShiftProp?: AcademicShift;
  selectedSessionProp?: string;
  selectedSemesterProp?: string;
  selectedSectionProp?: string;
  currentUser?: ActiveUserSession;
  onOpenUserModal?: () => void;
  onSessionChangedProp?: (session: string) => void;
  onSemesterChangedProp?: (semester: string) => void;
  onDepartmentChangedProp?: (dept: string) => void;
  onProgramChangedProp?: (prog: string) => void;
  onShiftChangedProp?: (shift: AcademicShift) => void;
  onSectionChangedProp?: (section: string) => void;
  onSwitchToVC?: () => void;
  readOnly?: boolean;
}

export const HODEntryForm: React.FC<Props> = ({
  onRecordSavedOrDeleted,
  selectedDepartmentProp,
  selectedProgramProp,
  selectedShiftProp,
  selectedSessionProp,
  selectedSemesterProp,
  selectedSectionProp,
  currentUser,
  onOpenUserModal,
  onSessionChangedProp,
  onSemesterChangedProp,
  onDepartmentChangedProp,
  onProgramChangedProp,
  onShiftChangedProp,
  onSectionChangedProp,
  onSwitchToVC,
  readOnly,
}) => {
  
  const isVC = currentUser?.role === 'VC';
  const isAdmin = currentUser?.role === 'ADMIN';

  const [session, setSession] = useState<string>(
    selectedSessionProp || StorageService.getSelectedSession()
  );
  const [semester, setSemester] = useState<string>(selectedSemesterProp || '1');

  const [isDeadlineExpired, setIsDeadlineExpired] = useState<boolean>(() =>
    StorageService.isSystemDeadlineExpired(
      selectedSessionProp || StorageService.getSelectedSession(),
      selectedSemesterProp || '1'
    )
  );

  useEffect(() => {
    const handleDeadlineUpdated = () => {
      setIsDeadlineExpired(StorageService.isSystemDeadlineExpired(session, semester));
    };
    handleDeadlineUpdated();
    // Re-check periodically just in case it crosses the threshold while they are typing
    const interval = setInterval(handleDeadlineUpdated, 10000);
    window.addEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    };
  }, [session, semester]);

  // Lock form if readonly, or if VC, or if deadline expired and NOT VC/ADMIN
  const isReadOnly = Boolean(readOnly || isVC || (isDeadlineExpired && !isVC && !isAdmin));

  // Mode for HOD to toggle between Read-Only Inspection Mode and Write/Update Mode
  const [isHodReadMode, setIsHodReadMode] = useState<boolean>(false);

  // Effective read-only mode considering HOD read mode preference
  const effectiveReadOnly = Boolean(
    isReadOnly || (currentUser?.role === 'HOD' && isHodReadMode)
  );


  const userDept = (currentUser?.role === 'HOD' || currentUser?.role === 'COORDINATOR') && currentUser.department
    ? currentUser.department
    : null;

  // Master Selections
  const [department, setDepartment] = useState<string>(
    userDept || selectedDepartmentProp || UNIVERSITY_DEPARTMENTS[0].name
  );

  // Storage synchronization listener for live database reactive updates
  const [storageVersion, setStorageVersion] = useState<number>(0);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setStorageVersion((v) => v + 1);
    };
    window.addEventListener('mnsuet_storage_updated', handleStorageUpdate);
    window.addEventListener('mnsuet_sessions_updated', handleStorageUpdate);
    window.addEventListener('mnsuet_roster_updated', handleStorageUpdate);
    return () => {
      window.removeEventListener('mnsuet_storage_updated', handleStorageUpdate);
      window.removeEventListener('mnsuet_sessions_updated', handleStorageUpdate);
      window.removeEventListener('mnsuet_roster_updated', handleStorageUpdate);
    };
  }, []);

  // Generic Session State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);

  // Filter to show only programs that belong to the selected session
  const [onlySessionFilter, setOnlySessionFilter] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [isCoordinatorAssignModalOpen, setIsCoordinatorAssignModalOpen] = useState<boolean>(false);
  const [rosterVersion, setRosterVersion] = useState<number>(0);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isSendReminderModalOpen, setIsSendReminderModalOpen] = useState<boolean>(false);

  // Available programs for current department (guaranteed to include all department offerings)
  const currentDeptPrograms = useMemo(() => {
    const dept = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === (department || '').trim().toLowerCase() || d.code.trim().toLowerCase() === (department || '').trim().toLowerCase()
    );
    if (!dept) return UNIVERSITY_DEPARTMENTS[0].programs;
    if (onlySessionFilter && !isReadOnly) {
      const activeNames = StorageService.getSessionPrograms(department, session);
      const filtered = dept.programs.filter((p) => activeNames.includes(p.name));
      return filtered.length > 0 ? filtered : dept.programs;
    }
    return dept.programs;
  }, [department, session, onlySessionFilter, isReadOnly, rosterVersion]);

  const allDeptPrograms = useMemo(() => {
    const dept = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === (department || '').trim().toLowerCase() || d.code.trim().toLowerCase() === (department || '').trim().toLowerCase()
    );
    return dept ? dept.programs : UNIVERSITY_DEPARTMENTS[0].programs;
  }, [department]);

  // Institutional Privilege Check:
  // Head of Department (HOD), ADMIN, and VC have department-wide privilege to view and select all programs.
  // Program Coordinators are strictly restricted to their assigned degree programs and assigned shifts.
  const isPrivilegedUser = useMemo(() => {
    return currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'VC';
  }, [currentUser?.role]);

  // Determine programs allowed for the active user:
  // Coordinators ONLY see programs explicitly assigned to them during registration or by HOD.
  // Only HOD, ADMIN, and VC have access to all programs.
  const coordinatorAllowedPrograms = useMemo(() => {
    if (isPrivilegedUser) {
      return allDeptPrograms;
    }
    // Gating check: if coordinator account is pending approval by HOD, they have NO approved programs
    if (currentUser?.approvalStatus === 'PENDING') {
      return [];
    }
    const userPrograms: string[] = [];
    if (currentUser?.assignedPrograms && currentUser.assignedPrograms.length > 0) {
      userPrograms.push(...currentUser.assignedPrograms);
    } else if (currentUser?.program) {
      userPrograms.push(currentUser.program);
    }
    if (currentUser?.programShiftAssignments) {
      Object.keys(currentUser.programShiftAssignments).forEach((p) => {
        if (!userPrograms.includes(p)) userPrograms.push(p);
      });
    }

    const filtered = allDeptPrograms.filter((p) =>
      userPrograms.some((up) => up.trim().toLowerCase() === p.name.trim().toLowerCase())
    );

    if (filtered.length > 0) return filtered;
    if (userPrograms.length > 0) {
      return userPrograms.map((name) => ({
        name,
        degreeLevel: 'BS (4 Years)',
        department,
        session2023: true,
      }));
    }
    // Strict isolation: if coordinator has no assigned programs, return empty array (do NOT expose other coordinators' programs)
    return [];
  }, [isPrivilegedUser, allDeptPrograms, currentUser, department]);

  const initialProgram = useMemo(() => {
    if (selectedProgramProp) {
      if (isPrivilegedUser) return selectedProgramProp;
      const match = coordinatorAllowedPrograms.find(
        (p) => p.name.trim().toLowerCase() === selectedProgramProp.trim().toLowerCase()
      );
      if (match) return match.name;
    }
    if (!isPrivilegedUser) {
      return coordinatorAllowedPrograms[0]?.name || '';
    }
    return currentDeptPrograms[0]?.name || '';
  }, [selectedProgramProp, isPrivilegedUser, coordinatorAllowedPrograms, currentDeptPrograms]);

  const [program, setProgram] = useState<string>(initialProgram);

  // Auto-derived default degree level, with user override capability
  const autoDegreeLevel = useMemo(() => {
    const progInfo = allDeptPrograms.find((p) => p.name.trim().toLowerCase() === (program || '').trim().toLowerCase());
    return progInfo?.degreeLevel || 'BS (4 Years)';
  }, [allDeptPrograms, program]);

  const [degreeLevel, setDegreeLevel] = useState<string>(autoDegreeLevel);

  useEffect(() => {
    setDegreeLevel(autoDegreeLevel);
  }, [autoDegreeLevel]);

  // Allowed shifts for current selected program
  const allowedShiftsForProgram = useMemo<AcademicShift[]>(() => {
    const configuredShifts = StorageService.getProgramShifts(department, program);
    if (!isPrivilegedUser && currentUser?.programShiftAssignments && program && currentUser.programShiftAssignments[program]) {
      const shs = currentUser.programShiftAssignments[program];
      if (shs && shs.length > 0) {
        const filtered = shs.filter((s) => configuredShifts.includes(s));
        if (filtered.length > 0) return filtered;
      }
    }
    return configuredShifts.length > 0 ? configuredShifts : ['Evening'];
  }, [department, program, isPrivilegedUser, currentUser, rosterVersion]);

  // Shift selection (Morning vs Evening) - strictly isolated hierarchy level
  const initialShift = useMemo<AcademicShift>(() => {
    if (selectedShiftProp) {
      if (isPrivilegedUser || allowedShiftsForProgram.includes(selectedShiftProp)) {
        return selectedShiftProp;
      }
    }
    return allowedShiftsForProgram[0] || 'Morning';
  }, [selectedShiftProp, isPrivilegedUser, allowedShiftsForProgram]);

  const [shift, setShift] = useState<AcademicShift>(initialShift);

  useEffect(() => {
    if (allowedShiftsForProgram.length > 0 && !allowedShiftsForProgram.includes(shift)) {
      setShift(allowedShiftsForProgram[0]);
    }
  }, [allowedShiftsForProgram, shift]);

  // Section selection (Section A, Section B, Section C, etc.) - strictly isolated data partition
  const [section, setSection] = useState<string>((selectedSectionProp || 'A').trim().toUpperCase());
  const [isCustomSectionOpen, setIsCustomSectionOpen] = useState<boolean>(false);
  const [customSectionInput, setCustomSectionInput] = useState<string>('');

  // Semester selection (1 to 8) - strictly isolated institutional semester cycle
  // (semester state initialized at top of component)

  // Course search query, scope & advanced columns toggle
  const [courseFilterQuery, setCourseFilterQuery] = useState<string>('');
  const [courseFilterScope, setCourseFilterScope] = useState<HODSearchScope>('ALL');
  const [showAdvancedColumns, setShowAdvancedColumns] = useState<boolean>(false);

  // Row selection & Quick Tool Scope state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [applyScope, setApplyScope] = useState<'selected' | 'all'>('selected');

  // Custom remarks / delay reasons state
  const [isCustomReasonOpen, setIsCustomReasonOpen] = useState<boolean>(false);
  const [customReasonInput, setCustomReasonInput] = useState<string>('');
  const [recentCustomReasons, setRecentCustomReasons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mnsuet_custom_delay_reasons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State flags
  const [isExistingRecord, setIsExistingRecord] = useState<boolean>(false);
  const [loadedRecord, setLoadedRecord] = useState<SubmissionRecord | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);
  const [conflictRecord, setConflictRecord] = useState<SubmissionRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto-Save Real-Time State & Feedback
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [autoSaveToast, setAutoSaveToast] = useState<{
    message: string;
    timestamp: string;
    detail?: string;
  } | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic status change chronological audit logs for this specific section
  const currentRecordLogs = useMemo(() => {
    const logs = AuditTrailService.getLogs();
    const normDept = (department || '').trim().toLowerCase();
    const normProg = (program || '').trim().toLowerCase();
    const normShift = (shift || '').trim().toLowerCase();
    const normSem = (semester || '').trim().toLowerCase();
    const normSec = (section || '').trim().toLowerCase();

    return logs.filter((log) => {
      const matchDept = !normDept || log.department.trim().toLowerCase().includes(normDept) || normDept.includes(log.department.trim().toLowerCase());
      const matchProg = !normProg || log.program.trim().toLowerCase().includes(normProg) || normProg.includes(log.program.trim().toLowerCase());
      const matchShift = !normShift || !log.shift || log.shift.trim().toLowerCase() === normShift;
      const matchSem = !normSem || !log.semester || log.semester.trim().toLowerCase() === normSem;
      const matchSec = !normSec || !log.section || log.section.trim().toLowerCase() === normSec;
      return matchDept && matchProg && matchShift && matchSem && matchSec;
    });
  }, [department, program, shift, semester, section, storageVersion]);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState<boolean>(false);

  // Coordinator Approval Workflow State
  const [pendingHODApprovals, setPendingHODApprovals] = useState<UserAccount[]>([]);
  const [pendingProgRequests, setPendingProgRequests] = useState<ProgramAccessRequest[]>([]);
  const [userProgramRequests, setUserProgramRequests] = useState<ProgramAccessRequest[]>([]);
  const [isReqProgModalOpen, setIsReqProgModalOpen] = useState<boolean>(false);
  const [isChangeHistoryOpen, setIsChangeHistoryOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportDefaultScope, setExportDefaultScope] = useState<ExportScope>('ENTIRE_DEPARTMENT');
  const [auditFilterAction, setAuditFilterAction] = useState<'ALL' | 'CREATED' | 'UPDATED' | 'DELETED'>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  const filteredAuditLogs = useMemo(() => {
    return currentRecordLogs.filter((log) => {
      const matchesAction = auditFilterAction === 'ALL' || log.action === auditFilterAction;
      const matchesSearch =
        !auditSearchQuery ||
        log.summary.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.actorName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.actorRole.toLowerCase().includes(auditSearchQuery.toLowerCase());
      return matchesAction && matchesSearch;
    });
  }, [currentRecordLogs, auditFilterAction, auditSearchQuery]);
  const isPendingCoordinator = currentUser?.role === 'COORDINATOR' && currentUser?.approvalStatus === 'PENDING';
  const isRejectedCoordinator = currentUser?.role === 'COORDINATOR' && currentUser?.approvalStatus === 'REJECTED';

  useEffect(() => {
    const refreshPending = () => {
      if (currentUser?.role === 'HOD' && currentUser?.department) {
        setPendingHODApprovals(AuthService.getPendingApprovals(currentUser.department));
        setPendingProgRequests(AuthService.getPendingProgramRequests(currentUser.department));
      } else if (currentUser?.role === 'ADMIN') {
        setPendingHODApprovals(AuthService.getPendingApprovals());
        setPendingProgRequests(AuthService.getPendingProgramRequests());
      }
      if (currentUser?.id) {
        setUserProgramRequests(AuthService.getUserProgramRequests(currentUser.id));
      }
    };
    refreshPending();
    window.addEventListener('mnsuet_accounts_updated', refreshPending);
    window.addEventListener('mnsuet_auth_changed', refreshPending);
    return () => {
      window.removeEventListener('mnsuet_accounts_updated', refreshPending);
      window.removeEventListener('mnsuet_auth_changed', refreshPending);
    };
  }, [currentUser]);

  const handleHODQuickApprove = (accountId: string, coordName: string) => {
    const res = AuthService.approveCoordinatorAccount(accountId, currentUser?.name || 'HOD');
    if (res.success) {
      showFeedback('success', `Approved coordinator authorization for ${coordName}.`);
      if (currentUser?.department) {
        setPendingHODApprovals(AuthService.getPendingApprovals(currentUser.department));
      }
    } else {
      showFeedback('warning', res.message);
    }
  };

  const handleHODQuickReject = (accountId: string, coordName: string) => {
    const res = AuthService.rejectCoordinatorAccount(accountId, currentUser?.name || 'HOD', 'Rejected by HOD');
    if (res.success) {
      showFeedback('info', `Coordinator authorization for ${coordName} was rejected.`);
      if (currentUser?.department) {
        setPendingHODApprovals(AuthService.getPendingApprovals(currentUser.department));
      }
    } else {
      showFeedback('warning', res.message);
    }
  };

  const handleHODApproveProgReq = (requestId: string, coordName: string, progName: string) => {
    const res = AuthService.approveAdditionalProgramRequest(requestId, currentUser?.name || 'HOD');
    if (res.success) {
      showFeedback('success', `Approved additional program "${progName}" for ${coordName}.`);
      if (currentUser?.department) {
        setPendingProgRequests(AuthService.getPendingProgramRequests(currentUser.department));
      } else {
        setPendingProgRequests(AuthService.getPendingProgramRequests());
      }
    } else {
      showFeedback('warning', res.message);
    }
  };

  const handleHODRejectProgReq = (requestId: string, coordName: string, progName: string) => {
    const res = AuthService.rejectAdditionalProgramRequest(requestId, currentUser?.name || 'HOD', 'Declined by HOD');
    if (res.success) {
      showFeedback('info', `Additional program request for "${progName}" from ${coordName} was declined.`);
      if (currentUser?.department) {
        setPendingProgRequests(AuthService.getPendingProgramRequests(currentUser.department));
      } else {
        setPendingProgRequests(AuthService.getPendingProgramRequests());
      }
    } else {
      showFeedback('warning', res.message);
    }
  };

  const handleRequestHODReapproval = () => {
    if (!currentUser) return;
    const res = AuthService.requestHODApproval(
      currentUser.id,
      currentUser.assignedPrograms || [program],
      currentUser.assignedShifts || [shift]
    );
    if (res.success) {
      showFeedback('success', 'Authorization request sent to the Head of Department. Your status is Pending Approval.');
    } else {
      showFeedback('info', res.message);
    }
  };

  // Collect all programs pending HOD approval for this user
  const pendingCoordinatorPrograms = useMemo(() => {
    const list = new Set<string>();
    if (currentUser?.requestedPrograms) {
      currentUser.requestedPrograms.forEach((p) => {
        if (p && p.trim()) list.add(p.trim());
      });
    }
    userProgramRequests
      .filter((r) => r.status === 'PENDING')
      .forEach((r) => {
        if (r.requestedProgram && r.requestedProgram.trim()) list.add(r.requestedProgram.trim());
      });
    if (currentUser?.approvalStatus === 'PENDING') {
      if (currentUser?.assignedPrograms) {
        currentUser.assignedPrograms.forEach((p) => {
          if (p && p.trim()) list.add(p.trim());
        });
      }
      if (currentUser?.program && currentUser.program.trim()) {
        list.add(currentUser.program.trim());
      }
    }
    // Remove any programs that are already approved in coordinatorAllowedPrograms
    coordinatorAllowedPrograms.forEach((ap) => list.delete(ap.name.trim()));
    return Array.from(list);
  }, [currentUser, userProgramRequests, coordinatorAllowedPrograms]);

  const hasApprovedCoordinatorPrograms = isPrivilegedUser || (coordinatorAllowedPrograms.length > 0 && currentUser?.approvalStatus !== 'PENDING');

  const handleDeleteCoordinatorProgram = (progToDelete: string) => {
    if (!currentUser) return;
    const confirmMsg = `Are you sure you want to remove "${progToDelete}" from your account?\n\nYou do not need any permission from your Head of Department to delete programs (you can delete programs even until no programs are left).`;
    if (!window.confirm(confirmMsg)) return;

    const res = AuthService.removeCoordinatorProgram(currentUser.id, progToDelete);
    if (res.success) {
      showFeedback('info', res.message);
      const remaining = coordinatorAllowedPrograms.filter(
        (p) => p.name.trim().toLowerCase() !== progToDelete.trim().toLowerCase()
      );
      if (remaining.length > 0) {
        handleProgramChange(remaining[0].name);
      } else {
        setProgram('');
      }
    } else {
      showFeedback('warning', res.message);
    }
  };

  const handleCancelPendingProgramRequest = (progName: string) => {
    if (!currentUser) return;
    const confirmMsg = `Cancel and delete your pending authorization request for "${progName}"?\n\nYou do not need HOD permission to cancel or delete this request.`;
    if (!window.confirm(confirmMsg)) return;

    const req = userProgramRequests.find(
      (r) => r.requestedProgram.trim().toLowerCase() === progName.trim().toLowerCase() && r.status === 'PENDING'
    );
    if (req) {
      const res = AuthService.cancelProgramAccessRequest(req.id, currentUser.id);
      if (res.success) {
        showFeedback('info', res.message);
      } else {
        showFeedback('warning', res.message);
      }
    } else {
      const res = AuthService.removeCoordinatorProgram(currentUser.id, progName);
      if (res.success) {
        showFeedback('info', res.message);
      } else {
        showFeedback('warning', res.message);
      }
    }
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    if (currentUser?.role === 'HOD' && currentUser.department && !isVC && !isAdmin) {
      if (department.trim().toLowerCase() !== currentUser.department.trim().toLowerCase()) {
        showFeedback('warning', `Access Denied: As HOD, you are only authorized to delete sections for ${currentUser.department}.`);
        setSectionToDelete(null);
        return;
      }
    }
    setIsDeletingSection(true);
    try {
      const secTarget = sectionToDelete;
      await StorageService.removeCohortSection(
        department,
        program,
        session,
        semester,
        shift,
        secTarget,
        degreeLevel
      );
      if (section === secTarget) {
        setSection('A');
        if (onSectionChangedProp) onSectionChangedProp('A');
        // Load Section A record if present or clean rows
        const existingA = StorageService.getSubmission(
          department,
          program,
          degreeLevel,
          shift,
          session,
          semester,
          'A'
        );
        if (existingA) {
          setIsExistingRecord(true);
          setLastSavedTime(existingA.updatedAt);
          setSubjects(existingA.subjects);
        } else {
          setIsExistingRecord(false);
          setSubjects(createInitialBlankRows(1, shift, semester, 'A'));
        }
      } else {
        setLastSavedTime(Date.now().toString());
      }
      setSectionToDelete(null);
      setFeedbackMessage({
        type: 'success',
        text: `Section ${secTarget} deleted successfully and returned cohort to single Section A. All records synced with database and executive dashboard.`,
      });
      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mnsuet_storage_updated'));
      }
    } catch (err) {
      console.error('Failed to remove section', err);
      setFeedbackMessage({
        type: 'warning',
        text: 'Failed to delete section from database. Please retry.',
      });
    } finally {
      setIsDeletingSection(false);
    }
  };

  // Status of each semester (1 to 8) for the current department + program + shift + session + section
  const semesterStatuses = useMemo(() => {
    return ACADEMIC_SEMESTERS.map((sem) => {
      const existing = StorageService.getSubmission(
        department,
        program,
        degreeLevel,
        shift,
        session,
        sem.id,
        section
      );
      const hasRecord = Boolean(existing);
      let summaryInfo = null;
      if (existing) {
        summaryInfo = StorageService.calculateSummary(existing.subjects);
      }
      return {
        ...sem,
        hasRecord,
        summary: summaryInfo,
      };
    });
  }, [department, program, degreeLevel, shift, session, section, lastSavedTime, isExistingRecord, storageVersion]);

  // Available sections for the current cohort (synced with database and user additions)
  const availableSections = useMemo(() => {
    return StorageService.getAvailableSectionsForCohort(
      department,
      program,
      session,
      semester,
      shift
    );
  }, [department, program, session, semester, shift, lastSavedTime, isExistingRecord, storageVersion]);

  // Keep selected section synchronized with available sections
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(section)) {
      setSection('A');
      if (onSectionChangedProp) onSectionChangedProp('A');
    }
  }, [availableSections, section, onSectionChangedProp]);

  // Status of all active sections for the currently selected semester & shift
  const sectionStatuses = useMemo(() => {
    const sectionSet = new Set<string>(availableSections);
    sectionSet.add('A');

    const sorted = Array.from(sectionSet).sort((a, b) => {
      if (a === 'A') return -1;
      if (b === 'A') return 1;
      if (a === 'B') return -1;
      if (b === 'B') return 1;
      return a.localeCompare(b);
    });

    return sorted.map((secId) => {
      const existing = StorageService.getSubmission(
        department,
        program,
        degreeLevel,
        shift,
        session,
        semester,
        secId
      );
      const hasRecord = Boolean(existing);
      let summaryInfo = null;
      let validCourseCount = 0;
      if (existing) {
        summaryInfo = StorageService.calculateSummary(existing.subjects);
        validCourseCount = existing.subjects.filter(
          (s) => s.courseCode.trim() || s.subjectTitle.trim() || s.status
        ).length;
      }
      return {
        id: secId,
        label: `Section ${secId}`,
        shortLabel: `Sec ${secId}`,
        hasRecord,
        courseCount: validCourseCount,
        summary: summaryInfo,
      };
    });
  }, [department, program, degreeLevel, shift, session, semester, availableSections, lastSavedTime, isExistingRecord, storageVersion]);

  const handleSectionChange = (newSec: string) => {
    const cleanSec = (newSec || 'A').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'A';
    if (cleanSec !== 'A') {
      StorageService.registerCohortSection(department, program, session, semester, shift, cleanSec);
    }
    setSection(cleanSec);
    setIsCustomSectionOpen(false);
    if (onSectionChangedProp) onSectionChangedProp(cleanSec);
  };

  const handleSemesterChange = (newSem: string) => {
    setSemester(newSem);
    if (onSemesterChangedProp) onSemesterChangedProp(newSem);
  };

  // Helper to resolve Program Coordinator name for current program
  const resolveProgramCoordinatorName = useCallback((dept: string, prog: string, targetShift?: AcademicShift, savedCoord?: string): string => {
    // 1. If logged-in user is a Coordinator, use their own name
    if (currentUser?.role === 'COORDINATOR' && currentUser?.name) {
      return `${currentUser.name} (${currentUser.designation || 'Program Coordinator'})`;
    }

    // 2. Check if savedCoord exists and is NOT an HOD designation
    if (
      savedCoord &&
      !savedCoord.toLowerCase().includes('head of department') &&
      !savedCoord.toLowerCase().includes('hod') &&
      !savedCoord.toLowerCase().includes('vice chancellor')
    ) {
      return savedCoord;
    }

    // 3. Resolve assigned coordinator for this program
    const coordRes = CompletionRadarService.resolveCoordinator(dept, prog, targetShift || shift);
    if (coordRes.isAssigned && coordRes.name) {
      return `${coordRes.name} (${coordRes.designation || 'Program Coordinator'})`;
    }

    if (savedCoord) return savedCoord;

    return 'Program Coordinator';
  }, [currentUser, shift]);

  // Metadata manual fields
  const [hodCoordinator, setHodCoordinator] = useState<string>(() => {
    const initDept = selectedDepartmentProp || UNIVERSITY_DEPARTMENTS[0].name;
    const initProg = selectedProgramProp || UNIVERSITY_DEPARTMENTS[0].programs[0].name;
    return resolveProgramCoordinatorName(initDept, initProg, initialShift);
  });
  const [submissionDate, setSubmissionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Update hodCoordinator if currentUser, selection, or shift changes and not editing a custom locked value
  useEffect(() => {
    if (!isExistingRecord) {
      setHodCoordinator(resolveProgramCoordinatorName(department, program, shift));
    }
  }, [currentUser, department, program, shift, resolveProgramCoordinatorName, isExistingRecord]);

  // Rows state: starts with 8 clean rows ready for fast data entry matching MNS-UET form
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => createInitialBlankRows(1, 'Morning', '1', 'A'));

  // Evaluate real-time shift completion status for Morning and Evening shifts
  const shiftStatuses = useMemo(() => {
    const supportedShifts = StorageService.getProgramShifts(department, program);
    const allStore = StorageService.getAllSubmissions();

    const currentVirtualRec: SubmissionRecord = {
      id: 'current-active',
      department,
      program,
      degreeLevel,
      shift,
      section,
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

    const getShiftMetrics = (targetShift: 'Morning' | 'Evening') => {
      const isOffered = supportedShifts.includes(targetShift);
      if (!isOffered) {
        return {
          isOffered: false,
          status: 'NOT_OFFERED' as const,
          label: 'Not Offered',
          displayText: 'N/A',
          hasRecord: false,
          courseCount: 0,
          uploaded: 0,
          total: 0,
        };
      }

      const matching = allStore.filter(
        (r) =>
          StorageService._isDeptMatch(department, r.department) &&
          StorageService._isProgMatch(program, r.program) &&
          (r.shift || 'Morning') === targetShift &&
          String(r.session || '2023').trim() === String(session).trim()
      );

      const isCurrentThisShift = shift === targetShift;
      let recordsToEvaluate: SubmissionRecord[] = [];

      if (isCurrentThisShift) {
        const hasCurrentInStore = matching.some(
          (r) =>
            String(r.semester) === String(semester) &&
            String(r.section || 'A') === String(section)
        );
        if (hasCurrentInStore) {
          recordsToEvaluate = matching.map((r) =>
            String(r.semester) === String(semester) && String(r.section || 'A') === String(section)
              ? currentVirtualRec
              : r
          );
        } else {
          recordsToEvaluate = [currentVirtualRec, ...matching];
        }
      } else {
        recordsToEvaluate = matching;
      }

      let totalSubjects = 0;
      let uploadedCount = 0;
      let inProgressCount = 0;

      recordsToEvaluate.forEach((r) => {
        const activeRows = (r.subjects || []).filter(
          (s) => (s.courseCode && s.courseCode.trim()) || (s.subjectTitle && s.subjectTitle.trim()) || s.status
        );
        activeRows.forEach((s) => {
          totalSubjects++;
          if (s.status === 'Uploaded') uploadedCount++;
          else if (s.status === 'In Progress') inProgressCount++;
        });
      });

      const hasRecord = recordsToEvaluate.length > 0 && totalSubjects > 0;

      if (recordsToEvaluate.length === 0 || totalSubjects === 0) {
        return {
          isOffered: true,
          status: 'PENDING' as const,
          label: 'Pending',
          displayText: 'Pending',
          hasRecord: false,
          courseCount: 0,
          uploaded: 0,
          total: 0,
        };
      }

      if (uploadedCount === totalSubjects && totalSubjects > 0) {
        return {
          isOffered: true,
          status: 'COMPLETE' as const,
          label: 'Complete',
          displayText: `Complete (${uploadedCount}/${totalSubjects})`,
          hasRecord,
          courseCount: totalSubjects,
          uploaded: uploadedCount,
          total: totalSubjects,
        };
      }

      if (uploadedCount > 0 || inProgressCount > 0) {
        return {
          isOffered: true,
          status: 'IN_PROGRESS' as const,
          label: 'In Progress',
          displayText: `In Progress (${uploadedCount}/${totalSubjects})`,
          hasRecord,
          courseCount: totalSubjects,
          uploaded: uploadedCount,
          total: totalSubjects,
        };
      }

      return {
        isOffered: true,
        status: 'PENDING' as const,
        label: 'Pending',
        displayText: `Pending (${uploadedCount}/${totalSubjects})`,
        hasRecord,
        courseCount: totalSubjects,
        uploaded: uploadedCount,
        total: totalSubjects,
      };
    };

    return {
      morning: getShiftMetrics('Morning'),
      evening: getShiftMetrics('Evening'),
    };
  }, [
    department,
    program,
    degreeLevel,
    shift,
    section,
    session,
    semester,
    hodCoordinator,
    submissionDate,
    subjects,
    currentUser,
    lastSavedTime,
    isExistingRecord,
    storageVersion,
  ]);

  // Sync props if changed externally (e.g. from VC Dashboard "Inspect Record" or parent)
  useEffect(() => {
    if (selectedDepartmentProp && selectedDepartmentProp !== department) {
      if (currentUser?.role === 'HOD' && currentUser.department && !isVC && !isAdmin) {
        if (department !== currentUser.department) {
          setDepartment(currentUser.department);
        }
      } else {
        setDepartment(selectedDepartmentProp);
      }
    }
    if (selectedProgramProp && selectedProgramProp !== program) {
      setProgram(selectedProgramProp);
    }
    if (selectedShiftProp && selectedShiftProp !== shift) {
      setShift(selectedShiftProp);
    }
    if (selectedSessionProp && selectedSessionProp !== session) {
      setSession(selectedSessionProp);
    }
    if (selectedSemesterProp && selectedSemesterProp !== semester) {
      const cleanSem = selectedSemesterProp === 'ALL' ? '1' : selectedSemesterProp;
      setSemester(cleanSem);
    }
    if (selectedSectionProp && selectedSectionProp.trim().toUpperCase() !== section) {
      setSection(selectedSectionProp.trim().toUpperCase());
    }
  }, [selectedDepartmentProp, selectedProgramProp, selectedShiftProp, selectedSessionProp, selectedSemesterProp, selectedSectionProp, currentUser, isVC, isAdmin]);

  // Strict Department Isolation for HOD & Coordinator roles (Only when NOT in VC or Admin or readOnly inspection mode)
  useEffect(() => {
    if (currentUser?.role === 'VC' || currentUser?.role === 'ADMIN' || isReadOnly || readOnly) {
      return;
    }
    const isRestricted = currentUser?.role === 'HOD' || currentUser?.role === 'COORDINATOR';
    if (isRestricted && currentUser.department) {
      if (department !== currentUser.department) {
        handleDepartmentChange(currentUser.department);
      }
    }
    // If user is a Coordinator with an assigned single program, auto-select it if not already set
    if (currentUser?.role === 'COORDINATOR' && currentUser.program && !currentUser.assignedPrograms) {
      if (program !== currentUser.program) {
        setProgram(currentUser.program);
        if (onProgramChangedProp) onProgramChangedProp(currentUser.program);
      }
    }
  }, [currentUser, department, isReadOnly, readOnly]);

  // Ensure the selected program is valid for the selected department
  useEffect(() => {
    const dept = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === (department || '').trim().toLowerCase() || d.code.trim().toLowerCase() === (department || '').trim().toLowerCase()
    );
    if (!dept) return;

    const activeNames = StorageService.getSessionPrograms(department, session);
    const isProgramInDept = dept.programs.some(
      (p) => StorageService._isProgMatch(p.name, program)
    );

    if (isPrivilegedUser) {
      if (!isProgramInDept && dept.programs.length > 0) {
        setProgram(dept.programs[0].name);
        if (onProgramChangedProp) onProgramChangedProp(dept.programs[0].name);
      }
      return;
    }

    // Strict Coordinator Isolation: Only fall back to allowed assigned programs
    const isProgramAllowed = coordinatorAllowedPrograms.some(
      (p) => StorageService._isProgMatch(p.name, program)
    );
    if (!isProgramAllowed) {
      const fallback = coordinatorAllowedPrograms[0]?.name || '';
      if (fallback !== program) {
        setProgram(fallback);
        if (onProgramChangedProp) onProgramChangedProp(fallback);
      }
    }
  }, [department, session, storageVersion, rosterVersion, allDeptPrograms, program, isPrivilegedUser, coordinatorAllowedPrograms, onProgramChangedProp]);

  // When department changes, update program to the first program of that department
  const handleDepartmentChange = (newDept: string) => {
    if (currentUser?.role === 'HOD' && currentUser.department && newDept !== currentUser.department && !isVC && !isAdmin) {
      showFeedback('warning', `Security Isolation: As HOD, you are authorized to manage ${currentUser.department} only.`);
      return;
    }
    setDepartment(newDept);
    if (onDepartmentChangedProp) onDepartmentChangedProp(newDept);
    const targetDept = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === newDept.trim().toLowerCase() || d.code.trim().toLowerCase() === newDept.trim().toLowerCase()
    );
    if (targetDept && targetDept.programs.length > 0) {
      const progName = targetDept.programs[0].name;
      setProgram(progName);
      if (onProgramChangedProp) onProgramChangedProp(progName);
    } else {
      setProgram('');
      if (onProgramChangedProp) onProgramChangedProp('');
    }
  };

  const handleProgramChange = (newProg: string) => {
    if (!isPrivilegedUser) {
      const isAllowed = coordinatorAllowedPrograms.some(
        (p) => p.name.trim().toLowerCase() === newProg.trim().toLowerCase()
      );
      if (!isAllowed) {
        showFeedback(
          'warning',
          `Access Restricted: Only Head of Department (HOD) has privilege to select other program coordinators' data. You are assigned to: ${coordinatorAllowedPrograms.map((p) => p.name).join(', ')}`
        );
        return;
      }
    }
    setProgram(newProg);
    if (onProgramChangedProp) onProgramChangedProp(newProg);
  };

  // Validate that program belongs to selected department, active session roster & allowed coordinator scope
  useEffect(() => {
    if (!department) return;
    const activeNames = StorageService.getSessionPrograms(department, session);
    
    if (!isPrivilegedUser) {
      const activeAllowed = coordinatorAllowedPrograms.filter((p) => activeNames.includes(p.name));
      const isAllowed = activeAllowed.some(
        (p) => StorageService._isProgMatch(p.name, program)
      );
      if (!isAllowed && activeAllowed.length > 0) {
        const fallback = activeAllowed[0].name;
        setProgram(fallback);
        if (onProgramChangedProp) onProgramChangedProp(fallback);
      }
      return;
    }

    const targetDept = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === department.trim().toLowerCase() || d.code.trim().toLowerCase() === department.trim().toLowerCase()
    );
    if (targetDept) {
      const isValid = targetDept.programs.some((p) => StorageService._isProgMatch(p.name, program));
      if (!isValid && targetDept.programs.length > 0) {
        const fallback = targetDept.programs[0].name;
        setProgram(fallback);
        if (onProgramChangedProp) onProgramChangedProp(fallback);
      }
    }
  }, [department, session, isPrivilegedUser, coordinatorAllowedPrograms]);

  const handleShiftChange = (newShift: AcademicShift) => {
    setShift(newShift);
    if (onShiftChangedProp) onShiftChangedProp(newShift);
  };

  // LOAD / CHECK EXISTING RECORD whenever Department, Program, Degree Level, Shift, Session, Semester, Section, or Storage updates
  useEffect(() => {
    if (!department || !program) return;

    const existing = StorageService.getSubmission(
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester,
      section
    );

    if (existing) {
      // Existing record exists -> LOAD EXACT SAVED ROWS ONLY
      setIsExistingRecord(true);
      setLoadedRecord(existing);
      setLastSavedTime(existing.updatedAt);
      setLoadedUpdatedAt(existing.updatedAt);
      setHodCoordinator(resolveProgramCoordinatorName(department, program, shift, existing.hodCoordinator));
      if (existing.submissionDate) setSubmissionDate(existing.submissionDate);

      // Filter to existing non-empty rows; if empty (0 courses remaining), preserve empty state
      const validRows = (existing.subjects || []).filter(
        (r) => r.courseCode.trim() || r.subjectTitle.trim() || r.status
      );
      setSubjects(validRows);
      setSelectedRowIds(new Set());

      showFeedback(
        'info',
        `Database record loaded for ${program} [${shift} Shift – Semester ${semester} – Section ${section}]: ${validRows.length} subject(s) saved.`
      );
    } else {
      
      // No record exists -> Start with 1 clean row
      setIsExistingRecord(false);
      setLoadedRecord(null);
      setLastSavedTime(null);
      setLoadedUpdatedAt(null);
      setHodCoordinator(resolveProgramCoordinatorName(department, program, shift));

      setSubjects(createInitialBlankRows(1, shift, semester, section));

      setSelectedRowIds(new Set());
      showFeedback(
        'info',
        `Ready to enter courses for ${program} (${shift} Shift – Semester ${semester} – Section ${section}). Fill course details and click 'Submit Result Status'.`
      );
    }
  }, [department, program, degreeLevel, shift, session, semester, section, storageVersion]);

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

  // Filtered rows for course table search with multi-field and scope support
  const filteredSubjects = useMemo(() => {
    let list = subjects;
    if (courseFilterScope === 'PENDING') {
      list = list.filter((s) => s.status === 'Pending');
    }
    if (!courseFilterQuery.trim()) return list;
    const q = courseFilterQuery.toLowerCase().trim();

    return list.filter((s) => {
      const code = (s.courseCode || '').toLowerCase();
      const title = (s.subjectTitle || '').toLowerCase();
      const teacher = (s.uploadedBy || '').toLowerCase();
      const remarks = (s.remarks || '').toLowerCase();
      const status = (s.status || '').toLowerCase();
      const secShift = (s.sectionShift || '').toLowerCase();

      if (courseFilterScope === 'CODE') {
        return code.includes(q);
      }
      if (courseFilterScope === 'SUBJECT') {
        return title.includes(q);
      }
      if (courseFilterScope === 'FACULTY') {
        return teacher.includes(q);
      }
      // 'ALL' or 'PENDING'
      return (
        code.includes(q) ||
        title.includes(q) ||
        teacher.includes(q) ||
        status.includes(q) ||
        remarks.includes(q) ||
        secShift.includes(q)
      );
    });
  }, [subjects, courseFilterQuery, courseFilterScope]);

  // Compute matches in other cohorts (semesters/sections) of this program if 0 in active view
  const otherCohortsMatches = useMemo((): OtherCohortMatch[] => {
    const q = courseFilterQuery.toLowerCase().trim();
    if (q.length < 2 || filteredSubjects.length > 0) return [];

    const matches: OtherCohortMatch[] = [];
    const allStore = StorageService.getAllSubmissions();

    allStore.forEach((rec) => {
      if (
        !StorageService._isDeptMatch(department, rec.department) ||
        !StorageService._isProgMatch(program, rec.program)
      ) {
        return;
      }
      const recSem = String(rec.semester || '1').replace(/\D/g, '');
      const recSec = rec.section || 'A';
      const recShift = (rec.shift as AcademicShift) || shift;

      // Skip current active cohort
      if (recSem === semester && recSec === section && recShift === shift) {
        return;
      }

      if (rec.subjects && Array.isArray(rec.subjects)) {
        rec.subjects.forEach((sub) => {
          const code = (sub.courseCode || '').toLowerCase();
          const title = (sub.subjectTitle || '').toLowerCase();
          const teacher = (sub.uploadedBy || '').toLowerCase();

          let isMatch = false;
          if (courseFilterScope === 'CODE' && code.includes(q)) isMatch = true;
          else if (courseFilterScope === 'SUBJECT' && title.includes(q)) isMatch = true;
          else if (courseFilterScope === 'FACULTY' && teacher.includes(q)) isMatch = true;
          else if (code.includes(q) || title.includes(q) || teacher.includes(q)) isMatch = true;

          if (isMatch) {
            matches.push({
              semester: recSem,
              section: recSec,
              shift: recShift,
              courseCode: sub.courseCode,
              subjectTitle: sub.subjectTitle,
              faculty: sub.uploadedBy || '',
              status: sub.status,
            });
          }
        });
      }
    });

    return matches.slice(0, 6);
  }, [courseFilterQuery, courseFilterScope, filteredSubjects.length, department, program, semester, section, shift, storageVersion]);

  // Text highlighting helper for search matches
  const highlightMatch = useCallback(
    (text: string | undefined | null, query: string) => {
      if (!text) return null;
      if (!query || !query.trim()) return <>{text}</>;
      const q = query.trim();
      try {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
        return (
          <>
            {parts.map((part, i) =>
              part.toLowerCase() === q.toLowerCase() ? (
                <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded">
                  {part}
                </mark>
              ) : (
                part
              )
            )}
          </>
        );
      } catch {
        return <>{text}</>;
      }
    },
    []
  );

  // Clean up auto-save timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (autoSaveToastTimeoutRef.current) clearTimeout(autoSaveToastTimeoutRef.current);
    };
  }, []);

  // Real-Time Auto-Save Function
  const triggerAutoSave = useCallback(
    (
      updatedSubjects: SubjectRow[],
      changeDescription?: string,
      detailInfo?: string
    ) => {
      // Do not auto-save if in read-only mode, or missing essential routing info
      if (effectiveReadOnly || !department || !program) return;

      // Update state to saving
      setAutoSaveStatus('saving');

      // Clear previous debounce timer
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const isHodOrAdmin = currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN';
          const activeRows = updatedSubjects.filter(
            (s) => s.courseCode.trim() || s.subjectTitle.trim() || s.uploadedBy.trim() || s.status
          );
          const today = new Date().toISOString().split('T')[0];
          const resolvedRows = activeRows.map((s) => ({
            ...s,
            dateUploaded:
              s.status === 'Uploaded'
                ? s.dateUploaded || submissionDate || today
                : s.dateUploaded || '',
          }));

          const recordToSave: SubmissionRecord = {
            id: '',
            department,
            program,
            degreeLevel,
            shift,
            section,
            session,
            semester,
            hodCoordinator,
            submissionDate,
            subjects: resolvedRows,
            accessedBy: currentUser?.name || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
            userDesignation: currentUser?.designation || (isHodOrAdmin ? 'Head of Department (HOD)' : 'Program Coordinator'),
            lastUpdatedByRole: currentUser?.role || (isHodOrAdmin ? 'HOD' : 'COORDINATOR'),
            lastUpdatedByName: currentUser?.name || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
            lastUpdatedByDesignation: currentUser?.designation || (isHodOrAdmin ? 'Head of Department (HOD)' : 'Program Coordinator'),
            hodLastModifiedAt: isHodOrAdmin ? new Date().toISOString() : loadedRecord?.hodLastModifiedAt,
            hodLastModifiedBy: isHodOrAdmin ? (currentUser?.name || 'Head of Department') : loadedRecord?.hodLastModifiedBy,
            createdAt: loadedRecord?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const result = await StorageService.saveSubmission(recordToSave);
          if (result.success) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setAutoSaveStatus('saved');
            setLastSavedTime(recordToSave.updatedAt);
            setLastAutoSavedTime(timeStr);
            setIsExistingRecord(true);
            setLoadedUpdatedAt(recordToSave.updatedAt);
            setLoadedRecord(recordToSave);

            // Trigger auto-save toast feedback
            if (autoSaveToastTimeoutRef.current) {
              clearTimeout(autoSaveToastTimeoutRef.current);
            }
            setAutoSaveToast({
              message: changeDescription || 'Auto-saved to database',
              timestamp: timeStr,
              detail: detailInfo || `${program} • Sem ${semester} • Sec ${section}`,
            });

            autoSaveToastTimeoutRef.current = setTimeout(() => {
              setAutoSaveToast(null);
            }, 3500);

            if (onRecordSavedOrDeleted) {
              onRecordSavedOrDeleted();
            }
          } else {
            setAutoSaveStatus('error');
          }
        } catch (err) {
          console.error('Auto-save error:', err);
          setAutoSaveStatus('error');
        }
      }, 750);
    },
    [
      effectiveReadOnly,
      department,
      program,
      degreeLevel,
      shift,
      section,
      session,
      semester,
      hodCoordinator,
      submissionDate,
      currentUser,
      loadedRecord,
      onRecordSavedOrDeleted,
    ]
  );

  // Field change handler by index
  const handleRowChange = (index: number, field: keyof SubjectRow, value: string) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      const courseLabel = next[index].courseCode || next[index].subjectTitle || `Row #${index + 1}`;
      triggerAutoSave(next, `Updated ${String(field)} for ${courseLabel}`);
      return next;
    });
  };

  // Field change handler by Row ID (immune to search/filter order)
  const handleRowChangeById = (rowId: string, field: keyof SubjectRow, value: string) => {
    setSubjects((prev) => {
      let targetCourseLabel = 'Course';
      const next = prev.map((item) => {
        if (item.id === rowId) {
          targetCourseLabel = item.courseCode || item.subjectTitle || 'Course';
          const updated = { ...item, [field]: value };
          if (field === 'status' && value === 'Uploaded' && !item.dateUploaded) {
            updated.dateUploaded = submissionDate || new Date().toISOString().split('T')[0];
          }
          return updated;
        }
        return item;
      });
      
      const fieldDesc =
        field === 'status'
          ? `LMS Status set to "${value}"`
          : field === 'remarks'
          ? 'Delay remarks updated'
          : field === 'uploadedBy'
          ? 'Teacher/Instructor updated'
          : `${String(field)} updated`;

      triggerAutoSave(next, `Auto-Saved: ${targetCourseLabel} (${fieldDesc})`);

      // Log subject modification audit
      if (field === 'status' || field === 'subjectTitle' || field === 'courseCode') {
        const isHodUser = currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN';
        AuditTrailService.logChange({
          action: 'UPDATED',
          actorId: currentUser?.id,
          actorName: currentUser?.name || hodCoordinator || (isHodUser ? 'Head of Department' : 'Program Coordinator'),
          actorRole: isHodUser ? 'Head of Department (HOD)' : (currentUser?.role || 'COORDINATOR'),
          department,
          program,
          shift,
          semester,
          section,
          summary: `Updated course "${targetCourseLabel}": ${fieldDesc}`,
          details: [{ field: String(field), newValue: value, courseCode: targetCourseLabel }],
        });
      }

      return next;
    });
  };

  // Add extra row (up to 25 rows maximum)
  const handleAddRow = () => {
    if (subjects.length >= 25) {
      showFeedback('warning', 'Maximum 25 subject rows reached for this sheet.');
      return;
    }
    const newRow = createEmptySubjectRow(subjects.length + 1, shift, semester, section);
    const updated = [...subjects, newRow];
    setSubjects(updated);
    showFeedback('info', `Added subject row #${subjects.length + 1} for Semester ${semester} (Section ${section}).`);
    triggerAutoSave(updated, `Added Course Row #${subjects.length + 1}`);

    const isHodUser = currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN';
    AuditTrailService.logChange({
      action: 'CREATED',
      actorId: currentUser?.id,
      actorName: currentUser?.name || hodCoordinator || (isHodUser ? 'Head of Department' : 'Program Coordinator'),
      actorRole: isHodUser ? 'Head of Department (HOD)' : (currentUser?.role || 'COORDINATOR'),
      department,
      program,
      shift,
      semester,
      section,
      summary: `Created subject row #${subjects.length + 1} for ${program} (${shift} Shift, Sem ${semester}, Sec ${section})`,
    });
  };

  // Remove last course row (allows deleting down to 0 rows)
  const handleRemoveRow = () => {
    if (subjects.length === 0) {
      showFeedback('info', 'Table has no course rows left (0 rows).');
      return;
    }
    const lastSubject = subjects[subjects.length - 1];
    const targetLabel = lastSubject?.courseCode || lastSubject?.subjectTitle || `Row #${subjects.length}`;
    const updated = subjects.slice(0, -1);
    setSubjects(updated);
    showFeedback('info', 'Last course row removed.');
    triggerAutoSave(updated, 'Removed last course row');

    const isHodUser = currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN';
    AuditTrailService.logChange({
      action: 'DELETED',
      actorId: currentUser?.id,
      actorName: currentUser?.name || hodCoordinator || (isHodUser ? 'Head of Department' : 'Program Coordinator'),
      actorRole: isHodUser ? 'Head of Department (HOD)' : (currentUser?.role || 'COORDINATOR'),
      department,
      program,
      shift,
      semester,
      section,
      summary: `Deleted course row "${targetLabel}" from ${program} (${shift} Shift, Sem ${semester}, Sec ${section})`,
    });
  };

  // Clear all course rows (allows wiping all rows to save empty state)
  const handleClearAllRows = () => {
    if (subjects.length === 0) {
      showFeedback('info', 'Course table is already empty (0 courses).');
      return;
    }
    setSubjects([]);
    setSelectedRowIds(new Set());
    showFeedback(
      'info',
      'All course rows removed from the table. Click "Update Record in Database" to save this cleared state or "Delete Record" to delete the record entirely.'
    );
    triggerAutoSave([], 'Cleared all course rows from table');
  };

  // Delete a specific row
  const handleDeleteRow = (index: number) => {
    const updated = subjects.filter((_, i) => i !== index);
    setSubjects(updated);
    showFeedback('info', `Removed row #${index + 1}.`);
    triggerAutoSave(updated, `Removed Course Row #${index + 1}`);
  };

  // Delete row by ID
  const handleDeleteRowById = (rowId: string) => {
    const target = subjects.find((s) => s.id === rowId);
    const updated = subjects.filter((item) => item.id !== rowId);
    setSubjects(updated);
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    showFeedback('info', 'Course row removed.');
    triggerAutoSave(updated, `Removed course ${target?.courseCode || target?.subjectTitle || ''}`);
  };

  // Batch delete selected rows
  const handleBatchDeleteSelected = () => {
    if (selectedRowIds.size === 0) {
      showFeedback('info', 'No courses selected to remove.');
      return;
    }
    const count = selectedRowIds.size;
    const updated = subjects.filter((item) => !selectedRowIds.has(item.id));
    setSubjects(updated);
    setSelectedRowIds(new Set());
    showFeedback('info', `Removed ${count} selected course row(s).`);
    triggerAutoSave(updated, `Removed ${count} selected courses`);
  };

  // Duplicate row by ID
  const handleDuplicateRow = (rowId: string) => {
    const existing = subjects.find((s) => s.id === rowId);
    if (!existing) return;
    const duplicated: SubjectRow = {
      ...existing,
      id: `row_${Date.now()}_dup_${Math.random().toString(36).substring(2, 6)}`,
      subjectTitle: existing.subjectTitle ? `${existing.subjectTitle} (Copy)` : '',
    };
    const updated = [...subjects, duplicated];
    setSubjects(updated);
    showFeedback('success', `Duplicated course ${existing.courseCode || existing.subjectTitle}.`);
    triggerAutoSave(updated, `Duplicated course ${existing.courseCode || existing.subjectTitle}`);
  };

  // Row Selection Helpers
  const isAnySelected = selectedRowIds.size > 0;
  const selectedCount = selectedRowIds.size;

  const handleToggleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
    setApplyScope('selected');
  };

  const allFilteredSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => selectedRowIds.has(s.id));

  const someFilteredSelected =
    filteredSubjects.some((s) => selectedRowIds.has(s.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        filteredSubjects.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        filteredSubjects.forEach((s) => next.add(s.id));
        return next;
      });
      setApplyScope('selected');
    }
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const handleSelectByStatus = (targetStatus: LMSStatus) => {
    const matching = filteredSubjects.filter((s) => s.status === targetStatus);
    if (matching.length === 0) {
      showFeedback('info', `No courses found with status "${targetStatus}".`);
      return;
    }
    setSelectedRowIds(new Set(matching.map((s) => s.id)));
    setApplyScope('selected');
    showFeedback('info', `Selected ${matching.length} course(s) with status "${targetStatus}".`);
  };

  // Helper to determine target courses for Quick Tools (Selected vs All)
  const getTargetSubjectRows = () => {
    const isSelectionActive = isAnySelected && applyScope === 'selected';
    if (isSelectionActive) {
      const targets = subjects.filter((s) => selectedRowIds.has(s.id));
      return {
        targetIds: new Set(targets.map((s) => s.id)),
        count: targets.length,
        isSelection: true,
      };
    }
    return {
      targetIds: new Set(subjects.map((s) => s.id)),
      count: subjects.length,
      isSelection: false,
    };
  };

  // Enterprise Quick Tool Operations (Selective or Global)
  const handleBatchMarkStatus = (newStatus: LMSStatus) => {
    const today = new Date().toISOString().split('T')[0];
    const { targetIds, count, isSelection } = getTargetSubjectRows();

    if (count === 0) {
      showFeedback('warning', 'Please select at least one course row.');
      return;
    }

    const updated = subjects.map((s) => {
      if (!targetIds.has(s.id)) return s;
      return {
        ...s,
        status: newStatus,
        dateUploaded: newStatus === 'Uploaded' ? (s.dateUploaded || today) : s.dateUploaded,
        uploadedBy: s.uploadedBy || '',
      };
    });

    setSubjects(updated);

    const scopeLabel = isSelection ? `${count} selected course(s)` : `all ${count} courses`;
    showFeedback('info', `Quick Tool: Marked ${scopeLabel} as "${newStatus}".`);
    triggerAutoSave(updated, `Marked ${scopeLabel} as "${newStatus}"`);
  };

  const handleBatchSetTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const { targetIds, count, isSelection } = getTargetSubjectRows();

    if (count === 0) {
      showFeedback('warning', 'Please select at least one course row.');
      return;
    }

    const updated = subjects.map((s) => {
      if (!targetIds.has(s.id)) return s;
      return {
        ...s,
        dateUploaded: today,
      };
    });

    setSubjects(updated);

    const scopeLabel = isSelection ? `${count} selected course(s)` : `all courses`;
    showFeedback('info', `Quick Tool: Set today's date (${today}) for ${scopeLabel}.`);
    triggerAutoSave(updated, `Set today's date for ${scopeLabel}`);
  };

  const handleBatchFillUploader = () => {
    const defaultName = currentUser?.name || 'Department Faculty';
    const { targetIds, count, isSelection } = getTargetSubjectRows();

    if (count === 0) {
      showFeedback('warning', 'Please select at least one course row.');
      return;
    }

    const updated = subjects.map((s) => {
      if (!targetIds.has(s.id)) return s;
      return {
        ...s,
        uploadedBy: s.uploadedBy?.trim() ? s.uploadedBy : defaultName,
      };
    });

    setSubjects(updated);

    const scopeLabel = isSelection ? `${count} selected course(s)` : `empty course rows`;
    showFeedback('info', `Quick Tool: Applied "${defaultName}" as instructor/uploader to ${scopeLabel}.`);
    triggerAutoSave(updated, `Assigned "${defaultName}" to ${scopeLabel}`);
  };

  const handleBatchApplyDelayReason = (reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) return;

    // Persist custom reasons to localStorage if not standard
    if (!STANDARD_DELAY_REASONS.includes(trimmed)) {
      setRecentCustomReasons((prev) => {
        const filtered = prev.filter((r) => r.toLowerCase() !== trimmed.toLowerCase());
        const updated = [trimmed, ...filtered].slice(0, 8);
        try {
          localStorage.setItem('mnsuet_custom_delay_reasons', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save custom reasons', err);
        }
        return updated;
      });
    }

    const { targetIds, count, isSelection } = getTargetSubjectRows();
    let updatedCount = 0;

    const updated = subjects.map((s) => {
      if (isSelection) {
        if (targetIds.has(s.id)) {
          updatedCount++;
          return { ...s, remarks: trimmed };
        }
        return s;
      }
      // If applying globally: apply to Pending, In Progress, or rows without remarks
      if (s.status === 'Pending' || s.status === 'In Progress' || !s.remarks?.trim()) {
        updatedCount++;
        return { ...s, remarks: trimmed };
      }
      return s;
    });

    setSubjects(updated);

    setIsCustomReasonOpen(false);
    setCustomReasonInput('');

    const scopeLabel = isSelection
      ? `${count} selected course(s)`
      : `all pending/in-progress courses (${updatedCount} updated)`;
    showFeedback('info', `Quick Tool: Applied delay remark "${trimmed}" to ${scopeLabel}.`);
    triggerAutoSave(updated, `Applied delay remarks to ${scopeLabel}`);
  };

  const handleImportCourses = (
    imported: Partial<SubjectRow>[],
    mode: 'replace' | 'append',
    targetSec?: string
  ) => {
    const effectiveSection = (targetSec || section).trim().toUpperCase();
    if (effectiveSection && effectiveSection !== section) {
      setSection(effectiveSection);
      if (onSectionChangedProp) onSectionChangedProp(effectiveSection);
    }

    const newRows: SubjectRow[] = imported.map((c, i) => ({
      id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + i,
      courseCode: c.courseCode || '',
      subjectTitle: c.subjectTitle || '',
      creditHours: c.creditHours || '3',
      sectionShift: c.sectionShift || `${shift} - Sem ${semester} (Sec ${effectiveSection})`,
      status: c.status || 'Uploaded',
      dateUploaded: c.dateUploaded || (c.status === 'Uploaded' ? new Date().toISOString().split('T')[0] : ''),
      uploadedBy: c.uploadedBy || '',
      remarks: c.remarks || '',
    }));

    if (mode === 'replace') {
      const total = Math.max(newRows.length, 1);
      const filledRows: SubjectRow[] = [...newRows];
      while (filledRows.length < 1) {
        filledRows.push(createEmptySubjectRow(filledRows.length + 1, shift, semester, effectiveSection));
      }
      setSubjects(filledRows);
      showFeedback(
        'success',
        `Imported ${newRows.length} course(s) for Section ${effectiveSection} (Replaced table). Remember to click 'Submit Result Status' or Save.`
      );
      triggerAutoSave(filledRows, `Imported ${newRows.length} courses for Section ${effectiveSection}`);
    } else {
      const updated = [...subjects, ...newRows];
      setSubjects(updated);
      showFeedback(
        'success',
        `Appended ${newRows.length} course(s) to Section ${effectiveSection} sheet.`
      );
      triggerAutoSave(updated, `Appended ${newRows.length} courses to Section ${effectiveSection}`);
    }
  };

  // Direct multi-section database synchronization (e.g. from LMS portal export with Section A & Section B)
  const handleImportDirectToSections = (
    sectionData: Record<string, Partial<SubjectRow>[]>,
    mode: 'replace' | 'append'
  ) => {
    let savedTotal = 0;
    const secKeys = Object.keys(sectionData);

    secKeys.forEach((secKey) => {
      const courses = sectionData[secKey];
      if (!courses || courses.length === 0) return;

      const existingRec = StorageService.getSubmission(
        department,
        program,
        degreeLevel,
        shift,
        session,
        semester,
        secKey
      );

      const newRows: SubjectRow[] = courses.map((c, i) => ({
        id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + i,
        courseCode: c.courseCode || '',
        subjectTitle: c.subjectTitle || '',
        creditHours: c.creditHours || '3',
        sectionShift: `${shift} - Sem ${semester} (Sec ${secKey})`,
        status: c.status || 'Uploaded',
        dateUploaded: c.dateUploaded || (c.status === 'Uploaded' ? new Date().toISOString().split('T')[0] : ''),
        uploadedBy: c.uploadedBy || '',
        remarks: c.remarks || 'LMS Portal Bulk Synchronization',
      }));

      let finalRows: SubjectRow[] = [];
      if (mode === 'replace' || !existingRec) {
        finalRows = [...newRows];
        while (finalRows.length < 1) {
          finalRows.push(createEmptySubjectRow(finalRows.length + 1, shift, semester, secKey));
        }
      } else {
        finalRows = [...(existingRec.subjects || []), ...newRows];
      }

      const today = new Date().toISOString().split('T')[0];
      const recToSave: SubmissionRecord = {
        id: '',
        department,
        program,
        degreeLevel,
        shift,
        session,
        semester,
        section: secKey,
        hodCoordinator: hodCoordinator || currentUser?.name || 'HOD / Coordinator',
        submissionDate: submissionDate || today,
        subjects: finalRows,
        accessedBy: currentUser?.name || 'Department Faculty',
        userDesignation: currentUser?.designation || 'HOD / Coordinator',
        createdAt: existingRec?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      StorageService.saveSubmission(recToSave);
      savedTotal += newRows.length;
    });

    // Refresh current active section view if it was updated
    const currentUpdated = StorageService.getSubmission(
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester,
      section
    );
    if (currentUpdated) {
      setSubjects(currentUpdated.subjects);
      setIsExistingRecord(true);
      setLastSavedTime(currentUpdated.updatedAt);
    }

    showFeedback(
      'success',
      `Synchronized & Saved ${savedTotal} course(s) across Section ${secKeys.join(' & Section ')} directly to database!`
    );

    dispatchSyncEvidence(
      'SAVE',
      'Database Dual Section Saved & Synced',
      `Successfully synchronized and saved ${savedTotal} course(s) across Section ${secKeys.join(' & Section ')} directly to database.`,
      `${program} • ${shift} Shift • Sem ${semester} (Sec ${secKeys.join(' & ')})`,
      currentUser?.name || hodCoordinator
    );

    if (onRecordSavedOrDeleted) {
      onRecordSavedOrDeleted();
    }
  };

  // Helper to copy syllabus from Section A to Section B (or vice versa) without overlapping records
  const handleCopySyllabusFromOtherSection = (sourceSec: string = 'A') => {
    const sourceRec = StorageService.getSubmission(
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester,
      sourceSec
    );
    if (!sourceRec || !sourceRec.subjects || sourceRec.subjects.length === 0) {
      showFeedback('warning', `No course syllabus found in Section ${sourceSec} to copy.`);
      return;
    }
    const valid = sourceRec.subjects.filter((s) => s.courseCode.trim() || s.subjectTitle.trim());
    if (valid.length === 0) {
      showFeedback('warning', `Section ${sourceSec} has no courses recorded.`);
      return;
    }
    const copiedRows: SubjectRow[] = valid.map((s, idx) => ({
      id: `row_${Date.now()}_copy_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      courseCode: s.courseCode,
      subjectTitle: s.subjectTitle,
      creditHours: s.creditHours,
      sectionShift: `${shift} - Sem ${semester} (Sec ${section})`,
      status: '' as LMSStatus,
      dateUploaded: '',
      uploadedBy: s.uploadedBy || '',
      remarks: '',
    }));
    while (copiedRows.length < 1) {
      copiedRows.push(createEmptySubjectRow(copiedRows.length + 1, shift, semester, section));
    }
    setSubjects(copiedRows);
    showFeedback(
      'success',
      `Imported ${valid.length} course(s) from Section ${sourceSec} for Section ${section}. Section records remain completely isolated.`
    );
  };

  // State for mandatory field missing highlights
  const [missingFields, setMissingFields] = useState<Record<string, boolean>>({});

  // Save / Update handler
  const handleSave = async (forceOverwrite: boolean = false) => {
    if (!department || !program) {
      showFeedback('warning', 'Please select both Department and Program before saving.');
      return;
    }

    // Coordinator Approval Check
    if (isPendingCoordinator) {
      showFeedback('warning', 'Authorization Pending: Your coordinator account is awaiting approval by the Head of Department. You cannot submit LMS results until your account is approved.');
      return;
    }
    if (isRejectedCoordinator) {
      showFeedback('warning', 'Authorization Rejected: Your coordinator account authorization request was rejected by the Head of Department.');
      return;
    }

    // Strict Department Authorization Check for HOD
    if (currentUser?.role === 'HOD' && currentUser.department && !isVC && !isAdmin) {
      if (department.trim().toLowerCase() !== currentUser.department.trim().toLowerCase()) {
        showFeedback('warning', `Access Denied: As Head of Department, you can only manage data for ${currentUser.department}.`);
        return;
      }
    }

    // Filter active course rows that are partially filled
    const activeRows = subjects.filter(
      (s) => s.courseCode.trim() || s.subjectTitle.trim() || s.uploadedBy.trim() || s.status
    );

    // Conflict detection check (unless forced)
    if (!forceOverwrite) {
      const dbRecord = StorageService.getSubmission(
        department,
        program,
        degreeLevel,
        shift,
        session,
        semester,
        section
      );
      if (dbRecord && dbRecord.updatedAt && loadedUpdatedAt && dbRecord.updatedAt !== loadedUpdatedAt && dbRecord.accessedBy !== currentUser?.name) {
        setConflictRecord(dbRecord);
        return;
      }
    }

    // Mandatory Field Validation Engine - only runs if there are active rows
    if (activeRows.length > 0) {
      const newMissingFields: Record<string, boolean> = {};
      let missingCount = 0;

      activeRows.forEach((row) => {
        if (!row.courseCode || !row.courseCode.trim()) {
          newMissingFields[`${row.id}_courseCode`] = true;
          missingCount++;
        }
        if (!row.subjectTitle || !row.subjectTitle.trim()) {
          newMissingFields[`${row.id}_subjectTitle`] = true;
          missingCount++;
        }
        if (!row.creditHours || String(row.creditHours).trim() === '') {
          newMissingFields[`${row.id}_creditHours`] = true;
          missingCount++;
        }
        if (!row.uploadedBy || !row.uploadedBy.trim()) {
          newMissingFields[`${row.id}_uploadedBy`] = true;
          missingCount++;
        }
        if (!row.status) {
          newMissingFields[`${row.id}_status`] = true;
          missingCount++;
        }
      });

      setMissingFields(newMissingFields);

      if (missingCount > 0) {
        showFeedback(
          'warning',
          `⚠️ Validation Blocked: ${missingCount} mandatory field(s) are missing across ${activeRows.length} course record(s). Highlighted in red below. Please complete Course Code, Title, Credit Hours, Instructor Name, and LMS Status.`
        );
        return;
      }
    } else {
      setMissingFields({});
    }

    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const resolvedRows = activeRows.map((s) => ({
      ...s,
      dateUploaded: s.status === 'Uploaded' ? (s.dateUploaded || submissionDate || today) : (s.dateUploaded || ''),
    }));

    const isHodOrAdmin = currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN';

    const recordToSave: SubmissionRecord = {
      id: '', // Generated in service
      department,
      program,
      degreeLevel,
      shift,
      section,
      session,
      semester,
      hodCoordinator,
      submissionDate,
      subjects: resolvedRows,
      accessedBy: currentUser?.name || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
      userDesignation: currentUser?.designation || (isHodOrAdmin ? 'Head of Department (HOD)' : 'Program Coordinator'),
      lastUpdatedByRole: currentUser?.role || (isHodOrAdmin ? 'HOD' : 'COORDINATOR'),
      lastUpdatedByName: currentUser?.name || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
      lastUpdatedByDesignation: currentUser?.designation || (isHodOrAdmin ? 'Head of Department (HOD)' : 'Program Coordinator'),
      hodLastModifiedAt: isHodOrAdmin ? new Date().toISOString() : loadedRecord?.hodLastModifiedAt,
      hodLastModifiedBy: isHodOrAdmin ? (currentUser?.name || 'Head of Department') : loadedRecord?.hodLastModifiedBy,
      createdAt: loadedRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await StorageService.saveSubmission(recordToSave);
    setIsSaving(false);

    if (result.success) {
      setIsExistingRecord(true);
      const savedTime = new Date().toISOString();
      setLastSavedTime(savedTime);
      setLoadedUpdatedAt(savedTime);
      setLoadedRecord(recordToSave);
      setSubjects(activeRows);
      setMissingFields({});
      showFeedback(
        'success',
        activeRows.length === 0
          ? 'Record updated in database. All course records have been removed (0 courses remaining).'
          : result.quotaExceeded
          ? `Record saved locally & to server SQLite database (Cloud writes paused due to daily quota limit).`
          : (result.isUpdate ? "Record updated successfully." : "Record created successfully.")
      );

      // Audit Trail Logging with explicit HOD Attribution
      AuditTrailService.logChange({
        action: result.isUpdate ? 'UPDATED' : 'CREATED',
        actorId: currentUser?.id,
        actorName: currentUser?.name || hodCoordinator || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
        actorRole: isHodOrAdmin ? 'Head of Department (HOD)' : (currentUser?.role || 'COORDINATOR'),
        department,
        program,
        shift,
        semester,
        section,
        summary: isHodOrAdmin
          ? `[HOD UPDATE] Head of Department (${currentUser?.name || 'HOD'}) ${result.isUpdate ? 'updated' : 'saved'} ${activeRows.length} course record(s) for ${program} (${shift} Shift - Semester ${semester} Sec ${section})`
          : (activeRows.length === 0
              ? `Cleared and removed all course records (0 courses left) for ${program} (${shift} Shift - Semester ${semester} Sec ${section})`
              : `${result.isUpdate ? 'Updated' : 'Created'} ${activeRows.length} course result record(s) for ${program} (${shift} Shift - Semester ${semester} Sec ${section})`),
        details: activeRows.length > 0
          ? activeRows.map((r) => ({
              field: `${r.courseCode} - ${r.subjectTitle}`,
              oldValue: 'N/A',
              newValue: `Status: ${r.status} | Instructor: ${r.uploadedBy} | Cr.Hrs: ${r.creditHours}`,
            }))
          : [{
              field: 'ALL_COURSES',
              oldValue: 'Previous courses',
              newValue: 'All courses removed/cleared (0 courses in database)',
            }],
      });

      // Global Evidence Toast Notification
      dispatchSyncEvidence(
        result.isUpdate ? 'UPDATE' : 'SAVE',
        result.isUpdate ? 'Database Record Updated & Synced' : 'Database Record Saved & Synced',
        isHodOrAdmin
          ? `[HOD Update] Head of Department saved ${activeRows.length} course entry(s) to university database. Synced across all coordinator pages.`
          : `Successfully ${result.isUpdate ? 'updated' : 'saved'} ${activeRows.length} course entry(s) to university database. Data is persistent and mathematically aggregated across all executive monitors.`,
        `${program} • ${shift} Shift • Sem ${semester} (Sec ${section})`,
        currentUser?.name || hodCoordinator
      );

      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
    } else {
      showFeedback(
        'warning',
        '⚠️ Write Limit Exceeded: The Firestore daily write limit has been exceeded. Your submission cannot be saved at this time. Please try again later.'
      );
    }
  };

  // Clear Form (Requirement 11: Clear Form clears screen ONLY, does NOT delete database data)
  const handleClearForm = () => {
    setSubjects(createInitialBlankRows(1, shift, semester, section));
    showFeedback(
      'info',
      `Visible form cleared on screen for ${shift} shift – Semester ${semester} – Section ${section}. Previously saved database records remain untouched.`
    );
  };

  // Delete Record (Supports single cohort section or entire program deletion with safe audit trail)
  const handleDeleteConfirm = async (scope: DeleteScope = 'CURRENT_SECTION') => {
    // Strict Department Authorization Check for HOD
    if (currentUser?.role === 'HOD' && currentUser.department && !isVC && !isAdmin) {
      if (department.trim().toLowerCase() !== currentUser.department.trim().toLowerCase()) {
        showFeedback('warning', `Access Denied: As Head of Department, you can only delete records for ${currentUser.department}.`);
        setIsDeleteModalOpen(false);
        return;
      }
    }

    const isHodOrAdmin = currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN' || isVC;
    setIsDeleteModalOpen(false);

    if (scope === 'ENTIRE_PROGRAM') {
      const res = await StorageService.deleteProgramSubmissions(department, program);
      if (res.success && res.count > 0) {
        setIsExistingRecord(false);
        setLoadedRecord(null);
        setLastSavedTime(null);
        setSubjects(createInitialBlankRows(1, shift, semester, section));
        showFeedback('success', `All records for ${program} (${res.count} slots) were deleted successfully.`);

        // Audit Trail Logging
        AuditTrailService.logChange({
          action: 'DELETED',
          actorId: currentUser?.id,
          actorName: currentUser?.name || hodCoordinator || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
          actorRole: isHodOrAdmin ? 'Head of Department (HOD)' : (currentUser?.role || 'COORDINATOR'),
          department,
          program,
          shift,
          semester,
          section,
          summary: isHodOrAdmin
            ? `[HOD DELETION] Head of Department (${currentUser?.name || 'HOD'}) deleted all submission records for program: ${program} (${res.count} slots cleared)`
            : `Deleted all submission records for ${program} (${res.count} slots) by ${currentUser?.name || hodCoordinator}`,
        });

        dispatchSyncEvidence(
          'DELETE',
          'Program Records Deleted & Synced',
          `Successfully deleted all ${res.count} submission record(s) for ${program} from university cloud database.`,
          program,
          currentUser?.name || hodCoordinator
        );

        if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
      } else {
        showFeedback('info', `No active saved database records found for ${program} to delete.`);
      }
      return;
    }

    const success = await StorageService.deleteSubmission(
      department,
      program,
      degreeLevel,
      shift,
      session,
      semester,
      section
    );

    if (success) {
      setIsExistingRecord(false);
      setLoadedRecord(null);
      setLastSavedTime(null);
      setSubjects(createInitialBlankRows(1, shift, semester, section));
      showFeedback('success', 'Record deleted successfully.');

      // Audit Trail Logging with explicit HOD Attribution
      AuditTrailService.logChange({
        action: 'DELETED',
        actorId: currentUser?.id,
        actorName: currentUser?.name || hodCoordinator || (isHodOrAdmin ? 'Head of Department' : 'Program Coordinator'),
        actorRole: isHodOrAdmin ? 'Head of Department (HOD)' : (currentUser?.role || 'COORDINATOR'),
        department,
        program,
        shift,
        semester,
        section,
        summary: isHodOrAdmin
          ? `[HOD DELETION] Head of Department (${currentUser?.name || 'HOD'}) deleted submission record for ${program} (${shift} Shift - Semester ${semester} Sec ${section})`
          : `Deleted submission record for ${program} (${shift} Shift - Semester ${semester} Sec ${section}) by ${currentUser?.name || hodCoordinator}`,
      });

      // Global Evidence Toast Notification
      dispatchSyncEvidence(
        'DELETE',
        'Database Record Deleted & Synced',
        `Successfully deleted submission record for ${program} (${shift} Shift - Sem ${semester} Sec ${section}) from university cloud database.`,
        `${program} • ${shift} Shift • Sem ${semester} (Sec ${section})`,
        currentUser?.name || hodCoordinator
      );

      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
    } else {
      showFeedback('warning', 'No saved database record was found to delete.');
    }
  };

  // Export current program / department comprehensive CSV (Merging Morning & Evening shifts)
  const handleExportCurrent = () => {
    const isCoord =
      currentUser?.role === 'COORDINATOR' ||
      currentUser?.role === 'LECTURER' ||
      currentUser?.role === 'VISITING_LECTURER';

    const currentRec: SubmissionRecord = {
      id: 'current-active',
      department,
      program,
      degreeLevel,
      shift,
      section,
      session,
      semester,
      hodCoordinator,
      submissionDate,
      subjects,
      accessedBy: currentUser?.name || 'HOD / Coordinator',
      userDesignation: currentUser?.designation || (isCoord ? 'Coordinator' : 'HOD'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allStore = StorageService.getAllSubmissions();

    // Strict Role Scoping:
    // Coordinator: ONLY active program for active session & active semester
    // HOD: ALL programs in department for active session & active semester
    const scopedMatches = allStore.filter((r) => {
      const matchDept = StorageService._isDeptMatch(department, r.department);
      const matchSess = String(r.session || '2023').trim() === String(session).trim();
      const matchSem = String(r.semester || '1').trim() === String(semester).trim();

      if (!matchDept || !matchSess || !matchSem) return false;

      if (isCoord) {
        return StorageService._isProgMatch(program, r.program);
      }
      return true; // HOD sees all programs in department
    });

    let mergedRecords: SubmissionRecord[] = [];
    const hasCurrentInStore = scopedMatches.some(
      (r) =>
        StorageService._isProgMatch(program, r.program) &&
        String(r.semester) === String(semester) &&
        String(r.shift) === String(shift) &&
        String(r.section || 'A') === String(section)
    );

    if (hasCurrentInStore) {
      mergedRecords = scopedMatches.map((r) => {
        if (
          StorageService._isProgMatch(program, r.program) &&
          String(r.semester) === String(semester) &&
          String(r.shift) === String(shift) &&
          String(r.section || 'A') === String(section)
        ) {
          return currentRec;
        }
        return r;
      });
    } else {
      mergedRecords = [currentRec, ...scopedMatches];
    }

    // Sort by Program, Shift (Morning first, Evening second), Semester, Section
    mergedRecords.sort((a, b) => {
      if (a.program !== b.program) return a.program.localeCompare(b.program);
      if (a.shift !== b.shift) {
        if (a.shift === 'Morning') return -1;
        if (b.shift === 'Morning') return 1;
      }
      if (a.semester !== b.semester) return String(a.semester).localeCompare(String(a.semester));
      return (a.section || 'A').localeCompare(b.section || 'A');
    });

    const filename = isCoord
      ? `MNS_UET_${program.replace(/[^a-zA-Z0-9]/g, '_')}_Session_${session}_Sem_${semester}_Report.csv`
      : `MNS_UET_${department.replace(/[^a-zA-Z0-9]/g, '_')}_Session_${session}_Sem_${semester}_All_Programs_Report.csv`;

    StorageService.exportCSV(mergedRecords, filename);

    const message = isCoord
      ? `Exported result summary for ${program} [Session ${session}, Semester ${semester}].`
      : `Exported comprehensive report for all programs in ${department} [Session ${session}, Semester ${semester}].`;

    showFeedback('success', message);
  };

  const handleOpenPDFReport = (scope: ExportScope = 'ENTIRE_DEPARTMENT') => {
    const isCoord =
      currentUser?.role === 'COORDINATOR' ||
      currentUser?.role === 'LECTURER' ||
      currentUser?.role === 'VISITING_LECTURER';
    
    setExportDefaultScope(isCoord ? 'CURRENT_PROGRAM' : scope);
    setIsExportModalOpen(true);
  };

  // Header Quota Progress Bar for Department, Shift & Session
  const headerQuotaProgress = useMemo(() => {
    const allStore = StorageService.getAllSubmissions();
    const currentVirtualRec: SubmissionRecord = {
      id: 'current-active',
      department,
      program,
      degreeLevel,
      shift,
      section,
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

    // Filter matching records for selected department, shift, and session
    const deptMatches = allStore.filter(
      (r) =>
        StorageService._isDeptMatch(department, r.department) &&
        (r.shift || 'Morning') === shift &&
        String(r.session || '2023').trim() === String(session).trim()
    );

    // Merge current form contents if matching
    const hasCurrentInStore = deptMatches.some(
      (r) =>
        StorageService._isProgMatch(program, r.program) &&
        String(r.semester) === String(semester) &&
        String(r.section || 'A') === String(section)
    );

    let recordsToEvaluate: SubmissionRecord[] = [];
    if (hasCurrentInStore) {
      recordsToEvaluate = deptMatches.map((r) =>
        StorageService._isProgMatch(program, r.program) &&
        String(r.semester) === String(semester) &&
        String(r.section || 'A') === String(section)
          ? currentVirtualRec
          : r
      );
    } else {
      recordsToEvaluate = [currentVirtualRec, ...deptMatches];
    }

    let totalSubjects = 0;
    let uploadedCount = 0;
    let inProgressCount = 0;

    recordsToEvaluate.forEach((r) => {
      const activeRows = (r.subjects || []).filter(
        (s) => (s.courseCode && s.courseCode.trim()) || (s.subjectTitle && s.subjectTitle.trim()) || s.status
      );
      activeRows.forEach((s) => {
        totalSubjects++;
        if (s.status === 'Uploaded') uploadedCount++;
        else if (s.status === 'In Progress') inProgressCount++;
      });
    });

    const percentage = totalSubjects > 0 ? Math.round((uploadedCount / totalSubjects) * 100) : 0;

    return {
      uploaded: uploadedCount,
      total: totalSubjects,
      inProgress: inProgressCount,
      percentage,
      shift,
      session,
    };
  }, [department, program, degreeLevel, shift, section, session, semester, hodCoordinator, submissionDate, subjects, currentUser, storageVersion]);

  const handleSessionChangeFromModal = (newSess: string) => {
    setSession(newSess);
    if (onSessionChangedProp) onSessionChangedProp(newSess);
  };

  return (
    <div id="hod-entry-interface" className="space-y-6 w-full overflow-hidden">
      {/* Toast Notification Stack (Floating Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {/* Real-Time Auto-Save Toast Notification */}
        {autoSaveToast && (
          <div
            id="autosave-toast-notification"
            className="pointer-events-auto px-4 py-3 rounded-xl bg-slate-900/95 border border-emerald-500/60 text-white shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-400/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  Auto-Saved to Database
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{autoSaveToast.timestamp}</span>
              </div>
              <p className="text-xs font-semibold text-slate-100 truncate">{autoSaveToast.message}</p>
              {autoSaveToast.detail && (
                <p className="text-[10px] text-emerald-300/80 font-medium truncate mt-0.5">{autoSaveToast.detail}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAutoSaveToast(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* General Feedback Message */}
        {feedbackMessage && (
          <div
            id="status-feedback-banner"
            className={`pointer-events-auto px-4 py-3 rounded-xl border flex items-center gap-3 shadow-xl ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-emerald-500/20'
                : feedbackMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-amber-500/20'
                : 'bg-blue-50 border-blue-400 text-blue-950 shadow-blue-500/20'
            } animate-in slide-in-from-bottom-5 fade-in duration-300`}
          >
            {feedbackMessage.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
            {feedbackMessage.type === 'warning' && <Info className="w-6 h-6 text-amber-600 shrink-0" />}
            {feedbackMessage.type === 'info' && <Clock className="w-6 h-6 text-blue-600 shrink-0" />}
            
            <span className="font-bold text-sm leading-snug flex-1">{feedbackMessage.text}</span>
            
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="p-1 rounded-md hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        )}
      </div>

      {/* EXECUTIVE READ-ONLY INSPECTION BANNER (FOR VICE CHANCELLOR) */}
      {isReadOnly && (
        <div
          id="vc-inspection-banner"
          className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800 shadow-md animate-in fade-in"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-800/90 text-emerald-200 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded">
                  Executive Oversight (Read-Only)
                </span>
                <span className="text-slate-400 text-xs">
                  Vice Chancellor Academic Inspection
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm sm:text-base font-bold text-white">
                  {department}
                </span>
                <span className="text-slate-500">•</span>
                <div className="flex items-center gap-1.5 bg-slate-800 border border-emerald-500/60 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-300">Program:</span>
                  <select
                    id="executive-oversight-program-select"
                    value={program}
                    onChange={(e) => handleProgramChange(e.target.value)}
                    className="bg-transparent text-emerald-200 hover:text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
                    title="Switch inspected program to see its specific courses and LMS records"
                  >
                    <optgroup label={!isPrivilegedUser ? `Your Assigned Coordinated Programs (${coordinatorAllowedPrograms.length})` : `Session ${session} Enrolled Programs`}>
                      {(() => {
                        const activeNames = StorageService.getSessionPrograms(department, session);
                        const allowed = !isPrivilegedUser ? coordinatorAllowedPrograms : allDeptPrograms;
                        const enrolledList = allowed.filter((p) => activeNames.includes(p.name));
                        const enrolled = enrolledList.length > 0 ? enrolledList : allowed;
                        return enrolled.map((p) => (
                          <option key={p.name} value={p.name} className="bg-slate-900 text-emerald-300 font-bold">
                            {p.name} ({p.degreeLevel}) {!isPrivilegedUser ? '★ Assigned' : `✓ [Session ${session}]`}
                          </option>
                        ));
                      })()}
                    </optgroup>
                  </select>
                </div>
                <span className="text-xs text-slate-300">
                  ({shift} Shift — Semester {semester})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Reviewing authenticated course records and LMS submission status. Modifications are restricted to authorized Department HOD and Course Instructors.
              </p>
            </div>
          </div>

          {onSwitchToVC && (
            <button
              type="button"
              onClick={onSwitchToVC}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to VC Dashboard</span>
            </button>
          )}
        </div>
      )}

      {/* INSTITUTIONAL DIRECTIVES & MESSAGING PANELS (VC -> HOD -> COORDINATOR) */}
      {(currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'VC') && (
        <HODDirectivePanel
          departmentName={department}
          currentUser={currentUser}
        />
      )}

      {(currentUser?.role === 'COORDINATOR' || currentUser?.role === 'LECTURER' || currentUser?.role === 'VISITING_LECTURER') && (
        <CoordinatorDirectivePanel
          departmentName={department}
          programName={program}
          currentUser={currentUser}
        />
      )}

      {/* CARD 1: TOP BANNER (Matching Screenshot 1) */}
      <div
        id="hod-header-banner"
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4"
      >
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                Central Monitoring Portal
              </span>
              <span className="text-[10px] font-bold text-slate-500">• Task #1</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {isReadOnly ? 'Executive LMS Result Inspection' : 'LMS Result Upload Status'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isReadOnly
                ? 'Vice Chancellor Academic Quality & LMS Result Verification Audit'
                : 'Departmental Verification & Upload Monitoring into LMS'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {/* Academic Session Switcher */}
          <button
            id="btn-switch-session"
            type="button"
            onClick={() => setIsSessionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Switch or create Academic Session"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>SESSION {session}</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
              Change
            </span>
          </button>

          {/* Current Semester Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>SEMESTER {semester}</span>
          </span>

          {/* Shift Status Badges (Morning & Evening) */}
          <div className="inline-flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {/* Morning Shift Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border ${
                shiftStatuses.morning.isOffered
                  ? shiftStatuses.morning.status === 'COMPLETE'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-extrabold'
                    : shiftStatuses.morning.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-950 border-blue-400 font-extrabold'
                    : 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title={`Morning Shift Status: ${shiftStatuses.morning.displayText}`}
            >
              <Sun className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Morning:</span>
              <span className="font-extrabold">{shiftStatuses.morning.displayText}</span>
              {shiftStatuses.morning.status === 'COMPLETE' && (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 ml-0.5" />
              )}
              {shiftStatuses.morning.status === 'IN_PROGRESS' && (
                <Clock className="w-3 h-3 text-blue-600 shrink-0 ml-0.5" />
              )}
              {shiftStatuses.morning.status === 'PENDING' && (
                <Clock className="w-3 h-3 text-amber-600 shrink-0 ml-0.5" />
              )}
            </span>

            {/* Evening Shift Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border ${
                shiftStatuses.evening.isOffered
                  ? shiftStatuses.evening.status === 'COMPLETE'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-extrabold'
                    : shiftStatuses.evening.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-950 border-blue-400 font-extrabold'
                    : 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title={`Evening Shift Status: ${shiftStatuses.evening.displayText}`}
            >
              <Moon className="w-3 h-3 text-indigo-600 shrink-0" />
              <span>Evening:</span>
              <span className="font-extrabold">{shiftStatuses.evening.displayText}</span>
              {shiftStatuses.evening.status === 'COMPLETE' && (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 ml-0.5" />
              )}
              {shiftStatuses.evening.status === 'IN_PROGRESS' && (
                <Clock className="w-3 h-3 text-blue-600 shrink-0 ml-0.5" />
              )}
              {shiftStatuses.evening.status === 'PENDING' && (
                <Clock className="w-3 h-3 text-amber-600 shrink-0 ml-0.5" />
              )}
            </span>
          </div>

          {/* Header Quota Progress Bar Visualization */}
          <div
            id="header-quota-progress-bar"
            className="inline-flex flex-col justify-center px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs min-w-[170px]"
            title={`Department Quota Progress: ${headerQuotaProgress.uploaded} of ${headerQuotaProgress.total} subjects uploaded for ${shift} shift (Session ${session})`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-800 mb-0.5">
              <span className="flex items-center gap-1 text-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full ${headerQuotaProgress.percentage === 100 ? 'bg-emerald-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span>Quota Progress</span>
              </span>
              <span className={headerQuotaProgress.percentage === 100 ? 'text-emerald-700 font-extrabold' : 'text-slate-900 font-extrabold'}>
                {headerQuotaProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className={`h-full transition-all duration-500 ${
                  headerQuotaProgress.percentage === 100
                    ? 'bg-emerald-600'
                    : headerQuotaProgress.percentage > 50
                    ? 'bg-blue-600'
                    : headerQuotaProgress.percentage > 0
                    ? 'bg-amber-500'
                    : 'bg-slate-300'
                }`}
                style={{ width: `${Math.min(100, headerQuotaProgress.percentage)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 mt-0.5 font-medium">
              <span>{headerQuotaProgress.uploaded} / {headerQuotaProgress.total} Subjects</span>
              <span className="font-semibold text-slate-600">{shift} {session}</span>
            </div>
          </div>

          {/* Export Report Button (PDF / CSV summary for current department, session & shift) */}
          <button
            id="btn-export-report-header"
            type="button"
            onClick={() => handleOpenPDFReport('ENTIRE_DEPARTMENT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={`Export official summary PDF or CSV report for ${department} (Session ${session}, ${shift} Shift)`}
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
            <span>Export Report</span>
            <span className="text-[10px] bg-emerald-900/60 text-emerald-100 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/30">
              PDF / CSV
            </span>
          </button>

          {/* Trigger Faculty Upload Reminder Notification Modal (HOD / Coordinator / Admin / VC) */}
          {(currentUser?.role === 'HOD' || currentUser?.role === 'COORDINATOR' || currentUser?.role === 'ADMIN' || currentUser?.role === 'VC' || isPrivilegedUser) && (
            <button
              id="btn-trigger-faculty-reminder"
              type="button"
              onClick={() => setIsSendReminderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition-all shadow-2xs cursor-pointer hover:scale-[1.02]"
              title="Dispatch system-wide pending result upload reminder notification to program faculty members"
            >
              <Megaphone className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-200" />
              <span>Send Faculty Reminder</span>
            </button>
          )}

          {/* Download All Departments Master Report Button for VC / Admin */}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'VC' || isVC) && (
            <button
              id="btn-export-all-departments-header"
              type="button"
              onClick={() => handleOpenPDFReport('ALL_DEPARTMENTS')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download master CSV / PDF report of ALL university departments"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-200" />
              <span>Download All Departments</span>
            </button>
          )}

          {/* VC View Link: Return button if read-only, otherwise switch link */}
          {onSwitchToVC && (currentUser?.role === 'ADMIN' || currentUser?.role === 'VC') && (
            <button
              id="btn-switch-vc-view"
              type="button"
              onClick={onSwitchToVC}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Open Vice Chancellor University-wide Monitoring Dashboard"
            >
              {isReadOnly ? (
                <>
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Return to VC Dashboard</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>VC View (Read Only) &gt;</span>
                </>
              )}
            </button>
          )}

          {/* Database Saved & Real-Time Auto-Save Status Badge */}
          <div className="flex items-center gap-2">
            {autoSaveStatus === 'saving' ? (
              <span
                id="autosave-status-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 animate-pulse"
                title="Writing changes to database..."
              >
                <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin shrink-0" />
                <span>Saving changes...</span>
              </span>
            ) : autoSaveStatus === 'saved' || isExistingRecord ? (
              <span
                id="record-status-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300"
                title="All changes are persisted to the database in real time"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Auto-Saved</span>
                {(lastAutoSavedTime || lastSavedTime) && (
                  <span className="text-emerald-700 font-normal hidden sm:inline">
                    ({lastAutoSavedTime || new Date(lastSavedTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
            ) : (
              <span
                id="record-status-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>New Sheet</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vice Chancellor Inspection Notice Banner */}
      {isReadOnly && isVC && (
        <div id="vc-inspection-banner" className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold text-amber-900 text-sm">Vice Chancellor Inspection Mode</p>
              <p className="text-amber-800 text-xs mt-0.5">
                Viewing real-time submitted LMS result details for <strong>{department}</strong> &gt; <strong>{program}</strong> [{shift} Shift – Semester {semester} – Section {section}]. Form editing is disabled for audit compliance.
              </p>
            </div>
          </div>
          {onSwitchToVC && (
            <button
              type="button"
              onClick={onSwitchToVC}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              Return to VC Dashboard
            </button>
          )}
        </div>
      )}

      {/* HOD Full Department Oversight Banner */}
      {currentUser?.role === 'HOD' && currentUser.department && (
        <div id="hod-authority-banner" className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-emerald-900 text-sm">Head of Department Administrative Oversight</p>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  HOD Verified
                </span>
              </div>
              <p className="text-emerald-800 text-xs mt-0.5">
                Viewing program records for <strong>{program}</strong>. You have full privilege to inspect in read mode or enable edit/update mode to write changes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Mode Switcher Toggle for HOD */}
            <button
              type="button"
              onClick={() => setIsHodReadMode(!isHodReadMode)}
              className={`flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                isHodReadMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                  : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-900'
              }`}
              title={isHodReadMode ? "Switch to Write & Update Mode to make changes" : "Switch to Read-Only Mode for clean inspection"}
            >
              {isHodReadMode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Enable Write &amp; Update Mode</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Read-Only View Active</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCoordinatorAssignModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
              title="Manage coordinator program allocations, shift programs, or change role to Regular/Visiting faculty"
            >
              <Users className="w-4 h-4" />
              <span>Manage Faculty</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent Activity Feed Widget for HOD Dashboard */}
      <RecentActivityWidget
        departmentFilter={department}
        programFilter={program}
        title={`Recent Activity — Last 10 Result Uploads (${department})`}
      />

      {/* HOD Alert: Coordinator Authorization & Additional Program Requests Pending */}
      {currentUser?.role === 'HOD' && (pendingHODApprovals.length > 0 || pendingProgRequests.length > 0) && (
        <div id="hod-pending-requests-card" className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-xs text-amber-950 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
              <h4 className="font-bold text-amber-950 text-sm">
                Coordinator &amp; Program Authorization Requests Pending ({pendingHODApprovals.length + pendingProgRequests.length})
              </h4>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2.5 py-0.5 rounded-full self-start sm:self-auto uppercase tracking-wide">
              Action Required
            </span>
          </div>

          {/* 1. Account Registrations Awaiting HOD Approval */}
          {pendingHODApprovals.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                New Coordinator Registrations ({pendingHODApprovals.length}):
              </span>
              {pendingHODApprovals.map((req) => (
                <div
                  key={req.id}
                  className="bg-white/90 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{req.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">@{req.username}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                        New Account
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-700 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-teal-900">Requested Program:</span>
                      <span className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 font-medium">
                        {req.requestedPrograms?.join(', ') || req.program || 'All Programs'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-indigo-900">Requested Shift:</span>
                      <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">
                        {req.requestedShifts?.join(', ') || 'Morning & Evening'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleHODQuickApprove(req.id, req.name)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      title="Authorize coordinator with requested programs and shifts"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve &amp; Authorize</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHODQuickReject(req.id, req.name)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                      title="Reject request"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Post-Login Additional Program Requests from Existing Faculty/Coordinators */}
          {pendingProgRequests.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-amber-200/60">
              <span className="text-[11px] font-bold text-teal-950 uppercase tracking-wider block">
                Additional Program Access Requests ({pendingProgRequests.length}):
              </span>
              {pendingProgRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white/95 border border-teal-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{req.userName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({req.userEmail})</span>
                      <span className="text-[10px] bg-teal-100 text-teal-900 font-bold px-1.5 py-0.2 rounded border border-teal-300">
                        Additional Program Request
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-700 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-teal-900">Requested Degree:</span>
                      <span className="bg-teal-50 text-teal-900 font-bold px-1.5 py-0.5 rounded border border-teal-200">
                        {req.requestedProgram}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-indigo-900">Shifts:</span>
                      <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">
                        {req.requestedShifts.join(', ')}
                      </span>
                      {req.reason && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 italic">Note: "{req.reason}"</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleHODApproveProgReq(req.id, req.userName, req.requestedProgram)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      title={`Grant full access to ${req.requestedProgram}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Program</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHODRejectProgReq(req.id, req.userName, req.requestedProgram)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                      title="Decline program request"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coordinator Status Banner: Pending Authorization */}
      {isPendingCoordinator && (
        <div id="coordinator-pending-banner" className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-xs text-amber-950 shadow-xs space-y-2.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
              <h4 className="font-bold text-amber-950 text-sm">Coordinator Account Authorization Pending</h4>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2.5 py-0.5 rounded-full self-start sm:self-auto">
              Pending HOD Approval
            </span>
          </div>
          <p className="text-amber-900 text-xs leading-relaxed">
            Your coordinator account registration has been submitted to the Head of Department for <strong>{currentUser?.department}</strong>.
            You requested coordination for <strong>{currentUser?.requestedPrograms?.join(', ') || currentUser?.program || program}</strong> ({currentUser?.requestedShifts?.join(', ') || 'Morning/Evening'}).
            Once approved by your HOD, you will have full authorization to submit and verify LMS records.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRequestHODReapproval}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh / Re-send Request to HOD</span>
            </button>
          </div>
        </div>
      )}

      {/* Coordinator Status Banner: Rejected */}
      {isRejectedCoordinator && (
        <div id="coordinator-rejected-banner" className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-xs text-rose-950 shadow-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <h4 className="font-bold text-rose-950 text-sm">Coordinator Authorization Request Not Approved</h4>
            </div>
            <span className="text-[10px] bg-rose-200 text-rose-900 font-black px-2.5 py-0.5 rounded-full">
              Rejected
            </span>
          </div>
          <p className="text-rose-900 text-xs">
            Your request for coordinator access in <strong>{currentUser?.department}</strong> was not approved. {currentUser?.rejectionReason ? `Reason: ${currentUser.rejectionReason}` : 'Please check with your Head of Department.'}
          </p>
          <button
            type="button"
            onClick={handleRequestHODReapproval}
            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Submit New Authorization Request to HOD</span>
          </button>
        </div>
      )}

      {/* Access Gate: If coordinator has no approved programs */}
      {!hasApprovedCoordinatorPrograms ? (
        <div className="space-y-4">
          {pendingCoordinatorPrograms.length > 0 ? (
            <div id="coordinator-access-restricted-card" className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 sm:p-7 text-amber-950 shadow-md space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 border border-amber-400/40">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-amber-950">
                      Program Access Restricted: Awaiting Head of Department Approval
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Your program enrollment request is pending review by the Head of Department for {currentUser?.department}.
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-amber-200 text-amber-950 font-black px-3 py-1 rounded-full border border-amber-300 self-start sm:self-auto">
                  Pending HOD Authorization
                </span>
              </div>

              <div className="bg-white/90 border border-amber-200/90 rounded-xl p-4 text-xs text-amber-950 leading-relaxed space-y-2">
                <p>
                  <strong>University Access Policy:</strong> When you first create an account and select a degree program, your request is automatically forwarded to your Head of Department. <strong>You can only access the program and enter course records if your HOD allows you</strong>.
                </p>
                <p className="text-amber-900">
                  <strong>Unrestricted Program Deletion:</strong> You can delete or leave this program at any time <strong>without any permission of the HOD</strong> (even until no program is left).
                </p>
              </div>

              {/* Pending Programs List with Immediate Delete (No HOD permission needed) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block">
                  Requested Degree Programs Awaiting Approval ({pendingCoordinatorPrograms.length}):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingCoordinatorPrograms.map((pName) => (
                    <div
                      key={pName}
                      className="bg-white border-2 border-amber-300 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900">{pName}</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                            Awaiting HOD
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                          <div>
                            <span className="font-medium text-slate-500">Department:</span> {currentUser?.department}
                          </div>
                          <div>
                            <span className="font-medium text-slate-500">Requested Shift:</span> {currentUser?.requestedShifts?.join(', ') || 'Morning & Evening'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 italic">No HOD permission required</span>
                        <button
                          type="button"
                          onClick={() => handleCancelPendingProgramRequest(pName)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Delete this program without HOD permission (even if no program left)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete Program</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setIsReqProgModalOpen(true)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Request Another Program from HOD</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestHODReapproval}
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refresh / Check Approval Status</span>
                </button>
              </div>
            </div>
          ) : (
            <div id="coordinator-no-programs-card" className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-sm animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">
                  No Degree Programs Assigned (0 Programs Left)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You currently have no active or pending degree programs in your account. Coordinators may delete programs at any time without HOD permission (even until no program is left).
                </p>
                <p className="text-xs text-teal-800 font-medium">
                  When you want to add or join a new program, submit a formal request to your Head of Department. Once your HOD approves, you will gain full access to the program.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsReqProgModalOpen(true)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Request Degree Program from Head of Department</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <DeadlineBanner
              currentSession={session}
              semesterFilter={semester}
              activeSessions={[session]}
              selectedSemesters={[semester]}
              isVC={Boolean(isVC || isAdmin)}
            />
          </div>

          {/* CARD 2: SELECT PROGRAM DETAILS (Screenshot 1) */}
          <div
            id="select-program-details-card"
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
          >
        {/* Global Active Shifts Configuration Settings Banner */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>Global Active Shifts Configuration</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded">
                  System Settings
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enable or disable university offering shifts. Inactive shifts are filtered from HOD forms and Vice Chancellor dashboards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-lg border border-slate-700/80 shrink-0">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200 bg-amber-950/80 hover:bg-amber-900/90 border border-amber-700/80 px-2.5 py-1.5 rounded cursor-pointer transition-colors" title="Toggle Morning shift university-wide">
              <input
                type="checkbox"
                checked={StorageService.getGlobalActiveShifts().includes('Morning')}
                onChange={(e) => {
                  const curr = StorageService.getGlobalActiveShifts();
                  let updated = e.target.checked
                    ? Array.from(new Set([...curr, 'Morning']))
                    : curr.filter((s) => s !== 'Morning');
                  if (updated.length === 0) updated = ['Evening'];
                  StorageService.setGlobalActiveShifts(updated as AcademicShift[]);
                  setRosterVersion((v) => v + 1);
                  showFeedback('success', `Global Active Shifts updated: ${updated.join(', ')}`);
                }}
                className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer"
              />
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Morning Shift</span>
            </label>

            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-700/80 px-2.5 py-1.5 rounded cursor-pointer transition-colors" title="Toggle Evening shift university-wide">
              <input
                type="checkbox"
                checked={StorageService.getGlobalActiveShifts().includes('Evening')}
                onChange={(e) => {
                  const curr = StorageService.getGlobalActiveShifts();
                  let updated = e.target.checked
                    ? Array.from(new Set([...curr, 'Evening']))
                    : curr.filter((s) => s !== 'Evening');
                  if (updated.length === 0) updated = ['Morning'];
                  StorageService.setGlobalActiveShifts(updated as AcademicShift[]);
                  setRosterVersion((v) => v + 1);
                  showFeedback('success', `Global Active Shifts updated: ${updated.join(', ')}`);
                }}
                className="rounded text-indigo-400 focus:ring-indigo-400 w-3.5 h-3.5 cursor-pointer"
              />
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Evening Shift</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Select Program Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose department, program, degree level, semester, and offering shift for LMS monitoring.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
            Session {session} Active
          </span>
        </div>

        {/* 6 Form Fields Grid: Dept, Program, Level, Semester, Shift, and Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
          {/* Department */}
          <div className="">
            <label
              htmlFor="select-department"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Department <span className="text-rose-600">*</span>
            </label>
            {currentUser?.role === 'HOD' || currentUser?.role === 'COORDINATOR' ? (
              <div
                className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-950 flex items-center justify-between shadow-2xs"
                title={`Department locked to ${department}`}
              >
                <span className="truncate">{department}</span>
                <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase shrink-0 flex items-center gap-1 ml-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </div>
            ) : (
              <select
                id="select-department"
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                {UNIVERSITY_DEPARTMENTS.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Program */}
          <div className="">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="select-program"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                Program <span className="text-rose-600">*</span>
                {currentUser?.role === 'COORDINATOR' && (
                  (currentUser.assignedPrograms ? currentUser.assignedPrograms.includes(program) : currentUser.program === program) ? (
                    <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                      ★ Coordinated by You
                    </span>
                  ) : null
                )}
              </label>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isPrivilegedUser && currentUser?.role === 'COORDINATOR' && (
                  <button
                    type="button"
                    onClick={() => setIsReqProgModalOpen(true)}
                    className="text-[10px] text-teal-800 hover:text-teal-950 font-bold bg-teal-100 hover:bg-teal-200 px-2 py-0.5 rounded cursor-pointer shrink-0 flex items-center gap-1 transition-colors shadow-2xs"
                    title="Request additional degree program or shift from your HOD"
                  >
                    <Plus className="w-3 h-3 text-teal-700" />
                    <span>Request More Programs</span>
                  </button>
                )}
                {(isPrivilegedUser || currentUser?.role === 'HOD') && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setIsCoordinatorAssignModalOpen(true)}
                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded cursor-pointer shrink-0 flex items-center gap-1 transition-colors"
                    title="Manage coordinator program allocations, shift programs, or switch roles to Regular/Visiting faculty"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Assign Coordinators</span>
                  </button>
                )}
                {!isReadOnly && isPrivilegedUser && (
                  <button
                    type="button"
                    onClick={() => setIsRosterModalOpen(true)}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer shrink-0 ml-1"
                    title="Configure active roster for this session (HOD privilege)"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
            <select
              id="select-program"
              value={program}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
            >
              {(() => {
                const activeNames = StorageService.getSessionPrograms(department, session);
                if (!isPrivilegedUser) {
                  const activeAllowedList = coordinatorAllowedPrograms.filter((p) =>
                    activeNames.some(
                      (an) =>
                        StorageService.normalizeProgramName(an, department) ===
                          StorageService.normalizeProgramName(p.name, department) ||
                        an.trim().toLowerCase() === p.name.trim().toLowerCase()
                    )
                  );
                  const activeAllowed = activeAllowedList.length > 0 ? activeAllowedList : coordinatorAllowedPrograms;
                  return (
                    <optgroup label={`Your Coordinated Programs (${activeAllowed.length})`}>
                      {activeAllowed.map((p) => (
                        <option key={p.name} value={p.name} className="font-bold text-slate-900">
                          {p.name} ★ (Assigned to You)
                        </option>
                      ))}
                    </optgroup>
                  );
                }

                const activeInSession = allDeptPrograms.filter((p) =>
                  activeNames.some(
                    (an) =>
                      StorageService.normalizeProgramName(an, department) ===
                        StorageService.normalizeProgramName(p.name, department) ||
                      an.trim().toLowerCase() === p.name.trim().toLowerCase()
                  )
                );
                const offCycleInSession = allDeptPrograms.filter(
                  (p) =>
                    !activeNames.some(
                      (an) =>
                        StorageService.normalizeProgramName(an, department) ===
                          StorageService.normalizeProgramName(p.name, department) ||
                        an.trim().toLowerCase() === p.name.trim().toLowerCase()
                    )
                );

                return (
                  <>
                    {activeInSession.length > 0 && (
                      <optgroup label={`Session ${session} Active Offerings (${activeInSession.length})`}>
                        {activeInSession.map((p) => {
                          const isCoordinated = currentUser?.assignedPrograms
                            ? currentUser.assignedPrograms.includes(p.name)
                            : currentUser?.program === p.name;
                          return (
                            <option key={p.name} value={p.name} className="font-bold text-slate-900">
                              {p.name} {isCoordinated ? '★ (Coordinated)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {offCycleInSession.length > 0 && (
                      <optgroup label={`Other Programs (Off-cycle in Session ${session})`}>
                        {offCycleInSession.map((p) => (
                          <option key={p.name} value={p.name} className="font-bold text-slate-400 italic">
                            {p.name} — [Off-cycle in Session {session}]
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                );
              })()}
            </select>
            {/* Quick program switcher buttons for HOD & Assigned Coordinators */}
            {(() => {
              const activeNames = StorageService.getSessionPrograms(department, session);
              const allowed = !isPrivilegedUser ? coordinatorAllowedPrograms : allDeptPrograms;
              const enrolledList = allowed.filter((p) =>
                activeNames.some(
                  (an) =>
                    StorageService.normalizeProgramName(an, department) ===
                      StorageService.normalizeProgramName(p.name, department) ||
                    an.trim().toLowerCase() === p.name.trim().toLowerCase()
                )
              );
              const visibleProgs = enrolledList.length > 0 ? enrolledList : allowed;
              if (visibleProgs.length <= 1) return null;
              return (
                <div className="mt-2 pt-1.5 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      {!isPrivilegedUser ? `Your Coordinated Programs (${visibleProgs.length}):` : `Department Programs (${visibleProgs.length}):`}
                    </span>
                    {!isPrivilegedUser && (
                      <button
                        type="button"
                        onClick={() => setIsReqProgModalOpen(true)}
                        className="text-[9px] text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> Request Program
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {visibleProgs.map((p) => {
                      const isSelected = program === p.name;
                      return (
                        <div
                          key={p.name}
                          onClick={() => handleProgramChange(p.name)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer border flex items-center gap-1 select-none ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title={`Switch to ${p.name}`}
                        >
                          <span>{p.name}</span>
                          {!isPrivilegedUser && currentUser?.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const res = AuthService.removeCoordinatorProgram(currentUser.id, p.name);
                                if (res.success) {
                                  showFeedback('success', res.message);
                                  dispatchSyncEvidence(
                                    'DELETE',
                                    'Coordinated Program Removed',
                                    `Program "${p.name}" removed from active portfolio.`,
                                    p.name,
                                    currentUser.name
                                  );
                                  const remaining = res.session?.assignedPrograms || [];
                                  if (program === p.name) {
                                    handleProgramChange(remaining.length > 0 ? remaining[0] : '');
                                  }
                                } else {
                                  showFeedback('warning', res.message);
                                }
                              }}
                              className={`p-0.5 rounded hover:bg-rose-600 hover:text-white transition-colors ${
                                isSelected ? 'text-emerald-100' : 'text-slate-400 hover:text-rose-600'
                              }`}
                              title={`Remove ${p.name} from your active coordination list`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                      </div>
                    );
                  })}
                  {!isPrivilegedUser && (
                    <button
                      type="button"
                      onClick={() => setIsReqProgModalOpen(true)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer border border-dashed border-teal-400 bg-teal-50/80 hover:bg-teal-100 text-teal-800 flex items-center gap-1"
                      title="Request access to another program from HOD"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Program</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
            {!isPrivilegedUser && (
              <div className="mt-2.5 px-3 py-1.5 bg-slate-50/90 border border-slate-200/90 rounded-lg text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-teal-950 uppercase tracking-wider text-[10px] shrink-0">Current Program:</span>
                  <span className="font-bold text-slate-900 truncate bg-white px-2 py-0.5 rounded border border-slate-200/80 shadow-2xs text-[11px]">
                    {program || 'No Program Assigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {program && currentUser?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = AuthService.removeCoordinatorProgram(currentUser.id, program);
                        if (res.success) {
                          showFeedback('success', res.message);
                          dispatchSyncEvidence(
                            'DELETE',
                            'Coordinated Program Removed',
                            `Program "${program}" removed from active portfolio.`,
                            program,
                            currentUser.name
                          );
                          const remaining = res.session?.assignedPrograms || [];
                          handleProgramChange(remaining.length > 0 ? remaining[0] : '');
                        } else {
                          showFeedback('warning', res.message);
                        }
                      }}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/90 border border-rose-200 px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 transition-all whitespace-nowrap active:scale-98 shadow-2xs"
                      title={`Remove ${program} from your active coordination list`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Remove</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsReqProgModalOpen(true)}
                    className="text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/90 px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 transition-all whitespace-nowrap active:scale-98 shadow-2xs"
                    title="Request additional degree program access from HOD"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>Request Program</span>
                  </button>
                </div>
              </div>
            )}

            {/* Coordinator's Pending Program Requests Status Alert */}
            {!isPrivilegedUser && userProgramRequests.some((r) => r.status === 'PENDING') && (
              <div className="mt-2 py-1.5 px-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[10px] text-amber-900 flex items-center justify-between gap-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
                  <span className="font-bold">Pending HOD Review:</span>
                  <span className="truncate">
                    {userProgramRequests
                      .filter((r) => r.status === 'PENDING')
                      .map((r) => `${r.requestedProgram} (${r.requestedShifts.join('/')})`)
                      .join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReqProgModalOpen(true)}
                  className="font-bold text-amber-800 hover:underline shrink-0"
                >
                  View Status
                </button>
              </div>
            )}
            {/* Sections filter indicator badge */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Layers className="w-3.5 h-3.5 text-indigo-700" />
                Sections Filter:
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    sectionStatuses.length > 1
                      ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                  title={`${sectionStatuses.length} section(s) currently configured for this program`}
                >
                  {sectionStatuses.length > 1
                    ? `${sectionStatuses.length} Sections: ${sectionStatuses.map((s) => s.shortLabel).join(', ')}`
                    : `Sec A Active (Single Section)`}
                </span>
                {!sectionStatuses.some((s) => s.id === 'B') && (
                  <button
                    type="button"
                    onClick={() => handleSectionChange('B')}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-all cursor-pointer flex items-center gap-0.5"
                    title="Enable Section B for this program and cohort"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Sec B</span>
                  </button>
                )}
              </div>
            </div>
            {/* Multi-program management and switcher chips for coordinators */}
            {!isPrivilegedUser && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                    Your Assigned Degree Programs ({coordinatorAllowedPrograms.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsReqProgModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                    title="Submit a formal request to your Head of Department to add another program"
                  >
                    <Plus className="w-3 h-3 text-emerald-700" />
                    <span>+ Add New Program (Request to HOD)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {coordinatorAllowedPrograms.map((ap) => {
                    const pName = ap.name;
                    const isCurrent = program.trim().toLowerCase() === pName.trim().toLowerCase();
                    return (
                      <div
                        key={pName}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border transition-all ${
                          isCurrent
                            ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleProgramChange(pName)}
                          className="cursor-pointer"
                          title={`Select ${pName}`}
                        >
                          {isCurrent ? '● ' : ''}{pName}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoordinatorProgram(pName)}
                          className={`p-0.5 rounded transition-colors cursor-pointer ml-1 ${
                            isCurrent
                              ? 'text-white/80 hover:text-white hover:bg-teal-800'
                              : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title={`Delete "${pName}" without HOD permission (even if no programs left)`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Pending programs awaiting HOD approval */}
                  {pendingCoordinatorPrograms.map((pendingP) => (
                    <div
                      key={pendingP}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs"
                      title="Awaiting Head of Department approval"
                    >
                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                      <span>{pendingP} (Pending HOD)</span>
                      <button
                        type="button"
                        onClick={() => handleCancelPendingProgramRequest(pendingP)}
                        className="p-0.5 rounded hover:bg-rose-200/50 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer ml-0.5"
                        title={`Cancel and delete request for "${pendingP}" without HOD permission`}
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Level */}
          <div className="">
            <label
              htmlFor="select-degree-level"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Level <span className="text-rose-600">*</span>
            </label>
            <select
              id="select-degree-level"
              value={degreeLevel}
              onChange={(e) => setDegreeLevel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
            >
              {DEGREE_LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Dropdown */}
          <div className="">
            <label
              htmlFor="select-semester"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Semester <span className="text-rose-600">*</span>
            </label>
            <select
              id="select-semester"
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
            >
              {ACADEMIC_SEMESTERS.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.shortLabel} ({sem.label})
                </option>
              ))}
            </select>
          </div>

          {/* Shift (Morning / Evening toggle) */}
          <div className="">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Shift <span className="text-rose-600">*</span>
              </label>
              {(isPrivilegedUser || currentUser?.role === 'HOD') && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500 font-semibold">Program Shifts:</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded transition-colors" title="Check or uncheck Morning shift for this program">
                    <input
                      type="checkbox"
                      checked={StorageService.getProgramShifts(department, program).includes('Morning')}
                      onChange={(e) => {
                        const curr = StorageService.getProgramShifts(department, program);
                        let updated = e.target.checked
                          ? Array.from(new Set([...curr, 'Morning']))
                          : curr.filter((s) => s !== 'Morning');
                        if (updated.length === 0) updated = ['Evening'];
                        StorageService.setProgramShifts(department, program, updated as AcademicShift[]);
                        setRosterVersion((v) => v + 1);
                        showFeedback('success', `Updated active shifts for ${program}: ${updated.join(', ')}`);
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3 h-3 cursor-pointer"
                    />
                    <span>Morning</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors" title="Check or uncheck Evening shift for this program">
                    <input
                      type="checkbox"
                      checked={StorageService.getProgramShifts(department, program).includes('Evening')}
                      onChange={(e) => {
                        const curr = StorageService.getProgramShifts(department, program);
                        let updated = e.target.checked
                          ? Array.from(new Set([...curr, 'Evening']))
                          : curr.filter((s) => s !== 'Evening');
                        if (updated.length === 0) updated = ['Morning'];
                        StorageService.setProgramShifts(department, program, updated as AcademicShift[]);
                        setRosterVersion((v) => v + 1);
                        showFeedback('success', `Updated active shifts for ${program}: ${updated.join(', ')}`);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                    />
                    <span>Evening</span>
                  </label>
                </div>
              )}
            </div>
            <div className={`grid ${allowedShiftsForProgram.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200`}>
              {allowedShiftsForProgram.includes('Morning') && (
                <button
                  id="btn-shift-morning"
                  type="button"
                  onClick={() => handleShiftChange('Morning')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    shift === 'Morning'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                  title={
                    shiftStatuses.morning.hasRecord
                      ? `Morning: ${shiftStatuses.morning.courseCount} course(s) saved`
                      : 'Morning: No saved courses'
                  }
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Morning</span>
                  {shiftStatuses.morning.hasRecord ? (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${shift === 'Morning' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'}`}>
                      ● {shiftStatuses.morning.courseCount}
                    </span>
                  ) : null}
                </button>
              )}

              {allowedShiftsForProgram.includes('Evening') && (
                <button
                  id="btn-shift-evening"
                  type="button"
                  onClick={() => handleShiftChange('Evening')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    shift === 'Evening'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                  title={
                    shiftStatuses.evening.hasRecord
                      ? `Evening: ${shiftStatuses.evening.courseCount} course(s) saved`
                      : 'Evening: No saved courses'
                  }
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Evening</span>
                  {shiftStatuses.evening.hasRecord ? (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${shift === 'Evening' ? 'bg-indigo-900 text-white' : 'bg-indigo-100 text-indigo-900'}`}>
                      ● {shiftStatuses.evening.courseCount}
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          </div>

          {/* Section (Section A, Section B, etc. - Strictly Isolated Partition) */}
          <div className="">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="select-section"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                Section <span className="text-rose-600">*</span>
              </label>
              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                Isolated
              </span>
            </div>
            <select
              id="select-section"
              value={section}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__ADD_B__') {
                  handleSectionChange('B');
                } else if (val === '__ADD_OTHER__') {
                  setIsCustomSectionOpen(true);
                  setCustomSectionInput('');
                } else if (val.startsWith('__DELETE_')) {
                  const secToDelete = val.replace('__DELETE_', '').replace('__', '');
                  setSectionToDelete(secToDelete);
                } else {
                  handleSectionChange(val);
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
            >
              {sectionStatuses.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label} {sec.hasRecord ? `(● ${sec.courseCount} courses logged)` : '(Empty)'}
                </option>
              ))}
              {!sectionStatuses.some((s) => s.id === 'B') && (
                <option value="__ADD_B__" className="text-indigo-700 font-bold">
                  + Add Section B...
                </option>
              )}
              <option value="__ADD_OTHER__" className="text-slate-600 font-semibold">
                + Add Other Section (C, D...)...
              </option>
              {section !== 'A' && (
                <option value={`__DELETE_${section}__`} className="text-rose-600 font-bold">
                  ✕ Delete Section {section} from this cohort...
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Isolated Section Selector Tabs (Section A, Section B, etc.) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Class Section:
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                (Data is strictly isolated per section — Section A &amp; B never overlap)
              </span>
            </div>
            <div className="text-[11px] text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded self-start sm:self-auto">
              Active: {shift} Shift • Sem {semester} • Section {section}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {sectionStatuses.map((sec) => {
              const isSelected = sec.id === section;
              const isDeletable = sec.id !== 'A';
              return (
                <div key={sec.id} className="inline-flex items-center rounded-lg shadow-2xs">
                  <button
                    id={`btn-section-tab-${sec.id}`}
                    type="button"
                    onClick={() => handleSectionChange(sec.id)}
                    className={`py-2 px-3.5 text-xs font-bold flex items-center gap-2 transition-all border ${
                      isDeletable ? 'rounded-l-lg border-r-0' : 'rounded-lg'
                    } ${
                      isSelected
                        ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs ring-2 ring-indigo-500/30 cursor-pointer'
                        : sec.hasRecord
                        ? 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100 cursor-pointer'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <span className="text-sm font-black">{sec.label}</span>
                    {sec.hasRecord ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-indigo-200 text-indigo-900'
                        }`}
                      >
                        ● {sec.courseCount} Saved
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                          isSelected ? 'bg-indigo-800 text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        Empty
                      </span>
                    )}
                  </button>
                  {isDeletable && (
                    <button
                      id={`btn-delete-section-${sec.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSectionToDelete(sec.id);
                      }}
                      title={`Delete ${sec.label} from this cohort & sync with database`}
                      className={`py-2.5 px-2 border rounded-r-lg text-xs transition-colors flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950 text-indigo-200 hover:bg-rose-600 hover:text-white border-indigo-950'
                          : 'bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-700 border-slate-200'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Quick Add Section B if not already present */}
            {!sectionStatuses.some((s) => s.id === 'B') && (
              <button
                id="btn-add-section-b"
                type="button"
                onClick={() => handleSectionChange('B')}
                className="py-2 px-3 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Create / Activate Section B for this cohort"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Section B</span>
              </button>
            )}

            {/* Custom section button */}
            <button
              id="btn-add-custom-section"
              type="button"
              onClick={() => {
                setIsCustomSectionOpen(true);
                setCustomSectionInput('');
              }}
              className="py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Other Section...</span>
            </button>
          </div>

          {/* Quick copy helper banner when current section is empty but another section has courses */}
          {(() => {
            const otherSecStatus = sectionStatuses.find(
              (s) => s.id !== section && s.hasRecord && s.courseCount > 0
            );
            const hasCurrentCourses = subjects.some(
              (s) => s.courseCode.trim() || s.subjectTitle.trim()
            );

            if (!isReadOnly && !hasCurrentCourses && otherSecStatus) {
              return (
                <div className="mt-2.5 p-3 rounded-lg bg-indigo-50/90 border border-indigo-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-indigo-950">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Section {section}</strong> is currently empty.{' '}
                      <strong>{otherSecStatus.label}</strong> has {otherSecStatus.courseCount} course(s).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopySyllabusFromOtherSection(otherSecStatus.id)}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    title={`Copy course codes and titles from ${otherSecStatus.label} into Section ${section}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Course Titles from {otherSecStatus.label}</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Quick Semester Selection Tabs (Semesters 1-8) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Quick Semester Jump:
            </span>
            <span className="text-[11px] text-slate-500">
              Active: <strong>Semester {semester}</strong> for <strong>{shift} Shift – Section {section}</strong>
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
            {semesterStatuses.map((sem) => {
              const isSelected = sem.id === semester;
              return (
                <button
                  key={sem.id}
                  id={`btn-quick-sem-${sem.id}`}
                  type="button"
                  onClick={() => handleSemesterChange(sem.id)}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-500/30'
                      : sem.hasRecord
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{sem.shortLabel}</span>
                  {sem.hasRecord && (
                    <span className="text-[9px] text-emerald-600 font-normal">● Saved</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submission Metadata Row (Head of Department, Program Coordinator & Submission Date) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Head of Department (HOD) - Official Designation Display */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Head of Department (HOD):
            </label>
            <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-950 font-semibold flex items-center justify-between">
              <span className="truncate">{CompletionRadarService.resolveHOD(department).name}</span>
              <span className="text-[9px] bg-emerald-200/90 text-emerald-900 font-bold px-1.5 py-0.5 rounded uppercase shrink-0">HOD</span>
            </div>
          </div>

          {/* Program Coordinator Name - Assigned for Program */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="input-hod-coordinator"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                Program Coordinator Name:
              </label>
              {onOpenUserModal && (
                <button
                  type="button"
                  onClick={onOpenUserModal}
                  className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
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
              placeholder="e.g. Engr. Muhammad Talha Jahangir"
              disabled={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white disabled:opacity-80"
            />
          </div>

          {/* Date of Submission */}
          <div>
            <label
              htmlFor="input-submission-date"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              Date of Submission:
            </label>
            <input
              id="input-submission-date"
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              disabled={effectiveReadOnly}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white disabled:opacity-80"
            />
          </div>
        </div>
      </div>

      {/* SECTION 02: EXECUTIVE SUMMARY */}
      <ExecutiveSummaryCards summary={summary} />

      {/* SECTION 02.5: ACTIVE DATA VIEW SEARCH & FILTER BAR */}
      <HODActiveSearchBar
        searchQuery={courseFilterQuery}
        onSearchChange={setCourseFilterQuery}
        searchScope={courseFilterScope}
        onSearchScopeChange={setCourseFilterScope}
        totalCount={subjects.length}
        matchCount={filteredSubjects.length}
        currentSemester={semester}
        currentSection={section}
        currentShift={shift}
        otherCohortsMatches={otherCohortsMatches}
        onSwitchCohort={(targetSem, targetSec, targetShift) => {
          handleSemesterChange(targetSem);
          handleSectionChange(targetSec);
          if (targetShift !== shift) handleShiftChange(targetShift);
          showFeedback('info', `Switched active cohort view to Semester ${targetSem} Section ${targetSec} (${targetShift})`);
        }}
      />

      {/* CARD 3: COURSE RESULT UPLOAD STATUS (Matching Screenshot 1) */}
      <div
        id="course-result-upload-card"
        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
      >
        {/* Card Header matching Screenshot 1 */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 bg-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Course Result Upload Status
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {program} • Sem {semester} • {shift}
              </span>
              <span className="text-[11px] font-bold bg-indigo-100 text-indigo-950 px-2.5 py-0.5 rounded-md border border-indigo-300 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                Section {section}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter individual course details, teaching instructor, and current upload status into the LMS portal.
            </p>

            {/* Quick Section Switcher Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mr-1">
                <Layers className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                Section View:
              </span>
              {sectionStatuses.map((sec) => {
                const isCur = sec.id === section;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSectionChange(sec.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      isCur
                        ? 'bg-indigo-900 text-white border-indigo-950 shadow-2xs ring-2 ring-indigo-400/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sec.hasRecord ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span>Section {sec.id}</span>
                    {sec.courseCount > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isCur ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sec.courseCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Course Search & Actions toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            {/* Search courses input */}
            <div className="relative flex-1 sm:flex-none sm:min-w-[220px] w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-course-filter"
                type="text"
                value={courseFilterQuery}
                onChange={(e) => setCourseFilterQuery(e.target.value)}
                placeholder="Search course or teacher..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {courseFilterQuery && (
                <button
                  type="button"
                  onClick={() => setCourseFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Toggle Advanced Columns */}
            <button
              id="btn-toggle-advanced-cols"
              type="button"
              onClick={() => setShowAdvancedColumns(!showAdvancedColumns)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showAdvancedColumns
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
              title="Show/hide credit hours, notification date, and LMS reference columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvancedColumns ? 'Compact View' : 'All Details'}</span>
            </button>

            {/* If Read-Only (VC View or HOD Read Mode): Show Print and Export. If Editable: Show Bulk Paste and Add Course */}
            {effectiveReadOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenPDFReport('ENTIRE_DEPARTMENT')}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Export official departmental summary PDF report merging Morning & Evening shifts"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Department PDF (Morning &amp; Evening)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCurrent}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Export comprehensive departmental results to CSV/Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </>
            ) : (
              <>
                {/* Real-time Auto-Save status indicator pill */}
                <div
                  id="autosave-realtime-pill"
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    autoSaveStatus === 'saving'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                      : autoSaveStatus === 'saved' || isExistingRecord
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                  title={
                    autoSaveStatus === 'saving'
                      ? 'Saving field changes in the background...'
                      : autoSaveStatus === 'saved'
                      ? 'All modifications automatically saved to database'
                      : 'Auto-save active on every keystroke/change'
                  }
                >
                  {autoSaveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : autoSaveStatus === 'saved' || isExistingRecord ? (
                    <>
                      <Cloud className="w-3 h-3 text-emerald-600" />
                      <span>Auto-Saved</span>
                      {lastAutoSavedTime && (
                        <span className="text-[10px] text-emerald-700 font-mono font-normal">
                          {lastAutoSavedTime}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 text-slate-400" />
                      <span>Auto-Save On</span>
                    </>
                  )}
                </div>

                {/* Bulk CSV / Excel Import */}
                <button
                  id="btn-open-bulk-import"
                  type="button"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Import course results in bulk from CSV, Excel, or LMS with database validation"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bulk CSV Import</span>
                </button>

                {/* Add Course Row Button */}
                <button
                  id="btn-add-subject-row"
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Course</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Official HOD Update Notice Banner for Coordinators and Viewers */}
        {(loadedRecord?.hodLastModifiedBy || currentRecordLogs.some((l) => l.actorRole?.toUpperCase().includes('HOD') || l.summary?.includes('[HOD UPDATE]'))) && (
          <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white p-3.5 border-b border-purple-800/60 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/50 border border-purple-400/50 flex items-center justify-center text-white shrink-0 shadow-inner">
                <ShieldCheck className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-purple-500/40 text-purple-200 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-purple-400/40 tracking-wider">
                    UPDATED BY HEAD OF DEPARTMENT
                  </span>
                  <span className="text-xs font-bold text-white">
                    {loadedRecord?.hodLastModifiedBy || currentRecordLogs.find((l) => l.actorRole?.toUpperCase().includes('HOD'))?.actorName || 'Head of Department'}
                  </span>
                  {loadedRecord?.hodLastModifiedAt && (
                    <span className="text-[11px] text-purple-300 font-mono">
                      • {new Date(loadedRecord.hodLastModifiedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-purple-200/90 mt-0.5">
                  This section was updated directly by the Head of Department. All recent modifications are recorded in the institutional audit logs.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChangeHistoryOpen(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg border border-purple-400/40 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-purple-200" />
              <span>View HOD Audit Logs</span>
            </button>
          </div>
        )}

        {/* Enterprise Quick-Fill & Selective Operations Toolbar (Editable Mode Only) */}
        {!isReadOnly && (
          <div className="bg-emerald-950/95 text-white px-4 py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs border-b border-emerald-800 shadow-inner">
          {/* Left: Quick Tool actions and Target Scope indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-[11px] uppercase font-bold text-emerald-300 flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                Quick Tool:
              </span>

              {/* Selection Status Badge */}
              {isAnySelected ? (
                <div className="flex items-center bg-emerald-900 text-emerald-200 border border-emerald-500/80 rounded-full px-2.5 py-0.5 text-[11px] font-semibold gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>
                    Target: <strong>{selectedCount} Selected {selectedCount === 1 ? 'Course' : 'Courses'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-emerald-400 hover:text-white font-bold ml-0.5 cursor-pointer text-xs"
                    title="Clear selection"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                  Target: <strong>All {subjects.length} Courses</strong>
                </span>
              )}
            </div>

            {/* Scope Switcher when courses are selected */}
            {isAnySelected && (
              <div className="flex items-center bg-emerald-900/80 p-0.5 rounded border border-emerald-700/80 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setApplyScope('selected')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    applyScope === 'selected'
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="Apply changes only to the selected row(s)"
                >
                  Selected Only ({selectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setApplyScope('all')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    applyScope === 'all'
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="Apply changes to all courses in the sheet"
                >
                  All Courses ({subjects.length})
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleBatchMarkStatus('Uploaded')}
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-[11px] font-bold rounded border border-emerald-600/70 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                title={isAnySelected && applyScope === 'selected' ? `Set ${selectedCount} selected course(s) to Uploaded` : "Set all courses to Uploaded"}
              >
                <CheckCheck className="w-3 h-3 text-emerald-300" />
                <span>{isAnySelected && applyScope === 'selected' ? `Selected Uploaded (${selectedCount})` : 'All Uploaded'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchMarkStatus('In Progress')}
                className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-200 text-[11px] font-bold rounded border border-blue-700/60 transition-colors cursor-pointer shadow-2xs"
                title={isAnySelected && applyScope === 'selected' ? `Set ${selectedCount} selected course(s) to In Progress` : "Set all courses to In Progress"}
              >
                <span>{isAnySelected && applyScope === 'selected' ? `Selected In Progress (${selectedCount})` : 'All In Progress'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchMarkStatus('Pending')}
                className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 text-amber-200 text-[11px] font-bold rounded border border-amber-700/60 transition-colors cursor-pointer shadow-2xs"
                title={isAnySelected && applyScope === 'selected' ? `Set ${selectedCount} selected course(s) to Pending` : "Set all courses to Pending"}
              >
                <span>{isAnySelected && applyScope === 'selected' ? `Selected Pending (${selectedCount})` : 'All Pending'}</span>
              </button>

              <button
                type="button"
                onClick={handleBatchSetTodayDate}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                title={isAnySelected && applyScope === 'selected' ? `Apply today's date to ${selectedCount} selected course(s)` : "Apply today's date to all courses"}
              >
                <span>Today&apos;s Date</span>
              </button>

              {currentUser?.name && (
                <button
                  type="button"
                  onClick={handleBatchFillUploader}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded border border-slate-700 transition-colors cursor-pointer"
                  title={`Set instructor/uploader to "${currentUser.name}"`}
                >
                  <span>Fill My Name</span>
                </button>
              )}

              {isAnySelected && (
                <button
                  type="button"
                  onClick={handleBatchDeleteSelected}
                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 text-[11px] font-bold rounded border border-rose-700/70 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title={`Remove ${selectedCount} selected course row(s)`}
                >
                  <Trash2 className="w-3 h-3 text-rose-300" />
                  <span>Delete Selected ({selectedCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Remarks / Delay Reason & Custom Reason Tool */}
          <div className="flex flex-wrap items-center gap-2">
            {!isCustomReasonOpen ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                  <span>Delay Reason:</span>
                </span>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__CUSTOM__') {
                      setIsCustomReasonOpen(true);
                    } else if (val) {
                      handleBatchApplyDelayReason(val);
                    }
                    e.target.value = '';
                  }}
                  className="bg-emerald-900 text-emerald-100 text-[11px] rounded border border-emerald-700 px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 max-w-[240px] md:max-w-[280px] truncate font-medium"
                >
                  <option value="">
                    {isAnySelected && applyScope === 'selected'
                      ? `Apply Reason to Selected (${selectedCount})...`
                      : 'Apply to Pending Courses...'}
                  </option>
                  <option value="__CUSTOM__" className="font-bold text-amber-300 bg-emerald-950">
                    ✍️ + Enter Custom Reason...
                  </option>
                  <optgroup label="Standard Institutional Reasons">
                    {STANDARD_DELAY_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </optgroup>
                  {recentCustomReasons.length > 0 && (
                    <optgroup label="Recent Custom Reasons">
                      {recentCustomReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Direct Custom Reason Button */}
                <button
                  type="button"
                  onClick={() => setIsCustomReasonOpen(true)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/50 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Write a custom remarks / delay reason"
                >
                  <Edit3 className="w-3 h-3 text-amber-300" />
                  <span>Custom Reason</span>
                </button>
              </div>
            ) : (
              /* Inline Custom Reason Input */
              <div className="flex items-center gap-1.5 bg-emerald-900/95 p-1 rounded-lg border border-amber-500/80 shadow-md animate-in fade-in">
                <Edit3 className="w-3.5 h-3.5 text-amber-300 ml-1.5 shrink-0" />
                <input
                  type="text"
                  value={customReasonInput}
                  onChange={(e) => setCustomReasonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBatchApplyDelayReason(customReasonInput);
                    } else if (e.key === 'Escape') {
                      setIsCustomReasonOpen(false);
                      setCustomReasonInput('');
                    }
                  }}
                  placeholder="Type custom reason (e.g. Visiting faculty out of city, re-tabulation)..."
                  className="bg-emerald-950 text-white text-xs px-2.5 py-1 rounded border border-emerald-700 placeholder-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-[240px] sm:min-w-[290px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleBatchApplyDelayReason(customReasonInput)}
                  disabled={!customReasonInput.trim()}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded cursor-pointer transition-colors shrink-0 shadow-xs"
                >
                  {isAnySelected && applyScope === 'selected'
                    ? `Apply to Selected (${selectedCount})`
                    : 'Apply to Pending'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomReasonOpen(false);
                    setCustomReasonInput('');
                  }}
                  className="px-1.5 py-1 text-emerald-300 hover:text-white text-xs cursor-pointer"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Legend / Status Key & Quick Row Selection Toolbar */}
        <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700">Status Legend:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Uploaded (Complete)
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              In Progress
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Pending
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Not Applicable
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Row Selection controls (Editable Mode Only) */}
            {!effectiveReadOnly && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                <span className="font-medium text-slate-600">Select:</span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-700 rounded font-semibold cursor-pointer transition-colors"
                >
                  {allFilteredSelected ? 'Deselect All' : 'All'}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleSelectByStatus('Pending')}
                  className="px-1.5 py-0.5 hover:bg-amber-50 text-amber-800 rounded font-semibold cursor-pointer transition-colors"
                  title="Select all Pending courses"
                >
                  Pending
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleSelectByStatus('In Progress')}
                  className="px-1.5 py-0.5 hover:bg-blue-50 text-blue-800 rounded font-semibold cursor-pointer transition-colors"
                  title="Select all In Progress courses"
                >
                  In Progress
                </button>
                {isAnySelected && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-1.5 py-0.5 text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Clear ({selectedCount})
                    </button>
                  </>
                )}
              </div>
            )}

            <span className="text-[11px] text-slate-500">
              Showing <strong>{filteredSubjects.length}</strong> of <strong>{subjects.length}</strong> courses
            </span>
            {courseFilterQuery && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                Filter active
              </span>
            )}
          </div>
        </div>

        {/* Global Datalist for Delay Reason Autocomplete on row inputs */}
        <datalist id="datalist-delay-reasons">
          {STANDARD_DELAY_REASONS.map((reason) => (
            <option key={reason} value={reason} />
          ))}
          {recentCustomReasons.map((reason) => (
            <option key={reason} value={reason} />
          ))}
        </datalist>

        {/* Mobile Course Cards (Visible on screens < 768px) */}
        <div className="block md:hidden divide-y divide-slate-200 bg-white">
          {filteredSubjects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600 text-sm">No matching courses found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                No course matches &quot;{courseFilterQuery}&quot;. Clear the search or click &quot;Add Course&quot; below.
              </p>
              <button
                type="button"
                onClick={() => setCourseFilterQuery('')}
                className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredSubjects.map((subject, idx) => {
              const isUploaded = subject.status === 'Uploaded';
              const isPending = subject.status === 'Pending';
              const isInProgress = subject.status === 'In Progress';
              const isRowSelected = selectedRowIds.has(subject.id);

              return (
                <div
                  key={`mob-course-${subject.id}`}
                  className={`p-3.5 space-y-2.5 transition-colors ${
                    isRowSelected
                      ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-500'
                      : isUploaded
                      ? 'bg-emerald-50/20'
                      : isPending
                      ? 'bg-amber-50/20'
                      : isInProgress
                      ? 'bg-blue-50/20'
                      : ''
                  }`}
                >
                  {/* Read-Only Mobile View (VC View) */}
                  {isReadOnly ? (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {highlightMatch(subject.courseCode || 'N/A', courseFilterQuery)}
                          </span>
                          <span className="font-mono font-bold text-[10px] bg-indigo-50 text-indigo-900 px-1.5 py-0.5 rounded border border-indigo-200">
                            Sec {section}
                          </span>
                        </div>
                        <div>
                          {isUploaded && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Uploaded
                            </span>
                          )}
                          {isInProgress && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Clock className="w-3 h-3 text-blue-600" />
                              In Progress
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Pending Upload
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {highlightMatch(subject.subjectTitle || 'Untitled Course', courseFilterQuery)}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-700">
                            {highlightMatch(subject.uploadedBy || 'Instructor Assigned', courseFilterQuery)}
                          </span>
                        </div>
                        <span className="font-mono text-slate-500 font-semibold">{subject.creditHours || '3'} Cr. Hrs</span>
                      </div>
                      {subject.remarks && (
                        <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-500 text-[10px] uppercase block mb-0.5">Remarks / Reason:</span>
                          {subject.remarks}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Editable Mobile View */
                    <>
                      {/* Card Header: Checkbox, Row #, Course Code, and Action buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleSelectRow(subject.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-bold text-[10px] bg-indigo-50 text-indigo-900 px-1.5 py-0.5 rounded border border-indigo-200">
                            Sec {section}
                          </span>
                        </div>

                        <div className="flex-1 max-w-[140px]">
                          <input
                            type="text"
                            value={subject.courseCode || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'courseCode', e.target.value.toUpperCase())
                            }
                            placeholder="CODE (CS-101)"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(subject.id)}
                            className="p-1 text-slate-400 hover:text-emerald-700 rounded cursor-pointer"
                            title="Duplicate course"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRowById(subject.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Course Title */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-0.5">
                          Course Title *
                        </label>
                        <input
                          type="text"
                          value={subject.subjectTitle || ''}
                          onChange={(e) =>
                            handleRowChangeById(subject.id, 'subjectTitle', e.target.value)
                          }
                          placeholder="e.g. Programming Fundamentals"
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>

                      {/* Instructor & Credit Hours */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-0.5">
                            Teacher / Instructor
                          </label>
                          <input
                            type="text"
                            value={subject.uploadedBy || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'uploadedBy', e.target.value)
                            }
                            placeholder="Instructor Name"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-0.5 text-center">
                            Credits
                          </label>
                          <input
                            type="text"
                            value={subject.creditHours || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'creditHours', e.target.value)
                            }
                            placeholder="3"
                            className="w-full text-center bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      {/* Big Touch-Friendly Status Buttons */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                          LMS Upload Status *
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRowChangeById(subject.id, 'status', 'Uploaded')}
                            className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                              isUploaded
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>✓ Uploaded</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowChangeById(subject.id, 'status', 'In Progress')}
                            className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                              isInProgress
                                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>⏳ In Prog</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowChangeById(subject.id, 'status', 'Pending')}
                            className={`py-1.5 px-1 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                              isPending
                                ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>⚠ Pending</span>
                          </button>
                        </div>
                      </div>

                      {/* Remarks / Delay Reason */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-0.5">
                          Remarks / Reason for Delay {isPending && <span className="text-amber-600 font-bold">*</span>}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            list="datalist-delay-reasons"
                            value={subject.remarks || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'remarks', e.target.value)
                            }
                            placeholder={
                              isPending
                                ? 'Specify delay reason (required)...'
                                : 'Remarks / notes (optional)'
                            }
                            className={`w-full bg-slate-50 border rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white ${
                              isPending && !subject.remarks?.trim()
                                ? 'border-amber-400 bg-amber-50/40'
                                : 'border-slate-200'
                            }`}
                          />
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleRowChangeById(subject.id, 'remarks', e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="w-7 h-7 p-0 text-slate-500 bg-slate-100 rounded border border-slate-300 text-xs cursor-pointer shrink-0 text-center"
                            title="Insert quick preset delay reason"
                          >
                            <option value="">⚡</option>
                            <optgroup label="Standard Reasons">
                              {STANDARD_DELAY_REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table Content (Visible on screens >= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                {/* Master Checkbox Column (Hidden in read-only) */}
                {!effectiveReadOnly && (
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      id="chk-master-select-all"
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title={allFilteredSelected ? 'Deselect all rows' : 'Select all visible rows'}
                    />
                  </th>
                )}
                <th className="py-2.5 px-2 text-center w-10 text-slate-500">#</th>
                <th className="py-2.5 px-3 w-32">Course Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Course Title *</th>
                <th className="py-2.5 px-2 text-center w-24">Section</th>
                <th className="py-2.5 px-2 text-center w-24">Credit Hours</th>
                <th className="py-2.5 px-3 min-w-[170px]">Teacher / Instructor</th>
                <th className="py-2.5 px-3 w-48">LMS Upload Status *</th>
                {showAdvancedColumns && (
                  <th className="py-2.5 px-3 w-36">Section / Shift</th>
                )}
                {showAdvancedColumns && (
                  <th className="py-2.5 px-3 w-36">Date Uploaded</th>
                )}
                {/* Remarks / Delay Reason */}
                <th className="py-2.5 px-3 min-w-[220px]">
                  <div className="flex items-center gap-1">
                    <span>Remarks / Delay Reason</span>
                    {!effectiveReadOnly && <span className="text-[9px] font-normal text-slate-500 normal-case">(Custom or preset)</span>}
                  </div>
                </th>
                {!effectiveReadOnly && <th className="py-2.5 px-2 text-center w-14">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={effectiveReadOnly ? (showAdvancedColumns ? 10 : 8) : (showAdvancedColumns ? 12 : 10)}
                    className="py-12 text-center text-slate-400 bg-white"
                  >
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No matching courses found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No course matches &quot;{courseFilterQuery}&quot;. Clear the search to view all courses.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCourseFilterQuery('')}
                      className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Clear Search Filter
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject, idx) => {
                  const isUploaded = subject.status === 'Uploaded';
                  const isPending = subject.status === 'Pending';
                  const isInProgress = subject.status === 'In Progress';
                  const isNotApplicable = subject.status === 'Not Applicable';
                  const isRowSelected = selectedRowIds.has(subject.id);

                  return (
                    <tr
                      key={subject.id}
                      className={`transition-colors ${
                        isRowSelected
                          ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-500'
                          : isUploaded
                          ? 'bg-emerald-50/20 hover:bg-slate-50'
                          : isPending
                          ? 'bg-amber-50/20 hover:bg-slate-50'
                          : isInProgress
                          ? 'bg-blue-50/20 hover:bg-slate-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Selection Checkbox (Editable mode only) */}
                      {!isReadOnly && (
                        <td className="py-2.5 px-3 text-center">
                          <input
                            id={`chk-row-${subject.id}`}
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleSelectRow(subject.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            title={isRowSelected ? 'Deselect this course' : 'Select this course for Quick Tool'}
                          />
                        </td>
                      )}

                      {/* Row index */}
                      <td
                        className={`py-2.5 px-2 text-center text-slate-400 font-semibold ${!isReadOnly ? 'cursor-pointer' : ''}`}
                        onClick={() => !isReadOnly && handleToggleSelectRow(subject.id)}
                      >
                        {idx + 1}
                      </td>

                      {/* Course Code */}
                      <td className="py-2 px-3">
                        {isReadOnly ? (
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                            {highlightMatch(subject.courseCode || 'N/A', courseFilterQuery)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={subject.courseCode || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'courseCode', e.target.value.toUpperCase())
                            }
                            placeholder="e.g. CS-101"
                            className={`w-full bg-transparent border rounded px-2 py-1 text-xs font-mono font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white ${
                              courseFilterQuery && subject.courseCode?.toLowerCase().includes(courseFilterQuery.toLowerCase().trim())
                                ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300/60'
                                : 'border-slate-200'
                            }`}
                          />
                        )}
                      </td>

                      {/* Course Title */}
                      <td className="py-2 px-3">
                        {isReadOnly ? (
                          <span className="font-semibold text-slate-900 text-xs">
                            {highlightMatch(subject.subjectTitle || 'Untitled Course', courseFilterQuery)}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={subject.subjectTitle || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'subjectTitle', e.target.value)
                            }
                            placeholder="Enter course name / subject title"
                            className={`w-full bg-transparent border rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-medium ${
                              courseFilterQuery && subject.subjectTitle?.toLowerCase().includes(courseFilterQuery.toLowerCase().trim())
                                ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300/60'
                                : 'border-slate-200'
                            }`}
                          />
                        )}
                      </td>

                      {/* Section Column - Always visible as requested */}
                      <td className="py-2 px-2 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono shadow-2xs"
                          title={`Assigned Class Section: Section ${section}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                          Sec {section}
                        </span>
                      </td>

                      {/* Credit Hours */}
                      <td className="py-2 px-2 text-center">
                        {isReadOnly ? (
                          <span className="font-mono text-slate-700 font-semibold text-xs">
                            {subject.creditHours || '3'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={subject.creditHours || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'creditHours', e.target.value)
                            }
                            placeholder="3"
                            title="Credit hours e.g. 3 or 3(2-1)"
                            className="w-16 mx-auto text-center bg-transparent border border-slate-200 rounded py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-medium"
                          />
                        )}
                      </td>

                      {/* Teacher / Instructor */}
                      <td className="py-2 px-3">
                        {isReadOnly ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{highlightMatch(subject.uploadedBy || 'Not specified', courseFilterQuery)}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={subject.uploadedBy || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'uploadedBy', e.target.value)
                            }
                            placeholder="e.g. Dr. Ahmad Khan"
                            className={`w-full bg-transparent border rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white ${
                              courseFilterQuery && subject.uploadedBy?.toLowerCase().includes(courseFilterQuery.toLowerCase().trim())
                                ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300/60'
                                : 'border-slate-200'
                            }`}
                          />
                        )}
                      </td>

                      {/* LMS Upload Status */}
                      <td className="py-2 px-3">
                        {isReadOnly ? (
                          <div>
                            {isUploaded && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Uploaded (Complete)
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                In Progress
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Pending (Delayed)
                              </span>
                            )}
                            {isNotApplicable && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                                Not Applicable
                              </span>
                            )}
                          </div>
                        ) : (
                          <select
                            value={subject.status}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'status', e.target.value as LMSStatus)
                            }
                            className={`w-full font-bold text-xs rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none focus:ring-2 ${
                              isUploaded
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 focus:ring-emerald-500'
                                : isInProgress
                                ? 'bg-blue-100 text-blue-900 border-blue-300 focus:ring-blue-500'
                                : isPending
                                ? 'bg-amber-100 text-amber-900 border-amber-300 focus:ring-amber-500'
                                : 'bg-slate-100 text-slate-700 border-slate-300 focus:ring-slate-500'
                            }`}
                          >
                            <option value="" disabled>-- Select Status --</option>
                            <option value="Uploaded">✓ Uploaded (Complete)</option>
                            <option value="In Progress">⏳ In Progress</option>
                            <option value="Pending">⚠ Pending (Not Uploaded)</option>
                            <option value="Not Applicable">✕ Not Applicable</option>
                          </select>
                        )}
                      </td>

                      {/* Section / Shift (Advanced column) */}
                      {showAdvancedColumns && (
                        <td className="py-2 px-3">
                          {isReadOnly ? (
                            <span className="text-xs text-slate-700">{subject.sectionShift || 'Morning'}</span>
                          ) : (
                            <input
                              type="text"
                              value={subject.sectionShift || ''}
                              onChange={(e) =>
                                handleRowChangeById(subject.id, 'sectionShift', e.target.value)
                              }
                              placeholder="e.g. Morning - A"
                              className="w-full bg-transparent border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                            />
                          )}
                        </td>
                      )}

                      {/* Notification Date / Date Uploaded (Advanced column) */}
                      {showAdvancedColumns && (
                        <td className="py-2 px-3">
                          {isReadOnly ? (
                            <span className="text-xs font-mono text-slate-700">{subject.dateUploaded || '—'}</span>
                          ) : (
                            <input
                              type="date"
                              value={subject.dateUploaded || ''}
                              onChange={(e) =>
                                handleRowChangeById(subject.id, 'dateUploaded', e.target.value)
                              }
                              className="w-full bg-transparent border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                            />
                          )}
                        </td>
                      )}

                      {/* Remarks / Delay Reason */}
                      <td className="py-2 px-3">
                        {isReadOnly ? (
                          <div className="text-xs">
                            {subject.remarks ? (
                              <span className={isPending ? 'text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-700'}>
                                {subject.remarks}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                {isPending ? 'No delay reason recorded' : '—'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="relative flex items-center gap-1">
                            <input
                              type="text"
                              list="datalist-delay-reasons"
                              value={subject.remarks || ''}
                              onChange={(e) =>
                                handleRowChangeById(subject.id, 'remarks', e.target.value)
                              }
                              placeholder={
                                isPending
                                  ? 'Delay reason required (type or pick)...'
                                  : isInProgress
                                  ? 'Progress notes / reason...'
                                  : 'Optional remarks / notes'
                              }
                              className={`w-full bg-transparent border rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors ${
                                isPending && !subject.remarks?.trim()
                                  ? 'border-amber-300 bg-amber-50/40'
                                  : 'border-slate-200'
                              }`}
                            />
                            {/* Quick Preset Reason Picker for this row */}
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleRowChangeById(subject.id, 'remarks', e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="w-6 h-6 p-0 text-slate-400 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-[10px] cursor-pointer shrink-0 focus:outline-none"
                              title="Insert preset delay reason into this row"
                            >
                              <option value="">⚡</option>
                              <optgroup label="Standard Reasons">
                                {STANDARD_DELAY_REASONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </optgroup>
                              {recentCustomReasons.length > 0 && (
                                <optgroup label="Recent Custom Reasons">
                                  {recentCustomReasons.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Action (Delete row) - Hidden in read-only */}
                      {!effectiveReadOnly && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRowById(subject.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete course row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer Toolbar */}
        <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {!effectiveReadOnly ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Another Course</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveRow}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-medium rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Remove the last row"
              >
                <Minus className="w-3.5 h-3.5 text-slate-500" />
                <span>Remove Last Row</span>
              </button>
              {subjects.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRows}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-medium rounded-lg border border-rose-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Remove all course rows so you can save 0 courses"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clear All Courses ({subjects.length})</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Institutional Record • Verified Read-Only Inspection</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>
              Configured: <strong>Session {session} – Semester {semester}</strong> ({shift})
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-800 font-bold">
              {summary.uploaded} of {summary.totalSubjects} Uploaded ({summary.uploadPercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* CARD 4: ACTIONS & SUBMISSION BAR */}
      <div
        id="hod-action-bar"
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 sm:gap-4"
      >
        {effectiveReadOnly ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {onSwitchToVC && (
                <button
                  type="button"
                  onClick={onSwitchToVC}
                  className="px-4 sm:px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>RETURN TO VC DASHBOARD</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 sm:px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-lg border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>PRINT VERIFIED AUDIT SHEET</span>
              </button>
              <button
                type="button"
                onClick={handleExportCurrent}
                className="px-3.5 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>EXPORT CSV (EXCEL)</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 self-start lg:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isDeadlineExpired && !isVC && !isAdmin 
                  ? `Deadline Expired for Session ${session} (Semester ${semester}) • Form is Locked (Contact VC to Edit)`
                  : 'Vice Chancellor Academic Oversight • Read-Only Inspection Mode'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* SAVE / UPDATE BUTTON */}
              <button
                id="btn-save-record"
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-5 sm:px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{isExistingRecord ? 'UPDATE RECORD IN DATABASE' : 'SAVE RECORD TO DATABASE'}</span>
              </button>

              {/* CLEAR FORM BUTTON */}
              <button
                id="btn-clear-form"
                type="button"
                onClick={handleClearForm}
                className="px-3.5 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Reset active form fields without deleting database records"
              >
                <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                <span>RESET FORM</span>
              </button>

              {/* DELETE RECORD BUTTON */}
              <button
                id="btn-delete-record"
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={!isExistingRecord}
                className={`px-3.5 sm:px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                  isExistingRecord
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                }`}
                title="Permanently remove saved record for this program from database"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>DELETE RECORD</span>
              </button>
            </div>

            {/* Export options for this department & program */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <button
                id="btn-export-department-report-bottom"
                type="button"
                onClick={() => handleOpenPDFReport('ENTIRE_DEPARTMENT')}
                className="px-3.5 sm:px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Generate official signed PDF report of departmental summary merging Morning and Evening shifts"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Export Departmental PDF Report (Morning &amp; Evening)</span>
              </button>

              <button
                id="btn-export-program-csv"
                type="button"
                onClick={handleExportCurrent}
                className="px-3 sm:px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Quick download CSV for current section"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Download CSV</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* SECTION: SUBJECT & RECORD AUDIT LOG */}
      <div id="hod-audit-log-section" className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <span>Audit Log &amp; Subject Activity History</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredAuditLogs.length} Events
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tracks individual user timestamps for record creations, modifications, and deletions for each subject in {department}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => AuditTrailService.exportCSV()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Download complete audit log as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Export Audit CSV</span>
          </button>
        </div>

        {/* Audit Filters & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-1">
            {(['ALL', 'CREATED', 'UPDATED', 'DELETED'] as const).map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setAuditFilterAction(act)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  auditFilterAction === act
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {act === 'ALL' ? 'All Activities' : act}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Search audit log..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="w-full pl-3 pr-3 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Audit Logs List */}
        {filteredAuditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
            No audit logs match the current filters for {program} ({shift} Shift, Session {session}).
          </p>
        ) : (
          <div className="relative border-l-2 border-indigo-200 ml-3 pl-5 space-y-4 py-1 max-h-[360px] overflow-y-auto pr-2">
            {filteredAuditLogs.map((log) => {
              const actionColors = {
                CREATED: 'bg-emerald-600 text-white',
                UPDATED: 'bg-amber-600 text-white',
                DELETED: 'bg-rose-600 text-white',
                APPROVED: 'bg-indigo-600 text-white',
                REASSIGNED: 'bg-violet-600 text-white',
                LOCKED: 'bg-slate-700 text-white',
                SELECTION_SHIFT: 'bg-teal-600 text-white'
              };
              const badgeClass = actionColors[log.action as keyof typeof actionColors] || 'bg-slate-500 text-white';
              
              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow-2xs" />
                  <div className="bg-slate-50/80 hover:bg-slate-50 p-3 rounded-lg border border-slate-200 transition-colors space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${badgeClass}`}>
                          {log.action}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{log.summary}</span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 mt-1">
                      <span>User: <strong className="text-slate-800">{log.actorName}</strong> ({log.actorRole})</span>
                      {log.semester && (
                        <span>Semester: <strong>{log.semester}</strong> (Section {log.section || 'A'})</span>
                      )}
                      {log.shift && <span>Shift: <strong>{log.shift}</strong></span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFLICT DETECTION MODAL */}
      {conflictRecord && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  ⚠️ Version Conflict Detected
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Record edited concurrently by another user</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-lg space-y-2 text-xs">
              <p className="text-slate-700">
                The submission record for <span className="font-bold">{program}</span> (Shift {shift}, Sem {semester}, Sec {section}) was updated after you loaded it.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-rose-100 pt-2 text-slate-500">
                <div>
                  <span className="block text-slate-400 uppercase font-bold text-[9px]">Modified By</span>
                  <span className="font-bold text-slate-700">{conflictRecord.accessedBy || 'Another Faculty'}</span>
                </div>
                <div>
                  <span className="block text-slate-400 uppercase font-bold text-[9px]">Last Modified</span>
                  <span className="font-bold text-slate-700">
                    {conflictRecord.updatedAt ? new Date(conflictRecord.updatedAt).toLocaleTimeString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Saving your changes will overwrite their modifications. Alternatively, you can reload the latest database entries, which will discard your current unsaved edits.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-150">
              <button
                type="button"
                onClick={() => {
                  // Refresh: Discard local changes, load DB record
                  setSubjects(conflictRecord.subjects);
                  setLastSavedTime(conflictRecord.updatedAt);
                  setLoadedUpdatedAt(conflictRecord.updatedAt);
                  setConflictRecord(null);
                  showFeedback('info', 'Record reloaded from database. Concurrent changes merged.');
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                🔄 Refresh &amp; Discard
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Overwrite: Save current copy
                  setConflictRecord(null);
                  await handleSave(true);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                💥 Overwrite Changes
              </button>
            </div>
          </div>
        </div>
      )}

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
      </>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        department={department}
        program={program}
        shift={shift}
        section={section}
        session={session}
        semester={semester}
        isHodOrAdmin={currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN' || isVC}
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

      {/* Coordinator & Faculty Reallocation Modal (HOD Administrative Control) */}
      <CoordinatorAssignmentModal
        isOpen={isCoordinatorAssignModalOpen}
        onClose={() => setIsCoordinatorAssignModalOpen(false)}
        defaultDepartment={department}
        currentUserRole={currentUser?.role}
        onCoordinatorUpdated={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
            window.dispatchEvent(new CustomEvent('mnsuet_auth_changed'));
          }
          if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
        }}
      />
      {/* Bulk Course Import Modal */}
      <BulkCourseImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportCourses={handleImportCourses}
        onImportDirectToSections={handleImportDirectToSections}
        currentCount={subjects.length}
        currentShift={shift}
        currentSemester={semester}
        currentSection={section}
        currentSession={session}
        departmentName={department}
        programName={program}
        availableSections={sectionStatuses.map((s) => s.id)}
        onCommitSuccess={() => {
          if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
          const rec = StorageService.getSubmission(
            department,
            program,
            degreeLevel,
            shift,
            session,
            semester,
            section
          );
          if (rec && rec.subjects) {
            setSubjects(rec.subjects);
          }
        }}
      />

      {/* Custom Section Dialog Modal */}
      {isCustomSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Add / Switch to Custom Section
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Create an isolated section partition (e.g. C, D, E) for {program} ({shift} Shift, Sem {semester}).
            </p>
            <input
              type="text"
              value={customSectionInput}
              onChange={(e) => setCustomSectionInput(e.target.value.toUpperCase())}
              placeholder="e.g. C or D"
              maxLength={12}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white mb-4 uppercase"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomSectionOpen(false);
                  setCustomSectionInput('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleaned = customSectionInput.trim().toUpperCase();
                  if (cleaned) {
                    handleSectionChange(cleaned);
                  }
                  setIsCustomSectionOpen(false);
                  setCustomSectionInput('');
                }}
                disabled={!customSectionInput.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
              >
                Set Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Confirmation Modal */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1">
              Delete Section {sectionToDelete}?
            </h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900">Section {sectionToDelete}</strong> for{' '}
              <strong className="text-slate-900">{program}</strong> ({shift} Shift, Semester {semester}, Session {session})?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 mb-5">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Action Notice</span>
              </div>
              <p className="text-[11px] leading-normal text-rose-700">
                This will delete Section {sectionToDelete} from this cohort, reset the class section back to single Section A, and remove any unintended data from the database and executive reports.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSectionToDelete(null)}
                disabled={isDeletingSection}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSection}
                disabled={isDeletingSection}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeletingSection ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting &amp; Syncing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Section {sectionToDelete}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail & Change History Modal */}
      <ChangeHistoryModal
        isOpen={isChangeHistoryOpen}
        onClose={() => setIsChangeHistoryOpen(false)}
        initialDepartment={department}
        initialProgram={program}
        initialShift={shift}
      />

      {/* Post-Login Request Additional Program Modal */}
      {currentUser && (
        <RequestAdditionalProgramModal
          isOpen={isReqProgModalOpen}
          onClose={() => setIsReqProgModalOpen(false)}
          currentUser={currentUser}
          onRequestSubmitted={(newReq) => {
            showFeedback('success', `Request for "${newReq.requestedProgram}" submitted to your Head of Department.`);
            if (currentUser?.id) {
              setUserProgramRequests(AuthService.getUserProgramRequests(currentUser.id));
            }
          }}
        />
      )}

      {/* Department & Program Result Export Modal (PDF / CSV) */}
      <DepartmentExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        department={department}
        program={program}
        degreeLevel={degreeLevel}
        shift={shift}
        section={section}
        session={session}
        semester={semester}
        hodCoordinator={hodCoordinator}
        submissionDate={submissionDate}
        currentSubjects={subjects}
        currentRecord={loadedRecord}
        currentUser={currentUser}
        defaultScope={exportDefaultScope}
      />

      {/* Send System-Wide Faculty Upload Reminder Modal */}
      <SendFacultyReminderModal
        isOpen={isSendReminderModalOpen}
        onClose={() => setIsSendReminderModalOpen(false)}
        currentUser={currentUser}
        defaultDepartment={department}
        defaultProgram={program}
        defaultShift={shift}
        defaultSession={session}
        defaultSemester={semester}
        defaultSection={section}
        onSuccess={(notification) => {
          showFeedback('success', `Faculty Reminder notification dispatched to ${notification.program} instructors!`);
        }}
      />
    </div>
  );
};
