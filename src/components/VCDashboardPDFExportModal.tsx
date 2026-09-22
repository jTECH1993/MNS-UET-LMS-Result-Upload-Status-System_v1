import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Download,
  Printer,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { UnifiedProgramRow } from './VCDashboard';
import { SubmissionRecord, AcademicShift } from '../types';
import { StorageService } from '../services/storageService';
import { MnsUetLogo } from './MnsUetLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filteredPrograms: UnifiedProgramRow[];
  allRecords: SubmissionRecord[];
  activeSessions: string[];
  currentSession: string;
  selectedSemesterFilter: string;
  selectedDeptFilter: string;
  selectedShiftFilter: string;
  selectedSectionFilter: string;
  statusFilter: 'ALL' | 'SUBMITTED' | 'PENDING';
  searchQuery: string;
  onlyGenuineSubmissions: boolean;
  stats: {
    totalDepartments: number;
    totalPrograms: number;
    totalCohortSlots: number;
    submittedSlots: number;
    pendingSlots: number;
    totalSubjectsAcrossUni: number;
    totalUploadedAcrossUni: number;
    totalPendingAcrossUni: number;
    uniUploadPercentage: number;
    totalGenuineSubmissionsCount: number;
  };
}

export const VCDashboardPDFExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  filteredPrograms,
  allRecords,
  activeSessions,
  currentSession,
  selectedSemesterFilter,
  selectedDeptFilter,
  selectedShiftFilter,
  selectedSectionFilter,
  statusFilter,
  searchQuery,
  onlyGenuineSubmissions,
  stats,
}) => {
  const [reportDetailLevel, setReportDetailLevel] = useState<'SUMMARY' | 'DETAILED'>('SUMMARY');
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('LANDSCAPE');
  const [customReportTitle, setCustomReportTitle] = useState<string>(
    'OFFICIAL LMS RESULT SUBMISSION & COMPLIANCE REPORT'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Metadata timestamps and reference IDs
  const generatedTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [isOpen]);

  const officialRefNumber = useMemo(() => {
    const sessTag = activeSessions.join('-');
    const semTag = selectedSemesterFilter === 'ALL' ? 'SEM-ALL' : `SEM-${selectedSemesterFilter}`;
    const randomHash = Math.floor(1000 + Math.random() * 9000);
    return `MNSUET/VC-REPORT/${sessTag}/${semTag}/${randomHash}`;
  }, [activeSessions, selectedSemesterFilter, isOpen]);

  // Aggregate stats specifically for the current filtered programs
  const filteredMetrics = useMemo(() => {
    let totalUploaded = 0;
    let totalSubjects = 0;
    let submittedCount = 0;

    const matchingRecordsList: SubmissionRecord[] = [];

    filteredPrograms.forEach((item) => {
      const effectiveShift: AcademicShift =
        selectedShiftFilter !== 'ALL'
          ? (selectedShiftFilter as AcademicShift)
          : item.recommendedShift;

      const shiftData = item.shifts[effectiveShift];
      const isSpecificSem = selectedSemesterFilter !== 'ALL';

      if (isSpecificSem) {
        const sub = shiftData.semesterRecords[selectedSemesterFilter];
        if (sub) {
          submittedCount++;
          matchingRecordsList.push(sub);
          const s = StorageService.calculateSummary(sub.subjects);
          totalUploaded += s.uploaded;
          totalSubjects += s.totalSubjects;
        } else {
          totalSubjects += 5; // Expected 5 subjects
        }
      } else {
        if (shiftData.hasSubmission) {
          submittedCount++;
          totalUploaded += shiftData.totalUploaded;
          totalSubjects += shiftData.totalSubjects;

          // Collect all submitted semester records for this program
          Object.values(shiftData.semesterRecords).forEach((rec) => {
            if (rec) matchingRecordsList.push(rec);
          });
        } else {
          totalSubjects += 40; // Expected 40 subjects across 8 sem
        }
      }
    });

    const totalPending = Math.max(0, totalSubjects - totalUploaded);
    const uploadPct = totalSubjects > 0 ? Math.round((totalUploaded / totalSubjects) * 100) : 0;

    return {
      filteredProgramsCount: filteredPrograms.length,
      submittedCount,
      pendingCount: filteredPrograms.length - submittedCount,
      totalUploaded,
      totalPending,
      totalSubjects,
      uploadPct,
      matchingRecordsList,
    };
  }, [filteredPrograms, selectedSemesterFilter, selectedShiftFilter]);

  if (!isOpen) return null;

  // Primary PDF Generation Handler using jsPDF and jspdf-autotable
  const handleDownloadPDF = () => {
    try {
      setIsGenerating(true);

      const doc = new jsPDF({
        orientation: orientation === 'LANDSCAPE' ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // Dark emerald palette
      const primaryColor: [number, number, number] = [6, 95, 70]; // #065f46
      const accentColor: [number, number, number] = [4, 120, 87]; // #047857
      const darkText: [number, number, number] = [15, 23, 42]; // #0f172a
      const lightBg: [number, number, number] = [248, 250, 252]; // #f8fafc

      // --- Header Section ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('MUHAMMAD NAWAZ SHARIF UNIVERSITY OF ENGINEERING & TECHNOLOGY, MULTAN', pageWidth / 2, 8, {
        align: 'center',
      });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'OFFICE OF THE VICE CHANCELLOR • DIRECTORATE OF ACADEMIC AFFAIRS & EXAMINATIONS',
        pageWidth / 2,
        13,
        { align: 'center' }
      );

      let currentY = 24;

      // Document Title & Metadata Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(customReportTitle, pageWidth / 2, currentY, { align: 'center' });

      currentY += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Official Reference: ${officialRefNumber} | Generated: ${generatedTimestamp}`, pageWidth / 2, currentY, {
        align: 'center',
      });

      currentY += 6;

      // Applied Filters Summary Box
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 16, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('APPLIED FILTERS & REPORT CONTEXT:', margin + 4, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);

      const col1 = `Dept: ${selectedDeptFilter === 'ALL' ? 'All Departments' : selectedDeptFilter}`;
      const col2 = `Sessions: ${activeSessions.join(', ')}`;
      const col3 = `Semester: ${selectedSemesterFilter === 'ALL' ? 'All 8 Semesters' : 'Semester ' + selectedSemesterFilter}`;
      const col4 = `Shift: ${selectedShiftFilter} | Section: ${selectedSectionFilter}`;
      const col5 = `Status: ${statusFilter} | Search: ${searchQuery || 'None'}`;

      doc.text(col1, margin + 4, currentY + 11);
      doc.text(col2, margin + 65, currentY + 11);
      doc.text(col3, margin + 120, currentY + 11);
      if (orientation === 'LANDSCAPE') {
        doc.text(col4, margin + 175, currentY + 11);
        doc.text(col5, margin + 225, currentY + 11);
      } else {
        doc.text(`${col4} | ${col5}`, margin + 4, currentY + 14);
      }

      currentY += 20;

      // KPI Summary Cards Bar
      const kpiCardWidth = (pageWidth - margin * 2 - 12) / 4;
      const kpiHeight = 14;

      const kpiData = [
        { label: 'FILTERED PROGRAMS', val: `${filteredMetrics.filteredProgramsCount}`, sub: 'Degree Programs' },
        { label: 'COURSES UPLOADED', val: `${filteredMetrics.totalUploaded}`, sub: `of ${filteredMetrics.totalSubjects} Total` },
        { label: 'COURSES PENDING', val: `${filteredMetrics.totalPending}`, sub: 'LMS Entry Awaited' },
        { label: 'COMPLIANCE RATE', val: `${filteredMetrics.uploadPct}%`, sub: 'LMS Verified' },
      ];

      kpiData.forEach((kpi, idx) => {
        const xPos = margin + idx * (kpiCardWidth + 4);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(xPos, currentY, kpiCardWidth, kpiHeight, 1.5, 1.5, 'FD');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, xPos + kpiCardWidth / 2, currentY + 4, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(kpi.val, xPos + kpiCardWidth / 2, currentY + 9, { align: 'center' });

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.sub, xPos + kpiCardWidth / 2, currentY + 12.5, { align: 'center' });
      });

      currentY += 18;

      // Section 1: Academic Program LMS Result Roster Table
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text('1. ACADEMIC PROGRAM LMS RESULT ROSTER', margin, currentY);

      currentY += 3;

      const tableHead = [
        [
          '#',
          'Department',
          'Degree Program',
          'Level',
          'Shift',
          'Semester',
          'Uploaded',
          'Total',
          'Completion',
          'Status',
          'HOD / Coordinator',
          'Last Activity',
        ],
      ];

      const tableBody = filteredPrograms.map((item, idx) => {
        const effectiveShift: AcademicShift =
          selectedShiftFilter !== 'ALL'
            ? (selectedShiftFilter as AcademicShift)
            : item.recommendedShift;

        const shiftData = item.shifts[effectiveShift];
        const isSpecificSem = selectedSemesterFilter !== 'ALL';

        const subRecord = isSpecificSem
          ? shiftData.semesterRecords[selectedSemesterFilter]
          : shiftData.firstSubmittedSemester
          ? shiftData.semesterRecords[shiftData.firstSubmittedSemester]
          : null;

        const summary = subRecord ? StorageService.calculateSummary(subRecord.subjects) : null;

        const uploadedCount = isSpecificSem
          ? summary?.uploaded || 0
          : shiftData.totalUploaded;

        const totalCount = isSpecificSem
          ? summary?.totalSubjects || 5
          : shiftData.totalSubjects || 40;

        const pct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;
        const isComplete = totalCount > 0 && uploadedCount === totalCount;

        const statusLabel = isComplete
          ? 'COMPLETE'
          : uploadedCount > 0
          ? 'PARTIAL'
          : 'PENDING';

        const hodName = subRecord?.hodCoordinator || 'Unassigned';
        const lastDate = subRecord?.submissionDate || subRecord?.updatedAt?.split('T')[0] || 'No Submission';

        return [
          (idx + 1).toString(),
          item.deptCode || item.department,
          item.program,
          item.degreeLevel,
          effectiveShift,
          isSpecificSem ? `Sem ${selectedSemesterFilter}` : 'All Sem',
          uploadedCount.toString(),
          totalCount.toString(),
          `${pct}%`,
          statusLabel,
          hodName,
          lastDate,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin, bottom: 20 },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { fontStyle: 'bold', cellWidth: 22 },
          2: { fontStyle: 'bold', cellWidth: 45 },
          3: { halign: 'center', cellWidth: 14 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'center', cellWidth: 15 },
          7: { halign: 'center', cellWidth: 14 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          9: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          10: { cellWidth: 35 },
          11: { halign: 'center', cellWidth: 22 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 9) {
            const val = data.cell.raw as string;
            if (val === 'COMPLETE') {
              data.cell.styles.textColor = [4, 120, 87]; // green
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'PARTIAL') {
              data.cell.styles.textColor = [28, 100, 242]; // blue
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [180, 83, 9]; // amber
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // Section 2: Detailed Course-Level Breakdown (If DETAILED mode is selected)
      if (reportDetailLevel === 'DETAILED' && filteredMetrics.matchingRecordsList.length > 0) {
        doc.addPage();
        let detailedY = 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('2. DETAILED COURSE-LEVEL SUBMISSION BREAKDOWN', margin, detailedY);

        detailedY += 5;

        filteredMetrics.matchingRecordsList.forEach((record, rIdx) => {
          if (!record || !record.subjects || record.subjects.length === 0) return;

          const recHeader = `${rIdx + 1}. ${record.department} - ${record.program} (${record.degreeLevel || 'BS'}) | ${record.shift} Shift | Sec ${record.section || 'A'} | Sem ${record.semester} (${record.session})`;
          
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(darkText[0], darkText[1], darkText[2]);

          const finalY = (doc as any).lastAutoTable?.finalY || detailedY;
          const nextY = finalY > pageHeight - 40 ? 20 : finalY + 8;

          if (nextY === 20) doc.addPage();

          doc.text(recHeader, margin, nextY);

          const courseHead = [
            ['#', 'Course Code', 'Subject / Course Title', 'Credit Hrs', 'Status', 'Instructor / Uploaded By', 'Remarks'],
          ];

          const courseBody = record.subjects.map((sub, sIdx) => [
            (sIdx + 1).toString(),
            sub.courseCode || 'N/A',
            sub.subjectTitle || 'Untitled Course',
            (sub.creditHours || 3).toString(),
            sub.status || 'Pending',
            sub.uploadedBy || record.hodCoordinator || 'Dept Coordinator',
            sub.remarks || '-',
          ]);

          autoTable(doc, {
            startY: nextY + 2,
            head: courseHead,
            body: courseBody,
            margin: { left: margin, right: margin, bottom: 20 },
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: {
              fillColor: [51, 65, 85],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
            },
            columnStyles: {
              0: { halign: 'center', cellWidth: 8 },
              1: { fontStyle: 'bold', cellWidth: 25 },
              2: { cellWidth: 80 },
              3: { halign: 'center', cellWidth: 18 },
              4: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
              5: { cellWidth: 50 },
              6: { cellWidth: 45 },
            },
          });
        });
      }

      // Final Signatures & Institutional Seal Section
      const finalPageY = (doc as any).lastAutoTable?.finalY || 100;
      let sigY = finalPageY + 15;

      if (sigY > pageHeight - 35) {
        doc.addPage();
        sigY = 35;
      }

      doc.setDrawColor(203, 213, 225);
      doc.line(margin, sigY, pageWidth - margin, sigY);

      sigY += 12;

      const sigColWidth = (pageWidth - margin * 2) / 3;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);

      // Sig 1
      doc.line(margin + 10, sigY, margin + sigColWidth - 10, sigY);
      doc.text('Dean, Faculty of Engineering', margin + sigColWidth / 2, sigY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('MNS-UET Multan', margin + sigColWidth / 2, sigY + 8, { align: 'center' });

      // Sig 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.line(margin + sigColWidth + 10, sigY, margin + sigColWidth * 2 - 10, sigY);
      doc.text('Controller of Examinations', margin + sigColWidth * 1.5, sigY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('MNS-UET Multan', margin + sigColWidth * 1.5, sigY + 8, { align: 'center' });

      // Sig 3
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.line(margin + sigColWidth * 2 + 10, sigY, pageWidth - margin - 10, sigY);
      doc.text('Prof. Dr. Vice Chancellor', margin + sigColWidth * 2.5, sigY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('MNS-UET Multan', margin + sigColWidth * 2.5, sigY + 8, { align: 'center' });

      // Running Page Footers
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);

        const footerText = `MNS-UET Multan Official LMS System • Ref: ${officialRefNumber} • Page ${i} of ${pageCount}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' });
      }

      // Save PDF Document
      const filename = `MNSUET_VC_LMS_Report_${activeSessions.join('_')}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      doc.save(filename);
      setIsGenerating(false);
    } catch (err) {
      console.error('Failed to generate PDF document:', err);
      alert('An error occurred while building the PDF report. Falling back to browser print option.');
      setIsGenerating(false);
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="modal-vc-pdf-export"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Toolbar Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide">
                  Export Filtered Submission PDF Report
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {filteredPrograms.length} Filtered Programs
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generate an official, structured PDF document representing your current filtered dashboard view.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-pdf-download"
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Building PDF...' : 'Download PDF Document'}</span>
            </button>

            <button
              id="btn-trigger-browser-print"
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              title="Open browser standard print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print View</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Configuration & Live Report Preview */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          {/* Export Options Control Panel */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Report PDF Formatting &amp; Customization</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Option 1: Report Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Report Document Title</label>
                <input
                  type="text"
                  value={customReportTitle}
                  onChange={(e) => setCustomReportTitle(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              {/* Option 2: Detail Depth */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Report Content Depth</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setReportDetailLevel('SUMMARY')}
                    className={`py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      reportDetailLevel === 'SUMMARY'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Summary Roster
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportDetailLevel('DETAILED')}
                    className={`py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      reportDetailLevel === 'DETAILED'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Course Audit
                  </button>
                </div>
              </div>

              {/* Option 3: Orientation */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Page Layout Orientation</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOrientation('LANDSCAPE')}
                    className={`py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      orientation === 'LANDSCAPE'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('PORTRAIT')}
                    className={`py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      orientation === 'PORTRAIT'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Portrait
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Applied Filters Summary Header */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Current Filter Context for PDF Export
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800">
                {officialRefNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Department</span>
                <span className="font-bold text-white truncate block">
                  {selectedDeptFilter === 'ALL' ? 'All Departments' : selectedDeptFilter}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Sessions</span>
                <span className="font-bold text-emerald-300 truncate block">
                  {activeSessions.join(', ')}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Semester</span>
                <span className="font-bold text-indigo-300 truncate block">
                  {selectedSemesterFilter === 'ALL' ? 'All 8 Semesters' : `Semester ${selectedSemesterFilter}`}
                </span>
              </div>

              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Shift &amp; Section</span>
                <span className="font-bold text-amber-300 truncate block">
                  {selectedShiftFilter} ({selectedSectionFilter})
                </span>
              </div>

              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Status Filter</span>
                <span className="font-bold text-sky-300 truncate block">{statusFilter}</span>
              </div>

              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Search Filter</span>
                <span className="font-bold text-rose-300 truncate block">{searchQuery || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Printable Report Document Live Preview Box */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md text-slate-900 space-y-6">
            {/* Header Letterhead Preview */}
            <div className="border-b-2 border-emerald-800 pb-4 text-center">
              <div className="flex items-center justify-between mb-2">
                <div className="w-14 h-14 shrink-0">
                  <MnsUetLogo className="w-full h-full" />
                </div>
                <div className="flex-1 px-3">
                  <h2 className="text-xs sm:text-sm md:text-base font-black tracking-tight uppercase text-slate-900">
                    Muhammad Nawaz Sharif University of Engineering &amp; Technology, Multan
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-600 font-bold uppercase tracking-wide mt-0.5">
                    Office of the Vice Chancellor • Directorate of Academic Affairs &amp; Examinations
                  </p>
                </div>
                <div className="w-14 text-right text-[9px]">
                  <span className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-800 rounded px-1.5 py-0.5 font-extrabold">
                    OFFICIAL
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mt-3 underline decoration-emerald-600 decoration-2 underline-offset-4">
                {customReportTitle}
              </h3>
            </div>

            {/* Filtered KPI Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Filtered Programs</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">
                  {filteredMetrics.filteredProgramsCount}
                </span>
                <span className="text-[10px] text-slate-500">Matching View</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Upload Compliance</span>
                <span className="text-xl font-black text-emerald-800 mt-0.5 block">
                  {filteredMetrics.uploadPct}%
                </span>
                <span className="text-[10px] text-emerald-700">LMS Verified</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-blue-800 block">Courses Uploaded</span>
                <span className="text-xl font-black text-blue-800 mt-0.5 block">
                  {filteredMetrics.totalUploaded}
                </span>
                <span className="text-[10px] text-blue-700">of {filteredMetrics.totalSubjects} Total</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Courses Pending</span>
                <span className="text-xl font-black text-amber-800 mt-0.5 block">
                  {filteredMetrics.totalPending}
                </span>
                <span className="text-[10px] text-amber-700">Action Required</span>
              </div>
            </div>

            {/* Table Roster Preview */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">Dept</th>
                    <th className="py-2 px-2.5">Program</th>
                    <th className="py-2 px-2.5 text-center">Level</th>
                    <th className="py-2 px-2.5 text-center">Shift</th>
                    <th className="py-2 px-2.5 text-center">Uploaded</th>
                    <th className="py-2 px-2.5 text-center">Compliance</th>
                    <th className="py-2 px-2.5">HOD / Coordinator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPrograms.slice(0, 8).map((item, idx) => {
                    const effectiveShift: AcademicShift =
                      selectedShiftFilter !== 'ALL'
                        ? (selectedShiftFilter as AcademicShift)
                        : item.recommendedShift;

                    const shiftData = item.shifts[effectiveShift];
                    const isSpecificSem = selectedSemesterFilter !== 'ALL';

                    const subRecord = isSpecificSem
                      ? shiftData.semesterRecords[selectedSemesterFilter]
                      : shiftData.firstSubmittedSemester
                      ? shiftData.semesterRecords[shiftData.firstSubmittedSemester]
                      : null;

                    const summary = subRecord ? StorageService.calculateSummary(subRecord.subjects) : null;

                    const uploaded = isSpecificSem
                      ? summary?.uploaded || 0
                      : shiftData.totalUploaded;

                    const total = isSpecificSem
                      ? summary?.totalSubjects || 5
                      : shiftData.totalSubjects || 40;

                    const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;

                    return (
                      <tr key={`prev-${item.department}-${item.program}`} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">{item.deptCode}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">{item.program}</td>
                        <td className="py-2 px-2.5 text-center text-slate-600 font-semibold">{item.degreeLevel}</td>
                        <td className="py-2 px-2.5 text-center text-slate-600">{effectiveShift}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-slate-900">
                          {uploaded}/{total}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              pct === 100
                                ? 'bg-emerald-100 text-emerald-900'
                                : pct > 0
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 font-medium truncate max-w-[140px]">
                          {subRecord?.hodCoordinator || 'Unassigned'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPrograms.length > 8 && (
                <div className="p-2 bg-slate-50 text-center text-[11px] font-bold text-slate-500 border-t border-slate-200">
                  + {filteredPrograms.length - 8} additional filtered programs will be formatted in the full exported PDF document
                </div>
              )}
            </div>

            {/* Official Signatures Block Preview */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="w-28 h-8 border-b border-slate-400 mx-auto mb-1" />
                <strong className="block text-slate-900 text-[11px]">Dean, Faculty of Engineering</strong>
                <span className="text-slate-500 text-[10px]">MNS-UET Multan</span>
              </div>
              <div>
                <div className="w-28 h-8 border-b border-slate-400 mx-auto mb-1" />
                <strong className="block text-slate-900 text-[11px]">Controller of Examinations</strong>
                <span className="text-slate-500 text-[10px]">MNS-UET Multan</span>
              </div>
              <div>
                <div className="w-28 h-8 border-b border-slate-400 mx-auto mb-1" />
                <strong className="block text-slate-900 text-[11px]">Prof. Dr. Vice Chancellor</strong>
                <span className="text-slate-500 text-[10px]">MNS-UET Multan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
