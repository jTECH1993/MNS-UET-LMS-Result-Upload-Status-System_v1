import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SEMESTERS, STANDARD_ACADEMIC_SECTIONS } from '../data/departmentsData';
import { AuthService } from './authService';
import { StorageService } from './storageService';
import { SubmissionRecord, SubjectRow, ProgramInfo } from '../types';

export interface CourseItem {
  id: string;
  courseCode: string;
  subjectTitle: string;
  creditHours: string;
  status: 'Uploaded' | 'Pending' | 'In Progress';
  submitted: boolean;
  dateUploaded?: string;
  uploadedBy?: string;
  remarks?: string;
  coordinatorName: string;
  deadlineText: string;
  lastActivity: string;
}

export interface RadarUnit {
  id: string;
  name: string;
  shortName?: string;
  level: 'UNIVERSITY' | 'DEPARTMENT' | 'PROGRAM' | 'SEMESTER' | 'SECTION';
  submitted: number;
  pending: number;
  inProgress: number;
  total: number;
  completionRate: number; // 0 - 100
  coordinatorStatus: 'Assigned' | 'Not Assigned';
  coordinatorName: string;
  coordinatorDesignation?: string;
  hodStatus: 'Registered' | 'Not Registered';
  hodName: string;
  deadlineText: string;
  deadlineDays: number;
  isOverdue: boolean;
  lastActivity: string;
  deptName: string;
  deptCode: string;
  progName?: string;
  semId?: string;
  semLabel?: string;
  sectionId?: string;
  courses?: CourseItem[];
}

export interface BottleneckInfo {
  department: string;
  deptCode: string;
  program: string;
  semesterId: string;
  semesterLabel: string;
  section: string;
  totalCourses: number;
  submittedCourses: number;
  pendingCourses: number;
  completionRate: number;
  uploadStatus: 'Complete' | 'Partially Uploaded' | 'Pending';
  coordinatorStatus: 'Assigned' | 'Not Assigned';
  coordinatorName: string;
  hodStatus: 'Registered' | 'Not Registered';
  hodName: string;
  deadlineText: string;
  isOverdue: boolean;
  daysRemaining: number;
  riskScore: number;
  reason: string;
  laggingCourses: CourseItem[];
}

export interface RadarDrillPath {
  deptName?: string;
  progName?: string;
  semId?: string;
  sectionId?: string;
}

export class CompletionRadarService {
  /**
   * Helper to format deadline status cleanly
   */
  public static getDeadlineInfo(): { text: string; days: number; isOverdue: boolean } {
    const deadline = StorageService.getSystemDeadline();
    const isExpired = StorageService.isSystemDeadlineExpired();
    if (!deadline) {
      return { text: '2 days remaining', days: 2, isOverdue: false };
    }
    const target = new Date(deadline);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (isExpired || days < 0) {
      return { text: `Overdue by ${Math.abs(days) || 1} day(s)`, days, isOverdue: true };
    }
    if (days === 0) {
      return { text: 'Due Today (Final Call)', days: 0, isOverdue: false };
    }
    return { text: `${days} day${days > 1 ? 's' : ''} remaining`, days, isOverdue: false };
  }

