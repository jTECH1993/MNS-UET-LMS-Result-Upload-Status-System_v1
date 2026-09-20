import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SEMESTERS, STANDARD_ACADEMIC_SECTIONS } from '../data/departmentsData';
import { AuthService } from './authService';
import { StorageService } from './storageService';
import { SubmissionRecord, SubjectRow, ProgramInfo, AcademicShift } from '../types';

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
  shift?: 'Morning' | 'Evening' | string;
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
  shift?: 'Morning' | 'Evening' | string;
  courses?: CourseItem[];
}

export interface BottleneckInfo {
  department: string;
  deptCode: string;
  program: string;
  shift?: 'Morning' | 'Evening';
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
  shift?: AcademicShift;
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
  public static resolveCoordinator(
    deptName: string,
    progName?: string,
    shift?: AcademicShift
  ): { isAssigned: boolean; name: string; designation?: string } {
    try {
      const accounts = AuthService.getAccounts();
      const allRecords = StorageService.getStore();

      // 1. Look in registered accounts strictly for this program if progName is given
      if (progName) {
        const cleanProg = progName.trim().toLowerCase();
        
        // Find all coordinators/lecturers for this specific program
        const programCoords = accounts.filter((a) => {
          if (a.role !== 'COORDINATOR' && a.role !== 'LECTURER') return false;
          const assigned = a.assignedPrograms || (a.program ? [a.program] : []);
          return assigned.some((p) => p.trim().toLowerCase() === cleanProg);
        });

        if (programCoords.length > 0) {
          // If shift is provided, prioritize a coordinator assigned to that shift
          if (shift) {
            const shiftMatch = programCoords.find((a) => {
              // Check programShiftAssignments first
              if (a.programShiftAssignments) {
                const matchedProgKey = Object.keys(a.programShiftAssignments).find(
                  (k) => k.trim().toLowerCase() === cleanProg
                );
                if (matchedProgKey) {
                  return a.programShiftAssignments[matchedProgKey].includes(shift);
                }
              }
              // Fallback to assignedShifts
              if (a.assignedShifts) {
                return a.assignedShifts.includes(shift);
              }
              return false;
            });

            if (shiftMatch) {
              return { isAssigned: true, name: shiftMatch.name, designation: shiftMatch.designation || 'Program Coordinator' };
            }
          }

          // Fallback to the first found coordinator for this program
          const fallbackCoord = programCoords[0];
          return { isAssigned: true, name: fallbackCoord.name, designation: fallbackCoord.designation || 'Program Coordinator' };
        }

        // 2. Check if a coordinator uploaded results or is recorded in database submissions for this program
        const matchingRecord = Object.values(allRecords).find((r) => {
          if (r.department.trim().toLowerCase() !== deptName.trim().toLowerCase()) return false;
          if (r.program.trim().toLowerCase() !== cleanProg) return false;
          if (shift && r.shift && r.shift.trim().toLowerCase() !== shift.trim().toLowerCase()) return false;
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
  public static resolveHOD(deptName: string): { isRegistered: boolean; name: string } {
    try {
      const accounts = AuthService.getAccounts();
      const hod = accounts.find(
        (a) =>
          (a.role === 'HOD' || (a.designation && a.designation.toLowerCase().includes('hod'))) &&
          a.department.trim().toLowerCase() === deptName.trim().toLowerCase()
      );
      if (hod) {
        return { isRegistered: true, name: hod.name };
      }
    } catch (e) {}

    const defaultHODs: Record<string, string> = {
      'Department of Computer Science': 'Dr. Najam-ul-Islam',
      'Department of Electrical Engineering & Technology': 'Dr. Muhammad Tariq',
      'Department of Mechanical Engineering & Technology': 'Dr. Hafiz Muhammad Umar',
      'Department of Civil Engineering & Technology': 'Dr. Tariq Mahmood',
      'Department of Chemical Engineering & Technology': 'Dr. M. Mubeen',
      'Department of Management Sciences': 'Dr. M. Fahad',
      'Department of Basic Sciences & Humanities': 'Dr. M. Fahad',
    };

    const matchedKey = Object.keys(defaultHODs).find(
      (k) => k.toLowerCase() === deptName.trim().toLowerCase()
    );

    if (matchedKey) {
      return { isRegistered: true, name: defaultHODs[matchedKey] };
    }

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
      sessionRoster.forEach((p) => {
        const canonical = StorageService.normalizeProgramName(p, deptName);
        if (canonical) set.add(canonical);
      });
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
        const canonical = StorageService.normalizeProgramName(r.program, deptName);
        if (canonical) set.add(canonical);
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
      const hod = this.resolveHOD(dept.name);
      const coord = this.resolveCoordinator(dept.name);

      let submitted = 0;
      let pending = 0;
      let inProgress = 0;
      let lastActivity = 'No recent activity';

      // Evaluate ALL program units across all shifts (Morning & Evening)
      const progUnits = this.getProgramsCoverage(dept.name, currentSession, allRecords, semesterFilter, 'ALL');
      progUnits.forEach((u) => {
        submitted += u.submitted;
        pending += u.pending;
        inProgress += u.inProgress;
        if (u.lastActivity && u.lastActivity !== 'No recent activity' && u.lastActivity !== 'Awaiting coordinator grade entry') {
          lastActivity = u.lastActivity;
        }
      });

      const total = submitted + pending + inProgress;
      let completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
      if (pending > 0 && completionRate >= 100) {
        completionRate = Math.min(95, Math.floor((submitted / total) * 100));
      }
      if (submitted === 0) {
        completionRate = 0;
      }

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
    semesterFilter?: string | string[],
    shiftFilter: 'ALL' | AcademicShift = 'ALL'
  ): RadarUnit[] {
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const deptCode = deptObj?.code || 'DEPT';
    const activeProgNames = this.getActiveProgramsForDepartment(deptName, currentSession, allRecords);
    const hod = this.resolveHOD(deptName);
    const deadlineInfo = this.getDeadlineInfo();
    const resultUnits: RadarUnit[] = [];

    activeProgNames.forEach((progName, idx) => {
      const progObj = deptObj?.programs.find(
        (p) => p.name.trim().toLowerCase() === progName.trim().toLowerCase()
      );

      let targetShifts: AcademicShift[] = [];
      const hasEveningRecs = allRecords.some(
        (r) =>
          r.department.trim().toLowerCase() === deptName.trim().toLowerCase() &&
          r.program.trim().toLowerCase() === progName.trim().toLowerCase() &&
          r.shift === 'Evening'
      );
      const hasMorningRecs = allRecords.some(
        (r) =>
          r.department.trim().toLowerCase() === deptName.trim().toLowerCase() &&
          r.program.trim().toLowerCase() === progName.trim().toLowerCase() &&
          (r.shift || 'Morning') === 'Morning'
      );

      const coordMorning = this.resolveCoordinator(deptName, progName, 'Morning');
      const coordEvening = this.resolveCoordinator(deptName, progName, 'Evening');

      const isMorningActive = hasMorningRecs || coordMorning.isAssigned;
      const isEveningActive = hasEveningRecs || coordEvening.isAssigned;

      if (isMorningActive && isEveningActive) {
        targetShifts = ['Morning', 'Evening'];
      } else if (isEveningActive) {
        targetShifts = ['Evening'];
      } else if (isMorningActive) {
        targetShifts = ['Morning'];
      } else {
        if (progObj?.degreeLevel === 'B.Tech' || progName.includes('(B.Tech)')) {
          targetShifts = ['Evening'];
        } else {
          targetShifts = ['Morning'];
        }
      }

      if (shiftFilter !== 'ALL') {
        targetShifts = targetShifts.includes(shiftFilter) ? [shiftFilter] : targetShifts;
      }

      targetShifts.forEach((shift) => {
        const coord = this.resolveCoordinator(deptName, progName, shift);
        const progUnits = this.getProgramSectionUnits(deptName, progName, currentSession, allRecords, semesterFilter, shift);

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
        const displayName = targetShifts.length > 1 ? `${progName} (${shift})` : progName;

        resultUnits.push({
          id: `prog-${deptCode}-${idx}-${shift.toLowerCase()}`,
          name: displayName,
          shortName: `${progName.split(' ')[0]} (${shift[0]})`,
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
          shift,
        });
      });
    });

    return resultUnits;
  }

  /**
   * LEVEL 2: Semesters Coverage inside a specific Program
   */
  public static getSemestersCoverage(
    deptName: string,
    progName: string,
    currentSession: string | string[],
    allRecords: SubmissionRecord[],
    semesterFilter?: string | string[],
    shift: AcademicShift = 'Morning'
  ): RadarUnit[] {
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const deptCode = deptObj?.code || 'DEPT';
    const coord = this.resolveCoordinator(deptName, progName, shift);
    const hod = this.resolveHOD(deptName);
    const deadlineInfo = this.getDeadlineInfo();
    const semList = Array.isArray(semesterFilter)
      ? semesterFilter.filter((s) => s !== 'ALL')
      : semesterFilter && semesterFilter !== 'ALL'
      ? semesterFilter.split(',')
      : [];

    const activeSems = semList.length > 0
      ? ACADEMIC_SEMESTERS.filter((s) => semList.includes(s.id))
      : ACADEMIC_SEMESTERS;

    return activeSems.map((sem) => {
      const activeSections = StorageService.getAvailableSectionsForCohort(
        deptName,
        progName,
        Array.isArray(currentSession) ? currentSession[0] : (currentSession || '2023'),
        sem.id,
        shift
      );

      const secUnits = activeSections.map((secId) =>
        this.getSectionUnit(deptName, progName, sem.id, secId, currentSession, allRecords, shift)
      );

      const submitted = secUnits.reduce((sum, u) => sum + u.submitted, 0);
      const pending = secUnits.reduce((sum, u) => sum + u.pending, 0);
      const inProgress = secUnits.reduce((sum, u) => sum + u.inProgress, 0);
      const total = submitted + pending + inProgress;
      const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

      const activeUnitWithActivity = secUnits.find((u) => u.lastActivity !== 'Awaiting coordinator grade entry');
      const lastActivity = activeUnitWithActivity ? activeUnitWithActivity.lastActivity : (secUnits[0]?.lastActivity || 'Not started');

      return {
        id: `sem-${sem.id}-${shift.toLowerCase()}`,
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
        shift,
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
    allRecords: SubmissionRecord[],
    shift: AcademicShift = 'Morning'
  ): RadarUnit[] {
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const activeSections = StorageService.getAvailableSectionsForCohort(
      deptName,
      progName,
      sessionList[0] || '2023',
      semId,
      shift
    );
    return activeSections.map((secId) =>
      this.getSectionUnit(deptName, progName, semId, secId, currentSession, allRecords, shift)
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
    allRecords: SubmissionRecord[],
    shift: AcademicShift = 'Morning'
  ): RadarUnit {
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()
    );
    const deptCode = deptObj?.code || 'DEPT';
    const coord = this.resolveCoordinator(deptName, progName, shift);
    const hod = this.resolveHOD(deptName);
    const deadlineInfo = this.getDeadlineInfo();

    // Find authentic record if exists
    const rec = allRecords.find((r) => {
      if (!r) return false;
      const matchDept = StorageService._isDeptMatch(r.department || '', deptName);
      const matchProg = StorageService._isProgMatch(r.program || '', progName);
      const matchSem = String(r.semester || '').trim() === String(semId).trim();
      const matchSec = (r.section || 'A').trim().toUpperCase() === sectionId.trim().toUpperCase();
      const matchShift = !shift || (r.shift || 'Morning') === shift;
      const rSess = (r.session || '2023').trim();
      const matchSession = sessionList.some((s) => rSess.startsWith(s) || s.startsWith(rSess));
      return matchDept && matchProg && matchSem && matchSec && matchShift && matchSession;
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
          shift: rec?.shift || shift || 'Morning',
        });
      });
    } else {
      // WHEN NO RECORD IS SUBMITTED FOR THIS SECTION:
      // Default expected curriculum course count is 5 courses per section (pending upload)
      pending = 5;
    }

    const total = submitted + pending + inProgress;
    const completionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

    return {
      id: `sec-${semId}-${sectionId}-${shift.toLowerCase()}`,
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
      shift: rec?.shift || shift || 'Morning',
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
    semesterFilter?: string | string[],
    shift: AcademicShift = 'Morning'
  ): RadarUnit[] {
    const list: RadarUnit[] = [];
    const sessionList = Array.isArray(currentSession) ? currentSession : [currentSession];
    const semList = Array.isArray(semesterFilter)
      ? semesterFilter.filter((s) => s !== 'ALL')
      : semesterFilter && semesterFilter !== 'ALL'
      ? semesterFilter.split(',')
      : [];

    const progRecords = allRecords.filter((r) => {
      if (!r) return false;
      const matchDept = StorageService._isMatch(r.department || '', deptName);
      const matchProg = StorageService._isMatch(r.program || '', progName);
      const matchShift = !shift || (r.shift || 'Morning') === shift;
      const rSess = (r.session || '2023').trim();
      const matchSession = sessionList.some((s) => rSess.startsWith(s) || s.startsWith(rSess));
      return matchDept && matchProg && matchShift && matchSession;
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
        shift
      );
      activeSections.forEach((secId) => {
        list.push(this.getSectionUnit(deptName, progName, semId, secId, currentSession, allRecords, shift));
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

            let pendingCoursesCount = unit.pending;
            let totalCoursesCount = unit.total;
            let submittedCoursesCount = unit.submitted;
            let completionRateValue = unit.completionRate;

            // If completely unsubmitted (unit.total === 0 because no records exist in DB),
            // it means all 5 curriculum courses are pending!
            if (unit.total === 0) {
              pendingCoursesCount = 5;
              totalCoursesCount = 5;
              submittedCoursesCount = 0;
              completionRateValue = 0;
            }

            // Compute Risk Score
            let risk = 0;

            // Workload factor: more pending courses = higher bottleneck
            risk += pendingCoursesCount * 15;

            // Completion deficit: 0% completion is penalized heavily
            risk += (100 - completionRateValue);

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
            if (pendingCoursesCount > 0) {
              let reason = '';
              if (!coord.isAssigned && pendingCoursesCount === totalCoursesCount) {
                reason = 'No coordinator assigned and 100% of courses unsubmitted';
              } else if (deadlineInfo.isOverdue) {
                reason = `Deadline expired with ${pendingCoursesCount} pending courses`;
              } else if (pendingCoursesCount >= 5) {
                reason = `Heavy backlog: ${pendingCoursesCount} of ${totalCoursesCount} courses unsubmitted with deadline in ${deadlineInfo.days} days`;
              } else {
                reason = `Stagnant upload progress (${completionRateValue}% complete)`;
              }

              const uploadStatus: 'Complete' | 'Partially Uploaded' | 'Pending' =
                pendingCoursesCount === 0 ? 'Complete' : submittedCoursesCount > 0 ? 'Partially Uploaded' : 'Pending';

              candidates.push({
                department: dept.name,
                deptCode: dept.code,
                program: progName,
                shift: 'Morning',
                semesterId: sem.id,
                semesterLabel: sem.label,
                section: `Section ${secId}`,
                totalCourses: totalCoursesCount,
                submittedCourses: submittedCoursesCount,
                pendingCourses: pendingCoursesCount,
                completionRate: completionRateValue,
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
                laggingCourses: (unit.courses || []).length > 0
                  ? (unit.courses || []).filter((c) => !c.submitted)
                  : Array.from({ length: 5 }, (_, i) => ({
                      id: `lms-course-pending-${dept.code}-${sem.id}-${i}`,
                      courseCode: `${dept.code}-${sem.id}0${i + 1}`,
                      subjectTitle: `Curriculum Course ${i + 1}`,
                      creditHours: '3(3-0)',
                      status: 'Pending',
                      submitted: false,
                      uploadedBy: 'Unassigned',
                      remarks: 'Awaiting instructor entry',
                      coordinatorName: coord.name,
                      deadlineText: deadlineInfo.text,
                      lastActivity: 'Not started',
                      shift: 'Morning',
                    })),
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
