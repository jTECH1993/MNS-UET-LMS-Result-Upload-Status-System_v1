import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { AuthService } from './authService';
import { StorageService } from './storageService';
import { SubmissionRecord, AcademicShift, SubjectRow } from '../types';

export interface CoordinatorDimension {
  name: string;
  username?: string;
  email?: string;
  isAssigned: boolean;
  accountStatus: 'Active' | 'Not Created';
  lastLoginAt?: string;
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
    currentSession: string;
    semesterFilter?: string; // 'ALL' or '1'-'8'
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

      // 2. Resolve Programs Dimension
      const programDims: ProgramDimension[] = [];
      let deptCourses = 0;
      let deptUploaded = 0;
      let deptPending = 0;

      dept.programs.forEach((prog) => {
        totalUniversityPrograms++;

        // Coordinator Dimension: decoupled from program existence
        const coordinatorAccount = accounts.find((acc) => {
          if (acc.role !== 'COORDINATOR' && acc.role !== 'LECTURER') return false;
          if (acc.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
          const assigned = acc.assignedPrograms || (acc.program ? [acc.program] : []);
          return assigned.some((p) => p.trim().toLowerCase() === prog.name.trim().toLowerCase());
        });

        const coordinatorDim: CoordinatorDimension = coordinatorAccount
          ? {
              name: coordinatorAccount.name,
              username: coordinatorAccount.username,
              email: coordinatorAccount.email,
              isAssigned: true,
              accountStatus: 'Active',
              lastLoginAt: coordinatorAccount.lastLoginAt,
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

        // Multiple Sections Dimension
        // Detect all matching submissions for this program
        const matchingRecords = allRecords.filter((r) => {
          if (r.department.trim().toLowerCase() !== dept.name.trim().toLowerCase()) return false;
          if (r.program.trim().toLowerCase() !== prog.name.trim().toLowerCase()) return false;
          if (r.session !== currentSession) return false;
          if (semesterFilter !== 'ALL' && (r.semester || '1') !== semesterFilter) return false;
          if (shiftFilter !== 'ALL' && (r.shift || 'Morning') !== shiftFilter) return false;
          return true;
        });

        // Determine sections to show: standard 'A' and 'B' plus any explicit sections found in records
        const sectionSet = new Set<string>(['A', 'B']);
        matchingRecords.forEach((r) => {
          if (r.section) sectionSet.add(r.section.trim().toUpperCase());
        });

        let targetSections = Array.from(sectionSet).sort();
        if (sectionFilter !== 'ALL') {
          targetSections = targetSections.filter((s) => s === sectionFilter);
        }

        const sectionBreakdowns: SectionBreakdown[] = [];
        let progCourses = 0;
        let progUploaded = 0;
        let progPending = 0;
        let progInProgress = 0;
        let latestSubmission: string | undefined = undefined;

        targetSections.forEach((secName) => {
          const rec = matchingRecords.find((r) => (r.section || 'A').trim().toUpperCase() === secName);
          if (rec && rec.updatedAt) {
            if (!latestSubmission || new Date(rec.updatedAt) > new Date(latestSubmission)) {
              latestSubmission = rec.updatedAt;
            }
          }

          const rawSubjects: SubjectRow[] = rec?.subjects && rec.subjects.length > 0 ? rec.subjects : [];
          
          let secUploaded = 0;
          let secPending = 0;
          let secInProgress = 0;
          const courseDetails: CourseDetail[] = [];

          if (rawSubjects.length > 0) {
            rawSubjects.forEach((s, idx) => {
              const status = (s.status === 'Uploaded' ? 'Uploaded' : s.status === 'In Progress' ? 'In Progress' : 'Pending');
              if (status === 'Uploaded') secUploaded++;
              else if (status === 'In Progress') secInProgress++;
              else secPending++;

              courseDetails.push({
                id: s.id || `course-${secName}-${idx}`,
                courseCode: s.courseCode || `CS-${100 + idx}`,
                subjectTitle: s.subjectTitle || `Core Subject ${idx + 1}`,
                creditHours: s.creditHours || '3(3-0)',
                status,
                dateUploaded: s.dateUploaded || rec?.submissionDate || '',
                uploadedBy: s.uploadedBy || rec?.accessedBy || coordinatorDim.name,
                remarks: s.remarks || '',
                expected: true,
                submitted: status === 'Uploaded',
                coordinatorName: coordinatorDim.name,
                deadline,
                lastActivity: s.dateUploaded || rec?.updatedAt || 'No upload recorded',
              });
            });
          } else {
            // Expected courses placeholder when not started
            secPending = 6;
            for (let i = 1; i <= 6; i++) {
              courseDetails.push({
                id: `expected-${secName}-${i}`,
                courseCode: `SUBJ-10${i}`,
                subjectTitle: `Curricular Subject ${i}`,
                creditHours: '3(3-0)',
                status: 'Pending',
                dateUploaded: '',
                uploadedBy: '—',
                remarks: 'Pending coordinator entry',
                expected: true,
                submitted: false,
                coordinatorName: coordinatorDim.name,
                deadline,
                lastActivity: 'Not started',
              });
            }
          }

          const secTotal = secUploaded + secPending + secInProgress;
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
            submissionRecord: rec || null,
            courses: courseDetails,
          });

          progCourses += secTotal;
          progUploaded += secUploaded;
          progPending += secPending;
          progInProgress += secInProgress;
        });

        const progCompletion = progCourses > 0 ? Math.round((progUploaded / progCourses) * 100) : 0;
        let progStatus: 'Verified' | 'Partial' | 'Not Started' | 'Overdue' | 'Attention Required';

        if (progCompletion === 100) {
          progStatus = 'Verified';
        } else if (isDeadlinePassed && progPending > 0) {
          progStatus = 'Overdue';
          overdueCount++;
        } else if (progCompletion > 0) {
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

      const deptCompletion = deptCourses > 0 ? Math.round((deptUploaded / deptCourses) * 100) : 0;
      let deptStatus: 'Completed' | 'Good' | 'Needs Attention' | 'Critical';
      if (deptCompletion >= 90) deptStatus = 'Completed';
      else if (deptCompletion >= 70) deptStatus = 'Good';
      else if (deptCompletion >= 50) deptStatus = 'Needs Attention';
      else deptStatus = 'Critical';

      departments.push({
        name: dept.name,
        code: dept.code,
        hod: hodDim,
        programsCount: dept.programs.length,
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

    const completedDepts = departments.filter((d) => d.completionRate >= 90).length;

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