  /**
   * Helper to resolve coordinator for a program/department
   */
  private static resolveCoordinator(
    deptName: string,
    progName?: string
  ): { isAssigned: boolean; name: string; designation?: string } {
    try {
      const accounts = AuthService.getAccounts();
      const allRecords = StorageService.getStore();

      // 1. Look in registered accounts strictly for this program if progName is given
      if (progName) {
        const cleanProg = progName.trim().toLowerCase();
        const coord = accounts.find((a) => {
          if (a.role !== 'COORDINATOR' && a.role !== 'LECTURER') return false;
          const assigned = a.assignedPrograms || (a.program ? [a.program] : []);
          return assigned.some((p) => p.trim().toLowerCase() === cleanProg);
        });

        if (coord) {
          return { isAssigned: true, name: coord.name, designation: coord.designation || 'Program Coordinator' };
        }

        // 2. Check if a coordinator uploaded results or is recorded in database submissions for this program
        const matchingRecord = Object.values(allRecords).find((r) => {
          if (r.department.trim().toLowerCase() !== deptName.trim().toLowerCase()) return false;
          if (r.program.trim().toLowerCase() !== cleanProg) return false;
          return !!(r.hodCoordinator && r.hodCoordinator.trim() && !r.hodCoordinator.includes('HOD / Coordinator'));
        });

        if (matchingRecord && matchingRecord.hodCoordinator) {
          return {
            isAssigned: true,
            name: matchingRecord.hodCoordinator,
            designation: matchingRecord.userDesignation || 'Program Coordinator',
          };
        }

        // If program is specified, do NOT fallback to a coordinator of a different program!
        return { isAssigned: false, name: 'Not Assigned', designation: 'Coordinator Unassigned' };
      }

      // If no program is specified (department level), find if there is a department-level coordinator
      const deptCoord = accounts.find((a) => {
        if (a.role !== 'COORDINATOR' && a.role !== 'LECTURER') return false;
        return a.department.trim().toLowerCase() === deptName.trim().toLowerCase();
      });

      if (deptCoord) {
        return { isAssigned: true, name: deptCoord.name, designation: deptCoord.designation || 'Coordinator' };
      }
    } catch (e) {}

    return { isAssigned: false, name: 'Not Assigned', designation: 'Coordinator Unassigned' };
  }

  /**
   * Helper to resolve HOD for a department
   */
  private static resolveHOD(deptName: string): { isRegistered: boolean; name: string } {
    try {
      const accounts = AuthService.getAccounts();
      const hod = accounts.find(
        (a) => a.role === 'HOD' && a.department.trim().toLowerCase() === deptName.trim().toLowerCase()
      );
      if (hod) {
        return { isRegistered: true, name: hod.name };
      }
    } catch (e) {}

    return { isRegistered: false, name: 'Not Registered' };
  }

  /**
   * Returns active programs for a department strictly for currentSession (or array of sessions)
   */
  public static getActiveProgramsForDepartment(
    deptName: string,
    currentSession: string | string[],
    allRecords: SubmissionRecord[]
  ): string[] {
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const set = new Set<string>();

    sessionList.forEach((sess) => {
      const sessionRoster = StorageService.getSessionPrograms(deptName, sess, allRecords);
      sessionRoster.forEach((p) => set.add(p));
    });

    // Add any programs with authentic submissions in these sessions
    allRecords.forEach((r) => {
      if (
        r &&
        r.department &&
        StorageService._isMatch(r.department, deptName) &&
        sessionList.some((s) => (r.session || '2023').startsWith(s) || s.startsWith(r.session || '2023')) &&
        r.program &&
        r.program.trim()
      ) {
        set.add(r.program.trim());
      }
    });

    // If the set is empty, fallback to session-configured programs
    if (set.size === 0 && deptObj) {
      const is2023 = sessionList.some((s) => s === '2023' || s.includes('23'));
      const defaults = deptObj.programs.filter((p) => (is2023 ? p.session2023 : true));
      if (defaults.length > 0) {
        defaults.forEach((p) => set.add(p.name));
      } else if (deptObj.programs.length > 0) {
        set.add(deptObj.programs[0].name);
      }
    }

    return Array.from(set);
  }

