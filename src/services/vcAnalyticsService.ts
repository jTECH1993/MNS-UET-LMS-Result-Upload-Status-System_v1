import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SEMESTERS } from '../data/departmentsData';
import { AuthService } from './authService';
import { StorageService } from './storageService';
import { SubmissionRecord, AcademicShift, SubjectRow, ProgramInfo } from '../types';

export interface CoordinatorDimension {
  name: string;
  username?: string;
  email?: string;
  isAssigned: boolean;
  accountStatus: 'Active' | 'Not Created';
  lastLoginAt?: string;
  shifts?: AcademicShift[];
  shiftLabel?: string;
}

export interface HODDimension {
  name: string;
  username?: string;
  email?: string;
  isRegistered: boolean;
  lastLoginAt?: string;
}

export interface CourseDetail {
  id: string;
  courseCode: string;
  subjectTitle: string;
  creditHours?: string;
  status: 'Uploaded' | 'Pending' | 'In Progress';
  dateUploaded?: string;
  uploadedBy?: string;
  remarks?: string;
  expected: boolean;
  submitted: boolean;
  coordinatorName: string;
  deadline: string | null;
  lastActivity: string;
}

export interface SectionBreakdown {
  section: string; // 'A', 'B', 'C'
  totalCourses: number;
  uploadedCourses: number;
  pendingCourses: number;
  inProgressCourses: number;
  completionRate: number; // 0-100
  status: 'Completed' | 'Partial' | 'Not Started';
  submissionRecord?: SubmissionRecord | null;
  courses: CourseDetail[];
}

export interface ProgramDimension {
  department: string;
  deptCode: string;
  program: string;
  degreeLevel: string;
  coordinator: CoordinatorDimension;
  sectionsCount: number;
  totalCourses: number;
  uploadedCourses: number;
  pendingCourses: number;
  completionRate: number; // 0-100
  status: 'Verified' | 'Partial' | 'Not Started' | 'Overdue' | 'Attention Required';
  lastSubmissionDate?: string;
  sections: SectionBreakdown[];
}

export interface DepartmentDimension {
  name: string;
  code: string;
  hod: HODDimension;
  programsCount: number;
  totalCourses: number;
  uploadedCourses: number;
  pendingCourses: number;
  completionRate: number; // 0-100
  status: 'Completed' | 'Good' | 'Needs Attention' | 'Critical';
  programs: ProgramDimension[];
}

export interface ActionRequiredException {
  id: string;
  category: 'OVERDUE' | 'CRITICAL_LOW' | 'PARTIAL' | 'NO_COORDINATOR' | 'NO_HOD';
  badge: string;
  severity: 'red' | 'orange' | 'yellow' | 'gray';
  department: string;
  deptCode: string;
  program?: string;
  semester?: string;
  section?: string;
  message: string;
  detail: string;
}

export interface DeadlineAgingRisk {
  overdue: number;
  dueToday: number;
  dueWithin3Days: number;
  dueLater: number;
}

