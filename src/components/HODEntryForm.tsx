import React, { useState, useEffect, useMemo } from 'react';
import {
  DepartmentGroup,
  UNIVERSITY_DEPARTMENTS,
  ACADEMIC_SHIFTS,
  ACADEMIC_SEMESTERS,
  DEGREE_LEVEL_OPTIONS,
  createEmptySubjectRow,
  createInitialBlankRows,
} from '../data/departmentsData';
import { SubjectRow, SubmissionRecord, LMSStatus, ActiveUserSession, AcademicShift } from '../types';
import { StorageService } from '../services/storageService';
import { ExecutiveSummaryCards } from './ExecutiveSummaryCards';
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
  currentUser?: ActiveUserSession;
  onOpenUserModal?: () => void;
  onSessionChangedProp?: (session: string) => void;
  onSemesterChangedProp?: (semester: string) => void;
  onDepartmentChangedProp?: (dept: string) => void;
  onProgramChangedProp?: (prog: string) => void;
  onShiftChangedProp?: (shift: AcademicShift) => void;
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
  currentUser,
  onOpenUserModal,
  onSessionChangedProp,
  onSemesterChangedProp,
  onDepartmentChangedProp,
  onProgramChangedProp,
  onShiftChangedProp,
  onSwitchToVC,
  readOnly,
}) => {
  const isVC = currentUser?.role === 'VC';
  const isReadOnly = Boolean(readOnly || isVC);

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
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);

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

  // Auto-derived default degree level, with user override capability
  const autoDegreeLevel = useMemo(() => {
    const progInfo = currentDeptPrograms.find((p) => p.name === program);
    return progInfo?.degreeLevel || 'BS (4 Years)';
  }, [currentDeptPrograms, program]);

  const [degreeLevel, setDegreeLevel] = useState<string>(autoDegreeLevel);

  useEffect(() => {
    setDegreeLevel(autoDegreeLevel);
  }, [autoDegreeLevel]);

  // Shift selection (Morning vs Evening) - strictly isolated hierarchy level
  const [shift, setShift] = useState<AcademicShift>(selectedShiftProp || 'Morning');

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

  // Status of each semester (1 to 8) for the current department + program + shift + session
  const semesterStatuses = useMemo(() => {
    return ACADEMIC_SEMESTERS.map((sem) => {
      const existing = StorageService.getSubmission(
        department,
        program,
        degreeLevel,
        shift,
        session,
        sem.id
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
  }, [department, program, degreeLevel, shift, session, lastSavedTime, isExistingRecord]);

  const handleSemesterChange = (newSem: string) => {
    setSemester(newSem);
    if (onSemesterChangedProp) onSemesterChangedProp(newSem);
  };

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
  const [subjects, setSubjects] = useState<SubjectRow[]>(() => createInitialBlankRows(8, 'Morning'));

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

  useEffect(() => {
    if (selectedSemesterProp && selectedSemesterProp !== semester) {
      setSemester(selectedSemesterProp);
    }
  }, [selectedSemesterProp]);

  // Strict Department & Program Isolation for HOD & Coordinator roles
  useEffect(() => {
    const isRestricted = currentUser?.role === 'HOD' || currentUser?.role === 'COORDINATOR';
    if (isRestricted && currentUser.department) {
      if (department !== currentUser.department) {
        handleDepartmentChange(currentUser.department);
      }
    }
    // If user is a Coordinator with an assigned program, auto-select it if not already set
    if (currentUser?.role === 'COORDINATOR' && currentUser.program) {
      if (program !== currentUser.program) {
        setProgram(currentUser.program);
        if (onProgramChangedProp) onProgramChangedProp(currentUser.program);
      }
    }
  }, [currentUser, department, program]);

  // When department changes, update program to the first program of that department
  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    if (onDepartmentChangedProp) onDepartmentChangedProp(newDept);
    const targetDept = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDept);
    if (targetDept && targetDept.programs.length > 0) {
      const activeNames = StorageService.getSessionPrograms(newDept, session);
      const available = onlySessionFilter
        ? targetDept.programs.filter((p) => activeNames.includes(p.name))
        : targetDept.programs;
      const pick = available[0] || targetDept.programs[0];
      const progName = pick ? pick.name : '';
      setProgram(progName);
      if (onProgramChangedProp) onProgramChangedProp(progName);
    } else {
      setProgram('');
      if (onProgramChangedProp) onProgramChangedProp('');
    }
  };

  const handleProgramChange = (newProg: string) => {
    setProgram(newProg);
    if (onProgramChangedProp) onProgramChangedProp(newProg);
  };

  const handleShiftChange = (newShift: AcademicShift) => {
    setShift(newShift);
    if (onShiftChangedProp) onShiftChangedProp(newShift);
  };

  // LOAD / CHECK EXISTING RECORD whenever Department, Program, Degree Level, Shift, Session, or Semester changes
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

      // Filter to existing non-empty rows, pad up to 8 for fast entry
      const validRows = existing.subjects.filter(
        (r) => r.courseCode.trim() || r.subjectTitle.trim() || r.status
      );
      const rows = [...validRows];
      while (rows.length < 8) {
        rows.push(createEmptySubjectRow(rows.length + 1, shift, semester));
      }
      setSubjects(rows);
      setSelectedRowIds(new Set());

      showFeedback(
        'info',
        `Database record loaded for ${program} [${shift} Shift – Semester ${semester}]: ${validRows.length} subject(s) saved.`
      );
    } else {
      // No record exists -> Start with 8 clean rows
      setIsExistingRecord(false);
      setLastSavedTime(null);
      setSubjects(createInitialBlankRows(8, shift, semester));
      setSelectedRowIds(new Set());
      showFeedback(
        'info',
        `Ready to enter courses for ${program} (${shift} Shift – Semester ${semester}). Fill course details and click 'Submit Result Status'.`
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
          return { ...item, [field]: value };
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
    const newRow = createEmptySubjectRow(subjects.length + 1, shift, semester);
    if (currentUser?.name) {
      newRow.uploadedBy = currentUser.name;
    }
    setSubjects((prev) => [...prev, newRow]);
    showFeedback('info', `Added subject row #${subjects.length + 1} for Semester ${semester}.`);
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
          uploadedBy: s.uploadedBy || (currentUser?.name || ''),
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

  const handleImportCourses = (imported: Partial<SubjectRow>[], mode: 'replace' | 'append') => {
    const newRows: SubjectRow[] = imported.map((c, i) => ({
      id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + i,
      courseCode: c.courseCode || '',
      subjectTitle: c.subjectTitle || '',
      creditHours: c.creditHours || '3',
      sectionShift: c.sectionShift || shift,
      status: c.status || 'Uploaded',
      dateUploaded: c.dateUploaded || (c.status === 'Uploaded' ? new Date().toISOString().split('T')[0] : ''),
      uploadedBy: c.uploadedBy || (currentUser?.name || ''),
      remarks: c.remarks || '',
    }));

    if (mode === 'replace') {
      const total = Math.max(newRows.length, 6);
      const filledRows: SubjectRow[] = [...newRows];
      while (filledRows.length < total) {
        filledRows.push(createEmptySubjectRow(filledRows.length + 1, shift, semester));
      }
      setSubjects(filledRows);
      showFeedback('success', `Imported ${newRows.length} course(s) and replaced existing table.`);
    } else {
      setSubjects((prev) => [...prev, ...newRows]);
      showFeedback('success', `Appended ${newRows.length} course(s) to table.`);
    }
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
          ? `Record updated successfully for ${program} [${shift} Shift – Semester ${semester}] (${activeRows.length} subjects). Changes saved to database.`
          : `New record saved successfully for ${program} [${shift} Shift – Semester ${semester}] (${activeRows.length} subjects) in database.`
      );
      if (onRecordSavedOrDeleted) onRecordSavedOrDeleted();
    }
  };

  // Clear Form (Requirement 11: Clear Form clears screen ONLY, does NOT delete database data)
  const handleClearForm = () => {
    setSubjects(createInitialBlankRows(1, shift, semester));
    showFeedback(
      'info',
      `Visible form cleared on screen for ${shift} shift – Semester ${semester}. Previously saved database records remain untouched.`
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
      setSubjects(createInitialBlankRows(1, shift, semester));
      showFeedback('success', `Record permanently deleted from database for ${program} [${shift} Shift – Semester ${semester}].`);
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
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                {department} • {program} ({shift} Shift — Semester {semester})
              </h3>
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

        {/* 5 Form Fields Grid matching Screenshot 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Department */}
          <div>
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="select-program"
                className="text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                Program <span className="text-rose-600">*</span>
                {currentUser?.role === 'COORDINATOR' && currentUser.program === program && (
                  <span className="text-[9px] bg-teal-100 text-teal-800 px-1 py-0.2 rounded font-bold">
                    My Program
                  </span>
                )}
              </label>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setIsRosterModalOpen(true)}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                  title="Configure active roster for this session"
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
              {currentDeptPrograms.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} {currentUser?.program === p.name ? '★ (Coordinated)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
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
          <div>
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
          <div>
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
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Morning</span>
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
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Evening</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Semester Selection Tabs (Semesters 1-8) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Quick Semester Jump:
            </span>
            <span className="text-[11px] text-slate-500">
              Active: <strong>Semester {semester}</strong> for <strong>{shift} Shift</strong>
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
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Course Result Upload Status
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {program} • Sem {semester} • {shift}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter individual course details, teaching instructor, and current upload status into the LMS portal.
            </p>
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {subject.courseCode || 'N/A'}
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
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleSelectRow(subject.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
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
                    colSpan={isReadOnly ? (showAdvancedColumns ? 9 : 7) : (showAdvancedColumns ? 11 : 9)}
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
              <span>Vice Chancellor Academic Oversight • Read-Only Inspection Mode</span>
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
        currentCount={subjects.length}
        currentShift={shift}
        currentSemester={semester}
        departmentName={department}
        programName={program}
      />
    </div>
  );
};
