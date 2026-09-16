import React, { useState, useMemo, useEffect } from 'react';
import { SubjectRow, LMSStatus, AcademicShift } from '../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ListPlus,
  RotateCcw,
  Database,
  Layers,
  Filter,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportCourses: (
    courses: Partial<SubjectRow>[],
    mode: 'replace' | 'append',
    targetSection?: string
  ) => void;
  onImportDirectToSections?: (
    sectionData: Record<string, Partial<SubjectRow>[]>,
    mode: 'replace' | 'append'
  ) => void;
  currentCount: number;
  currentShift: AcademicShift;
  currentSemester: string;
  currentSection?: string;
  departmentName: string;
  programName: string;
  availableSections?: string[];
}

export interface ParsedCourse {
  courseCode: string;
  subjectTitle: string;
  section: string;
  shift: string;
  creditHours: string;
  uploadedBy: string;
  status: LMSStatus;
  remarks: string;
}

// Sample LMS string matching the exact institutional LMS portal export from user screenshot
const SAMPLE_LMS_TEMPLATE = `CS-111-Programming Fundamentals - A - Morning - Both - Asim Ali
CS-111L-L-Programming Fundamentals - A - Morning - Both - Asim Ali
CS-111-Programming Fundamentals - B - Morning - Both - Asim Ali
CS-111L-L-Programming Fundamentals - B - Morning - Both - Asim Ali
MTH-114-Calculus and Analytic Geometry - A - Morning - Both - Asim Ali
MTH-114-Calculus and Analytic Geometry - B - Morning - Both - Asim Ali
ENG-115-English Composition and Comprehension - A - Morning - Both - Asim Ali
ENG-115-English Composition and Comprehension - B - Morning - Both - Asim Ali
GE-116-Teaching of Holy Quran with Translation-I - A - Morning - Both - Asim Ali
GE-116-Teaching of Holy Quran with Translation-I - B - Morning - Both - Asim Ali
GE-113-Web Engineering - A - Morning - Both - Asim Ali
GE-113L-L-Web Engineering - A - Morning - Both - Asim Ali
GE-113-Web Engineering - B - Morning - Both - Asim Ali
GE-113L-L-Web Engineering - B - Morning - Both - Asim Ali
GE-112-Introduction to ICT - A - Morning - Both - Asim Ali
GE-112L-L-Introduction to ICT - A - Morning - Both - Asim Ali
GE-112-Introduction to ICT - B - Morning - Both - Asim Ali
GE-112L-L-Introduction to ICT - B - Morning - Both - Asim Ali`;

const SAMPLE_CS_TEMPLATE = `CS-101	Programming Fundamentals	A	4	Dr. Tariq Mahmood	Uploaded	LMS marks uploaded
CS-102	Discrete Structures	A	3	Engr. Usama Javed	Uploaded	Final result submitted
CS-103	Digital Logic & Design	A	4	Dr. M. Haris	In Progress	Practical viva pending
MT-101	Calculus & Analytical Geometry	A	3	Prof. Dr. Zahid	Uploaded	Verified
EN-101	Functional English	A	3	Ms. Ayesha Siddiqa	Uploaded	Completed
HU-101	Islamic & Pak Studies	A	2	Mr. Abdul Rehman	Pending	Awaiting instructor tabulation`;

const SAMPLE_ENG_TEMPLATE = `ME-111	Engineering Mechanics	A	4	Dr. Farooq Ahmad	Uploaded	Complete
ME-112	Computer Aided Design (CAD)	A	3	Engr. Bilal Khan	In Progress	Lab evaluation
EE-101	Basic Electrical Engineering	A	4	Dr. S. Raza	Uploaded	Uploaded to LMS
MA-101	Applied Mathematics-I	A	3	Dr. Naveed Akhtar	Uploaded	Verified
CH-101	Applied Chemistry	A	3	Ms. Sadia Bibi	Pending	Awaiting external examiner
HS-101	Communication Skills	A	2	Mr. M. Zafar	Uploaded	Final grade submitted`;