  /**
   * LEVEL 0: All University Departments Coverage
   */
  public static getUniversityDepartmentCoverage(
    allRecords: SubmissionRecord[],
    currentSession: string | string[],
    semesterFilter?: string | string[]
  ): RadarUnit[] {
    const deadlineInfo = this.getDeadlineInfo();

    return UNIVERSITY_DEPARTMENTS.map((dept) => {
      const activeProgNames = this.getActiveProgramsForDepartment(dept.name, currentSession, allRecords);
      const hod = this.resolveHOD(dept.name);
      const coord = this.resolveCoordinator(dept.name);

      let submitted = 0;
      let pending = 0;
      let inProgress = 0;
      let lastActivity = 'No recent activity';

      activeProgNames.forEach((progName) => {
        const progUnits = this.getProgramSectionUnits(dept.name, progName, currentSession, allRecords, semesterFilter);
        progUnits.forEach((u) => {
          submitted += u.submitted;
          pending += u.pending;
          inProgress += u.inProgress;
          if (u.lastActivity && u.lastActivity !== 'No recent activity' && u.lastActivity !== 'Awaiting coordinator grade entry') {
            lastActivity = u.lastActivity;
          }
        });
      });

      const total = submitted + pending + inProgress;
      const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

      return {
        id: `dept-${dept.code}`,
        name: dept.name,
        shortName: dept.code,
        level: 'DEPARTMENT',
        submitted,
        pending,
        inProgress,
        total,
        completionRate,
        coordinatorStatus: coord.isAssigned ? 'Assigned' : 'Not Assigned',
        coordinatorName: coord.name,
        coordinatorDesignation: coord.designation,
        hodStatus: hod.isRegistered ? 'Registered' : 'Not Registered',
        hodName: hod.name,
        deadlineText: deadlineInfo.text,
        deadlineDays: deadlineInfo.days,
        isOverdue: deadlineInfo.isOverdue,
        lastActivity,
        deptName: dept.name,
        deptCode: dept.code,
      };
    });
  }

  /**
   * LEVEL 1: Programs Coverage inside a specific Department
   */
  public static getProgramsCoverage(
    deptName: string,
    currentSession: string | string[],
    allRecords: SubmissionRecord[],
    semesterFilter?: string | string[]
  ): RadarUnit[] {
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const deptCode = deptObj?.code || 'DEPT';
    const activeProgNames = this.getActiveProgramsForDepartment(deptName, currentSession, allRecords);
    const hod = this.resolveHOD(deptName);
    const deadlineInfo = this.getDeadlineInfo();

    return activeProgNames.map((progName, idx) => {
      const coord = this.resolveCoordinator(deptName, progName);
      const progUnits = this.getProgramSectionUnits(deptName, progName, currentSession, allRecords, semesterFilter);

      let submitted = 0;
      let pending = 0;
      let inProgress = 0;
      let lastActivity = 'No recent activity';

      progUnits.forEach((u) => {
        submitted += u.submitted;
        pending += u.pending;
        inProgress += u.inProgress;
        if (u.lastActivity && u.lastActivity !== 'No recent activity' && u.lastActivity !== 'Awaiting coordinator grade entry') {
          lastActivity = u.lastActivity;
        }
      });

      const total = submitted + pending + inProgress;
      const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

      return {
        id: `prog-${deptCode}-${idx}`,
        name: progName,
        shortName: progName.split(' ')[0] + ' ' + (progName.split(' ')[1] || ''),
        level: 'PROGRAM',
        submitted,
        pending,
        inProgress,
        total,
        completionRate,
        coordinatorStatus: coord.isAssigned ? 'Assigned' : 'Not Assigned',
        coordinatorName: coord.name,
        coordinatorDesignation: coord.designation,
        hodStatus: hod.isRegistered ? 'Registered' : 'Not Registered',
        hodName: hod.name,
        deadlineText: deadlineInfo.text,
        deadlineDays: deadlineInfo.days,
        isOverdue: deadlineInfo.isOverdue,
        lastActivity,
        deptName,
        deptCode,
        progName,
      };
    });
  }