export class VCAnalyticsService {
  /**
   * Retrieves complete, uncoupled academic hierarchy:
   * Department -> Programs -> Sections -> Courses
   * with decoupled HOD and Coordinator accounts.
   */
  public static buildAcademicHierarchy(params: {
    allRecords: SubmissionRecord[];
    currentSession: string | string[];
    semesterFilter?: string | string[]; // 'ALL' or '1'-'8' or array of semester IDs
    shiftFilter?: 'ALL' | AcademicShift;
    sectionFilter?: string; // 'ALL' or 'A'-'D'
  }): {
    departments: DepartmentDimension[];
    overallCompletionRate: number;
    totalDepartments: number;
    completedDepartments: number;
    totalPrograms: number;
    activePrograms: number;
    totalCourses: number;
    uploadedCourses: number;
    pendingCourses: number;
    exceptions: ActionRequiredException[];
    agingRisk: DeadlineAgingRisk;
  } {
    const { allRecords, currentSession, semesterFilter = 'ALL', shiftFilter = 'ALL', sectionFilter = 'ALL' } = params;
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const semesterList = Array.isArray(semesterFilter)
      ? semesterFilter.filter((s) => s !== 'ALL')
      : semesterFilter === 'ALL'
      ? []
      : [semesterFilter];

    const accounts = AuthService.getAccounts();
    const deadline = StorageService.getSystemDeadline();
    const isDeadlinePassed = StorageService.isSystemDeadlineExpired();

    const departments: DepartmentDimension[] = [];
    const exceptions: ActionRequiredException[] = [];

    let totalUniversityCourses = 0;
    let totalUniversityUploaded = 0;
    let totalUniversityPending = 0;
    let totalUniversityPrograms = 0;
    let totalUniversityActivePrograms = 0;

    let overdueCount = 0;
    let dueTodayCount = 0;
    let dueWithin3DaysCount = 0;
    let dueLaterCount = 0;

    const now = new Date();
    let deadlineDate: Date | null = null;
    let daysToDeadline = 999;
    if (deadline) {
      deadlineDate = new Date(deadline);
      const diffMs = deadlineDate.getTime() - now.getTime();
      daysToDeadline = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      // 1. Resolve HOD Dimension (Department exists even if HOD is not registered)
      const hodAccount = accounts.find(
        (acc) => acc.role === 'HOD' && acc.department.trim().toLowerCase() === dept.name.trim().toLowerCase()
      );

      const hodDim: HODDimension = hodAccount
        ? {
            name: hodAccount.name,
            username: hodAccount.username,
            email: hodAccount.email,
            isRegistered: true,
            lastLoginAt: hodAccount.lastLoginAt,
          }
        : {
            name: 'Not Registered',
            isRegistered: false,
          };

      if (!hodDim.isRegistered) {
        exceptions.push({
          id: `no-hod-${dept.code}`,
          category: 'NO_HOD',
          badge: 'HOD Not Registered',
          severity: 'gray',
          department: dept.name,
          deptCode: dept.code,
          message: `${dept.name} has no registered HOD account`,
          detail: 'Leadership profile not initialized in portal',
        });
      }

      // 2. Resolve Programs Dimension - Strictly for selected sessions (e.g. Session 2023, 2024...)
      // Only consider active programs dynamically configured for these sessions or with active submissions
      const registeredProgramNames = new Set<string>();
      sessionList.forEach((sess) => {
        const sessionRoster = StorageService.getSessionPrograms(dept.name, sess, allRecords);
        sessionRoster.forEach((p) => registeredProgramNames.add(p));
      });

      // Dynamically include any program that has authentic submitted LMS records in this department for selected sessions
      allRecords.forEach((r) => {
        if (
          r.department.trim().toLowerCase() === dept.name.trim().toLowerCase() &&
          sessionList.includes(r.session || '2023') &&
          r.program &&
          r.program.trim()
        ) {
          registeredProgramNames.add(r.program.trim());
        }
      });

      // Filter dept.programs to only those active in the selected sessions
      const activePrograms: ProgramInfo[] = [];
      registeredProgramNames.forEach((progName) => {
        const found = dept.programs.find((p) => p.name.trim().toLowerCase() === progName.trim().toLowerCase());
        if (found) {
          activePrograms.push(found);
        } else {
          activePrograms.push({
            name: progName,
            degreeLevel: progName.startsWith('MS') || progName.startsWith('M.Sc') ? 'MS' : 'BS',
            department: dept.name,
            session2023: sessionList.some((s) => s === '2023' || s.includes('23')),
          });
        }
      });

      const programDims: ProgramDimension[] = [];
      let deptCourses = 0;
      let deptUploaded = 0;
      let deptPending = 0;

      activePrograms.forEach((prog) => {
        totalUniversityPrograms++;

        // Coordinator Dimension: dynamic lookup from accounts and stored database records
        const matchingCoordAccounts = accounts.filter((acc) => {
          if (acc.role !== 'COORDINATOR' && acc.role !== 'LECTURER') return false;
          if (acc.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
          const assigned = acc.assignedPrograms || (acc.program ? [acc.program] : []);
          const keysFromShifts = acc.programShiftAssignments ? Object.keys(acc.programShiftAssignments) : [];
          const allProgs = Array.from(new Set([...assigned, ...keysFromShifts]));
          return allProgs.some((p) => p.trim().toLowerCase() === prog.name.trim().toLowerCase());
        });

        let coordinatorAccount = matchingCoordAccounts[0];
        if (shiftFilter !== 'ALL' && matchingCoordAccounts.length > 1) {
          const shiftSpecific = matchingCoordAccounts.find((acc) => {
            const shs = (acc.programShiftAssignments && acc.programShiftAssignments[prog.name]) || acc.assignedShifts || ['Morning', 'Evening'];
            return shs.includes(shiftFilter as AcademicShift);
          });
          if (shiftSpecific) coordinatorAccount = shiftSpecific;
        }

        let coordShifts: AcademicShift[] | undefined = undefined;
        let coordShiftLabel: string | undefined = undefined;
        let coordDisplayName: string | undefined = undefined;

        if (matchingCoordAccounts.length > 1 && shiftFilter === 'ALL') {
          // If multiple coordinators oversee different shifts of this program
          const namesWithShifts = matchingCoordAccounts.map((acc) => {
            const shs = (acc.programShiftAssignments && acc.programShiftAssignments[prog.name]) || acc.assignedShifts || ['Morning', 'Evening'];
            const label = shs.includes('Morning') && shs.includes('Evening') ? 'M&E' : shs.includes('Morning') ? 'Morning' : 'Evening';
            return `${acc.name} (${label})`;
          });
          coordDisplayName = namesWithShifts.join(' • ');
          coordShiftLabel = 'Morning & Evening (Coordinated)';
          coordShifts = ['Morning', 'Evening'];
        } else if (coordinatorAccount) {
          coordDisplayName = coordinatorAccount.name;
          coordShifts = (coordinatorAccount.programShiftAssignments && coordinatorAccount.programShiftAssignments[prog.name]) ||
            coordinatorAccount.assignedShifts || ['Morning', 'Evening'];
          if (coordShifts.includes('Morning') && coordShifts.includes('Evening')) {
            coordShiftLabel = 'Morning & Evening';
          } else if (coordShifts.includes('Morning')) {
            coordShiftLabel = 'Morning Only';
          } else if (coordShifts.includes('Evening')) {
            coordShiftLabel = 'Evening Only';
          }
        }

        // Check if any database submission for this program records a coordinator
        let dbCoordName = '';
        if (!coordinatorAccount && matchingCoordAccounts.length === 0) {
          const recWithCoord = allRecords.find((r) => {
            if (r.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
            if (r.program.trim().toLowerCase() !== prog.name.trim().toLowerCase()) return false;
            return !!(r.hodCoordinator && r.hodCoordinator.trim() && !r.hodCoordinator.includes('HOD / Coordinator'));
          });
          if (recWithCoord && recWithCoord.hodCoordinator) {
            dbCoordName = recWithCoord.hodCoordinator.trim();
          }
        }

        const coordinatorDim: CoordinatorDimension = (coordinatorAccount || matchingCoordAccounts.length > 0)
          ? {
              name: coordDisplayName || coordinatorAccount.name,
              username: coordinatorAccount?.username || matchingCoordAccounts[0]?.username,
              email: coordinatorAccount?.email || matchingCoordAccounts[0]?.email,
              isAssigned: true,
              accountStatus: 'Active',
              lastLoginAt: coordinatorAccount?.lastLoginAt || matchingCoordAccounts[0]?.lastLoginAt,
              shifts: coordShifts,
              shiftLabel: coordShiftLabel,
            }
          : dbCoordName
          ? {
              name: dbCoordName,
              isAssigned: true,
              accountStatus: 'Active',
              shiftLabel: 'Morning & Evening',
            }
          : {
              name: 'Not Assigned',
              isAssigned: false,
              accountStatus: 'Not Created',
            };

        if (!coordinatorDim.isAssigned) {
          exceptions.push({
            id: `no-coord-${dept.code}-${prog.name.replace(/\s+/g, '-')}`,
            category: 'NO_COORDINATOR',
            badge: 'No Coordinator Assigned',
            severity: 'gray',
            department: dept.name,
            deptCode: dept.code,
            program: prog.name,
            message: `${prog.name} has no coordinator assigned`,
            detail: 'Account not created; academic oversight unassigned',
          });
        }

        // Multiple Sections Dimension: Dynamically resolve active sections for this program
        const matchingRecords = allRecords.filter((r) => {
          if (r.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
          if (r.program.trim().toLowerCase() !== prog.name.trim().toLowerCase()) return false;
          if (!sessionList.includes(r.session || '2023')) return false;
          if (semesterList.length > 0 && !semesterList.includes(r.semester || '1')) return false;
          if (shiftFilter !== 'ALL' && (r.shift || 'Morning') !== shiftFilter) return false;
          return true;
        });

        // Determine active sections for this specific program:
        // Always starts with baseline Section A. Extra sections (like B) only exist if registered or if valid submitted records exist.
        const cleanDeptName = dept.name.trim().toLowerCase();
        const cleanProgName = prog.name.trim().toLowerCase();
        const progActiveSections = new Set<string>(['A']);

        matchingRecords.forEach((r) => {
          if (r.subjects && r.subjects.some((s) => s && (s.subjectTitle?.trim() || s.courseCode?.trim()))) {
            const sec = (r.section || 'A').trim().toUpperCase();
            if (sec) progActiveSections.add(sec);
          }
        });

        const cohortMap = StorageService.getCohortSectionsMap();
        const activeSemId = semesterList.length === 1 ? semesterList[0] : (typeof semesterFilter === 'string' && semesterFilter !== 'ALL' ? semesterFilter : '');
        Object.keys(cohortMap).forEach((key) => {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes(cleanDeptName) &&
            lowerKey.includes(cleanProgName) &&
            (!activeSemId || lowerKey.includes(`__${activeSemId}__`) || lowerKey.endsWith(`__${activeSemId}`))
          ) {
            const list = cohortMap[key];
            if (Array.isArray(list)) {
              list.forEach((s) => {
                const clean = (s || '').trim().toUpperCase();
                if (clean) progActiveSections.add(clean);
              });
            }
          }
        });

        let targetSections: string[] = [];
        if (sectionFilter === 'ALL') {
          targetSections = Array.from(progActiveSections).sort((a, b) => {
            if (a === 'A') return -1;
            if (b === 'A') return 1;
            return a.localeCompare(b);
          });
        } else {
          targetSections = progActiveSections.has(sectionFilter) ? [sectionFilter] : ['A'];
        }

        if (targetSections.length === 0) {
          targetSections = ['A'];
        }

        // If semesterFilter is 'ALL' or empty, account for all active semesters (1 to 8) to calculate realistic program expected courses
        const semestersToEvaluate: string[] =
          semesterList.length > 0
            ? semesterList
            : ACADEMIC_SEMESTERS.map((s: { id: string }) => s.id);

        const sectionBreakdowns: SectionBreakdown[] = [];
        let progCourses = 0;
        let progUploaded = 0;
        let progPending = 0;
        let progInProgress = 0;
        let latestSubmission: string | undefined = undefined;

        targetSections.forEach((secName) => {
          let secUploaded = 0;
          let secPending = 0;
          let secInProgress = 0;
          let secTotal = 0;
          const courseDetails: CourseDetail[] = [];
          let secRec: SubmissionRecord | null = null;

          semestersToEvaluate.forEach((semId: string) => {
            const rec = matchingRecords.find(
              (r) =>
                (r.section || 'A').trim().toUpperCase() === secName &&
                (r.semester || '1').trim() === semId
            );

            if (rec && rec.updatedAt) {
              if (!latestSubmission || new Date(rec.updatedAt) > new Date(latestSubmission)) {
                latestSubmission = rec.updatedAt;
              }
            }
            if (rec && !secRec) {
              secRec = rec;
            }

            const rawSubjects: SubjectRow[] = rec?.subjects && rec.subjects.length > 0 ? rec.subjects : [];
            const validSubjects = rawSubjects.filter(
              (s) => s && (s.courseCode?.trim() || s.subjectTitle?.trim() || s.status)
            );

            if (validSubjects.length > 0) {
              validSubjects.forEach((s, idx) => {
                const status = (s.status === 'Uploaded' ? 'Uploaded' : s.status === 'In Progress' ? 'In Progress' : 'Pending');
                if (status === 'Uploaded') secUploaded++;
                else if (status === 'In Progress') secInProgress++;
                else secPending++;

                courseDetails.push({
                  id: s.id || `course-${semId}-${secName}-${idx}`,
                  courseCode: s.courseCode || `COURSE-${100 + idx}`,
                  subjectTitle: s.subjectTitle || `Curricular Subject ${idx + 1}`,
                  creditHours: s.creditHours || '3(3-0)',
                  status,
                  dateUploaded: s.dateUploaded || rec?.submissionDate || '',
                  uploadedBy: s.uploadedBy || rec?.accessedBy || coordinatorDim.name,
                  remarks: s.remarks || '',
                  expected: true,
                  submitted: status === 'Uploaded',
                  coordinatorName: coordinatorDim.name,
                  deadline,
                  lastActivity: s.dateUploaded || rec?.updatedAt || 'Updated in LMS',
                });
              });
              secTotal += validSubjects.length;
            }
          });

          const secPct = secTotal > 0 ? Math.round((secUploaded / secTotal) * 100) : 0;
          const secStatus = secPct === 100 ? 'Completed' : secPct > 0 ? 'Partial' : 'Not Started';

          sectionBreakdowns.push({
            section: secName,
            totalCourses: secTotal,
            uploadedCourses: secUploaded,
            pendingCourses: secPending,
            inProgressCourses: secInProgress,
            completionRate: secPct,
            status: secStatus,
            submissionRecord: secRec,
            courses: courseDetails,
          });

          progCourses += secTotal;
          progUploaded += secUploaded;
          progPending += secPending;
          progInProgress += secInProgress;
        });

        // Ensure every active academic program has at least 5 expected courses awaiting entry
        if (progCourses === 0) {
          const defaultSec = 'A';
          const defaultCourses: CourseDetail[] = [];
          for (let i = 1; i <= 5; i++) {
            defaultCourses.push({
              id: `awaiting-${dept.code}-${prog.name.replace(/\s+/g, '-')}-${defaultSec}-c${i}`,
              courseCode: `SUBJ-${i}`,
              subjectTitle: `Curricular Subject ${i} (Awaiting LMS Entry)`,
              creditHours: '3(3-0)',
              status: 'Pending',
              dateUploaded: '',
              uploadedBy: coordinatorDim.isAssigned ? coordinatorDim.name : 'Coordinator Unassigned',
              remarks: `Awaiting LMS result upload for ${prog.name}`,
              expected: true,
              submitted: false,
              coordinatorName: coordinatorDim.name,
              deadline,
              lastActivity: 'Awaiting submission',
            });
          }
          sectionBreakdowns.push({
            section: defaultSec,
            totalCourses: 5,
            uploadedCourses: 0,
            pendingCourses: 5,
            inProgressCourses: 0,
            completionRate: 0,
            status: 'Not Started',
            submissionRecord: null,
            courses: defaultCourses,
          });
          progCourses = 5;
          progPending = 5;
          progUploaded = 0;
          progInProgress = 0;
        }

        const progCompletion = progCourses > 0 ? Math.round((progUploaded / progCourses) * 100) : 0;
        let progStatus: 'Verified' | 'Partial' | 'Not Started' | 'Overdue' | 'Attention Required';

        if (progCompletion === 100 && progPending === 0 && progCourses > 0) {
          progStatus = 'Verified';
        } else if (isDeadlinePassed && progPending > 0) {
          progStatus = 'Overdue';
          overdueCount++;
        } else if (progUploaded > 0 || progInProgress > 0) {
          progStatus = 'Partial';
        } else {
          progStatus = !coordinatorDim.isAssigned ? 'Attention Required' : 'Not Started';
        }

        if (progUploaded > 0 || progInProgress > 0) {
          totalUniversityActivePrograms++;
        }

        // Exception tracking
        if (progStatus === 'Overdue') {
          exceptions.push({
            id: `overdue-${dept.code}-${prog.name}`,
            category: 'OVERDUE',
            badge: 'Submission Overdue',
            severity: 'red',
            department: dept.name,
            deptCode: dept.code,
            program: prog.name,
            message: `${prog.name} is past deadline with ${progPending} pending courses`,
            detail: `Deadline was ${deadline ? new Date(deadline).toLocaleDateString() : 'recently'}`,
          });
        } else if (progCompletion > 0 && progCompletion < 50) {
          exceptions.push({
            id: `low-${dept.code}-${prog.name}`,
            category: 'CRITICAL_LOW',
            badge: '< 50% Completion',
            severity: 'orange',
            department: dept.name,
            deptCode: dept.code,
            program: prog.name,
            message: `${prog.name} has only ${progCompletion}% courses submitted`,
            detail: `${progUploaded} of ${progCourses} courses uploaded`,
          });
        } else if (progStatus === 'Partial') {
          exceptions.push({
            id: `partial-${dept.code}-${prog.name}`,
            category: 'PARTIAL',
            badge: 'Partially Submitted',
            severity: 'yellow',
            department: dept.name,
            deptCode: dept.code,
            program: prog.name,
            message: `${prog.name} is in progress (${progCompletion}%)`,
            detail: `${progPending} remaining to verify`,
          });
        }

        // Deadline aging tracking
        if (progPending > 0) {
          if (isDeadlinePassed) {
            // Already counted in overdueCount
          } else if (daysToDeadline <= 0) {
            dueTodayCount++;
          } else if (daysToDeadline <= 3) {
            dueWithin3DaysCount++;
          } else {
            dueLaterCount++;
          }
        }

        programDims.push({
          department: dept.name,
          deptCode: dept.code,
          program: prog.name,
          degreeLevel: prog.degreeLevel,
          coordinator: coordinatorDim,
          sectionsCount: sectionBreakdowns.length,
          totalCourses: progCourses,
          uploadedCourses: progUploaded,
          pendingCourses: progPending,
          completionRate: progCompletion,
          status: progStatus,
          lastSubmissionDate: latestSubmission,
          sections: sectionBreakdowns,
        });

        deptCourses += progCourses;
        deptUploaded += progUploaded;
        deptPending += progPending;
      });

      let deptCompletion = deptCourses > 0 ? Math.round((deptUploaded / deptCourses) * 100) : 0;
      const completedProgramsCount = programDims.filter((p) => p.completionRate >= 100 && p.pendingCourses === 0 && p.totalCourses > 0).length;
      const totalProgramsCount = programDims.length;
      const hasUnfinishedPrograms = completedProgramsCount < totalProgramsCount;
      const allProgramsCompleted = totalProgramsCount > 0 && completedProgramsCount === totalProgramsCount;

      // CRITICAL FIX: If ANY program in the department is still pending or has courses left,
      // the department completion rate CANNOT read 100%!
      // If a department has 3 programs and 2 are left unsubmitted, completion is proportional (e.g. 33%-41%), NOT 100%!
      if (hasUnfinishedPrograms) {
        const courseBasedPct = deptCourses > 0 ? Math.floor((deptUploaded / deptCourses) * 100) : 0;
        const programBasedCap = totalProgramsCount > 0 ? Math.floor((completedProgramsCount / totalProgramsCount) * 100) : 0;
        
        // Capped strictly below 100%
        deptCompletion = Math.min(courseBasedPct, programBasedCap > 0 ? programBasedCap : courseBasedPct);
        if (deptCompletion >= 100) {
          deptCompletion = programBasedCap > 0 ? programBasedCap : Math.min(courseBasedPct, 95);
        }
      }
      if (deptUploaded === 0) {
        deptCompletion = 0;
      }

      let deptStatus: 'Completed' | 'Good' | 'Needs Attention' | 'Critical';
      if (deptCompletion === 100 && deptPending === 0 && allProgramsCompleted) deptStatus = 'Completed';
      else if (deptCompletion >= 70) deptStatus = 'Good';
      else if (deptCompletion >= 30) deptStatus = 'Needs Attention';
      else deptStatus = 'Critical';

      departments.push({
        name: dept.name,
        code: dept.code,
        hod: hodDim,
        programsCount: activePrograms.length,
        totalCourses: deptCourses,
        uploadedCourses: deptUploaded,
        pendingCourses: deptPending,
        completionRate: deptCompletion,
        status: deptStatus,
        programs: programDims,
      });

      totalUniversityCourses += deptCourses;
      totalUniversityUploaded += deptUploaded;
      totalUniversityPending += deptPending;
    });

    const overallRate =
      totalUniversityCourses > 0 ? Math.round((totalUniversityUploaded / totalUniversityCourses) * 100) : 0;

    const completedDepts = departments.filter((d) => d.status === 'Completed').length;

    return {
      departments: departments.sort((a, b) => b.completionRate - a.completionRate),
      overallCompletionRate: overallRate,
      totalDepartments: departments.length,
      completedDepartments: completedDepts,
      totalPrograms: totalUniversityPrograms,
      activePrograms: totalUniversityActivePrograms,
      totalCourses: totalUniversityCourses,
      uploadedCourses: totalUniversityUploaded,
      pendingCourses: totalUniversityPending,
      exceptions,
      agingRisk: {
        overdue: overdueCount,
        dueToday: dueTodayCount,
        dueWithin3Days: dueWithin3DaysCount,
        dueLater: dueLaterCount,
      },
    };
  }
}