export const BulkCourseImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportCourses,
  onImportDirectToSections,
  currentCount,
  currentShift,
  currentSemester,
  currentSection = 'A',
  departmentName,
  programName,
  availableSections = ['A', 'B'],
}) => {
  const [rawInput, setRawInput] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [parseError, setParseError] = useState<string | null>(null);
  const [targetSection, setTargetSection] = useState<string>(currentSection);
  const [previewFilterSection, setPreviewFilterSection] = useState<string>('ALL');

  // Sync targetSection when modal opens or currentSection prop changes
  useEffect(() => {
    if (isOpen) {
      setTargetSection(currentSection);
      setPreviewFilterSection('ALL');
    }
  }, [isOpen, currentSection]);

  // Parse raw text into structured course objects
  const parsedCourses = useMemo<ParsedCourse[]>(() => {
    setParseError(null);
    if (!rawInput.trim()) return [];

    const lines = rawInput.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const results: ParsedCourse[] = [];

    // Check if line 0 is a header with specific columns
    let headerHasSection = false;
    let sectionColIdx = -1;

    if (lines.length > 0) {
      const firstLineLower = lines[0].toLowerCase();
      if (
        firstLineLower.includes('course code') ||
        firstLineLower.includes('subject title') ||
        firstLineLower.includes('credit hour')
      ) {
        const headerCols = lines[0].includes('\t')
          ? lines[0].split('\t')
          : lines[0].split(',');
        sectionColIdx = headerCols.findIndex((c) =>
          c.trim().toLowerCase().includes('section')
        );
        headerHasSection = sectionColIdx !== -1;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header line if detected
      if (
        i === 0 &&
        (line.toLowerCase().includes('course code') ||
          line.toLowerCase().includes('subject title') ||
          line.toLowerCase().includes('credit hour'))
      ) {
        continue;
      }

      // Check if line matches institutional LMS Portal Format:
      // e.g. "CS-111-Programming Fundamentals - A - Morning - Both - Asim Ali"
      // or   "CS-111L-L-Programming Fundamentals - A - Morning - Both - Asim Ali"
      if (line.includes(' - ')) {
        const dashParts = line.split(/\s+-\s+/).map((p) => p.trim());
        if (dashParts.length >= 3) {
          // dashParts[0] is e.g. "CS-111-Programming Fundamentals" or "CS-111L-L-Programming Fundamentals"
          const codeAndTitlePart = dashParts[0];
          let courseCode = '';
          let subjectTitle = '';

          // Match course code pattern: e.g. CS-111, CS-111L, MTH-114, GE-113, ENG-115, etc.
          const codeMatch = codeAndTitlePart.match(/^([A-Za-z]{2,6}-\d{2,4}[A-Za-z]?)-(.*)$/);
          if (codeMatch) {
            courseCode = codeMatch[1].trim();
            subjectTitle = codeMatch[2].trim();
            // Clean up redundant "L-" prefix from subject title if present (e.g. "L-Programming Fundamentals")
            if (subjectTitle.startsWith('L-') || subjectTitle.startsWith('l-')) {
              subjectTitle = subjectTitle.substring(2).trim() + ' (Lab)';
            }
          } else {
            // Fallback split on first dash
            const firstDash = codeAndTitlePart.indexOf('-');
            if (firstDash !== -1) {
              courseCode = codeAndTitlePart.substring(0, firstDash).trim();
              subjectTitle = codeAndTitlePart.substring(firstDash + 1).trim();
            } else {
              courseCode = codeAndTitlePart;
              subjectTitle = codeAndTitlePart;
            }
          }

          // Section detection from dashParts[1]: e.g. "A" or "B" or "Section A"
          let extractedSection = targetSection;
          const secCandidate = dashParts[1].replace(/^(sec|section)\s*/i, '').trim().toUpperCase();
          if (/^[A-Z0-9]{1,3}$/.test(secCandidate)) {
            extractedSection = secCandidate;
          }

          // Shift detection from dashParts[2]: e.g. "Morning" or "Evening"
          const extractedShift = dashParts[2] || currentShift;

          // Teacher / Instructor from dashParts[4] or dashParts[3]
          let teacher = '';
          if (dashParts.length >= 5) {
            teacher = dashParts[4];
          } else if (dashParts.length === 4) {
            teacher = dashParts[3];
          }

          // Determine credit hours: labs default to 1, theory default to 3 or 4
          let creditHours = '3';
          if (courseCode.toUpperCase().endsWith('L') || subjectTitle.toLowerCase().includes('lab')) {
            creditHours = '1';
          } else if (
            courseCode.includes('111') ||
            courseCode.includes('114') ||
            courseCode.includes('101')
          ) {
            creditHours = '3';
          }

          results.push({
            courseCode,
            subjectTitle,
            section: extractedSection,
            shift: extractedShift,
            creditHours,
            uploadedBy: teacher,
            status: 'Uploaded',
            remarks: 'LMS Portal Import',
          });
          continue;
        }
      }

      // Detect delimiter: tab, comma, semicolon, or pipe
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes('|')) {
        cols = line.split('|');
      } else if (line.includes(';')) {
        cols = line.split(';');
      } else if (line.includes(',')) {
        // Parse CSV while respecting quotes
        cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, ''));
      } else {
        // Fallback: multiple spaces
        cols = line.split(/\s{2,}/);
      }

      cols = cols.map((c) => c.trim());
      if (cols.length === 0 || !cols[0]) continue;

      const courseCode = cols[0] || `CRS-${i + 1}`;
      const subjectTitle = cols[1] || `Subject ${i + 1}`;

      // Section handling in tabular formats:
      // If header had a section column, use that.
      // Otherwise check if cols[2] or cols[5] or cols[6] looks like a single letter section ('A', 'B', etc.)
      let extractedSection = targetSection;
      let creditHours = '3';
      let uploadedBy = '';
      let statusCandidate = '';
      let remarks = '';

      if (headerHasSection && sectionColIdx !== -1 && cols[sectionColIdx]) {
        const clean = cols[sectionColIdx].replace(/^(sec|section)\s*/i, '').trim().toUpperCase();
        if (clean) extractedSection = clean;
      }

      // Check if cols[2] is a Section (e.g. 'A' or 'B') or Credit Hours
      if (cols.length >= 3) {
        const col2 = cols[2].trim().toUpperCase();
        if (/^[A-Z]$/.test(col2)) {
          extractedSection = col2;
          creditHours = cols[3] || '3';
          uploadedBy = cols[4] || '';
          statusCandidate = cols[5] || '';
          remarks = cols[6] || '';
        } else {
          creditHours = cols[2] || '3';
          uploadedBy = cols[3] || '';
          statusCandidate = cols[4] || '';
          remarks = cols[5] || '';
          // Check if cols[6] or cols[5] has section
          if (cols[6] && /^[A-Z]$/i.test(cols[6].trim())) {
            extractedSection = cols[6].trim().toUpperCase();
          }
        }
      }

      // Normalize status
      let status: LMSStatus = 'Uploaded';
      const statusLower = statusCandidate.toLowerCase();
      if (statusLower.includes('pending')) {
        status = 'Pending';
      } else if (statusLower.includes('progress')) {
        status = 'In Progress';
      } else if (statusLower.includes('applicable') || statusLower === 'n/a') {
        status = 'Not Applicable';
      } else if (
        statusLower.includes('upload') ||
        statusLower === 'complete' ||
        statusLower === 'yes'
      ) {
        status = 'Uploaded';
      }

      results.push({
        courseCode,
        subjectTitle,
        section: extractedSection,
        shift: currentShift,
        creditHours,
        uploadedBy,
        status,
        remarks: remarks || (status === 'Uploaded' ? 'Imported via Batch Roster' : ''),
      });
    }

    return results;
  }, [rawInput, targetSection, currentShift]);

  // Distinct sections detected in parsed data
  const distinctSectionsFound = useMemo(() => {
    const set = new Set<string>();
    parsedCourses.forEach((c) => {
      if (c.section) set.add(c.section);
    });
    return Array.from(set).sort();
  }, [parsedCourses]);

  // Filtered courses for preview based on active preview tab
  const displayedPreviewCourses = useMemo(() => {
    if (previewFilterSection === 'ALL') return parsedCourses;
    return parsedCourses.filter((c) => c.section === previewFilterSection);
  }, [parsedCourses, previewFilterSection]);

  if (!isOpen) return null;

  // Option 1: Apply to active sheet (filters by targetSection if multiple sections parsed)
  const handleApplyImport = () => {
    if (parsedCourses.length === 0) {
      setParseError('Please paste or type at least one valid course row to import.');
      return;
    }

    // If multiple sections exist in parsed data, only import courses matching targetSection
    const coursesToApply =
      distinctSectionsFound.length > 1
        ? parsedCourses.filter((c) => c.section === targetSection)
        : parsedCourses;

    if (coursesToApply.length === 0) {
      setParseError(
        `No courses found for Section ${targetSection}. Please select another section or switch tab.`
      );
      return;
    }

    const payload: Partial<SubjectRow>[] = coursesToApply.map((c) => ({
      courseCode: c.courseCode,
      subjectTitle: c.subjectTitle,
      creditHours: c.creditHours,
      uploadedBy: c.uploadedBy,
      status: c.status,
      remarks: c.remarks,
      sectionShift: `${currentShift} - Sem ${currentSemester} (Sec ${c.section || targetSection})`,
      dateUploaded: c.status === 'Uploaded' ? new Date().toISOString().split('T')[0] : '',
    }));

    onImportCourses(payload, importMode, targetSection);
    onClose();
  };

  // Option 2: Direct multi-section database sync (saves Section A & Section B simultaneously)
  const handleDirectMultiSectionSave = () => {
    if (!onImportDirectToSections) {
      handleApplyImport();
      return;
    }

    const sectionData: Record<string, Partial<SubjectRow>[]> = {};

    parsedCourses.forEach((c) => {
      const sec = (c.section || targetSection).toUpperCase();
      if (!sectionData[sec]) {
        sectionData[sec] = [];
      }
      sectionData[sec].push({
        courseCode: c.courseCode,
        subjectTitle: c.subjectTitle,
        creditHours: c.creditHours,
        uploadedBy: c.uploadedBy,
        status: c.status,
        remarks: c.remarks,
        sectionShift: `${currentShift} - Sem ${currentSemester} (Sec ${sec})`,
        dateUploaded: c.status === 'Uploaded' ? new Date().toISOString().split('T')[0] : '',
      });
    });

    onImportDirectToSections(sectionData, importMode);
    onClose();
  };

  return (
    <div
      id="modal-bulk-import-courses"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header with Section Badge */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-indigo-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-600/60">
                  LMS &amp; Excel Bulk Tool
                </span>
                <span className="text-xs text-emerald-300 font-medium">
                  Semester {currentSemester} • {currentShift} Shift
                </span>
                <span className="text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Active Sheet: Section {currentSection}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-1">
                Paste Courses with Section &amp; Synchronize LMS Portal
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Target Section Selector */}
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-indigo-950 block text-xs uppercase tracking-wider">
                Target Section for Bulk Entry:
              </span>
              <span className="text-[11px] text-indigo-800">
                Pasted courses without explicit section tag will be routed to this section.
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {availableSections.map((sec) => {
                const isSelected = targetSection === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTargetSection(sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-900 text-white border-indigo-950 shadow-2xs ring-2 ring-indigo-500/30'
                        : 'bg-white text-indigo-900 border-indigo-300 hover:bg-indigo-100'
                    }`}
                  >
                    Section {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Fast Sample Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div>
              <p className="font-bold text-slate-900 text-xs">One-Click Sample Templates</p>
              <p className="text-slate-500 text-[11px]">
                Click below to auto-fill sample courses from LMS portal or Excel tables:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRawInput(SAMPLE_LMS_TEMPLATE);
                  setPreviewFilterSection('ALL');
                }}
                className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Loads the 18 courses export from LMS portal with Section A and Section B"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Sample LMS (Sec A &amp; B)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRawInput(SAMPLE_CS_TEMPLATE);
                  setPreviewFilterSection('ALL');
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Load sample CS semester courses"
              >
                <span>Sample CS (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRawInput(SAMPLE_ENG_TEMPLATE);
                  setPreviewFilterSection('ALL');
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Load sample Engineering semester courses"
              >
                <span>Sample Engg (Excel)</span>
              </button>
            </div>
          </div>

          {/* Paste Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="textarea-raw-courses"
                className="font-bold text-slate-800 uppercase tracking-wider text-[11px]"
              >
                Paste Course Data from LMS or Spreadsheet
              </label>
              {rawInput && (
                <button
                  type="button"
                  onClick={() => setRawInput('')}
                  className="text-slate-500 hover:text-rose-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Text</span>
                </button>
              )}
            </div>
            <textarea
              id="textarea-raw-courses"
              rows={6}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={`Supported formats:\n1. LMS Portal String:\nCS-111-Programming Fundamentals - A - Morning - Both - Asim Ali\nCS-111-Programming Fundamentals - B - Morning - Both - Asim Ali\n\n2. Tabular / Excel:\nCS-101\tProgramming Fundamentals\tA\t4\tDr. Tariq\tUploaded`}
              className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-hidden transition-all text-slate-900 leading-relaxed"
            />
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Live Preview of Parsed Courses with Section Column */}
          {parsedCourses.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-xs">
                    Parsed Preview: {parsedCourses.length} Course(s) Detected
                  </span>
                  {distinctSectionsFound.length > 1 && (
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded border border-indigo-300">
                      Sections: {distinctSectionsFound.join(', ')}
                    </span>
                  )}
                </div>

                {/* Section filter tabs if multiple sections exist */}
                {distinctSectionsFound.length > 1 && (
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewFilterSection('ALL')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        previewFilterSection === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({parsedCourses.length})
                    </button>
                    {distinctSectionsFound.map((sec) => {
                      const count = parsedCourses.filter((c) => c.section === sec).length;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setPreviewFilterSection(sec)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            previewFilterSection === sec
                              ? 'bg-indigo-700 text-white'
                              : 'text-indigo-900 hover:bg-indigo-50'
                          }`}
                        >
                          Sec {sec} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Table Preview showing Section */}
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3 w-28">Code</th>
                      <th className="py-2 px-3">Subject Title</th>
                      <th className="py-2 px-2 text-center w-20">Section</th>
                      <th className="py-2 px-2 text-center w-16">Cr. Hrs</th>
                      <th className="py-2 px-3 min-w-[140px]">Instructor</th>
                      <th className="py-2 px-3 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedPreviewCourses.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-3 text-slate-400 font-mono text-center">{i + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-800">
                          {c.courseCode}
                        </td>
                        <td className="py-1.5 px-3 text-slate-800 font-medium">
                          {c.subjectTitle}
                        </td>
                        {/* Section badge */}
                        <td className="py-1.5 px-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            Sec {c.section}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-600 font-mono">
                          {c.creditHours}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">{c.uploadedBy || '—'}</td>
                        <td className="py-1.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'Uploaded'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-800'
                                : c.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Mode Options */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Import Target Mode</span>
              <span className="text-[11px] text-slate-500">
                Choose how parsed courses interact with your existing {currentCount} course row(s).
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-700">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Replace Existing Rows</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-700">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Append to Existing Rows</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer with Single & Multi-Section Sync Options */}
        <div className="bg-slate-100 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* If multiple sections detected, show direct database auto-distribution button */}
            {distinctSectionsFound.length > 1 && onImportDirectToSections && (
              <button
                type="button"
                onClick={handleDirectMultiSectionSave}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                title={`Automatically save ${distinctSectionsFound.map((s) => `Sec ${s} (${parsedCourses.filter((c) => c.section === s).length})`).join(' and ')} to database`}
              >
                <Database className="w-4 h-4" />
                <span>
                  🚀 Save Both Sections to Database ({distinctSectionsFound.map((s) => `Sec ${s}`).join(' &amp; ')})
                </span>
              </button>
            )}

            {/* Standard Apply to current target section */}
            <button
              type="button"
              onClick={handleApplyImport}
              disabled={parsedCourses.length === 0}
              className={`px-5 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-all ${
                parsedCourses.length > 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>
                Apply to Section {targetSection} (
                {distinctSectionsFound.length > 1
                  ? parsedCourses.filter((c) => c.section === targetSection).length
                  : parsedCourses.length}{' '}
                Courses)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
