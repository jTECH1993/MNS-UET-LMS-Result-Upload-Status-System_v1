import React, { useState, useMemo } from 'react';
import {
  CompletionRadarService,
  RadarUnit,
  CourseItem,
  RadarDrillPath,
} from '../services/completionRadarService';
import { SubmissionRecord } from '../types';
import {
  Building2,
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  UserX,
  Sparkles,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface Props {
  allRecords: SubmissionRecord[];
  currentSession: string;
  drillPath: RadarDrillPath;
  onDrillPathChange: (newPath: RadarDrillPath) => void;
  onSelectUnitForInspector?: (unit: RadarUnit | null) => void;
  highlightedBottleneckSection?: string | null;
}

export const SubmissionCoverageRadar: React.FC<Props> = ({
  allRecords,
  currentSession,
  drillPath,
  onDrillPathChange,
  onSelectUnitForInspector,
  highlightedBottleneckSection,
}) => {
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

  // Determine current active level
  const currentLevel = useMemo<'UNIVERSITY' | 'DEPARTMENT' | 'PROGRAM' | 'SEMESTER' | 'COURSES'>(() => {
    if (drillPath.sectionId && drillPath.semId && drillPath.progName && drillPath.deptName) {
      return 'COURSES';
    }
    if (drillPath.semId && drillPath.progName && drillPath.deptName) {
      return 'SEMESTER';
    }
    if (drillPath.progName && drillPath.deptName) {
      return 'PROGRAM';
    }
    if (drillPath.deptName) {
      return 'DEPARTMENT';
    }
    return 'UNIVERSITY';
  }, [drillPath]);

  // Compute the current list of Radar Units based on drill-down level
  const units = useMemo<RadarUnit[]>(() => {
    if (currentLevel === 'UNIVERSITY') {
      return CompletionRadarService.getUniversityDepartmentCoverage(allRecords, currentSession);
    }
    if (currentLevel === 'DEPARTMENT' && drillPath.deptName) {
      return CompletionRadarService.getProgramsCoverage(drillPath.deptName, currentSession, allRecords);
    }
    if (currentLevel === 'PROGRAM' && drillPath.deptName && drillPath.progName) {
      return CompletionRadarService.getSemestersCoverage(
        drillPath.deptName,
        drillPath.progName,
        currentSession,
        allRecords
      );
    }
    if (currentLevel === 'SEMESTER' && drillPath.deptName && drillPath.progName && drillPath.semId) {
      return CompletionRadarService.getSectionsCoverage(
        drillPath.deptName,
        drillPath.progName,
        drillPath.semId,
        currentSession,
        allRecords
      );
    }
    return [];
  }, [currentLevel, drillPath, allRecords, currentSession]);

  // If in COURSES view, retrieve the course items for the selected section
  const sectionCourseUnit = useMemo<RadarUnit | null>(() => {
    if (currentLevel === 'COURSES' && drillPath.deptName && drillPath.progName && drillPath.semId && drillPath.sectionId) {
      return CompletionRadarService.getSectionUnit(
        drillPath.deptName,
        drillPath.progName,
        drillPath.semId,
        drillPath.sectionId,
        currentSession,
        allRecords
      );
    }
    return null;
  }, [currentLevel, drillPath, allRecords, currentSession]);

  // Inform parent inspector of active unit whenever hovered or selected
  const handleHoverUnit = (unit: RadarUnit | null) => {
    setHoveredUnitId(unit ? unit.id : null);
    if (onSelectUnitForInspector && unit) {
      onSelectUnitForInspector(unit);
    }
  };

  // Click on a unit bar to drill down to next level
  const handleUnitClick = (unit: RadarUnit) => {
    if (onSelectUnitForInspector) {
      onSelectUnitForInspector(unit);
    }

    if (unit.level === 'DEPARTMENT') {
      onDrillPathChange({ deptName: unit.deptName });
    } else if (unit.level === 'PROGRAM') {
      onDrillPathChange({ deptName: unit.deptName, progName: unit.progName });
    } else if (unit.level === 'SEMESTER') {
      onDrillPathChange({
        deptName: unit.deptName,
        progName: unit.progName,
        semId: unit.semId,
      });
    } else if (unit.level === 'SECTION') {
      onDrillPathChange({
        deptName: unit.deptName,
        progName: unit.progName,
        semId: unit.semId,
        sectionId: unit.sectionId,
      });
    }
  };

  // Step back one level
  const handleStepBack = () => {
    if (currentLevel === 'COURSES') {
      onDrillPathChange({
        deptName: drillPath.deptName,
        progName: drillPath.progName,
        semId: drillPath.semId,
      });
    } else if (currentLevel === 'SEMESTER') {
      onDrillPathChange({
        deptName: drillPath.deptName,
        progName: drillPath.progName,
      });
    } else if (currentLevel === 'PROGRAM') {
      onDrillPathChange({
        deptName: drillPath.deptName,
      });
    } else if (currentLevel === 'DEPARTMENT') {
      onDrillPathChange({});
    }
  };

  // Reset all the way back to University level
  const handleResetToUniversity = () => {
    onDrillPathChange({});
  };

  // Calculate dynamic max value for the X-axis scale
  const maxAxisValue = useMemo(() => {
    if (units.length === 0) return 140;
    const highest = Math.max(...units.map((u) => u.total));
    if (highest <= 12) return 12;
    if (highest <= 35) return 35;
    if (highest <= 70) return 70;
    if (highest <= 105) return 105;
    if (highest <= 140) return 140;
    return Math.ceil(highest / 35) * 35;
  }, [units]);

  // Tick marks for the X-axis
  const axisTicks = useMemo(() => {
    if (maxAxisValue <= 12) {
      return [0, 3, 6, 9, 12];
    }
    const step = maxAxisValue / 4;
    return [0, Math.round(step), Math.round(step * 2), Math.round(step * 3), maxAxisValue];
  }, [maxAxisValue]);

  return (
    <div className="bg-[#121622] text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all duration-300">
      {/* Header & Breadcrumbs Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#161b2b] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-emerald-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-black text-base shadow-inner">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Submission Coverage Matrix</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80">
                    Completion Radar
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Illustrative view of submitted versus pending expected result items across academic areas
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {currentLevel !== 'UNIVERSITY' && (
              <button
                type="button"
                onClick={handleStepBack}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="Go back one level"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            {currentLevel !== 'UNIVERSITY' && (
              <button
                type="button"
                onClick={handleResetToUniversity}
                className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1 border border-slate-700/60 cursor-pointer"
                title="Reset to University overview"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Top Level</span>
              </button>
            )}
            <div className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700/80 text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Session {currentSession}</span>
            </div>
          </div>
        </div>

        {/* Interactive Breadcrumb Hierarchy Bar */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-800/50">
          <button
            type="button"
            onClick={handleResetToUniversity}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer font-bold ${
              currentLevel === 'UNIVERSITY'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>University Departments</span>
          </button>

          {drillPath.deptName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                type="button"
                onClick={() => onDrillPathChange({ deptName: drillPath.deptName })}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  currentLevel === 'DEPARTMENT'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[160px] truncate">{drillPath.deptName}</span>
              </button>
            </>
          )}

          {drillPath.progName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                type="button"
                onClick={() =>
                  onDrillPathChange({ deptName: drillPath.deptName, progName: drillPath.progName })
                }
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  currentLevel === 'PROGRAM'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-[160px] truncate">{drillPath.progName}</span>
              </button>
            </>
          )}

          {drillPath.semId && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                type="button"
                onClick={() =>
                  onDrillPathChange({
                    deptName: drillPath.deptName,
                    progName: drillPath.progName,
                    semId: drillPath.semId,
                  })
                }
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  currentLevel === 'SEMESTER'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Semester {drillPath.semId}</span>
              </button>
            </>
          )}

          {drillPath.sectionId && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <div className="flex items-center gap-1 px-2 py-1 rounded-md font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/50">
                <Users className="w-3.5 h-3.5" />
                <span>Section {drillPath.sectionId} (Courses)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6">
        {currentLevel === 'COURSES' && sectionCourseUnit ? (
          /* =========================================================================
             LEVEL 4: COURSE-LEVEL BREAKDOWN FOR SELECTED SECTION
             ========================================================================= */
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Course-Level Verification & Inspection
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    {sectionCourseUnit.progName} • Semester {sectionCourseUnit.semId} (Section {sectionCourseUnit.sectionId})
                  </h4>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border shadow-xs ${
                    (sectionCourseUnit.shift || 'Morning').toLowerCase().includes('evening')
                      ? 'bg-purple-950/90 text-purple-300 border-purple-700/80'
                      : 'bg-amber-950/90 text-amber-300 border-amber-700/80'
                  }`}>
                    {(sectionCourseUnit.shift || 'Morning')} Shift
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sectionCourseUnit.deptName} • Coordinator:{' '}
                  <span className="text-emerald-400 font-semibold">{sectionCourseUnit.coordinatorName}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black text-white font-mono">
                    {sectionCourseUnit.completionRate}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">Overall Section Status</span>
                </div>
                <div className="h-10 w-[1px] bg-slate-700" />
                <div className="text-right text-xs">
                  <span className="text-blue-400 font-bold block">{sectionCourseUnit.submitted} Submitted</span>
                  <span className="text-emerald-400 font-bold block">{sectionCourseUnit.pending} Pending</span>
                </div>
              </div>
            </div>

            {/* Courses Checklist */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex justify-between">
                <span>Curricular Subject / Course Title</span>
                <span>Verification Status</span>
              </div>

              {(sectionCourseUnit.courses || []).map((course, idx) => (
                <div
                  key={course.id || idx}
                  className={`p-3.5 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                    course.submitted
                      ? 'bg-blue-950/20 border-blue-900/40 hover:border-blue-700/60'
                      : 'bg-slate-900/70 border-slate-800 hover:border-emerald-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                        course.submitted
                          ? 'bg-blue-500/20 border border-blue-400/30 text-blue-400'
                          : 'bg-rose-500/20 border border-rose-400/30 text-rose-400'
                      }`}
                    >
                      {course.submitted ? '✓' : '✗'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {course.courseCode}
                        </span>
                        <h5 className="text-sm font-bold text-white">{course.subjectTitle}</h5>
                        <span className="text-[10px] text-slate-400">({course.creditHours})</span>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          (course.shift || sectionCourseUnit.shift || 'Morning').toLowerCase().includes('evening')
                            ? 'bg-purple-950/90 text-purple-300 border-purple-800'
                            : 'bg-amber-950/90 text-amber-300 border-amber-800'
                        }`}>
                          {(course.shift || sectionCourseUnit.shift || 'Morning')} Shift
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>Instructor/By: <strong className="text-slate-300">{course.uploadedBy || 'Awaiting entry'}</strong></span>
                        <span>•</span>
                        <span>{course.remarks}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {course.submitted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Submitted & Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Pending Upload</span>
                      </span>
                    )}
                    {course.dateUploaded && (
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {course.dateUploaded}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* =========================================================================
             LEVEL 0 - 3: HORIZONTAL STACKED RADAR BARS (MATCHING USER SCREENSHOT)
             ========================================================================= */
          <div className="space-y-4">
            {/* Guide caption indicating click to drill-down */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>
                  Click any bar to drill down:{' '}
                  <strong className="text-slate-200">
                    {currentLevel === 'UNIVERSITY'
                      ? 'Select Department →'
                      : currentLevel === 'DEPARTMENT'
                      ? 'Select Program →'
                      : currentLevel === 'PROGRAM'
                      ? 'Select Semester →'
                      : 'Select Section →'}
                  </strong>
                </span>
              </span>
              <span className="text-[11px] text-slate-500">
                Denominator derived from configured academic structure
              </span>
            </div>

            {/* List of Bars */}
            <div className="space-y-3.5">
              {units.map((unit) => {
                // Calculate percentage widths for Submitted (Blue) and Pending (Green)
                const submittedPct = maxAxisValue > 0 ? (unit.submitted / maxAxisValue) * 100 : 0;
                const pendingPct = maxAxisValue > 0 ? (unit.pending / maxAxisValue) * 100 : 0;
                const totalPct = Math.min(100, submittedPct + pendingPct);

                const isHovered = hoveredUnitId === unit.id;
                const isBottleneckTarget =
                  highlightedBottleneckSection &&
                  unit.name.toLowerCase().includes(highlightedBottleneckSection.toLowerCase());

                return (
                  <div
                    key={unit.id}
                    className={`group cursor-pointer p-2 rounded-xl transition-all ${
                      isBottleneckTarget
                        ? 'ring-2 ring-rose-500 bg-rose-950/20'
                        : isHovered
                        ? 'bg-slate-800/40'
                        : 'hover:bg-slate-800/20'
                    }`}
                    onMouseEnter={() => handleHoverUnit(unit)}
                    onClick={() => handleUnitClick(unit)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      {/* Academic Unit Label (Left Y-Axis) */}
                      <div className="w-full sm:w-56 shrink-0 flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors truncate">
                          {unit.name}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {/* Stacked Horizontal Bar (Submitted in Blue #4f79ec, Pending in Green #5cb874) */}
                      <div className="flex-1 relative">
                        {/* Background guide track */}
                        <div className="w-full h-8 sm:h-9 bg-slate-900/90 rounded-lg overflow-hidden flex items-center p-0.5 border border-slate-800/80 relative shadow-inner">
                          {/* Vertical subtle gridlines aligned with ticks */}
                          {axisTicks.slice(1, -1).map((tick) => (
                            <div
                              key={tick}
                              className="absolute top-0 bottom-0 w-[1px] bg-slate-800/60 pointer-events-none z-0"
                              style={{ left: `${(tick / maxAxisValue) * 100}%` }}
                            />
                          ))}

                          {/* Stacked Bar Container */}
                          <div
                            className="h-full flex rounded-md overflow-hidden relative z-10 transition-all duration-500"
                            style={{ width: `${totalPct}%` }}
                          >
                            {/* Blue Segment: Submitted */}
                            {unit.submitted > 0 && (
                              <div
                                className="h-full bg-[#4f79ec] hover:bg-[#5b85f5] transition-colors flex items-center justify-end px-2"
                                style={{
                                  width: `${(unit.submitted / (unit.submitted + unit.pending || 1)) * 100}%`,
                                }}
                                title={`${unit.submitted} Submitted`}
                              >
                                {submittedPct > 8 && (
                                  <span className="text-[11px] font-bold text-white font-mono drop-shadow">
                                    {unit.submitted}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Green Segment: Pending */}
                            {unit.pending > 0 && (
                              <div
                                className="h-full bg-[#5cb874] hover:bg-[#68c781] transition-colors flex items-center justify-end px-2"
                                style={{
                                  width: `${(unit.pending / (unit.submitted + unit.pending || 1)) * 100}%`,
                                }}
                                title={`${unit.pending} Pending`}
                              >
                                {pendingPct > 8 && (
                                  <span className="text-[11px] font-bold text-white font-mono drop-shadow">
                                    {unit.pending}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Summary Pill (Right End) */}
                      <div className="hidden md:flex items-center justify-end gap-2 w-36 shrink-0 text-right">
                        {unit.total > 0 ? (
                          <>
                            <span className="text-xs font-bold text-slate-200 font-mono">
                              {unit.completionRate}%
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({unit.submitted}/{unit.total})
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                            Awaiting Upload
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom X-Axis Ticks & Grid */}
            <div className="pt-2 pl-0 sm:pl-60 pr-0 md:pr-32">
              <div className="relative w-full flex justify-between text-[11px] font-mono font-bold text-slate-400 border-t border-slate-800 pt-1.5">
                {axisTicks.map((tick) => (
                  <span key={tick} className="relative -ml-2 first:ml-0 last:-mr-1">
                    {tick}
                  </span>
                ))}
              </div>
            </div>

            {/* Exact Legend matching the user screenshot */}
            <div className="pt-4 flex items-center justify-center gap-8 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#4f79ec] shadow-sm" />
                <span>Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#5cb874] shadow-sm" />
                <span>Pending</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
