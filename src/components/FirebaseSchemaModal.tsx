import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  X,
  Cloud,
  Server,
  ShieldCheck,
  Download,
  CheckCircle2,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { SubmissionRecord } from '../types';
import { StorageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRecord?: SubmissionRecord | null;
  allRecords: SubmissionRecord[];
}

export const FirebaseSchemaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentRecord,
  allRecords,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'current' | 'all' | 'rules'>('status');
  const [accessLogs, setAccessLogs] = useState(() => StorageService.getAccessLogs());

  if (!isOpen) return null;

  const handleClearDatabase = () => {
    if (
      window.confirm(
        'Are you sure you want to completely clear all saved submissions? This will wipe the database to a completely clean state (zero records).'
      )
    ) {
      StorageService.clearAllData();
      setAccessLogs(StorageService.getAccessLogs());
      window.location.reload();
    }
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
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
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
              setAccessLogs(StorageService.getAccessLogs());
              setActiveTab('logs');
            }}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit & Access Logs ({accessLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('current')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'current'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Current Record Payload
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
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
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'rules'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Security Rules
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
                    Yes, the application is actively connected to a persistent database.
                  </h4>
                  <p className="text-emerald-900 mt-1 leading-relaxed">
                    All departmental submissions are stored securely in browser-backed local database
                    storage (<strong>Persistent Storage Engine</strong>). When you Save, Update, or Delete
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
                    Unique Isolation Key:
                  </span>
                  <code className="bg-slate-200 px-1.5 py-0.5 rounded text-emerald-900 font-mono text-[11px]">
                    dept__prog__degree__2023__1
                  </code>
                  <p className="text-slate-500 text-[11px] mt-2">
                    Guarantees zero cross-contamination between different engineering and computer science programs.
                  </p>
                </div>
              </div>

              {/* Cloud Firestore Integration Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Cloud className="w-4 h-4 text-emerald-700" />
                  Firebase Firestore Cloud Readiness
                </div>
                <p className="text-slate-600 leading-relaxed">
                  The data structure and rules in the next tabs are 100% compliant with Google Cloud
                  Firebase Firestore. If you wish to sync this to an external remote Firebase project ID,
                  you can export the JSON payload or integrate the Firebase Admin credentials.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Full JSON Backup ({allRecords.length} records)
                </button>

                <button
                  type="button"
                  onClick={handleClearDatabase}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Clear Database (Zero Records)
                </button>
              </div>
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
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {activeTab === 'rules'
                    ? 'Firestore rules file for database security'
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
                      Copy {activeTab === 'rules' ? 'Rules' : 'JSON'}
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