  /**
   * LEVEL 2: Semesters Coverage inside a specific Program
   */
  public static getSemestersCoverage(
    deptName: string,
    progName: string,
    currentSession: string | string[],
    allRecords: SubmissionRecord[],
    semesterFilter?: string | string[]
  ): RadarUnit[] {
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const deptCode = deptObj?.code || 'DEPT';
    const coord = this.resolveCoordinator(deptName, progName);
    const hod = this.resolveHOD(deptName);
    const deadlineInfo = this.getDeadlineInfo();
    const semList = Array.isArray(semesterFilter)
      ? semesterFilter.filter((s) => s !== 'ALL')
      : semesterFilter && semesterFilter !== 'ALL'
      ? [semesterFilter]
      : [];

    const activeSems = semList.length > 0
      ? ACADEMIC_SEMESTERS.filter((s) => semList.includes(s.id))
      : ACADEMIC_SEMESTERS;

    // Standard Undergraduate semesters
    return activeSems.map((sem) => {
      const activeSections = StorageService.getAvailableSectionsForCohort(
        deptName,
        progName,
        Array.isArray(currentSession) ? currentSession[0] : (currentSession || '2023'),
        sem.id,
        'Morning'
      );

      const secUnits = activeSections.map((secId) =>
        this.getSectionUnit(deptName, progName, sem.id, secId, currentSession, allRecords)
      );

      const submitted = secUnits.reduce((sum, u) => sum + u.submitted, 0);
      const pending = secUnits.reduce((sum, u) => sum + u.pending, 0);
      const inProgress = secUnits.reduce((sum, u) => sum + u.inProgress, 0);
      const total = submitted + pending + inProgress;
      const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

      const activeUnitWithActivity = secUnits.find((u) => u.lastActivity !== 'Awaiting coordinator grade entry');
      const lastActivity = activeUnitWithActivity ? activeUnitWithActivity.lastActivity : (secUnits[0]?.lastActivity || 'Not started');

      return {
        id: `sem-${sem.id}`,
        name: `Semester ${sem.id}`,
        shortName: sem.shortLabel,
        level: 'SEMESTER',
        submitted,
        pending,
        inProgress,
        total,
        completionRate,
        coordinatorStatus: coord.isAssigned ? 'Assigned' : 'Not Assigned',
        coordinatorName: coord.name,
        coordinatorDesignation: coord.designation,
        hodStatus: hod.isRegistered ? 'Registered' : 'Not Registered',
        hodName: hod.name,
        deadlineText: deadlineInfo.text,
        deadlineDays: deadlineInfo.days,
        isOverdue: deadlineInfo.isOverdue,
        lastActivity,
        deptName,
        deptCode,
        progName,
        semId: sem.id,
        semLabel: sem.label,
      };
    });
  }

  /**
   * LEVEL 3: Sections Coverage (Active sections only) inside a specific Semester
   */
  public static getSectionsCoverage(
    deptName: string,
    progName: string,
    semId: string,
    currentSession: string | string[],
    allRecords: SubmissionRecord[]
  ): RadarUnit[] {
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const activeSections = StorageService.getAvailableSectionsForCohort(
      deptName,
      progName,
      sessionList[0] || '2023',
      semId,
      'Morning'
    );
    return activeSections.map((secId) =>
      this.getSectionUnit(deptName, progName, semId, secId, currentSession, allRecords)
    );
  }

