import React, { useState, useMemo } from 'react';
import { SubmissionRecord, AcademicShift } from '../types';
import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SEMESTERS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';
import { Building2, GraduationCap, Calendar, Layers, CheckCircle2, AlertCircle, Search, ChevronRight, ChevronDown, Award } from 'lucide-react';

interface Props {
  allRecords: SubmissionRecord[];
  activeSessions: string[];
  selectedSemesterFilter: string;
  selectedShiftFilter?: string;
}

interface CourseLeaf {
  id: string;
  code: string;
  title: string;
  status: 'Uploaded' | 'In Progress' | 'Pending';
  uploadedBy: string;
  uploadedAt: string;
}

interface SectionNode {
  id: string;
  name: string;
  sectionName: string;
  shift: string;
  coordinator: string;
  courses: CourseLeaf[];
  totalCourses: number;
  uploadedCourses: number;
}

interface SemesterNode {
  id: string;
  name: string;
  semId: string;
  sections: Record<string, SectionNode>;
  totalCourses: number;
  uploadedCourses: number;
}

interface SessionNode {
  id: string;
  name: string;
  sessionId: string;
  semesters: Record<string, SemesterNode>;
  totalCourses: number;
  uploadedCourses: number;
}

interface ProgramNode {
  id: string;
  name: string;
  degreeLevel: string;
  supportedShifts: AcademicShift[];
  sessions: Record<string, SessionNode>;
  totalCourses: number;
  uploadedCourses: number;
}

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  programs: Record<string, ProgramNode>;
  totalCourses: number;
  uploadedCourses: number;
}

