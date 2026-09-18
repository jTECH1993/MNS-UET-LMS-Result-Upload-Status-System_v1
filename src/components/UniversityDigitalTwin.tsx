import React, { useState, useMemo } from 'react';
import { SubmissionRecord, AcademicShift } from '../types';
import { UNIVERSITY_DEPARTMENTS, ACADEMIC_SEMESTERS } from '../data/departmentsData';
import { Building2, GraduationCap, Calendar, Layers, CheckCircle2, AlertCircle, Search, ChevronRight, ChevronDown, Award } from 'lucide-react';

interface Props {
  allRecords: SubmissionRecord[];
  activeSessions: string[];
  selectedSemesterFilter: string;
}

// Map department to its respective Faculty
function getFacultyForDept(deptName: string): string {
  const name = deptName.toLowerCase();
  if (name.includes('computer science') || name.includes('information technology')) {
    return 'Faculty of Computing & Information Technology';
  }
  if (name.includes('mechanical') || name.includes('electrical') || name.includes('chemical') || name.includes('civil') || name.includes('engineering')) {
    return 'Faculty of Engineering & Technology';
  }
  if (name.includes('humanities') || name.includes('management') || name.includes('social')) {
    return 'Faculty of Social Sciences & Humanities';
  }
  return 'Faculty of Basic Sciences & Applied Sciences';
}

