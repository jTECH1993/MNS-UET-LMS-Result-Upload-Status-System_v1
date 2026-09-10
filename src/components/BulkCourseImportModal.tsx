import React, { useState, useMemo } from 'react';
import { SubjectRow, LMSStatus, AcademicShift } from '../types';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Sparkles,
  ArrowRight,
  ListPlus,
  RotateCcw,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportCourses: (courses: Partial<SubjectRow>[], mode: 'replace' | 'append') => void;
  currentCount: number;
  currentShift: AcademicShift;
  currentSemester: string;
  departmentName: string;
  programName: string;
}

interface ParsedCourse {
  courseCode: string;
  subjectTitle: string;
  creditHours: string;
  uploadedBy: string;
  status: LMSStatus;
  remarks: string;
}

const SAMPLE_CS_TEMPLATE = `CS-101	Programming Fundamentals	4	Dr. Tariq Mahmood	Uploaded	LMS marks uploaded
CS-102	Discrete Structures	3	Engr. Usama Javed	Uploaded	Final result submitted
CS-103	Digital Logic & Design	4	Dr. M. Haris	In Progress	Practical viva pending
MT-101	Calculus & Analytical Geometry	3	Prof. Dr. Zahid	Uploaded	Verified
EN-101	Functional English	3	Ms. Ayesha Siddiqa	Uploaded	Completed
HU-101	Islamic & Pak Studies	2	Mr. Abdul Rehman	Pending	Awaiting instructor tabulation`;

const SAMPLE_ENG_TEMPLATE = `ME-111	Engineering Mechanics	4	Dr. Farooq Ahmad	Uploaded	Complete
ME-112	Computer Aided Design (CAD)	3	Engr. Bilal Khan	In Progress	Lab evaluation
EE-101	Basic Electrical Engineering	4	Dr. S. Raza	Uploaded	Uploaded to LMS
MA-101	Applied Mathematics-I	3	Dr. Naveed Akhtar	Uploaded	Verified
CH-101	Applied Chemistry	3	Ms. Sadia Bibi	Pending	Awaiting external examiner
HS-101	Communication Skills	2	Mr. M. Zafar	Uploaded	Final grade submitted`;

export const BulkCourseImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportCourses,
  currentCount,
  currentShift,
  currentSemester,
  departmentName,
  programName,
}) => {
  const [rawInput, setRawInput] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [parseError, setParseError] = useState<string | null>(null);

  // Parse raw text into structured course objects
  const parsedCourses = useMemo<ParsedCourse[]>(() => {
    setParseError(null);
    if (!rawInput.trim()) return [];

    const lines = rawInput.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const results: ParsedCourse[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip header line if detected
      if (
        i === 0 &&
        (line.toLowerCase().includes('course code') ||
          line.toLowerCase().includes('subject title') ||
          line.toLowerCase().includes('credit hour'))
      ) {
        continue;
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
      const creditHours = cols[2] || '3';
      const uploadedBy = cols[3] || '';

      // Normalize status
      let status: LMSStatus = 'Uploaded';
      const statusCandidate = (cols[4] || '').toLowerCase();
      if (statusCandidate.includes('pending')) {
        status = 'Pending';
      } else if (statusCandidate.includes('progress')) {
        status = 'In Progress';
      } else if (statusCandidate.includes('applicable') || statusCandidate === 'n/a') {
        status = 'Not Applicable';
      } else if (statusCandidate.includes('upload') || statusCandidate === 'complete' || statusCandidate === 'yes') {
        status = 'Uploaded';
      }

      const remarks = cols[5] || (status === 'Uploaded' ? 'Imported via Batch Roster' : '');

      results.push({
        courseCode,
        subjectTitle,
        creditHours,
        uploadedBy,
        status,
        remarks,
      });
    }

    return results;
  }, [rawInput]);

  if (!isOpen) return null;

  const handleApplyImport = () => {
    if (parsedCourses.length === 0) {
      setParseError('Please paste or type at least one valid course row to import.');
      return;
    }

    const payload: Partial<SubjectRow>[] = parsedCourses.map((c) => ({
      courseCode: c.courseCode,
      subjectTitle: c.subjectTitle,
      creditHours: c.creditHours,
      uploadedBy: c.uploadedBy,
      status: c.status,
      remarks: c.remarks,
      sectionShift: currentShift,
      dateUploaded: c.status === 'Uploaded' ? new Date().toISOString().split('T')[0] : '',
    }));

    onImportCourses(payload, importMode);
    onClose();
  };

  return (
    <div
      id="modal-bulk-import-courses"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-600/60">
                  Enterprise Bulk Tool
                </span>
                <span className="text-xs text-emerald-300 font-medium">
                  Semester {currentSemester} • {currentShift} Shift
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Paste / Bulk Import Courses from Excel or LMS
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Instructions & Template Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
            <div>
              <p className="font-bold text-emerald-950 text-sm">Fast Tabular Paste Supported</p>
              <p className="text-emerald-800 text-xs mt-0.5">
                Copy columns from Excel/Google Sheets (Code, Title, Credit Hours, Teacher, Status) and paste below.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRawInput(SAMPLE_CS_TEMPLATE)}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Load sample CS semester courses"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sample CS Syllabus</span>
              </button>
              <button
                type="button"
                onClick={() => setRawInput(SAMPLE_ENG_TEMPLATE)}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Load sample Engineering semester courses"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sample Engg Syllabus</span>
              </button>
            </div>
          </div>

          {/* Paste Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="textarea-raw-courses" className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Paste Tabular Data / CSV Text
              </label>
              {rawInput && (
                <button
                  type="button"
                  onClick={() => setRawInput('')}
                  className="text-slate-500 hover:text-rose-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Input</span>
                </button>
              )}
            </div>
            <textarea
              id="textarea-raw-courses"
              rows={6}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="e.g.&#10;CS-101	Programming Fundamentals	4	Dr. Tariq	Uploaded&#10;CS-102	Discrete Structures	3	Engr. Usama	Uploaded&#10;CS-103	Digital Logic Design	4	Dr. Haris	In Progress"
              className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden transition-all text-slate-900"
            />
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Live Preview of Parsed Courses */}
          {parsedCourses.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Parsed Preview: {parsedCourses.length} Valid Course(s) Detected
                </span>
                <span className="text-[11px] text-slate-500">Review before confirming</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3">Subject Title</th>
                      <th className="py-2 px-3 text-center">Cr. Hrs</th>
                      <th className="py-2 px-3">Instructor</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedCourses.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{c.courseCode}</td>
                        <td className="py-1.5 px-3 text-slate-700">{c.subjectTitle}</td>
                        <td className="py-1.5 px-3 text-center text-slate-600">{c.creditHours}</td>
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
                <span>Replace All Rows</span>
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

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
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
            <span>Apply {parsedCourses.length} Course(s) to Sheet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
