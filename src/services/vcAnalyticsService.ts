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
    submittedUploadedPct: number;
    submittedPendingPct: number;
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
          r &&
          r.department &&
          StorageService._isDeptMatch(dept.name, r.department) &&
          sessionList.some((s) => (r.session || '2023').startsWith(s) || s.startsWith(r.session || '2023')) &&
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
        // Coordinator Dimension: dynamic lookup from accounts and stored database records
        const matchingCoordAccounts = accounts.filter((acc) => {
          if (acc.role !== 'COORDINATOR' && acc.role !== 'LECTURER') return false;
          if (acc.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
          const assigned = acc.assignedPrograms || (acc.program ? [acc.program] : []);
          const keysFromShifts = acc.programShiftAssignments ? Object.keys(acc.programShiftAssignments) : [];
          const allProgs = Array.from(new Set([...assigned, ...keysFromShifts]));
          return allProgs.some((p) => p.trim().toLowerCase() === prog.name.trim().toLowerCase());
        });

        // Determine target shifts for this program strictly matching supportedShifts
        const progSupported = prog.supportedShifts || ['Morning', 'Evening'];
        let targetShifts: AcademicShift[] = [];

        if (shiftFilter !== 'ALL') {
          targetShifts = progSupported.includes(shiftFilter as AcademicShift)
            ? [shiftFilter as AcademicShift]
            : [progSupported[0]];
        } else if (progSupported.length === 1) {
          targetShifts = [progSupported[0]];
        } else {
          // Both Morning and Evening supported by program definition
          const hasMorningRecs = allRecords.some(
            (r) =>
              r &&
              r.department &&
              StorageService._isDeptMatch(dept.name, r.department) &&
              StorageService._isProgMatch(prog.name, r.program) &&
              (r.shift || 'Morning').trim().toLowerCase() === 'morning' &&
              sessionList.some((s) => (r.session || '2023').startsWith(s) || s.startsWith(r.session || '2023'))
          );
          const hasEveningRecs = allRecords.some(
            (r) =>
              r &&
              r.department &&
              StorageService._isDeptMatch(dept.name, r.department) &&
              StorageService._isProgMatch(prog.name, r.program) &&
              (r.shift || '').trim().toLowerCase() === 'evening' &&
              sessionList.some((s) => (r.session || '2023').startsWith(s) || s.startsWith(r.session || '2023'))
          );

          const hasMorningCoord = matchingCoordAccounts.some((acc) => {
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
            return shs.includes('Morning');
          });

          const hasEveningCoord = matchingCoordAccounts.some((acc) => {
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
            return shs.includes('Evening');
          });

          if ((hasMorningRecs || hasMorningCoord) && (hasEveningRecs || hasEveningCoord)) {
            targetShifts = ['Morning', 'Evening'];
          } else if (hasEveningRecs || hasEveningCoord) {
            targetShifts = ['Evening'];
          } else if (hasMorningRecs || hasMorningCoord) {
            targetShifts = ['Morning'];
          } else {
            if (prog.degreeLevel === 'B.Tech' || prog.name.includes('(B.Tech)')) {
              targetShifts = ['Evening'];
            } else {
              targetShifts = ['Morning'];
            }
          }
        }

        targetShifts.forEach((activeShift) => {
          totalUniversityPrograms++;

          // Resolve Coordinator specific to this active shift
          let coordinatorAccount = matchingCoordAccounts.find((acc) => {
            const shs = (acc.programShiftAssignments && acc.programShiftAssignments[prog.name]) || acc.assignedShifts || ['Morning', 'Evening'];
            return shs.includes(activeShift);
          }) || matchingCoordAccounts[0];

          let coordShifts: AcademicShift[] = [activeShift];
          let coordShiftLabel = activeShift === 'Morning' ? 'Morning Shift' : 'Evening Shift';
          let coordDisplayName = coordinatorAccount?.name;

          // Check if any database submission for this program and shift records a coordinator
          let dbCoordName = '';
          if (!coordinatorAccount && matchingCoordAccounts.length === 0) {
            const recWithCoord = allRecords.find((r) => {
              if (r.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
              if (r.program.trim().toLowerCase() !== prog.name.trim().toLowerCase()) return false;
              if ((r.shift || 'Morning') !== activeShift) return false;
              return !!(r.hodCoordinator && r.hodCoordinator.trim() && !r.hodCoordinator.includes('HOD / Coordinator'));
            });
            if (recWithCoord && recWithCoord.hodCoordinator) {
              dbCoordName = recWithCoord.hodCoordinator.trim();
            }
          }

          const coordinatorDim: CoordinatorDimension = coordinatorAccount
            ? {
                name: coordDisplayName || coordinatorAccount.name,
                username: coordinatorAccount.username,
                email: coordinatorAccount.email,
                isAssigned: true,
                accountStatus: 'Active',
                lastLoginAt: coordinatorAccount.lastLoginAt,
                shifts: coordShifts,
                shiftLabel: coordShiftLabel,
              }
            : dbCoordName
            ? {
                name: dbCoordName,
                isAssigned: true,
                accountStatus: 'Active',
                shifts: coordShifts,
                shiftLabel: coordShiftLabel,
              }
            : {
                name: 'Not Assigned',
                isAssigned: false,
                accountStatus: 'Not Created',
                shifts: coordShifts,
                shiftLabel: coordShiftLabel,
              };

          if (!coordinatorDim.isAssigned) {
            exceptions.push({
              id: `no-coord-${dept.code}-${prog.name.replace(/\s+/g, '-')}-${activeShift}`,
              category: 'NO_COORDINATOR',
              badge: 'No Coordinator Assigned',
              severity: 'gray',
              department: dept.name,
              deptCode: dept.code,
              program: `${prog.name} (${activeShift})`,
              message: `${prog.name} (${activeShift}) has no coordinator assigned`,
              detail: 'Account not created; academic oversight unassigned',
            });
          }

          // Filter submission records matching department, program, session, semester, section, AND activeShift
          const matchingRecords = allRecords.filter((r) => {
            if (!r || !r.department || !r.program) return false;
            if (!StorageService._isDeptMatch(dept.name, r.department) && !StorageService._isDeptMatch(dept.code, r.department)) return false;
            if (!StorageService._isProgMatch(prog.name, r.program)) return false;
            const rSess = (r.session || '2023').trim();
            const sessionMatch = sessionList.some(
              (s) => rSess.startsWith(s) || s.startsWith(rSess) || rSess.includes(s) || s.includes(rSess)
            );
            if (!sessionMatch) return false;
            if (semesterList.length > 0) {
              const rSemNum = String(r.semester || '1').replace(/\D/g, '') || '1';
              const semMatch = semesterList.some((s) => String(s).replace(/\D/g, '') === rSemNum);
              if (!semMatch) return false;
            }
            if (shiftFilter !== 'ALL') {
              const rShift = (r.shift || 'Morning').trim().toLowerCase();
              if (rShift !== activeShift.trim().toLowerCase()) return false;
            }
            return true;
          });

          // Determine active sections for this specific program and shift
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
          const activeSemId =
            semesterList.length === 1
              ? semesterList[0]
              : typeof semesterFilter === 'string' && semesterFilter !== 'ALL'
              ? semesterFilter
              : '';

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

          // Find semesters that have actual records for this program and shift
          const recordedSemIds = new Set<string>();
          matchingRecords.forEach((r) => {
            if (r.semester) recordedSemIds.add(String(r.semester).trim());
          });

          const semestersToEvaluate: string[] =
            semesterList.length > 0
              ? semesterList
              : recordedSemIds.size > 0
              ? Array.from(recordedSemIds)
              : ['1'];

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
                  const status =
                    s.status === 'Uploaded' ? 'Uploaded' : s.status === 'In Progress' ? 'In Progress' : 'Pending';
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
              } else {
                // Program section awaiting LMS upload
                const defaultCoursesCount = 5;
                for (let idx = 0; idx < defaultCoursesCount; idx++) {
                  secPending++;
                  courseDetails.push({
                    id: `unsubmitted-${semId}-${secName}-${idx}`,
                    courseCode: `SEM${semId}-CRS${idx + 1}`,
                    subjectTitle: `Semester ${semId} Curricular Subject ${idx + 1}`,
                    creditHours: '3(3-0)',
                    status: 'Pending',
                    dateUploaded: '',
                    uploadedBy: coordinatorDim.isAssigned ? coordinatorDim.name : 'Unassigned Coordinator',
                    remarks: coordinatorDim.isAssigned ? 'Awaiting coordinator upload in LMS' : 'Awaiting coordinator assignment & result upload',
                    expected: true,
                    submitted: false,
                    coordinatorName: coordinatorDim.name,
                    deadline,
                    lastActivity: 'Not Started',
                  });
                }
                secTotal += defaultCoursesCount;
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

          if (progCourses === 0 && coordinatorDim.isAssigned) {
            const expectedDefaultCourses = 5 * semestersToEvaluate.length * targetSections.length;
            progCourses = expectedDefaultCourses;
            progUploaded = 0;
            progPending = expectedDefaultCourses;
            progInProgress = 0;

            if (sectionBreakdowns.length === 0) {
              sectionBreakdowns.push({
                section: 'A',
                totalCourses: expectedDefaultCourses,
                uploadedCourses: 0,
                pendingCourses: expectedDefaultCourses,
                inProgressCourses: 0,
                completionRate: 0,
                status: 'Not Started',
                submissionRecord: null,
                courses: [],
              });
            }
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

          // Display program name with shift label if multiple shifts exist or if explicitly requested
          const programDisplayName =
            targetShifts.length > 1
              ? `${prog.name} (${activeShift})`
              : prog.name;

          // Exception tracking
          if (progStatus === 'Overdue') {
            exceptions.push({
              id: `overdue-${dept.code}-${prog.name}-${activeShift}`,
              category: 'OVERDUE',
              badge: 'Submission Overdue',
              severity: 'red',
              department: dept.name,
              deptCode: dept.code,
              program: programDisplayName,
              message: `${programDisplayName} is past deadline with ${progPending} pending courses`,
              detail: `Deadline was ${deadline ? new Date(deadline).toLocaleDateString() : 'recently'}`,
            });
          } else if (progCompletion > 0 && progCompletion < 50) {
            exceptions.push({
              id: `low-${dept.code}-${prog.name}-${activeShift}`,
              category: 'CRITICAL_LOW',
              badge: '< 50% Completion',
              severity: 'orange',
              department: dept.name,
              deptCode: dept.code,
              program: programDisplayName,
              message: `${programDisplayName} has only ${progCompletion}% courses submitted`,
              detail: `${progUploaded} of ${progCourses} courses uploaded`,
            });
          } else if (progStatus === 'Partial') {
            exceptions.push({
              id: `partial-${dept.code}-${prog.name}-${activeShift}`,
              category: 'PARTIAL',
              badge: 'Partially Submitted',
              severity: 'yellow',
              department: dept.name,
              deptCode: dept.code,
              program: programDisplayName,
              message: `${programDisplayName} is in progress (${progCompletion}%)`,
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
            program: programDisplayName,
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
      });

      let deptCompletion = deptCourses > 0 ? Math.round((deptUploaded / deptCourses) * 100) : 0;
      const activeProgramsWithCourses = programDims.filter((p) => p.totalCourses > 0);
      const completedProgramsCount = activeProgramsWithCourses.filter(
        (p) => p.completionRate >= 100 && p.pendingCourses === 0
      ).length;
      const totalProgramsCount = activeProgramsWithCourses.length;
      const allProgramsCompleted = totalProgramsCount > 0 && completedProgramsCount === totalProgramsCount;

      // Ensure that if any courses or programs are pending, department cannot falsely read 100%
      if (deptPending > 0 && deptCompletion >= 100) {
        deptCompletion = 99;
      }
      if (deptCourses > 0 && deptUploaded === deptCourses && deptPending === 0) {
        deptCompletion = 100;
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
    const submittedUploadedPct = overallRate;
    const submittedPendingPct =
      totalUniversityCourses > 0 ? Math.round((totalUniversityPending / totalUniversityCourses) * 100) : 0;

    const completedDepts = departments.filter((d) => d.status === 'Completed').length;

    return {
      departments: departments.sort((a, b) => b.completionRate - a.completionRate),
      overallCompletionRate: overallRate,
      submittedUploadedPct,
      submittedPendingPct,
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
