import React, { useState } from 'react';
import { ProgramDimension, SectionBreakdown, CourseDetail } from '../services/vcAnalyticsService';
import {
  X,
  GraduationCap,
  UserCheck,
  UserX,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  BookOpen,
  Info,
  ChevronRight,
  ShieldCheck,
  Edit3
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  program: ProgramDimension | null;
  onEditProgramSubmission?: (
    department: string,
    program: string,
    section: string
  ) => void;
}

export const ProgramSectionDrillDownModal: React.FC<Props> = ({
  isOpen,
  onClose,
  program,
  onEditProgramSubmission,
}) => {
  const [selectedSectionName, setSelectedSectionName] = useState<string>('A');
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);

  if (!isOpen || !program) return null;

  // Active section data
  const currentSection =
    program.sections.find((s) => s.section === selectedSectionName) ||
    program.sections[0] || {
      section: 'A',
      totalCourses: 0,
      uploadedCourses: 0,
      pendingCourses: 0,
      inProgressCourses: 0,
      completionRate: 0,
      status: 'Not Started' as const,
      courses: [],
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <GraduationCap className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-emerald-200 border border-white/20">
                  {program.deptCode}
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-tight">{program.program}</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  {program.coordinator.shiftLabel || 'Morning & Evening Shifts'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                {program.department} • Shift: {program.coordinator.shiftLabel || 'Morning & Evening'} • Multi-Section Cohort & Course Level Audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coordinator Dimension Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Coordinator Name & Assignment */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <span className="text-slate-400 font-bold block mb-1">PROGRAM COORDINATOR</span>
              <div className="flex items-center gap-2">
                {program.coordinator.isAssigned ? (
                  <>
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {program.coordinator.name}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Account: Active (Verified)
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                      <UserX className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-700 dark:text-amber-400 text-sm">
                        ⚠ Not Assigned
                      </div>
                      <div className="text-[10px] text-slate-500">Account: Not Created</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Last Activity / Login */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <span className="text-slate-400 font-bold block mb-1">ACTIVITY TRACEABILITY</span>
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500">Last Login:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {program.coordinator.lastLoginAt
                      ? new Date(program.coordinator.lastLoginAt).toLocaleString()
                      : 'Never logged in'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Last Submission:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {program.lastSubmissionDate
                      ? new Date(program.lastSubmissionDate).toLocaleString()
                      : 'No submissions yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Program Completion */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <span className="text-slate-400 font-bold block mb-1">OVERALL PROGRAM COMPLETION</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {program.completionRate}%
                </span>
                <span className="text-slate-500 font-medium">
                  ({program.uploadedCourses}/{program.totalCourses} courses)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    program.completionRate === 100
                      ? 'bg-emerald-600'
                      : program.completionRate > 0
                      ? 'bg-blue-600'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  style={{ width: `${Math.max(program.completionRate, 2)}%` }}
                />
              </div>
            </div>

            {/* Academic Program Status */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-2xs flex flex-col justify-between">
              <span className="text-slate-400 font-bold block mb-1">PROGRAM STATUS</span>
              <div>
                <span
                  className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs ${
                    program.status === 'Verified'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : program.status === 'Partial'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : program.status === 'Overdue'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  {program.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {program.sections.length} Cohort {program.sections.length === 1 ? 'Section' : 'Sections'}
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs (Item 16: Multiple Sections) */}
        <div className="px-4 pt-3 pb-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mr-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Sections:
          </span>

          {program.sections.map((sec) => {
            const isSelected = sec.section === currentSection.section;
            return (
              <button
                key={sec.section}
                type="button"
                onClick={() => {
                  setSelectedSectionName(sec.section);
                  setSelectedCourse(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs border ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-emerald-600 dark:border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-200/80 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                <span>Section {sec.section}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                    sec.completionRate === 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : sec.completionRate > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {sec.completionRate}%
                </span>
                <span className="text-sm">
                  {sec.completionRate === 100 ? '🟢' : sec.completionRate > 0 ? '🟡' : '🔴'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section Content & Course Drill-Down (Item 17) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Courses List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Section {currentSection.section} Courses ({currentSection.uploadedCourses}/
                  {currentSection.totalCourses} Uploaded)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Click any course to inspect upload logs, submission timestamps & coordinator details
                </p>
              </div>

              {onEditProgramSubmission && (
                <button
                  type="button"
                  onClick={() =>
                    onEditProgramSubmission(
                      program.department,
                      program.program,
                      currentSection.section
                    )
                  }
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Open HOD Form</span>
                </button>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Course Title</th>
                    <th className="p-2.5 text-center">Cr. Hrs</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentSection.courses.map((course) => {
                    const isSelected = selectedCourse?.id === course.id;
                    return (
                      <tr
                        key={course.id}
                        onClick={() => setSelectedCourse(course)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {course.courseCode}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                          <div>{course.subjectTitle}</div>
                          {course.uploadedBy && course.uploadedBy !== '—' && (
                            <div className="text-[10px] text-slate-400">
                              Uploaded by: {course.uploadedBy}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                          {course.creditHours || '3(3-0)'}
                        </td>
                        <td className="p-2.5 text-center">
                          {course.status === 'Uploaded' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Submitted
                            </span>
                          ) : course.status === 'In Progress' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-blue-600" />
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            className="text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-bold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Course Detail Inspector (Item 17: Then click the course) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            {selectedCourse ? (
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Course Audit Inspector
                  </h5>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">COURSE TITLE</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedCourse.subjectTitle}
                  </div>
                  <div className="font-mono text-xs text-slate-500">{selectedCourse.courseCode}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">EXPECTED</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Yes</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">SUBMITTED</span>
                    <span
                      className={`font-bold ${
                        selectedCourse.submitted
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {selectedCourse.submitted ? 'Yes (Verified)' : 'No (Pending)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">COORDINATOR</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCourse.coordinatorName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">DEADLINE</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCourse.deadline
                        ? new Date(selectedCourse.deadline).toLocaleString()
                        : 'Institutional Standard (30 Sep 2026)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">LAST ACTIVITY</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedCourse.lastActivity}
                    </span>
                  </div>

                  {selectedCourse.remarks && (
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">REMARKS</span>
                      <p className="text-slate-600 dark:text-slate-300 italic text-[11px] bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        {selectedCourse.remarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center">
                <BookOpen className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">Select any course from the list to inspect</p>
                <span className="text-[10px] text-slate-500 mt-1">
                  Shows deadline, coordinator, upload status, and timestamps
                </span>
              </div>
            )}

            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">Executive Oversight:</span> Section{' '}
              {currentSection.section} status is {currentSection.status} with{' '}
              {currentSection.pendingCourses} pending courses.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>MNS-UET Central Academic Monitoring Portal • Vice Chancellor Secretariat</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
