import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { AuditTrailService, AuditTrailRecord } from '../services/auditTrailService';
import { SubmissionRecord, SubjectRow } from '../types';
import {
  Activity,
  FileCheck,
  User,
  Clock,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export interface RecentUploadItem {
  id: string;
  subjectTitle: string;
  courseCode: string;
  uploadedBy: string;
  timestamp: string;
  department: string;
  program: string;
  shift: string;
  semester: string;
  section: string;
  status: string;
  creditHours?: string;
  source: 'submission' | 'audit';
}

export interface RecentActivityWidgetProps {
  title?: string;
  departmentFilter?: string;
  programFilter?: string;
  limit?: number; // Defaults to 10
  className?: string;
  showCompact?: boolean;
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  title = 'Recent Activity — Last 10 Result Uploads',
  departmentFilter,
  programFilter,
  limit = 10,
  className = '',
  showCompact = false,
}) => {
  const [version, setVersion] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Re-fetch when storage or audit logs are updated
  useEffect(() => {
    const handleUpdate = () => setVersion((v) => v + 1);

    window.addEventListener('mnsuet_storage_updated', handleUpdate);
    window.addEventListener('mnsuet_audit_updated', handleUpdate);
    window.addEventListener('mnsuet_roster_updated', handleUpdate);

    return () => {
      window.removeEventListener('mnsuet_storage_updated', handleUpdate);
      window.removeEventListener('mnsuet_audit_updated', handleUpdate);
      window.removeEventListener('mnsuet_roster_updated', handleUpdate);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setVersion((v) => v + 1);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Compile and sort recent uploads from all submissions and audit trail logs
  const recentUploads = useMemo(() => {
    const items: RecentUploadItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Gather from StorageService Submissions
    const submissions: SubmissionRecord[] = StorageService.getAllSubmissions();
    
    submissions.forEach((sub) => {
      if (departmentFilter && departmentFilter !== 'ALL') {
        const normSubDept = (sub.department || '').toLowerCase();
        const normFilterDept = departmentFilter.toLowerCase();
        if (!normSubDept.includes(normFilterDept) && !normFilterDept.includes(normSubDept)) {
          return;
        }
      }

      if (programFilter && programFilter !== 'ALL') {
        const normSubProg = (sub.program || '').toLowerCase();
        const normFilterProg = programFilter.toLowerCase();
        if (!normSubProg.includes(normFilterProg) && !normFilterProg.includes(normSubProg)) {
          return;
        }
      }

      const baseTime = sub.updatedAt || sub.submissionDate || sub.createdAt || new Date().toISOString();

      (sub.subjects || []).forEach((subj: SubjectRow, idx: number) => {
        // We include subjects that have code/title and an uploader or upload status
        const code = (subj.courseCode || 'COURSE').trim().toUpperCase();
        const title = (subj.subjectTitle || code).trim();
        const faculty = (subj.uploadedBy || sub.accessedBy || sub.hodCoordinator || 'Course Instructor').trim();
        const time = subj.dateUploaded || baseTime;
        const status = subj.status || 'Uploaded';

        const itemKey = `${code}_${sub.program}_${sub.semester}_${sub.section}_${time}`;

        if (!seenKeys.has(itemKey)) {
          seenKeys.add(itemKey);
          items.push({
            id: `sub_${sub.id}_${idx}_${code}`,
            subjectTitle: title,
            courseCode: code,
            uploadedBy: faculty,
            timestamp: time,
            department: sub.department || 'Department of Computer Science',
            program: sub.program || 'BS Computer Science',
            shift: sub.shift || 'Morning',
            semester: sub.semester || '1',
            section: sub.section || 'A',
            status,
            creditHours: subj.creditHours || '3',
            source: 'submission',
          });
        }
      });
    });

    // 2. Gather from AuditTrailService Logs
    const auditLogs: AuditTrailRecord[] = AuditTrailService.getLogs();
    auditLogs.forEach((log) => {
      if (departmentFilter && departmentFilter !== 'ALL') {
        const normLogDept = (log.department || '').toLowerCase();
        const normFilterDept = departmentFilter.toLowerCase();
        if (!normLogDept.includes(normFilterDept) && !normFilterDept.includes(normLogDept)) {
          return;
        }
      }

      if (programFilter && programFilter !== 'ALL') {
        const normLogProg = (log.program || '').toLowerCase();
        const normFilterProg = programFilter.toLowerCase();
        if (!normLogProg.includes(normFilterProg) && !normFilterProg.includes(normLogProg)) {
          return;
        }
      }

      // Check if audit log represents a course upload
      const isUploadEvent =
        log.action === 'CREATED' ||
        log.action === 'UPDATED' ||
        log.action === 'APPROVED' ||
        (log.summary && (log.summary.toLowerCase().includes('upload') || log.summary.toLowerCase().includes('result') || log.summary.toLowerCase().includes('grade')));

      if (isUploadEvent) {
        let extractedCourse = '';
        let extractedTitle = '';

        if (log.details && log.details.length > 0 && log.details[0].courseCode) {
          extractedCourse = log.details[0].courseCode;
        }

        // Try extracting course code pattern like CS-101 or MET-101 from summary
        if (!extractedCourse && log.summary) {
          const match = log.summary.match(/\b([A-Z]{2,6}-\d{2,4}[A-Z]?)\b/);
          if (match) {
            extractedCourse = match[1];
          }
        }

        if (extractedCourse) {
          extractedTitle = log.summary.split(extractedCourse)[1]?.split(/[\.\,]/)[0]?.trim() || `Course ${extractedCourse}`;
        } else {
          extractedCourse = 'LMS-RESULT';
          extractedTitle = log.program ? `${log.program} Grade Sheet` : 'Course Result Sheet';
        }

        const faculty = log.actorName || 'Faculty Member';
        const itemKey = `${extractedCourse}_${log.program}_${log.semester}_${log.section}_${log.timestamp}`;

        if (!seenKeys.has(itemKey)) {
          seenKeys.add(itemKey);
          items.push({
            id: `audit_${log.id}`,
            subjectTitle: extractedTitle.replace(/^[\s\-\:]+/, ''),
            courseCode: extractedCourse,
            uploadedBy: faculty,
            timestamp: log.timestamp,
            department: log.department || 'Department of Engineering',
            program: log.program || 'Engineering Degree',
            shift: log.shift || 'Morning',
            semester: log.semester || '1',
            section: log.section || 'A',
            status: 'Uploaded',
            source: 'audit',
          });
        }
      }
    });

    // Sort descending by timestamp (newest first)
    items.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });

    return items;
  }, [version, departmentFilter, programFilter]);

  // Filter items by search query
  const filteredUploads = useMemo(() => {
    if (!searchQuery.trim()) return recentUploads;
    const q = searchQuery.toLowerCase().trim();
    return recentUploads.filter(
      (item) =>
        item.subjectTitle.toLowerCase().includes(q) ||
        item.courseCode.toLowerCase().includes(q) ||
        item.uploadedBy.toLowerCase().includes(q) ||
        item.program.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q)
    );
  }, [recentUploads, searchQuery]);

  // Display top N items (default 10)
  const displayedUploads = useMemo(() => {
    return filteredUploads.slice(0, limit);
  }, [filteredUploads, limit]);

  // Helper to format timestamps gracefully
  const formatTimestamp = (rawTs: string): { relative: string; full: string } => {
    try {
      const d = new Date(rawTs);
      if (isNaN(d.getTime())) return { relative: '', full: rawTs };

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relativeStr = '';
      if (diffMins < 1) relativeStr = 'Just now';
      else if (diffMins < 60) relativeStr = `${diffMins}m ago`;
      else if (diffHours < 24) relativeStr = `${diffHours}h ago`;
      else if (diffDays < 7) relativeStr = `${diffDays}d ago`;

      const formattedDate = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const formattedTime = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return {
        relative: relativeStr,
        full: `${formattedDate}, ${formattedTime}`,
      };
    } catch {
      return { relative: '', full: rawTs };
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-100 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2 uppercase tracking-wide">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold">
                {displayedUploads.length} / {recentUploads.length} Uploads
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time feed of the latest result uploads, subject grade sheets, and instructor submissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search subject/faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh Recent Activity Feed"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Scrollable Feed List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
        {displayedUploads.length === 0 ? (
          <div className="py-8 px-4 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">No recent result uploads found</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No subject uploads match '${searchQuery}'. Try clearing your search query.`
                : 'When faculty members or program coordinators upload course result sheets, they will appear here live in real time.'}
            </p>
          </div>
        ) : (
          displayedUploads.map((item, idx) => {
            const timeObj = formatTimestamp(item.timestamp);
            return (
              <div
                key={item.id || idx}
                className="group bg-slate-950 hover:bg-slate-950/90 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl p-3 sm:p-3.5 transition-all duration-200 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Subject & Code */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                          {item.subjectTitle}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold shrink-0">
                          {item.courseCode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700/80 shrink-0">
                          {item.creditHours ? `${item.creditHours} Cr Hrs` : '3 Cr Hrs'}
                        </span>
                      </div>

                      {/* Department, Program, Shift, Semester */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          {item.program}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                          Sem {item.semester} ({item.shift} - Sec {item.section})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Uploader Faculty & Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0 shrink-0 text-right">
                    {/* Faculty Member Name */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-md">
                      <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{item.uploadedBy}</span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{timeObj.full}</span>
                      {timeObj.relative && (
                        <span className="text-indigo-400 font-semibold ml-0.5">
                          ({timeObj.relative})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Meta Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified LMS Upload Stream</span>
        </span>
        <span className="text-slate-500">
          Showing last {displayedUploads.length} of {recentUploads.length} activity records
        </span>
      </div>
    </div>
  );
};

export default RecentActivityWidget;
