import React, { useState, useEffect, useMemo } from 'react';
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
import { SubjectRow, SubmissionRecord, LMSStatus, ActiveUserSession, AcademicShift } from '../types';
import { StorageService } from '../services/storageService';
import { ExecutiveSummaryCards } from './ExecutiveSummaryCards';
import { DeadlineBanner } from './DeadlineBanner';
import { DeleteModal } from './DeleteModal';
import { Session2023SelectorModal } from './Session2023SelectorModal';
import { AcademicSessionModal } from './AcademicSessionModal';
import { BulkCourseImportModal } from './BulkCourseImportModal';
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
  Edit3,
  CheckSquare,
  Square,
  AlertTriangle,
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

  const [isDeadlineExpired, setIsDeadlineExpired] = useState<boolean>(() => StorageService.isSystemDeadlineExpired());

  useEffect(() => {
    const handleDeadlineUpdated = () => {
      setIsDeadlineExpired(StorageService.isSystemDeadlineExpired());
    };
    // Re-check periodically just in case it crosses the threshold while they are typing
    const interval = setInterval(handleDeadlineUpdated, 10000);
    window.addEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mnsuet_deadline_updated', handleDeadlineUpdated);
    };
  }, []);

  // Lock form if readonly, or if VC, or if deadline expired and NOT VC/ADMIN
  const isReadOnly = Boolean(readOnly || isVC || (isDeadlineExpired && !isVC && !isAdmin));


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
  const [session, setSession] = useState<string>(
    selectedSessionProp || StorageService.getSelectedSession()
  );
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);

  // Filter to show only programs that belong to the selected session
  const [onlySessionFilter, setOnlySessionFilter] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterVersion, setRosterVersion] = useState<number>(0);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

  // Available programs for current department (guaranteed to include all department offerings)
  const currentDeptPrograms = useMemo(() => {
    const dept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === department);
    if (!dept) return [];
    if (onlySessionFilter && !isReadOnly) {
      const activeNames = StorageService.getSessionPrograms(department, session);
      const filtered = dept.programs.filter((p) => activeNames.includes(p.name));
      return filtered.length > 0 ? filtered : dept.programs;
    }
    return dept.programs;
  }, [department, session, onlySessionFilter, isReadOnly, rosterVersion]);

  const allDeptPrograms = useMemo(() => {
    const dept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === department);
    return dept ? dept.programs : [];
  }, [department]);

  // Institutional Privilege Check:
  // Head of Department (HOD), ADMIN, and VC have department-wide privilege to view and select all programs.
  // Program Coordinators are strictly restricted to their assigned degree programs and assigned shifts.
  const isPrivilegedUser = useMemo(() => {
    return currentUser?.role === 'HOD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'VC';
  }, [currentUser?.role]);

  // Determine programs allowed for the active user:
  const coordinatorAllowedPrograms = useMemo(() => {
    if (isPrivilegedUser) {
      return allDeptPrograms;
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

    return filtered.length > 0 ? filtered : allDeptPrograms;
  }, [isPrivilegedUser, allDeptPrograms, currentUser]);

  const initialProgram = useMemo(() => {
    if (selectedProgramProp) {
      if (isPrivilegedUser) return selectedProgramProp;
      const match = coordinatorAllowedPrograms.find(
        (p) => p.name.trim().toLowerCase() === selectedProgramProp.trim().toLowerCase()
      );
      if (match) return match.name;
    }
    return coordinatorAllowedPrograms[0]?.name || (currentDeptPrograms[0]?.name || '');
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
    if (isPrivilegedUser) {
      return ['Morning', 'Evening'];
    }
    if (currentUser?.programShiftAssignments && program && currentUser.programShiftAssignments[program]) {
      const shs = currentUser.programShiftAssignments[program];
      if (shs && shs.length > 0) return shs;
    }
    if (currentUser?.assignedShifts && currentUser.assignedShifts.length > 0) {
      return currentUser.assignedShifts;
    }
    return ['Morning', 'Evening'];
  }, [isPrivilegedUser, currentUser, program]);

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

  // Section selection (Section A, Section B, Section C, etc.) - strictly isolated data partition
  const [section, setSection] = useState<string>((selectedSectionProp || 'A').trim().toUpperCase());
  const [isCustomSectionOpen, setIsCustomSectionOpen] = useState<boolean>(false);
  const [customSectionInput, setCustomSectionInput] = useState<string>('');

  // Semester selection (1 to 8) - strictly isolated institutional semester cycle
  const [semester, setSemester] = useState<string>(selectedSemesterProp || '1');

  // Course search query & advanced columns toggle
  const [courseFilterQuery, setCourseFilterQuery] = useState<string>('');
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
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState<boolean>(false);

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

  // Status of Morning and Evening shifts for the currently selected program & semester
  const shiftStatuses = useMemo(() => {
    const morningRec = StorageService.getSubmission(
      department,
      program,
      degreeLevel,
      'Morning',
      session,
      semester,
      section
    );
    const eveningRec = StorageService.getSubmission(
      department,
      program,
      degreeLevel,
      'Evening',
      session,
      semester,
      section
    );
    const morningCount = morningRec?.subjects?.filter((s) => s.courseCode.trim() || s.subjectTitle.trim() || s.status).length || 0;
    const eveningCount = eveningRec?.subjects?.filter((s) => s.courseCode.trim() || s.subjectTitle.trim() || s.status).length || 0;

    return {
      morning: { hasRecord: Boolean(morningRec && morningCount > 0), courseCount: morningCount },
      evening: { hasRecord: Boolean(eveningRec && eveningCount > 0), courseCount: eveningCount },
    };
  }, [department, program, degreeLevel, session, semester, section, lastSavedTime, isExistingRecord, storageVersion]);

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

  // Rows state: starts with 8 clean rows ready for fast data entry matching MNS-UET form
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => createInitialBlankRows(1, 'Morning', '1', 'A'));

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

  // When department changes, update program to the first program of that department
  const handleDepartmentChange = (newDept: string) => {
    if (currentUser?.role === 'HOD' && currentUser.department && newDept !== currentUser.department && !isVC && !isAdmin) {
      showFeedback('warning', `Security Isolation: As HOD, you are authorized to manage ${currentUser.department} only.`);
      return;
    }
    setDepartment(newDept);
    if (onDepartmentChangedProp) onDepartmentChangedProp(newDept);
    const targetDept = UNIVERSITY_DEPARTMENTS.find((d) => d.name.trim().toLowerCase() === newDept.trim().toLowerCase());
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

  // Validate that program belongs to selected department & allowed coordinator scope
  useEffect(() => {
    if (!department) return;
    if (!isPrivilegedUser) {
      const isAllowed = coordinatorAllowedPrograms.some(
        (p) => p.name.trim().toLowerCase() === (program || '').trim().toLowerCase()
      );
      if (!isAllowed && coordinatorAllowedPrograms.length > 0) {
        const fallback = coordinatorAllowedPrograms[0].name;
        setProgram(fallback);
        if (onProgramChangedProp) onProgramChangedProp(fallback);
      }
      return;
    }

    const targetDept = UNIVERSITY_DEPARTMENTS.find((d) => d.name.trim().toLowerCase() === department.trim().toLowerCase());
    if (targetDept && targetDept.programs.length > 0) {
      const isValid = targetDept.programs.some((p) => p.name.trim().toLowerCase() === (program || '').trim().toLowerCase());
      if (!isValid) {
        const fallback = targetDept.programs[0].name;
        setProgram(fallback);
        if (onProgramChangedProp) onProgramChangedProp(fallback);
      }
    }
  }, [department, isPrivilegedUser, coordinatorAllowedPrograms]);

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
      setLastSavedTime(existing.updatedAt);
      if (existing.hodCoordinator) setHodCoordinator(existing.hodCoordinator);
      if (existing.submissionDate) setSubmissionDate(existing.submissionDate);

      // Filter to existing non-empty rows, pad up to 8 for fast entry
      const validRows = existing.subjects.filter(
        (r) => r.courseCode.trim() || r.subjectTitle.trim() || r.status
      );
      const rows = [...validRows];
      while (rows.length < 1) {
        rows.push(createEmptySubjectRow(rows.length + 1, shift, semester, section));
      }
      setSubjects(rows);
      setSelectedRowIds(new Set());

      showFeedback(
        'info',
        `Database record loaded for ${program} [${shift} Shift – Semester ${semester} – Section ${section}]: ${validRows.length} subject(s) saved.`
      );
    } else {
      
      // No record exists -> Start with 8 clean rows
      setIsExistingRecord(false);
      setLastSavedTime(null);
      
      // Reset HOD / Coordinator name to the currently logged-in user
      if (currentUser?.name) {
        setHodCoordinator(`${currentUser.name} (${currentUser.designation})`);
      }

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

  // Filtered rows for course table search
  const filteredSubjects = useMemo(() => {
    if (!courseFilterQuery.trim()) return subjects;
    const q = courseFilterQuery.toLowerCase().trim();
    return subjects.filter((s) => {
      return (
        s.courseCode.toLowerCase().includes(q) ||
        s.subjectTitle.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        (s.remarks && s.remarks.toLowerCase().includes(q)) ||
        (s.uploadedBy && s.uploadedBy.toLowerCase().includes(q)) ||
        (s.sectionShift && s.sectionShift.toLowerCase().includes(q))
      );
    });
  }, [subjects, courseFilterQuery]);

  // Field change handler by index
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

  // Field change handler by Row ID (immune to search/filter order)
  const handleRowChangeById = (rowId: string, field: keyof SubjectRow, value: string) => {
    setSubjects((prev) => {
      return prev.map((item) => {
        if (item.id === rowId) {
          const updated = { ...item, [field]: value };
          if (field === 'status' && value === 'Uploaded' && !item.dateUploaded) {
            updated.dateUploaded = submissionDate || new Date().toISOString().split('T')[0];
          }
          return updated;
        }
        return item;
      });
    });
  };

  // Add extra row (up to 25 rows maximum)
  const handleAddRow = () => {
    if (subjects.length >= 25) {
      showFeedback('warning', 'Maximum 25 subject rows reached for this sheet.');
      return;
    }
    const newRow = createEmptySubjectRow(subjects.length + 1, shift, semester, section);
    setSubjects((prev) => [...prev, newRow]);
    showFeedback('info', `Added subject row #${subjects.length + 1} for Semester ${semester} (Section ${section}).`);
  };

  // Remove last course row
  const handleRemoveRow = () => {
    if (subjects.length <= 1) {
      showFeedback('warning', 'At least one row must be kept in the table.');
      return;
    }
    setSubjects((prev) => prev.slice(0, -1));
    showFeedback('info', 'Last course row removed.');
  };

  // Delete a specific row
  const handleDeleteRow = (index: number) => {
    setSubjects((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    showFeedback('info', `Removed row #${index + 1}.`);
  };

  // Delete row by ID
  const handleDeleteRowById = (rowId: string) => {
    setSubjects((prev) => prev.filter((item) => item.id !== rowId));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    showFeedback('info', 'Course row removed.');
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
    setSubjects((prev) => [...prev, duplicated]);
    showFeedback('success', `Duplicated course ${existing.courseCode || existing.subjectTitle}.`);
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

    setSubjects((prev) =>
      prev.map((s) => {
        if (!targetIds.has(s.id)) return s;
        return {
          ...s,
          status: newStatus,
          dateUploaded: newStatus === 'Uploaded' ? (s.dateUploaded || today) : s.dateUploaded,
          uploadedBy: s.uploadedBy || '',
        };
      })
    );

    const scopeLabel = isSelection ? `${count} selected course(s)` : `all ${count} courses`;
    showFeedback('info', `Quick Tool: Marked ${scopeLabel} as "${newStatus}".`);
  };

  const handleBatchSetTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const { targetIds, count, isSelection } = getTargetSubjectRows();

    if (count === 0) {
      showFeedback('warning', 'Please select at least one course row.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) => {
        if (!targetIds.has(s.id)) return s;
        return {
          ...s,
          dateUploaded: today,
        };
      })
    );

    const scopeLabel = isSelection ? `${count} selected course(s)` : `all courses`;
    showFeedback('info', `Quick Tool: Set today's date (${today}) for ${scopeLabel}.`);
  };

  const handleBatchFillUploader = () => {
    const defaultName = currentUser?.name || 'Department Faculty';
    const { targetIds, count, isSelection } = getTargetSubjectRows();

    if (count === 0) {
      showFeedback('warning', 'Please select at least one course row.');
      return;
    }

    setSubjects((prev) =>
      prev.map((s) => {
        if (!targetIds.has(s.id)) return s;
        return {
          ...s,
          uploadedBy: s.uploadedBy?.trim() ? s.uploadedBy : defaultName,
        };
      })
    );

    const scopeLabel = isSelection ? `${count} selected course(s)` : `empty course rows`;
    showFeedback('info', `Quick Tool: Applied "${defaultName}" as instructor/uploader to ${scopeLabel}.`);
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

    setSubjects((prev) =>
      prev.map((s) => {
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
      })
    );

    setIsCustomReasonOpen(false);
    setCustomReasonInput('');

    const scopeLabel = isSelection
      ? `${count} selected course(s)`
      : `all pending/in-progress courses (${updatedCount} updated)`;
    showFeedback('info', `Quick Tool: Applied delay remark "${trimmed}" to ${scopeLabel}.`);
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
    } else {
      setSubjects((prev) => [...prev, ...newRows]);
      showFeedback(
        'success',
        `Appended ${newRows.length} course(s) to Section ${effectiveSection} sheet.`
      );
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

  // Save / Update handler
  const handleSave = async () => {
    if (!department || !program) {
      showFeedback('warning', 'Please select both Department and Program before saving.');
      return;
    }

    // Strict Department Authorization Check for HOD
    if (currentUser?.role === 'HOD' && currentUser.department && !isVC && !isAdmin) {
      if (department.trim().toLowerCase() !== currentUser.department.trim().toLowerCase()) {
        showFeedback('warning', `Access Denied: As Head of Department, you can only manage data for ${currentUser.department}.`);
        return;
      }
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
    const today = new Date().toISOString().split('T')[0];
    const resolvedRows = activeRows.map((s) => ({
      ...s,
      dateUploaded: s.status === 'Uploaded' ? (s.dateUploaded || submissionDate || today) : (s.dateUploaded || ''),
    }));

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
      accessedBy: currentUser?.name || 'University HOD',
      userDesignation: currentUser?.designation || 'HOD / Coordinator',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await StorageService.saveSubmission(recordToSave);
    setIsSaving(false);

    if (result.success) {
      setIsExistingRecord(true);
      setLastSavedTime(new Date().toISOString());
      setSubjects(activeRows);
      showFeedback(
        'success',
        result.isUpdate ? "Record updated successfully." : "Record created successfully."
           
          
      );
      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
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

  // Delete Record (Requirement 10: Prompts confirmation, then deletes only that shift/section record)
  const handleDeleteConfirm = async () => {
    // Strict Department Authorization Check for HOD
    if (currentUser?.role === 'HOD' && currentUser.department && !isVC && !isAdmin) {
      if (department.trim().toLowerCase() !== currentUser.department.trim().toLowerCase()) {
        showFeedback('warning', `Access Denied: As Head of Department, you can only delete records for ${currentUser.department}.`);
        setIsDeleteModalOpen(false);
        return;
      }
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

    setIsDeleteModalOpen(false);

    if (success) {
      setIsExistingRecord(false);
      setLastSavedTime(null);
      setSubjects(createInitialBlankRows(1, shift, semester, section));
      showFeedback('success', 'Record deleted successfully.');
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
    StorageService.exportCSV([currentRec]);
    showFeedback('success', `Exported CSV sheet for ${program} [${shift} Shift – Section ${section}].`);
  };

  const handleSessionChangeFromModal = (newSess: string) => {
    setSession(newSess);
    if (onSessionChangedProp) onSessionChangedProp(newSess);
  };

  return (
    <div id="hod-entry-interface" className="space-y-6">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div
            id="status-feedback-banner"
            className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-xl max-w-sm ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-emerald-500/20'
                : feedbackMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-amber-500/20'
                : 'bg-blue-50 border-blue-400 text-blue-950 shadow-blue-500/20'
            }`}
          >
            {feedbackMessage.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
            {feedbackMessage.type === 'warning' && <Info className="w-6 h-6 text-amber-600 shrink-0" />}
            {feedbackMessage.type === 'info' && <Clock className="w-6 h-6 text-blue-600 shrink-0" />}
            
            <span className="font-bold text-sm leading-snug flex-1">{feedbackMessage.text}</span>
            
            <button
              onClick={() => setFeedbackMessage(null)}
              className="p-1 rounded-md hover:bg-black/5 transition-colors shrink-0"
            >
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

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
                      {(!isPrivilegedUser ? coordinatorAllowedPrograms : allDeptPrograms)
                        .filter((p) => !isPrivilegedUser || StorageService.getSessionPrograms(department, session).includes(p.name))
                        .map((p) => (
                          <option key={p.name} value={p.name} className="bg-slate-900 text-emerald-300 font-bold">
                            {p.name} ({p.degreeLevel}) {!isPrivilegedUser ? '★ Assigned' : `✓ [Session ${session}]`}
                          </option>
                        ))}
                    </optgroup>
                    {isPrivilegedUser && allDeptPrograms.some((p) => !StorageService.getSessionPrograms(department, session).includes(p.name)) && (
                      <optgroup label={`Other Offerings (Not in Session ${session})`}>
                        {allDeptPrograms
                          .filter((p) => !StorageService.getSessionPrograms(department, session).includes(p.name))
                          .map((p) => (
                            <option
                              key={p.name}
                              value={p.name}
                              disabled
                              title={`Not applicable in selected session: Session ${session}`}
                              className="bg-slate-900 text-slate-500 italic"
                            >
                              {p.name} ({p.degreeLevel}) — [Not applicable in Session {session}]
                            </option>
                          ))}
                      </optgroup>
                    )}
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

      {/* CARD 1: TOP BANNER (Matching Screenshot 1) */}
      <div
        id="hod-header-banner"
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                Central Monitoring Portal
              </span>
              <span className="text-[10px] font-bold text-slate-500">• Task #1</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isReadOnly ? 'Executive LMS Result Inspection' : 'LMS Result Upload Status'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isReadOnly
                ? 'Vice Chancellor Academic Quality & LMS Result Verification Audit'
                : 'Departmental Verification & Upload Monitoring into LMS'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Session Switcher */}
          <button
            id="btn-switch-session"
            type="button"
            onClick={() => setIsSessionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Switch or create Academic Session"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>SESSION {session}</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
              Change
            </span>
          </button>

          {/* Current Semester Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>SEMESTER {semester}</span>
          </span>

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
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Return to VC Dashboard</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>VC View (Read Only) &gt;</span>
                </>
              )}
            </button>
          )}

          {/* Database Saved Status Badge */}
          {isExistingRecord ? (
            <span
              id="record-status-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Saved Record
              {lastSavedTime && (
                <span className="text-emerald-700 font-normal hidden lg:inline">
                  ({new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </span>
          ) : (
            <span
              id="record-status-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium border border-slate-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              New Record
            </span>
          )}
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
        <div id="hod-authority-banner" className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900 text-sm">Head of Department Administrative Oversight</p>
              <p className="text-emerald-800 text-xs mt-0.5">
                You have full administrative authorization to view, manage, and update LMS result status for all programs under <strong>{currentUser.department}</strong>.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            HOD Verified
          </span>
        </div>
      )}

      <div className="mb-4">
        <DeadlineBanner currentSession={session} semesterFilter={semester} isVC={false} />
      </div>

      {/* CARD 2: SELECT PROGRAM DETAILS (Screenshot 1) */}
      <div
        id="select-program-details-card"
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
      >
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
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
            <select
              id="select-program"
              value={program}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all cursor-pointer"
            >
              {(() => {
                if (!isPrivilegedUser) {
                  return (
                    <optgroup label={`Your Coordinated Programs (${coordinatorAllowedPrograms.length})`}>
                      {coordinatorAllowedPrograms.map((p) => (
                        <option key={p.name} value={p.name} className="font-bold text-slate-900">
                          {p.name} ★ (Assigned to You)
                        </option>
                      ))}
                    </optgroup>
                  );
                }

                const activeNames = StorageService.getSessionPrograms(department, session);
                const enrolled = allDeptPrograms.filter((p) => activeNames.includes(p.name));
                const other = allDeptPrograms.filter((p) => !activeNames.includes(p.name));

                return (
                  <>
                    {enrolled.length > 0 && (
                      <optgroup label={`Department Degree Offerings (${enrolled.length})`}>
                        {enrolled.map((p) => {
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
                    {other.length > 0 && (
                      <optgroup label={`Additional Department Offerings (${other.length})`}>
                        {other.map((p) => {
                          const isCoordinated = currentUser?.assignedPrograms
                            ? currentUser.assignedPrograms.includes(p.name)
                            : currentUser?.program === p.name;
                          return (
                            <option
                              key={p.name}
                              value={p.name}
                              className="font-medium text-slate-800"
                            >
                              {p.name} {isCoordinated ? '★ (Coordinated)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </>
                );
              })()}
            </select>
            {/* Quick program switcher buttons for HOD & Assigned Coordinators */}
            {(!isPrivilegedUser ? coordinatorAllowedPrograms : allDeptPrograms).length > 1 && (
              <div className="mt-2 pt-1.5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-emerald-600" />
                    {!isPrivilegedUser ? `Your Coordinated Programs (${coordinatorAllowedPrograms.length}):` : `Department Programs (${allDeptPrograms.length}):`}
                  </span>
                  {!isPrivilegedUser && (
                    <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                      🔒 HOD Privilege for Other Programs
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(!isPrivilegedUser ? coordinatorAllowedPrograms : allDeptPrograms).map((p) => {
                    const isSelected = program === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleProgramChange(p.name)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={`Switch to ${p.name}`}
                      >
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!isPrivilegedUser && coordinatorAllowedPrograms.length === 1 && (
              <div className="mt-2 py-1 px-2 bg-amber-50/90 border border-amber-200 rounded text-[10px] text-amber-800 flex items-center gap-1.5">
                <span className="font-bold shrink-0">🔒 Coordinator Scope:</span>
                <span>Assigned to <strong>{coordinatorAllowedPrograms[0]?.name}</strong>. Head of Department (HOD) privilege is required to access other degree programs.</span>
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
            {/* Quick multi-program switcher chips for coordinators overseeing >1 program */}
            {currentUser?.assignedPrograms && currentUser.assignedPrograms.length > 1 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-bold text-teal-900">Your Coordinated Programs:</span>
                {currentUser.assignedPrograms.map((pName) => {
                  const isCurrent = program === pName;
                  return (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => handleProgramChange(pName)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer border ${
                        isCurrent
                          ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                          : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                      }`}
                      title={`Switch to ${pName}`}
                    >
                      {isCurrent ? '● ' : ''}{pName}
                    </button>
                  );
                })}
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Shift <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Class Section:
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                (Data is strictly isolated per section — Section A &amp; B never overlap)
              </span>
            </div>
            <div className="text-[11px] text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              Active: {shift} Shift • Sem {semester} • Section {section}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Quick Semester Jump:
            </span>
            <span className="text-[11px] text-slate-500">
              Active: <strong>Semester {semester}</strong> for <strong>{shift} Shift – Section {section}</strong>
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
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

        {/* Submission Metadata Row (HOD Coordinator & Submission Date) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="input-hod-coordinator"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                HOD / Program Coordinator Name:
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
              placeholder="e.g. Dr. Muhammad Tariq (HOD CS)"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="input-submission-date"
              className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Date of Submission:
            </label>
            <input
              id="input-submission-date"
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 02: EXECUTIVE SUMMARY */}
      <ExecutiveSummaryCards summary={summary} />

      {/* CARD 3: COURSE RESULT UPLOAD STATUS (Matching Screenshot 1) */}
      <div
        id="course-result-upload-card"
        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
      >
        {/* Card Header matching Screenshot 1 */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
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
                <Layers className="w-3.5 h-3.5 text-indigo-700" />
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
          <div className="flex flex-wrap items-center gap-2">
            {/* Search courses input */}
            <div className="relative min-w-[220px]">
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

            {/* If Read-Only (VC View): Show Print and Export. If Editable: Show Bulk Paste and Add Course */}
            {isReadOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Print official departmental sheet"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCurrent}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Export results to CSV/Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </>
            ) : (
              <>
                {/* Bulk Paste from Excel/LMS */}
                <button
                  id="btn-open-bulk-import"
                  type="button"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Copy and paste courses from Excel, LMS, or timetable"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bulk Paste</span>
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
            {!isReadOnly && (
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
                            {subject.courseCode || 'N/A'}
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
                        {subject.subjectTitle || 'Untitled Course'}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-700">{subject.uploadedBy || 'Instructor Assigned'}</span>
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
                {!isReadOnly && (
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
                    {!isReadOnly && <span className="text-[9px] font-normal text-slate-500 normal-case">(Custom or preset)</span>}
                  </div>
                </th>
                {!isReadOnly && <th className="py-2.5 px-2 text-center w-14">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={isReadOnly ? (showAdvancedColumns ? 10 : 8) : (showAdvancedColumns ? 12 : 10)}
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
                            {subject.courseCode || 'N/A'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={subject.courseCode || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'courseCode', e.target.value.toUpperCase())
                            }
                            placeholder="e.g. CS-101"
                            className="w-full bg-transparent border border-slate-200 rounded px-2 py-1 text-xs font-mono font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                          />
                        )}
                      </td>

                      {/* Course Title */}
                      <td className="py-2 px-3">
                        {isReadOnly ? (
                          <span className="font-semibold text-slate-900 text-xs">
                            {subject.subjectTitle || 'Untitled Course'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={subject.subjectTitle || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'subjectTitle', e.target.value)
                            }
                            placeholder="Enter course name / subject title"
                            className="w-full bg-transparent border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-medium"
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
                            <span>{subject.uploadedBy || 'Not specified'}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={subject.uploadedBy || ''}
                            onChange={(e) =>
                              handleRowChangeById(subject.id, 'uploadedBy', e.target.value)
                            }
                            placeholder="e.g. Dr. Ahmad Khan"
                            className="w-full bg-transparent border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
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
                      {!isReadOnly && (
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
          {!isReadOnly ? (
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
                title="Remove the last empty row"
              >
                <Minus className="w-3.5 h-3.5 text-slate-500" />
                <span>Remove Last Row</span>
              </button>
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
        className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4"
      >
        {isReadOnly ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {onSwitchToVC && (
                <button
                  type="button"
                  onClick={onSwitchToVC}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>RETURN TO VC DASHBOARD</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg border border-slate-800 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>PRINT VERIFIED AUDIT SHEET</span>
              </button>
              <button
                type="button"
                onClick={handleExportCurrent}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>EXPORT CSV (EXCEL)</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
    {isDeadlineExpired && !isVC && !isAdmin 
      ? 'Deadline Expired • Form is Locked (Contact VC to Edit)'
      : 'Vice Chancellor Academic Oversight • Read-Only Inspection Mode'}
  </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {/* SAVE / UPDATE BUTTON */}
              <button
                id="btn-save-record"
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isExistingRecord ? 'UPDATE RECORD IN DATABASE' : 'SAVE RECORD TO DATABASE'}</span>
              </button>

              {/* CLEAR FORM BUTTON */}
              <button
                id="btn-clear-form"
                type="button"
                onClick={handleClearForm}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 flex items-center gap-2 transition-all cursor-pointer"
                title="Reset active form fields without deleting database records"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>RESET FORM</span>
              </button>

              {/* DELETE RECORD BUTTON */}
              <button
                id="btn-delete-record"
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={!isExistingRecord}
                className={`px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all border cursor-pointer ${
                  isExistingRecord
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                }`}
                title="Permanently remove saved record for this program from database"
              >
                <Trash2 className="w-4 h-4" />
                <span>DELETE RECORD</span>
              </button>
            </div>

            {/* CSV Export for this program */}
            <div className="flex items-center gap-2">
              <button
                id="btn-export-program-csv"
                type="button"
                onClick={handleExportCurrent}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Program CSV</span>
              </button>
            </div>
          </>
        )}
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
        section={section}
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
        departmentName={department}
        programName={program}
        availableSections={sectionStatuses.map((s) => s.id)}
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
    </div>
  );
};
