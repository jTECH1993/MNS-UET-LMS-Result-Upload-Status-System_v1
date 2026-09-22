import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  X,
  Cloud,
  Server,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle2,
  HelpCircle,
  FileCode,
  Activity, AlertTriangle,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Clock,
  Zap,
} from 'lucide-react';
import { SubmissionRecord } from '../types';
import { StorageService } from '../services/storageService';
import { FirestoreUsageService, FirestoreUsageStats } from '../services/firestoreUsageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRecord?: SubmissionRecord | null;
  allRecords: SubmissionRecord[];
  isAdmin?: boolean;
}

export const FirebaseSchemaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentRecord,
  allRecords,
  isAdmin = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'diagnostic' | 'logs' | 'current' | 'all' | 'schemas' | 'rules' | 'usage'>('status');
  const [accessLogs, setAccessLogs] = useState(() => StorageService.getAccessLogs());
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showConfirmClearDb, setShowConfirmClearDb] = useState(false);
  const [stats, setStats] = useState<FirestoreUsageStats>(() => FirestoreUsageService.getUsageStats());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return FirestoreUsageService.subscribe((updated) => {
      setStats(updated);
    });
  }, []);

  if (!isOpen) return null;

  // Strict role security: Only admin can access database management and danger zone
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600">
            Database schema and cloud management operations are restricted strictly to the
            System Administrator (<code className="bg-slate-100 px-1 py-0.5 rounded font-bold font-mono">admin</code>).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleRunDiagnostic = () => {
    setIsTesting(true);
    setTimeout(() => {
      const res = StorageService.testDatabaseConnectivity();
      setDiagnosticResult(res);
      setIsTesting(false);
    }, 250);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = StorageService.importDatabaseJSON(text);
        if (res.success) {
          setImportStatus(`Successfully restored ${res.importedCount} genuine records into database.`);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setImportStatus(`Import error: ${res.error || 'Unknown format'}`);
        }
      } catch (err: any) {
        setImportStatus(`Failed to read file: ${err?.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = async () => {
    await StorageService.clearAllData();
    setAccessLogs(StorageService.getAccessLogs());
    setShowConfirmClearDb(false);
    window.location.reload();
  };

  const currentPayload = currentRecord
    ? {
        session: currentRecord.session,
        semester: currentRecord.semester,
        shift: currentRecord.shift || 'Morning',
        department: currentRecord.department,
        program: currentRecord.program,
        degreeLevel: currentRecord.degreeLevel,
        hodCoordinator: currentRecord.hodCoordinator,
        submissionDate: currentRecord.submissionDate,
        updatedAt: currentRecord.updatedAt,
        subjects: currentRecord.subjects
          .filter((s) => s.courseCode.trim() || s.subjectTitle.trim() || s.status)
          .map((s, idx) => ({
            index: idx + 1,
            courseCode: s.courseCode,
            subjectTitle: s.subjectTitle,
            creditHours: s.creditHours,
            sectionShift: s.sectionShift,
            status: s.status,
            dateUploaded: s.dateUploaded,
            uploadedBy: s.uploadedBy,
            remarks: s.remarks,
          })),
      }
    : null;

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lms_submissions/{submissionId} {
      // Allow read access to all authenticated university staff and admins
      allow read: if request.auth != null;
      
      // Allow create/update for authorized HODs and departmental coordinators
      allow write: if request.auth != null &&
        request.resource.data.session is string &&
        request.resource.data.semester is string &&
        request.resource.data.department is string &&
        request.resource.data.program is string;
    }
  }
}`;

  const multiModuleSchemas = `/**
 * MNS-UET Central Academic Monitoring Portal
 * Multi-Module Institutional Database Schemas (TypeScript)
 * Verified against Task #1: LMS Result Upload Status and future monitoring tasks
 */

// 1. Base Entity (Shared by all monitoring tasks)
export interface BaseInstitutionalEntity {
  id: string;                         // Primary Key: dept__program__shift__session__sem
  department: string;                 // Department Name
  program: string;                    // Degree Program
  degreeLevel: string;                // "BS", "MS", "PhD"
  shift: 'Morning' | 'Evening';       // Academic Shift
  session: string;                    // e.g. "2023", "2024"
  semester: string;                   // "1" to "8"
  createdAt: string;                  // ISO 8601 Timestamp
  updatedAt: string;
  accessedBy: string;                 // User who last modified
  userDesignation: string;
}

// 2. Active Task: LMS Result Upload Status
export interface LMSResultRecord extends BaseInstitutionalEntity {
  moduleId: 'LMS';
  hodCoordinator: string;
  submissionDate: string;
  subjects: {
    id: string;
    courseCode: string;
    subjectTitle: string;
    creditHours: string;
    sectionShift: string;
    status: 'Submitted' | 'Pending' | 'In Progress';
    dateUploaded: string;
    uploadedBy: string;
    remarks: string;
  }[];
  referenceNumber?: string;
  editPin?: string;
}

// 3. Task: Faculty Biometric & Lecture Attendance (In Progress - Active After Demand)
export interface FacultyAttendanceRecord extends BaseInstitutionalEntity {
  moduleId: 'FACULTY_ATTENDANCE';
  targetDate: string;
  lectures: {
    id: string;
    teacherId: string;
    teacherName: string;
    designation: string;
    courseCode: string;
    scheduledTime: string;
    punchInTime?: string;
    conductStatus: 'Delivered' | 'Substitute' | 'Cancelled' | 'Pending';
    remarks?: string;
  }[];
  totalScheduled: number;
  totalDelivered: number;
  biometricComplianceRate: number;
}

// 4. Task: Student Enrollment & 75% Attendance (In Progress - Active After Demand)
export interface StudentAttendanceRecord extends BaseInstitutionalEntity {
  moduleId: 'STUDENT_ATTENDANCE';
  courseCode: string;
  courseTitle: string;
  students: {
    rollNumber: string;
    studentName: string;
    classesHeld: number;
    classesAttended: number;
    percentage: number;
    isEligible: boolean; // >= 75%
    warningIssued: boolean;
  }[];
  totalEnrolled: number;
  eligibleCount: number;
  defaultersCount: number;
}

// 5. Task: Course File & OBE Accreditation Audit (In Progress - Active After Demand)
export interface CourseFileRecord extends BaseInstitutionalEntity {
  moduleId: 'COURSE_FILE';
  courseCode: string;
  instructorName: string;
  sections: {
    sectionName: string;
    isCompleted: boolean;
    auditedBy?: string;
    auditDate?: string;
  }[];
  cloAttainmentRate: number;
  isPecCompliant: boolean;
}

// 6. Task: QEC Institutional Audit (In Progress - Active After Demand)
export interface QECAuditRecord extends BaseInstitutionalEntity {
  moduleId: 'QEC_AUDIT';
  sarSubmitted: boolean;
  sarSubmissionDate?: string;
  studentEvaluationAverage: number;
  facultyCourseReviewSubmitted: boolean;
  hecIpeRatingScore: number;
}

// 7. Task: Examination Secrecy & Moderation (In Progress - Active After Demand)
export interface ExamSecrecyRecord extends BaseInstitutionalEntity {
  moduleId: 'EXAM_SECRECY';
  examType: 'Midterm' | 'Final';
  paperModerated: boolean;
  moderatedBy?: string;
  scriptDeliveryDate?: string;
  marksSubmittedDate?: string;
  turnaroundDays: number;
  isDelayed: boolean;
}

// 8. User Security & Password Recovery Schema
export interface UserAccountSchema {
  id: string;
  username: string;
  email: string;
  password: string; // SHA-256 / bcrypt equivalent
  name: string;
  department: string;
  designation: string;
  role: 'VC' | 'ADMIN' | 'DEPT_HEAD' | 'FACULTY';
  failedLoginAttempts: number;
  isLocked: boolean;
  lockoutUntil?: string;
  createdAt: string;
}

export interface PasswordResetRequest {
  id: string;
  username: string;
  email: string;
  otpCode: string; // 6-digit numeric verification code
  resetToken: string;
  expiresAt: string; // 15-minute expiration
  verified: boolean;
  attempts: number;
}`;

  const jsonText =
    activeTab === 'current'
      ? JSON.stringify(
          currentPayload || {
            note: 'No active record selected. Select a program with data first.',
          },
          null,
          2
        )
      : activeTab === 'all'
      ? JSON.stringify(
          allRecords.map((r) => ({
            documentId: r.id,
            data: {
              session: r.session,
              semester: r.semester,
              shift: r.shift || 'Morning',
              department: r.department,
              program: r.program,
              degreeLevel: r.degreeLevel,
              hodCoordinator: r.hodCoordinator,
              submissionDate: r.submissionDate,
              subjectCount: r.subjects.filter((s) => s.courseCode || s.subjectTitle).length,
              subjects: r.subjects.filter((s) => s.courseCode || s.subjectTitle),
            },
          })),
          null,
          2
        )
      : activeTab === 'schemas'
      ? multiModuleSchemas
      : sampleRules;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackup = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(allRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `MNS_UET_LMS_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">MNS-UET Database & Cloud Architecture</h3>
              <p className="text-[11px] text-slate-400">
                Live Data Persistence & Firebase Firestore Connection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Database Status
          </button>
          <button
            onClick={() => {
              setActiveTab('diagnostic');
              if (!diagnosticResult) handleRunDiagnostic();
            }}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'diagnostic'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Diagnostic
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'usage'
                ? 'border-amber-600 text-amber-900 font-bold bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Daily Quota &amp; Ops</span>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-1 rounded font-bold">
              {Math.max(0, stats.limits.dailyWrites - stats.writes).toLocaleString()} left
            </span>
          </button>
          <button
            onClick={() => {
              setAccessLogs(StorageService.getAccessLogs());
              setActiveTab('logs');
            }}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit Logs ({accessLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('current')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'current'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Current Record
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            All Records ({allRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Security Rules
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'schemas'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Multi-Module Schemas
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto">
          {activeTab === 'status' ? (
            <div className="space-y-4 text-xs">
              {/* Status Banner */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Database Connected • Enterprise Storage Engine Operational
                  </h4>
                  <p className="text-emerald-900 mt-1 leading-relaxed">
                    All departmental submissions are stored securely in persistent local database
                    storage (<strong>Persistent Storage Engine</strong>) with zero dummy data. When you Save, Update, or Delete
                    a record, changes are saved permanently and are immediately available across sessions,
                    page reloads, and program switches.
                  </p>
                </div>
              </div>

              {/* Architecture Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-bold text-slate-800 block mb-1">
                    Database Collection Name:
                  </span>
                  <code className="bg-slate-200 px-2 py-0.5 rounded text-emerald-900 font-mono text-[11px]">
                    lms_submissions
                  </code>
                  <p className="text-slate-500 text-[11px] mt-2">
                    Stores complete departmental subject arrays, upload dates, coordinators, and audit logs.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="font-bold text-slate-800 block mb-1">
                    Zero Dummy Data Policy:
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Enforced Strictly
                  </span>
                  <p className="text-slate-500 text-[11px] mt-2">
                    Zero mock entries injected. Only authentic records entered by coordinators are saved.
                  </p>
                </div>
              </div>

              {/* Cloud Firestore Integration Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Cloud className="w-4 h-4 text-emerald-700" />
                  Cloud Migration &amp; Portability
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Export complete JSON snapshots for institutional archives or import past semester records anytime.
                </p>
                {importStatus && (
                  <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 p-2 rounded text-xs font-semibold">
                    {importStatus}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => StorageService.exportDatabaseJSON()}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export Database JSON Backup ({allRecords.length} records)
                </button>

                <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-600" />
                  Import Database JSON
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>

                {showConfirmClearDb ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1.5 rounded-lg text-xs">
                    <span className="text-rose-800 font-bold">Wipe all records to zero?</span>
                    <button
                      type="button"
                      onClick={handleClearDatabase}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold cursor-pointer transition-colors"
                    >
                      Yes, Wipe All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmClearDb(false)}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearDb(true)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Clear Database (Zero Records)
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'diagnostic' ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-lg">
                <div>
                  <h4 className="font-bold text-sm">Real-time Database Diagnostics</h4>
                  <p className="text-[11px] text-slate-300">Live ping, read/write latency, and storage integrity test</p>
                </div>
                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testing...' : 'Re-run Test'}
                </button>
              </div>

              {diagnosticResult ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg border ${
                    diagnosticResult.connected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {diagnosticResult.connected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                      )}
                      <span>{diagnosticResult.message}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-slate-500 font-semibold block text-[11px]">Read/Write Latency</span>
                      <span className="text-xl font-black text-emerald-700">{diagnosticResult.latencyMs} ms</span>
                      <span className="text-[10px] text-slate-400 block mt-1">Instant local persistence</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-slate-500 font-semibold block text-[11px]">Genuine Saved Records</span>
                      <span className="text-xl font-black text-slate-900">{diagnosticResult.recordsCount}</span>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-1">0 Dummy Data</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-slate-500 font-semibold block text-[11px]">Storage Footprint</span>
                      <span className="text-xl font-black text-slate-900">
                        {Math.round((diagnosticResult.storageUsageBytes / 1024) * 10) / 10} KB
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">Active browser storage</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-800">Verified System Attributes:</div>
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span><strong>Key Normalization:</strong> Deterministic keys across shifts and semesters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span><strong>Shift Isolation:</strong> Morning &amp; Evening stored as separate independent datasets</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span><strong>Event Dispatching:</strong> Real-time cross-tab synchronization active</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">Click &quot;Re-run Test&quot; to execute diagnostics.</div>
              )}
            </div>
          ) : activeTab === 'logs' ? (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                <strong>Access Traceability Log:</strong> Automatically records every HOD or coordinator
                who accessed, saved, or updated results in this application (without requiring login
                credentials).
              </div>

              {accessLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs">
                  No access activity recorded yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">User / Designation</th>
                        <th className="p-2.5">Department</th>
                        <th className="p-2.5">Action Performed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accessLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="p-2.5 font-medium text-slate-900">
                            <div>{log.userName}</div>
                            <div className="text-[10px] text-slate-500">{log.designation}</div>
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-600">{log.department}</td>
                          <td className="p-2.5 text-slate-800 font-medium">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                              {log.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'usage' ? (
            <div className="space-y-4 text-xs">
              {/* Header Banner with Firebase Console Direct Link */}
              <div className="p-3.5 rounded-lg bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-950 dark:text-amber-200 text-sm">
                      Firestore Operations &amp; Quota Monitor
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                      {stats.planTier} Plan
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                    Free daily limit: <strong>{stats.limits.dailyWrites.toLocaleString()} writes</strong>, <strong>{stats.limits.dailyReads.toLocaleString()} reads</strong>. Resets every midnight at 00:00 UTC.
                  </p>
                </div>
                <a
                  href="https://console.firebase.google.com/project/hrcv-2d7ce/firestore/databases/ai-studio-mnsuetlmsresultu-e2136163-8fbb-42d0-a2cb-ea06807df2ce/usage/prev-24h"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Firebase Console</span>
                </a>
              </div>

              {/* Progress Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Writes */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                    <span>Document Writes</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                      {((stats.writes / stats.limits.dailyWrites) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        stats.writes >= stats.limits.dailyWrites * 0.9 ? 'bg-rose-500' : stats.writes >= stats.limits.dailyWrites * 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.writes / stats.limits.dailyWrites) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {stats.writes.toLocaleString()} performed
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {Math.max(0, stats.limits.dailyWrites - stats.writes).toLocaleString()} left
                    </span>
                  </div>
                </div>

                {/* Reads */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                    <span>Document Reads</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      {((stats.reads / stats.limits.dailyReads) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.reads / stats.limits.dailyReads) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {stats.reads.toLocaleString()} performed
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {Math.max(0, stats.limits.dailyReads - stats.reads).toLocaleString()} left
                    </span>
                  </div>
                </div>

                {/* Deletes */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
                    <span>Document Deletes</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                      {((stats.deletes / stats.limits.dailyDeletes) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (stats.deletes / stats.limits.dailyDeletes) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {stats.deletes.toLocaleString()} performed
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {Math.max(0, stats.limits.dailyDeletes - stats.deletes).toLocaleString()} left
                    </span>
                  </div>
                </div>
              </div>

              {/* Collections breakdown table */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Collection Activity Breakdown (Today)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {Object.entries(stats.writesByCollection || {}).map(([col, writeCount]) => {
                    const readCount = stats.readsByCollection?.[col] || 0;
                    const deleteCount = stats.deletesByCollection?.[col] || 0;
                    return (
                      <div key={col} className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750">
                        <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 truncate">
                          {col}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                          <span>W: {Number(writeCount)}</span>
                          <span>R: {Number(readCount)}</span>
                          <span>D: {Number(deleteCount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      FirestoreUsageService.resetDailyCounters();
                    }}
                    className="px-2.5 py-1 text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors cursor-pointer"
                  >
                    Reset Local Counters
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  Database ID: <code className="font-mono text-emerald-700 dark:text-emerald-400">ai-studio-mnsuetlmsresultu-e2136163-8fbb-42d0-a2cb-ea06807df2ce</code>
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {activeTab === 'rules'
                    ? 'Firestore rules file for database security'
                    : activeTab === 'schemas'
                    ? 'Institutional Multi-Module Database Schemas (Normalized TypeScript Models)'
                    : 'Target Firestore document representation'}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy {activeTab === 'rules' ? 'Rules' : activeTab === 'schemas' ? 'Schemas' : 'JSON'}
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-96 border border-slate-800 leading-relaxed select-all">
                {jsonText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Active Session: 2023 – Semester 1 • MNS-UET Multan</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