  /**
   * Computes a single section unit with its course list
   */
  public static getSectionUnit(
    deptName: string,
    progName: string,
    semId: string,
    sectionId: string, // 'A' | 'B' | custom
    currentSession: string | string[],
    allRecords: SubmissionRecord[]
  ): RadarUnit {
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const deptCode = deptObj?.code || 'DEPT';
    const coord = this.resolveCoordinator(deptName, progName);
    const hod = this.resolveHOD(deptName);
    const deadlineInfo = this.getDeadlineInfo();

    // Find authentic record if exists
    const rec = allRecords.find((r) => {
      if (!r) return false;
      const matchDept = StorageService._isMatch(r.department || '', deptName);
      const matchProg = StorageService._isMatch(r.program || '', progName);
      const matchSem = String(r.semester || '').trim() === String(semId).trim();
      const matchSec = (r.section || 'A').trim().toUpperCase() === sectionId.trim().toUpperCase();
      const rSess = (r.session || '2023').trim();
      const matchSession = sessionList.some((s) => rSess.startsWith(s) || s.startsWith(rSess));
      return matchDept && matchProg && matchSem && matchSec && matchSession;
    });

    const courses: CourseItem[] = [];
    let submitted = 0;
    let pending = 0;
    let inProgress = 0;
    let lastActivity = 'Awaiting coordinator grade entry';

    if (rec && rec.subjects && rec.subjects.length > 0) {
      rec.subjects.forEach((subj, idx) => {
        const isUploaded = subj.status === 'Uploaded';
        const isInProg = subj.status === 'In Progress';
        if (isUploaded) submitted++;
        else if (isInProg) inProgress++;
        else pending++;

        if (subj.dateUploaded || rec.updatedAt || rec.submissionDate) {
          lastActivity = subj.dateUploaded || rec.updatedAt || rec.submissionDate || lastActivity;
        }

        courses.push({
          id: subj.id || `course-${sectionId}-${idx}`,
          courseCode: subj.courseCode || `CS-${100 + idx * 10}`,
          subjectTitle: subj.subjectTitle || `Core Subject ${idx + 1}`,
          creditHours: subj.creditHours || '3(3-0)',
          status: subj.status === 'Uploaded' ? 'Uploaded' : subj.status === 'In Progress' ? 'In Progress' : 'Pending',
          submitted: isUploaded,
          dateUploaded: subj.dateUploaded || '',
          uploadedBy: subj.uploadedBy || rec.accessedBy || rec.hodCoordinator || coord.name,
          remarks: subj.remarks || (isUploaded ? 'Verified in LMS' : 'Awaiting instructor entry'),
          coordinatorName: coord.name,
          deadlineText: deadlineInfo.text,
          lastActivity: subj.dateUploaded || rec.updatedAt || 'Synced',
        });
      });
    } else {
      // No course records uploaded yet for this cohort - show authentic awaiting state (no fabricated placeholder numbers)
      courses.push({
        id: `awaiting-${semId}-${sectionId}`,
        courseCode: 'PENDING',
        subjectTitle: 'Awaiting Coordinator LMS Grade Entry',
        creditHours: '—',
        status: 'Pending',
        submitted: false,
        dateUploaded: '',
        uploadedBy: coord.isAssigned ? coord.name : 'Coordinator Unassigned',
        remarks: 'No course sheet uploaded yet for this cohort',
        coordinatorName: coord.name,
        deadlineText: deadlineInfo.text,
        lastActivity: 'Awaiting submission',
      });
    }

    const total = submitted + pending + inProgress;
    const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

    return {
      id: `sec-${semId}-${sectionId}`,
      name: `Section ${sectionId}`,
      shortName: `Sec ${sectionId}`,
      level: 'SECTION',
      submitted,
      pending,
      inProgress,
      total,
      completionRate,
      coordinatorStatus: coord.isAssigned ? 'Assigned' : 'Not Assigned',
      coordinatorName: coord.name,
      coordinatorDesignation: coord.designation,
      hodStatus: hod.isRegistered ? 'Registered' : 'Not Registered',
      hodName: hod.name,
      deadlineText: deadlineInfo.text,
      deadlineDays: deadlineInfo.days,
      isOverdue: deadlineInfo.isOverdue,
      lastActivity,
      deptName,
      deptCode,
      progName,
      semId,
      sectionId,
      courses,
    };
  }