export const UniversityDigitalTwin: React.FC<Props> = ({
  allRecords,
  activeSessions,
  selectedSemesterFilter,
  selectedShiftFilter = 'ALL',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    uni: true, // Root expanded by default
  });

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Build the clean digital twin hierarchy directly starting from real MNS-UET Departments & Programs
  const digitalTwinDepartments = useMemo(() => {
    const departmentsMap: Record<string, DepartmentNode> = {};

    // 1. Seed all real official departments from data definitions
    UNIVERSITY_DEPARTMENTS.forEach((dept) => {
      const deptKey = dept.name;
      const deptNode: DepartmentNode = {
        id: `dept_${dept.code}`,
        name: dept.name,
        code: dept.code,
        programs: {},
        totalCourses: 0,
        uploadedCourses: 0,
      };

      // 2. Seed all official programs registered in this department
      dept.programs.forEach((prog) => {
        const progNode: ProgramNode = {
          id: `prog_${dept.code}_${prog.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: prog.name,
          degreeLevel: prog.degreeLevel,
          supportedShifts: prog.supportedShifts || ['Morning', 'Evening'],
          sessions: {},
          totalCourses: 0,
          uploadedCourses: 0,
        };
        deptNode.programs[prog.name] = progNode;
      });

      departmentsMap[deptKey] = deptNode;
    });

    // Sessions to evaluate
    const targetSessions = activeSessions.length > 0 ? activeSessions : ['2023'];

    // Semesters to evaluate
    const allSemesterIds = ACADEMIC_SEMESTERS.map((s) => s.id);
    const targetSemesters =
      selectedSemesterFilter !== 'ALL' ? [selectedSemesterFilter] : allSemesterIds;

    // Build nested tree structure for every department and program
    Object.values(departmentsMap).forEach((deptNode) => {
      Object.keys(deptNode.programs).forEach((progName) => {
        const progNode = deptNode.programs[progName];

        targetSessions.forEach((sessId) => {
          const activeProgramsForSession = StorageService.getSessionPrograms(
            deptNode.name,
            sessId,
            allRecords
          );

          // Check if this program is enrolled/active in this session or has records
          const isEnrolledInSession = activeProgramsForSession.some(
            (p) => p.trim().toLowerCase() === progNode.name.trim().toLowerCase()
          );

          const hasRecordsInSession = allRecords.some(
            (r) =>
              r &&
              r.department &&
              r.program &&
              StorageService._isDeptMatch(deptNode.name, r.department) &&
              StorageService._isProgMatch(progNode.name, r.program) &&
              ((r.session || '2023').trim() === sessId || (r.session || '2023').includes(sessId))
          );

          // Only include this session for the program if it is selected/enrolled in this session or has submissions
          if (!isEnrolledInSession && !hasRecordsInSession) {
            return;
          }

          const sessKey = `Session ${sessId}`;
          const sessNode: SessionNode = {
            id: `sess_${progNode.id}_${sessId}`,
            name: sessKey,
            sessionId: sessId,
            semesters: {},
            totalCourses: 0,
            uploadedCourses: 0,
          };

          const isMasterOrPhd = progNode.degreeLevel === 'MS' || progNode.degreeLevel === 'PhD';
          const progSemesters = isMasterOrPhd
            ? targetSemesters.filter((s) => ['1', '2', '3', '4'].includes(s))
            : targetSemesters;

          progSemesters.forEach((semId) => {
            const semKey = `Semester ${semId}`;
            const semNode: SemesterNode = {
              id: `sem_${sessNode.id}_${semId}`,
              name: semKey,
              semId,
              sections: {},
              totalCourses: 0,
              uploadedCourses: 0,
            };

            // Find matching database records for this department, program, session, and semester
            const matchingRecords = allRecords.filter((r) => {
              if (!r || !r.department || !r.program) return false;
              if (!StorageService._isDeptMatch(deptNode.name, r.department)) return false;
              if (!StorageService._isProgMatch(progNode.name, r.program)) return false;
              const rSess = (r.session || '2023').trim();
              const sessMatch = rSess.startsWith(sessId) || sessId.startsWith(rSess) || rSess.includes(sessId) || sessId.includes(rSess);
              if (!sessMatch) return false;
              const rSemNum = String(r.semester || '1').replace(/\D/g, '') || '1';
              if (rSemNum !== semId) return false;
              if (selectedShiftFilter !== 'ALL') {
                const rShift = (r.shift || 'Morning').trim().toLowerCase();
                if (rShift !== selectedShiftFilter.trim().toLowerCase()) return false;
              }
              return true;
            });

            // Collect sections ('A' by default, plus 'B' if data exists)
            const sectionsSet = new Set<string>(['A']);
            matchingRecords.forEach((r) => {
              const sec = (r.section || 'A').trim().toUpperCase();
              if (sec) sectionsSet.add(sec);
            });

            Array.from(sectionsSet)
              .sort()
              .forEach((secName) => {
                const secKey = `Section ${secName}`;

                const secRecords = matchingRecords.filter(
                  (r) => (r.section || 'A').trim().toUpperCase() === secName
                );

                let secUploaded = 0;
                let secTotal = 0;
                const coursesList: CourseLeaf[] = [];
                let coordinatorName = 'Not Assigned';
                let shiftName = 'Morning';

                if (secRecords.length > 0) {
                  secRecords.forEach((r) => {
                    if (r.hodCoordinator) coordinatorName = r.hodCoordinator;
                    if (r.shift) shiftName = r.shift;

                    const subs = r.subjects || [];
                    const validSubs = subs.filter(
                      (s) => s && (s.courseCode?.trim() || s.subjectTitle?.trim() || s.status)
                    );

                    if (validSubs.length > 0) {
                      validSubs.forEach((sub, idx) => {
                        const isUploaded = sub.status === 'Uploaded';
                        if (isUploaded) secUploaded++;
                        secTotal++;

                        coursesList.push({
                          id: `course_${semNode.id}_${secName}_${sub.id || idx}`,
                          code: sub.courseCode || `SEM${semId}-CRS${idx + 1}`,
                          title: sub.subjectTitle || `Curricular Subject ${idx + 1}`,
                          status: isUploaded
                            ? 'Uploaded'
                            : sub.status === 'In Progress'
                            ? 'In Progress'
                            : 'Pending',
                          uploadedBy: sub.uploadedBy || r.accessedBy || coordinatorName,
                          uploadedAt: sub.dateUploaded || r.updatedAt || 'Updated in LMS',
                        });
                      });
                    }
                  });
                }

                // If no LMS course rows exist yet in DB for this semester & section, add 5 expected pending courses
                if (coursesList.length === 0) {
                  const defaultCoursesCount = 5;
                  for (let idx = 0; idx < defaultCoursesCount; idx++) {
                    secTotal++;
                    coursesList.push({
                      id: `expected_${semNode.id}_${secName}_${idx}`,
                      code: `SEM${semId}-CRS${idx + 1}`,
                      title: `Semester ${semId} Curricular Subject ${idx + 1}`,
                      status: 'Pending',
                      uploadedBy: 'Awaiting Coordinator Upload',
                      uploadedAt: 'Not Started',
                    });
                  }
                }

                const secNode: SectionNode = {
                  id: `sec_${semNode.id}_${secName}`,
                  name: secKey,
                  sectionName: secName,
                  shift: shiftName,
                  coordinator: coordinatorName,
                  courses: coursesList,
                  totalCourses: secTotal,
                  uploadedCourses: secUploaded,
                };

                semNode.sections[secKey] = secNode;
                semNode.totalCourses += secTotal;
                semNode.uploadedCourses += secUploaded;
              });

            sessNode.semesters[semKey] = semNode;
            sessNode.totalCourses += semNode.totalCourses;
            sessNode.uploadedCourses += semNode.uploadedCourses;
          });

          progNode.sessions[sessKey] = sessNode;
          progNode.totalCourses += sessNode.totalCourses;
          progNode.uploadedCourses += sessNode.uploadedCourses;
        });

        if (Object.keys(progNode.sessions).length > 0) {
          deptNode.totalCourses += progNode.totalCourses;
          deptNode.uploadedCourses += progNode.uploadedCourses;
        } else {
          // Remove program if it has no active sessions for current session filter
          delete deptNode.programs[progName];
        }
      });
    });

    return departmentsMap;
  }, [allRecords, activeSessions, selectedSemesterFilter, selectedShiftFilter]);

  // Aggregate global university compliance stats across all real departments
  const universityStats = useMemo(() => {
    let total = 0;
    let uploaded = 0;
    Object.values(digitalTwinDepartments).forEach((dept) => {
      total += dept.totalCourses;
      uploaded += dept.uploadedCourses;
    });
    const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;
    return { total, uploaded, percentage };
  }, [digitalTwinDepartments]);

  // Search filter helper
  const matchesSearch = (node: any, query: string): boolean => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();

    if (node.name && node.name.toLowerCase().includes(q)) return true;
    if (node.code && node.code.toLowerCase().includes(q)) return true;

    if (node.programs) {
      return Object.values(node.programs).some((p) => matchesSearch(p, query));
    }
    if (node.sessions) {
      return Object.values(node.sessions).some((s) => matchesSearch(s, query));
    }
    if (node.semesters) {
      return Object.values(node.semesters).some((s) => matchesSearch(s, query));
    }
    if (node.sections) {
      return Object.values(node.sections).some((sec) => matchesSearch(sec, query));
    }
    if (node.courses) {
      return node.courses.some(
        (c: CourseLeaf) =>
          c.title.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.uploadedBy.toLowerCase().includes(q)
      );
    }

    return false;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-100 shadow-xl">
      {/* Header & Dynamic Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            MNS-UET Digital Twin Interactive Explorer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time digital model of MNS-UET Multan structure. Drill down into every official department, degree program, session, semester, section, and course.
          </p>
        </div>

        {/* Dynamic Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search departments, programs, courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Hierarchy Explorer */}
      <div className="space-y-4">
        {/* Root University Level Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleNode('uni')}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 text-slate-300 cursor-pointer"
              >
                {expandedNodes['uni'] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <div className="p-2 bg-emerald-950/80 rounded-lg border border-emerald-800">
                <Award className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  MNS University of Engineering &amp; Technology (MNS-UET)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Global Academic Administration Root Node • {UNIVERSITY_DEPARTMENTS.length} Official Departments
                </p>
              </div>
            </div>

            {/* University Compliance Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400">Overall Compliance Index</div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {universityStats.percentage}%
                </div>
              </div>
              <div className="h-10 w-1 bg-emerald-500 rounded-full" />
              <div className="text-xs text-slate-400 font-mono">
                <div>
                  Total: <strong>{universityStats.total}</strong>
                </div>
                <div>
                  Uploaded: <strong className="text-emerald-400">{universityStats.uploaded}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level 1: Real MNS-UET Departments */}
        {expandedNodes['uni'] && (
          <div className="pl-3 sm:pl-6 border-l border-slate-800 space-y-3 mt-2">
            {Object.values(digitalTwinDepartments)
              .filter((dept) => matchesSearch(dept, searchQuery))
              .map((dept) => {
                const isDeptExpanded = expandedNodes[dept.id];
                const deptPct =
                  dept.totalCourses > 0
                    ? Math.round((dept.uploadedCourses / dept.totalCourses) * 100)
                    : 0;

                const progCount = Object.keys(dept.programs).length;

                return (
                  <div key={dept.id} className="space-y-2">
                    {/* Department Header */}
                    <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleNode(dept.id)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
                        >
                          {isDeptExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Building2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs sm:text-sm font-black uppercase text-slate-100">
                          [{dept.code}] {dept.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full">
                          {progCount} Programs
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="font-mono text-slate-400">
                          {dept.uploadedCourses} / {dept.totalCourses} courses
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            deptPct >= 90
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                              : deptPct >= 50
                              ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                              : deptPct > 0
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {deptPct}% Compliance
                        </span>
                      </div>
                    </div>

                    {/* Level 2: Degree Programs under Department */}
                    {isDeptExpanded && (
                      <div className="pl-4 sm:pl-6 border-l border-slate-800 space-y-2">
                        {Object.values(dept.programs)
                          .filter((prog) => matchesSearch(prog, searchQuery))
                          .map((prog) => {
                            const isProgExpanded = expandedNodes[prog.id];
                            const progPct =
                              prog.totalCourses > 0
                                ? Math.round((prog.uploadedCourses / prog.totalCourses) * 100)
                                : 0;

                            return (
                              <div key={prog.id} className="space-y-1.5">
                                {/* Program Header */}
                                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleNode(prog.id)}
                                      className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 cursor-pointer"
                                    >
                                      {isProgExpanded ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                                    <span className="text-xs font-bold text-slate-200">
                                      {prog.name}
                                    </span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                                      {prog.degreeLevel}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs font-mono">
                                    <span className="text-[10px] text-slate-400">
                                      {prog.uploadedCourses} / {prog.totalCourses}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        progPct >= 90
                                          ? 'text-emerald-400 bg-emerald-950/60'
                                          : progPct > 0
                                          ? 'text-amber-400 bg-amber-950/60'
                                          : 'text-rose-400 bg-rose-950/60'
                                      }`}
                                    >
                                      {progPct}%
                                    </span>
                                  </div>
                                </div>

                                {/* Level 3: Sessions */}
                                {isProgExpanded && (
                                  <div className="pl-4 sm:pl-6 border-l border-slate-800 space-y-1.5">
                                    {Object.values(prog.sessions)
                                      .filter((sess) => matchesSearch(sess, searchQuery))
                                      .map((sess) => {
                                        const isSessExpanded = expandedNodes[sess.id];
                                        const sessPct =
                                          sess.totalCourses > 0
                                            ? Math.round(
                                                (sess.uploadedCourses / sess.totalCourses) * 100
                                              )
                                            : 0;

                                        return (
                                          <div key={sess.id} className="space-y-1">
                                            {/* Session Header */}
                                            <div className="bg-slate-950/60 p-2 rounded flex items-center justify-between text-xs border border-slate-850">
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleNode(sess.id)}
                                                  className="w-4 h-4 rounded bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                                                >
                                                  {isSessExpanded ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                  ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                  )}
                                                </button>
                                                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="font-semibold text-slate-300">
                                                  {sess.name}
                                                </span>
                                              </div>
                                              <span className="font-mono text-[10px] text-slate-400">
                                                {sess.uploadedCourses} / {sess.totalCourses} ({sessPct}%)
                                              </span>
                                            </div>

                                            {/* Level 4: Semesters */}
                                            {isSessExpanded && (
                                              <div className="pl-4 sm:pl-6 border-l border-slate-800 space-y-1">
                                                {Object.values(sess.semesters)
                                                  .filter((sem) => matchesSearch(sem, searchQuery))
                                                  .map((sem) => {
                                                    const isSemExpanded = expandedNodes[sem.id];
                                                    const semPct =
                                                      sem.totalCourses > 0
                                                        ? Math.round(
                                                            (sem.uploadedCourses / sem.totalCourses) * 100
                                                          )
                                                        : 0;

                                                    return (
                                                      <div key={sem.id} className="space-y-1">
                                                        {/* Semester Header */}
                                                        <div className="p-1.5 flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/40 rounded hover:bg-slate-900/80 transition-colors">
                                                          <div className="flex items-center gap-1.5">
                                                            <button
                                                              type="button"
                                                              onClick={() => toggleNode(sem.id)}
                                                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                                            >
                                                              {isSemExpanded ? (
                                                                <ChevronDown className="w-3 h-3" />
                                                              ) : (
                                                                <ChevronRight className="w-3 h-3" />
                                                              )}
                                                            </button>
                                                            <Layers className="w-3 h-3 text-indigo-400" />
                                                            <span className="font-medium">
                                                              {sem.name}
                                                            </span>
                                                          </div>
                                                          <span className="font-mono text-[10px] text-slate-400">
                                                            {sem.uploadedCourses} / {sem.totalCourses} ({semPct}%)
                                                          </span>
                                                        </div>

                                                        {/* Level 5: Sections */}
                                                        {isSemExpanded && (
                                                          <div className="pl-4 sm:pl-5 border-l border-slate-800 space-y-1">
                                                            {Object.values(sem.sections)
                                                              .filter((sec) =>
                                                                matchesSearch(sec, searchQuery)
                                                              )
                                                              .map((sec) => {
                                                                const isSecExpanded =
                                                                  expandedNodes[sec.id];
                                                                const secPct =
                                                                  sec.totalCourses > 0
                                                                    ? Math.round(
                                                                        (sec.uploadedCourses /
                                                                          sec.totalCourses) *
                                                                          100
                                                                      )
                                                                    : 0;

                                                                return (
                                                                  <div
                                                                    key={sec.id}
                                                                    className="space-y-1"
                                                                  >
                                                                    {/* Section Header */}
                                                                    <div className="p-1.5 flex items-center justify-between text-[10px] bg-slate-950/80 rounded border border-slate-800">
                                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <button
                                                                          type="button"
                                                                          onClick={() =>
                                                                            toggleNode(sec.id)
                                                                          }
                                                                          className="text-slate-500 hover:text-slate-300 cursor-pointer mr-0.5"
                                                                        >
                                                                          {isSecExpanded ? (
                                                                            <ChevronDown className="w-2.5 h-2.5" />
                                                                          ) : (
                                                                            <ChevronRight className="w-2.5 h-2.5" />
                                                                          )}
                                                                        </button>
                                                                        <span className="font-bold text-slate-200">
                                                                          {sec.name}
                                                                        </span>
                                                                        <span className="text-[9px] text-indigo-300 font-semibold bg-indigo-950 px-1.5 py-0.2 rounded">
                                                                          {sec.shift} Shift
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400">
                                                                          Coord:{' '}
                                                                          <strong className="text-slate-300">
                                                                            {sec.coordinator}
                                                                          </strong>
                                                                        </span>
                                                                      </div>
                                                                      <span
                                                                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                                                          secPct === 100
                                                                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                                                                            : secPct > 0
                                                                            ? 'text-amber-400 bg-amber-950/60 border border-amber-800'
                                                                            : 'text-rose-400 bg-rose-950/60 border border-rose-800'
                                                                        }`}
                                                                      >
                                                                        {sec.uploadedCourses} / {sec.totalCourses} ({secPct}%)
                                                                      </span>
                                                                    </div>

                                                                    {/* Level 6: Course Leaves */}
                                                                    {isSecExpanded && (
                                                                      <div className="pl-4 border-l border-slate-800 space-y-0.5 py-1">
                                                                        {sec.courses.map(
                                                                          (course) => {
                                                                            const done =
                                                                              course.status ===
                                                                              'Uploaded';
                                                                            return (
                                                                              <div
                                                                                key={course.id}
                                                                                className="flex items-center justify-between text-[10px] hover:bg-slate-850 p-1.5 rounded transition-colors"
                                                                              >
                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                  {done ? (
                                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                                                  ) : (
                                                                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                                                                  )}
                                                                                  <span className="font-mono text-emerald-400 font-bold shrink-0">
                                                                                    {course.code}
                                                                                  </span>
                                                                                  <span className="text-slate-200 truncate font-medium">
                                                                                    {course.title}
                                                                                  </span>
                                                                                  <span className="text-[9px] text-slate-400 hidden sm:inline shrink-0 font-light">
                                                                                    • Inst:{' '}
                                                                                    {course.uploadedBy}
                                                                                  </span>
                                                                                </div>
                                                                                <span
                                                                                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                                                                                    done
                                                                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                                                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                                                                  }`}
                                                                                >
                                                                                  {course.status}
                                                                                </span>
                                                                              </div>
                                                                            );
                                                                          }
                                                                        )}
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                );
                                                              })}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