export const UniversityDigitalTwin: React.FC<Props> = ({ allRecords, activeSessions, selectedSemesterFilter }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'uni': true, // Root expanded by default
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Build the nested digital twin structure
  const digitalTwinData = useMemo(() => {
    // 1. Group records by unique path: Faculty -> Dept -> Program -> Session -> Semester -> Section -> Course
    const faculties: Record<string, any> = {};

    // Standard list of active faculties
    const activeFacultiesList = [
      'Faculty of Computing & Information Technology',
      'Faculty of Engineering & Technology',
      'Faculty of Social Sciences & Humanities',
      'Faculty of Basic Sciences & Applied Sciences'
    ];

    activeFacultiesList.forEach(fac => {
      faculties[fac] = {
        name: fac,
        id: `fac_${fac}`,
        departments: {},
        totalCourses: 0,
        uploadedCourses: 0,
      };
    });

    // Seed departments from data definition
    UNIVERSITY_DEPARTMENTS.forEach(dept => {
      const facName = getFacultyForDept(dept.name);
      if (!faculties[facName]) {
        faculties[facName] = { name: facName, id: `fac_${facName}`, departments: {}, totalCourses: 0, uploadedCourses: 0 };
      }
      faculties[facName].departments[dept.name] = {
        name: dept.name,
        code: dept.code,
        id: `dept_${dept.name}`,
        programs: {},
        totalCourses: 0,
        uploadedCourses: 0,
      };
    });

    // Populate with real database records
    allRecords.forEach(record => {
      // Apply filters if applicable
      if (selectedSemesterFilter !== 'ALL' && record.semester !== selectedSemesterFilter) return;
      if (!activeSessions.includes(record.session || '2023')) return;

      const facName = getFacultyForDept(record.department);
      const dept = faculties[facName]?.departments[record.department];
      if (!dept) return;

      const progName = record.program;
      if (!dept.programs[progName]) {
        dept.programs[progName] = {
          name: progName,
          id: `prog_${dept.name}_${progName}`,
          sessions: {},
          totalCourses: 0,
          uploadedCourses: 0,
        };
      }

      const sessionName = record.session || '2023';
      const prog = dept.programs[progName];
      if (!prog.sessions[sessionName]) {
        prog.sessions[sessionName] = {
          name: `Session ${sessionName}`,
          id: `sess_${prog.id}_${sessionName}`,
          semesters: {},
          totalCourses: 0,
          uploadedCourses: 0,
        };
      }

      const semesterName = `Semester ${record.semester || '1'}`;
      const sess = prog.sessions[sessionName];
      if (!sess.semesters[semesterName]) {
        sess.semesters[semesterName] = {
          name: semesterName,
          id: `sem_${sess.id}_${record.semester}`,
          sections: {},
          totalCourses: 0,
          uploadedCourses: 0,
        };
      }

      const sectionName = `Section ${record.section || 'A'}`;
      const sem = sess.semesters[semesterName];
      if (!sem.sections[sectionName]) {
        sem.sections[sectionName] = {
          name: sectionName,
          id: `sec_${sem.id}_${record.section}`,
          shift: record.shift || 'Morning',
          coordinator: record.hodCoordinator || 'Not Assigned',
          courses: [],
          totalCourses: 0,
          uploadedCourses: 0,
        };
      }

      const sec = sem.sections[sectionName];
      const subjectsList = record.subjects || [];

      subjectsList.forEach(sub => {
        const isUploaded = sub.status === 'Uploaded';
        sec.courses.push({
          id: `course_${sec.id}_${sub.courseCode || Math.random().toString()}`,
          code: sub.courseCode || 'N/A',
          title: sub.subjectTitle || 'Untitled Course',
          status: sub.status || 'Pending',
          uploadedBy: sub.uploadedBy || 'Unassigned',
          uploadedAt: sub.dateUploaded || record.updatedAt || 'N/A'
        });

        sec.totalCourses++;
        if (isUploaded) sec.uploadedCourses++;
        
        sem.totalCourses++;
        if (isUploaded) sem.uploadedCourses++;

        sess.totalCourses++;
        if (isUploaded) sess.uploadedCourses++;

        prog.totalCourses++;
        if (isUploaded) prog.uploadedCourses++;

        dept.totalCourses++;
        if (isUploaded) dept.uploadedCourses++;

        faculties[facName].totalCourses++;
        if (isUploaded) faculties[facName].uploadedCourses++;
      });
    });

    return faculties;
  }, [allRecords, activeSessions, selectedSemesterFilter]);

  // Aggregate stats at University level
  const universityStats = useMemo(() => {
    let total = 0;
    let uploaded = 0;
    Object.values(digitalTwinData).forEach((fac: any) => {
      total += fac.totalCourses;
      uploaded += fac.uploadedCourses;
    });
    const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 100;
    return { total, uploaded, percentage };
  }, [digitalTwinData]);

  // Recursively check if tree nodes match query
  const matchesSearch = (node: any, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    
    // Check node name
    if (node.name.toLowerCase().includes(q)) return true;
    if (node.code && node.code.toLowerCase().includes(q)) return true;

    // If node has departments
    if (node.departments) {
      return Object.values(node.departments).some(d => matchesSearch(d, query));
    }
    // If node has programs
    if (node.programs) {
      return Object.values(node.programs).some(p => matchesSearch(p, query));
    }
    // If node has sessions
    if (node.sessions) {
      return Object.values(node.sessions).some(s => matchesSearch(s, query));
    }
    // If node has semesters
    if (node.semesters) {
      return Object.values(node.semesters).some(s => matchesSearch(s, query));
    }
    // If node has sections
    if (node.sections) {
      return Object.values(node.sections).some(s => matchesSearch(s, query));
    }
    // If node has courses
    if (node.courses) {
      return node.courses.some((c: any) => 
        c.title.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q) || 
        c.uploadedBy.toLowerCase().includes(q)
      );
    }

    return false;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            University Digital Twin Interactive Explorer
          </h3>
          <p className="text-xs text-slate-400">
            Fully interactive digital model of MNS-UET Multan. Zoom into any tier down to individual courses to see verified real-time compliance statistics.
          </p>
        </div>

        {/* Dynamic Search */}
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

      {/* University Level Node */}
      <div className="space-y-4">
        {/* Main University root box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleNode('uni')}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 text-slate-300"
              >
                {expandedNodes['uni'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <div className="p-1.5 bg-emerald-950/60 rounded border border-emerald-800">
                <Award className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  MNS University of Engineering &amp; Technology (MNS-UET)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Global System Administrator Root Node
                </p>
              </div>
            </div>

            {/* University Aggregate KPI Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400">Overall Compliance Index</div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {universityStats.percentage}%
                </div>
              </div>
              <div className="h-10 w-1 bg-emerald-500 rounded-full" />
              <div className="text-xs text-slate-400 font-mono">
                <div>Total: <strong>{universityStats.total}</strong></div>
                <div>Done: <strong className="text-emerald-400">{universityStats.uploaded}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Level 1: Faculties (Rendered if root expanded) */}
        {expandedNodes['uni'] && (
          <div className="pl-6 border-l border-slate-800 space-y-3.5 mt-2">
            {Object.values(digitalTwinData).filter(fac => matchesSearch(fac, searchQuery)).map((fac: any) => {
              const isFacExpanded = expandedNodes[fac.id];
              const facPct = fac.totalCourses > 0 ? Math.round((fac.uploadedCourses / fac.totalCourses) * 100) : 100;

              return (
                <div key={fac.id} className="space-y-2">
                  <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleNode(fac.id)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                      >
                        {isFacExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase text-slate-200">{fac.name}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="font-mono text-slate-400">
                        {fac.uploadedCourses}/{fac.totalCourses}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        facPct > 85 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                        facPct > 50 ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                        'bg-rose-950/80 text-rose-400 border border-rose-800'
                      }`}>
                        {facPct}% Compliance
                      </span>
                    </div>
                  </div>

                  {/* Level 2: Departments */}
                  {isFacExpanded && (
                    <div className="pl-6 border-l border-slate-800 space-y-2">
                      {Object.values(fac.departments).filter(dept => matchesSearch(dept, searchQuery)).map((dept: any) => {
                        const isDeptExpanded = expandedNodes[dept.id];
                        const deptPct = dept.totalCourses > 0 ? Math.round((dept.uploadedCourses / dept.totalCourses) * 100) : 100;

                        return (
                          <div key={dept.id} className="space-y-1.5">
                            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 hover:border-slate-750 transition-colors flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleNode(dept.id)}
                                  className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-slate-400"
                                >
                                  {isDeptExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                                <span className="text-xs font-bold text-slate-300">
                                  [{dept.code}] {dept.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-slate-400 text-[10px]">{dept.uploadedCourses}/{dept.totalCourses}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  deptPct > 85 ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-400 bg-amber-950/40'
                                }`}>
                                  {deptPct}%
                                </span>
                              </div>
                            </div>

                            {/* Level 3: Programs */}
                            {isDeptExpanded && (
                              <div className="pl-6 border-l border-slate-800 space-y-1.5">
                                {Object.values(dept.programs).filter(prog => matchesSearch(prog, searchQuery)).map((prog: any) => {
                                  const isProgExpanded = expandedNodes[prog.id];
                                  const progPct = prog.totalCourses > 0 ? Math.round((prog.uploadedCourses / prog.totalCourses) * 100) : 100;

                                  return (
                                    <div key={prog.id} className="space-y-1">
                                      <div className="bg-slate-950/60 p-2 rounded flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => toggleNode(prog.id)}
                                            className="w-4 h-4 rounded bg-slate-900 flex items-center justify-center text-slate-500"
                                          >
                                            {isProgExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                          </button>
                                          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                          <span className="font-medium text-slate-300">{prog.name}</span>
                                        </div>
                                        <span className="font-mono text-[10px] text-slate-400">{prog.uploadedCourses}/{prog.totalCourses} ({progPct}%)</span>
                                      </div>

                                      {/* Level 4: Sessions */}
                                      {isProgExpanded && (
                                        <div className="pl-6 border-l border-slate-850 space-y-1">
                                          {Object.values(prog.sessions).filter(sess => matchesSearch(sess, searchQuery)).map((sess: any) => {
                                            const isSessExpanded = expandedNodes[sess.id];

                                            return (
                                              <div key={sess.id} className="space-y-1">
                                                <div className="p-1.5 flex items-center justify-between text-[11px] text-slate-400">
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggleNode(sess.id)}
                                                      className="text-slate-500 hover:text-slate-300"
                                                    >
                                                      {isSessExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                    </button>
                                                    <Calendar className="w-3 h-3 text-emerald-500" />
                                                    <span>{sess.name}</span>
                                                  </div>
                                                  <span className="font-mono text-[10px]">{sess.uploadedCourses}/{sess.totalCourses}</span>
                                                </div>

                                                {/* Level 5: Semesters */}
                                                {isSessExpanded && (
                                                  <div className="pl-6 border-l border-slate-800 space-y-1">
                                                    {Object.values(sess.semesters).filter(sem => matchesSearch(sem, searchQuery)).map((sem: any) => {
                                                      const isSemExpanded = expandedNodes[sem.id];

                                                      return (
                                                        <div key={sem.id} className="space-y-1">
                                                          <div className="p-1 flex items-center justify-between text-[10px] text-slate-400">
                                                            <div className="flex items-center gap-1.5">
                                                              <button
                                                                type="button"
                                                                onClick={() => toggleNode(sem.id)}
                                                                className="text-slate-600 hover:text-slate-400"
                                                              >
                                                                {isSemExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                                              </button>
                                                              <Layers className="w-2.5 h-2.5 text-indigo-400" />
                                                              <span>{sem.name}</span>
                                                            </div>
                                                            <span className="font-mono">{sem.uploadedCourses}/{sem.totalCourses}</span>
                                                          </div>

                                                          {/* Level 6: Sections */}
                                                          {isSemExpanded && (
                                                            <div className="pl-5 border-l border-slate-850 space-y-1">
                                                              {Object.values(sem.sections).filter(sec => matchesSearch(sec, searchQuery)).map((sec: any) => {
                                                                const isSecExpanded = expandedNodes[sec.id];
                                                                const secPct = sec.totalCourses > 0 ? Math.round((sec.uploadedCourses / sec.totalCourses) * 100) : 100;

                                                                return (
                                                                  <div key={sec.id} className="space-y-1">
                                                                    <div className="p-1 flex items-center justify-between text-[10px] bg-slate-950/40 rounded">
                                                                      <div className="flex items-center gap-1">
                                                                        <button
                                                                          type="button"
                                                                          onClick={() => toggleNode(sec.id)}
                                                                          className="text-slate-600 hover:text-slate-400 mr-0.5"
                                                                        >
                                                                          {isSecExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                                                        </button>
                                                                        <span className="font-bold text-slate-300">{sec.name}</span>
                                                                        <span className="text-[9px] text-slate-500 font-medium">({sec.shift})</span>
                                                                        <span className="text-[9px] text-slate-400 ml-1">Coordinator: <em>{sec.coordinator}</em></span>
                                                                      </div>
                                                                      <span className={`px-1 rounded text-[9px] font-mono font-bold ${
                                                                        secPct === 100 ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-400 bg-amber-950/40'
                                                                      }`}>
                                                                        {sec.uploadedCourses}/{sec.totalCourses} ({secPct}%)
                                                                      </span>
                                                                    </div>

                                                                    {/* Level 7: Individual Course Leaves */}
                                                                    {isSecExpanded && (
                                                                      <div className="pl-5 border-l border-slate-900 space-y-0.5 py-1">
                                                                        {sec.courses.map((course: any) => {
                                                                          const done = course.status === 'Uploaded';
                                                                          return (
                                                                            <div key={course.id} className="flex items-center justify-between text-[10px] hover:bg-slate-850 p-1 rounded transition-colors">
                                                                              <div className="flex items-center gap-1.5 min-w-0">
                                                                                {done ? (
                                                                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                                ) : (
                                                                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                                                )}
                                                                                <span className="font-mono text-emerald-400 shrink-0">{course.code}</span>
                                                                                <span className="text-slate-300 truncate font-sans">{course.title}</span>
                                                                                <span className="text-[9px] text-slate-500 hidden sm:inline shrink-0 font-light">| Inst: {course.uploadedBy}</span>
                                                                              </div>
                                                                              <span className={`px-1.5 py-0.2 rounded-[3px] text-[8px] font-extrabold uppercase shrink-0 ${
                                                                                done ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                                                                              }`}>
                                                                                {course.status}
                                                                              </span>
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