  /**
   * Internal helper to retrieve section units across semesters
   */
  private static getProgramSectionUnits(
    deptName: string,
    progName: string,
    currentSession: string | string[],
    allRecords: SubmissionRecord[],
    semesterFilter?: string | string[]
  ): RadarUnit[] {
    const list: RadarUnit[] = [];
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const semList = Array.isArray(semesterFilter)
      ? semesterFilter.filter((s) => s !== 'ALL')
      : semesterFilter && semesterFilter !== 'ALL'
      ? [semesterFilter]
      : [];

    const progRecords = allRecords.filter((r) => {
      if (!r) return false;
      const matchDept = StorageService._isMatch(r.department || '', deptName);
      const matchProg = StorageService._isMatch(r.program || '', progName);
      const rSess = (r.session || '2023').trim();
      const matchSession = sessionList.some((s) => rSess.startsWith(s) || s.startsWith(rSess));
      return matchDept && matchProg && matchSession;
    });

    // Find all semesters with actual records, or fallback to Semester 1
    const recordedSemIds = new Set<string>();
    progRecords.forEach((r) => {
      if (r.semester) recordedSemIds.add(String(r.semester).trim());
    });

    const targetSemIds = semList.length > 0
      ? semList
      : recordedSemIds.size > 0
      ? Array.from(recordedSemIds)
      : ['1'];

    targetSemIds.forEach((semId) => {
      const activeSections = StorageService.getAvailableSectionsForCohort(
        deptName,
        progName,
        sessionList[0] || '2023',
        semId,
        'Morning'
      );
      activeSections.forEach((secId) => {
        list.push(this.getSectionUnit(deptName, progName, semId, secId, currentSession, allRecords));
      });
    });
    return list;
  }

  /**
   * SIGNATURE FEATURE: "Find the Bottleneck"
   * Automatically traverses:
   * UNIVERSITY → FACULTY → DEPARTMENT → PROGRAM → SEMESTER → SECTION → COURSE
   * Evaluates completion rate, pending workload, coordinator assignment, and deadline pressure
   * to pinpoint the #1 critical bottleneck across the entire institution.
   */
  public static findBottleneck(
    allRecords: SubmissionRecord[],
    currentSession: string | string[],
    semesterFilter?: string | string[]
  ): {
    primary: BottleneckInfo;
    runnerUps: BottleneckInfo[];
  } {
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const semList = Array.isArray(semesterFilter)
      ? semesterFilter.filter((s) => s !== 'ALL')
      : semesterFilter && semesterFilter !== 'ALL'
      ? [semesterFilter]
      : [];

    const deadlineInfo = this.getDeadlineInfo();
    const candidates: BottleneckInfo[] = [];

    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const activeProgNames = this.getActiveProgramsForDepartment(dept.name, sessionList, allRecords);
      const hod = this.resolveHOD(dept.name);

      activeProgNames.forEach((progName) => {
        const coord = this.resolveCoordinator(dept.name, progName);

        // Check Semesters (or filtered ones)
        const targetSems = semList.length > 0
          ? ACADEMIC_SEMESTERS.filter((s) => semList.includes(s.id))
          : ACADEMIC_SEMESTERS;

        targetSems.forEach((sem) => {
          const activeSections = StorageService.getAvailableSectionsForCohort(
            dept.name,
            progName,
            sessionList[0] || '2023',
            sem.id,
            'Morning'
          );

          activeSections.forEach((secId) => {
            const unit = this.getSectionUnit(dept.name, progName, sem.id, secId, sessionList, allRecords);

            // Compute Risk Score
            let risk = 0;

            // Workload factor: more pending courses = higher bottleneck
            risk += unit.pending * 15;

            // Completion deficit: 0% completion is penalized heavily
            risk += (100 - unit.completionRate);

            // Missing coordinator penalty
            if (!coord.isAssigned) {
              risk += 60;
            }

            // Missing HOD penalty
            if (!hod.isRegistered) {
              risk += 30;
            }

            // Deadline pressure
            if (deadlineInfo.isOverdue) {
              risk += 100;
            } else if (deadlineInfo.days <= 2) {
              risk += 70;
            } else if (deadlineInfo.days <= 5) {
              risk += 35;
            }

            // Prefer sections with pending courses
            if (unit.pending > 0) {
              let reason = '';
              if (!coord.isAssigned && unit.pending === unit.total) {
                reason = 'No coordinator assigned and 100% of courses unsubmitted';
              } else if (deadlineInfo.isOverdue) {
                reason = `Deadline expired with ${unit.pending} pending courses`;
              } else if (unit.pending >= 5) {
                reason = `Heavy backlog: ${unit.pending} of ${unit.total} courses unsubmitted with deadline in ${deadlineInfo.days} days`;
              } else {
                reason = `Stagnant upload progress (${unit.completionRate}% complete)`;
              }

              const uploadStatus: 'Complete' | 'Partially Uploaded' | 'Pending' =
                unit.pending === 0 ? 'Complete' : unit.submitted > 0 ? 'Partially Uploaded' : 'Pending';

              candidates.push({
                department: dept.name,
                deptCode: dept.code,
                program: progName,
                semesterId: sem.id,
                semesterLabel: sem.label,
                section: `Section ${secId}`,
                totalCourses: unit.total,
                submittedCourses: unit.submitted,
                pendingCourses: unit.pending,
                completionRate: unit.completionRate,
                uploadStatus,
                coordinatorStatus: coord.isAssigned ? 'Assigned' : 'Not Assigned',
                coordinatorName: coord.name,
                hodStatus: hod.isRegistered ? 'Registered' : 'Not Registered',
                hodName: hod.name,
                deadlineText: deadlineInfo.text,
                isOverdue: deadlineInfo.isOverdue,
                daysRemaining: deadlineInfo.days,
                riskScore: risk,
                reason,
                laggingCourses: (unit.courses || []).filter((c) => !c.submitted),
              });
            }
          });
        });
      });
    });

    // Program-level deduplication: Find the most critical bottleneck for EACH program across all departments
    const progBottlenecksMap: Record<string, BottleneckInfo> = {};

    candidates.forEach((cand) => {
      const key = `${cand.department}__${cand.program}`;
      const existing = progBottlenecksMap[key];
      if (!existing || cand.riskScore > existing.riskScore) {
        progBottlenecksMap[key] = cand;
      }
    });

    const sortedProgBottlenecks = Object.values(progBottlenecksMap).sort((a, b) => b.riskScore - a.riskScore);

    // Fallback if zero candidates found (i.e. 100% submission)
    const primary: BottleneckInfo = sortedProgBottlenecks[0] || candidates[0] || {
      department: 'Department of Computer Science',
      deptCode: 'CS',
      program: 'BS Computer Science',
      semesterId: '1',
      semesterLabel: '1st Semester',
      section: 'Section A',
      totalCourses: 6,
      submittedCourses: 0,
      pendingCourses: 6,
      completionRate: 0,
      uploadStatus: 'Pending',
      coordinatorStatus: 'Not Assigned',
      coordinatorName: 'Not Assigned',
      hodStatus: 'Not Registered',
      hodName: 'Not Registered',
      deadlineText: deadlineInfo.text,
      isOverdue: deadlineInfo.isOverdue,
      daysRemaining: deadlineInfo.days,
      riskScore: 245,
      reason: 'Awaiting coordinator appointment and LMS grade submissions',
      laggingCourses: [
        {
          id: 'b-1',
          courseCode: 'CS-101',
          subjectTitle: 'Programming Fundamentals',
          creditHours: '3(3-0)',
          status: 'Pending',
          submitted: false,
          uploadedBy: 'Unassigned',
          coordinatorName: 'Not Assigned',
          deadlineText: deadlineInfo.text,
          lastActivity: 'Not started',
        },
      ],
    };

    // Include top bottlenecks from all other programs/departments so carousel cycles across all lagging programs
    const runnerUps = sortedProgBottlenecks.length > 1 
      ? sortedProgBottlenecks.slice(1) 
      : candidates.filter(c => c.program !== primary.program || c.section !== primary.section).slice(0, 15);

    return { primary, runnerUps };
  }
}
