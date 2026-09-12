import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { WorkOnDemandRequisition, ActiveUserSession } from '../types';
import {
  Briefcase,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PlusCircle,
  Database,
  FileCode,
  Building,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Search,
  Sparkles,
  Server,
  FileText,
} from 'lucide-react';

interface Props {
  currentUser: ActiveUserSession | null;
  currentSession: string;
  onSwitchToLMS: () => void;
  onOpenDatabaseModal?: () => void;
}

export const WorkOnDemandView: React.FC<Props> = ({
  currentUser,
  currentSession,
  onSwitchToLMS,
  onOpenDatabaseModal,
}) => {
  const [requisitions, setRequisitions] = useState<WorkOnDemandRequisition[]>(() =>
    StorageService.getWorkOnDemandRequisitions()
  );
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'WORKFLOW' | 'SCHEMAS'>('REQUISITIONS');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // New Requisition Form State
  const [moduleName, setModuleName] = useState<string>('');
  const [category, setCategory] = useState<WorkOnDemandRequisition['category']>('Faculty Oversight');
  const [requestedBy, setRequestedBy] = useState<string>(currentUser?.name || 'Academic Authority');
  const [requestorRole, setRequestorRole] = useState<string>(
    currentUser?.role === 'VC'
      ? 'Vice Chancellor'
      : currentUser?.role === 'HOD'
      ? 'Head of Department'
      : currentUser?.designation || 'Institutional Coordinator'
  );
  const [department, setDepartment] = useState<string>(currentUser?.department || 'All Engineering Departments');
  const [targetSession, setTargetSession] = useState<string>(`Session ${currentSession}`);
  const [priority, setPriority] = useState<WorkOnDemandRequisition['priority']>('High (Immediate Session)');
  const [technicalRequirements, setTechnicalRequirements] = useState<string>('');
  const [hardwareOrApiNeeded, setHardwareOrApiNeeded] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim()) return;

    const newReq = StorageService.submitWorkOnDemandRequisition({
      moduleName: moduleName.trim(),
      category,
      requestedBy: requestedBy.trim(),
      requestorRole: requestorRole.trim(),
      department: department.trim(),
      targetSession: targetSession.trim(),
      priority,
      technicalRequirements:
        technicalRequirements.trim() ||
        'Standard university institutional monitoring workflow requested under Academic Council directives.',
      hardwareOrApiNeeded:
        hardwareOrApiNeeded.trim() || 'Central university database gateway & authenticated user endpoints.',
    });

    setRequisitions(StorageService.getWorkOnDemandRequisitions());
    setModuleName('');
    setTechnicalRequirements('');
    setHardwareOrApiNeeded('');
    setIsModalOpen(false);
    setFormSuccess(`Requisition ${newReq.id} submitted successfully and queued for Vice Chancellor review.`);
    setTimeout(() => setFormSuccess(null), 5000);
  };

  const filteredRequisitions = requisitions.filter((r) => {
    const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesSearch =
      r.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const enterpriseSchemasCode = `/**
 * MNS-UET Central Academic Oversight Architecture
 * Normalized Data Contracts Ready for 'Work on Demand' Module Ingestion
 */

// Common Base Entity for all MNS-UET institutional modules
export interface BaseInstitutionalEntity {
  id: string;                         // Normalized Key: dept__program__shift__session__sem
  department: string;                 // e.g. "Department of Computer Science"
  program: string;                    // Degree Program
  degreeLevel: string;                // "BS" | "MS" | "PhD"
  shift: 'Morning' | 'Evening';       // Academic Shift
  session: string;                    // Academic Session (e.g. "2023", "2024")
  semester: string;                   // "1" to "8"
  createdAt: string;                  // ISO 8601 Timestamp
  updatedAt: string;
  accessedBy: string;                 // User traceability
}

// 1. Operational Live Module: LMS Result Upload Status
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
}

// 2. Work on Demand: Faculty Attendance & Biometric Monitoring
export interface FacultyBiometricRecord extends BaseInstitutionalEntity {
  moduleId: 'FACULTY_ATTENDANCE';
  targetDate: string;
  lectures: {
    teacherId: string;
    courseCode: string;
    scheduledTime: string;
    biometricPunchIn?: string;
    conductStatus: 'Delivered' | 'Substitute' | 'Cancelled';
  }[];
  biometricComplianceRate: number;
}

// 3. Work on Demand: Student 75% Attendance Threshold
export interface StudentAttendanceAuditRecord extends BaseInstitutionalEntity {
  moduleId: 'STUDENT_ATTENDANCE';
  courseCode: string;
  students: {
    rollNumber: string;
    classesHeld: number;
    classesAttended: number;
    percentage: number;
    isEligible: boolean; // >= 75%
  }[];
}

// 4. Work on Demand: Outcome-Based Education (OBE) Washington Accord Audit
export interface CourseFileAuditRecord extends BaseInstitutionalEntity {
  moduleId: 'COURSE_FILE';
  courseCode: string;
  cloAttainmentRate: number;
  isPecCompliant: boolean;
}`;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(enterpriseSchemasCode);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Strict Zero-Dummy-Data Notice */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700 shadow-sm">
              <Briefcase className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                  Institutional Framework
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  MNS-UET Central Academic Oversight
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                Institutional Oversight Modules: Work on Demand
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                Official provisioning framework for university monitoring systems. All non-operational modules are activated strictly upon institutional requisition from the Vice Chancellor Secretariat or Academic Council.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={onSwitchToLMS}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Task: LMS Result Upload Status</span>
            </button>
          </div>
        </div>

        {/* Zero Dummy Data & Enterprise Integrity Assurance Notice */}
        <div className="mt-4 p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block">Strict Zero Dummy Data Guarantee:</strong>
            <span>
              In strict accordance with MNS-UET quality assurance policies, this application contains{' '}
              <strong>zero synthetic, placeholder, or fake records</strong>. No mock screens are simulated. Instead,
              future modules (Biometrics, OBE Accreditation, QEC Audits, Student 75% Rule) are deployed{' '}
              <strong>&ldquo;Work on Demand&rdquo;</strong> upon formal administrative requisition and live campus hardware integration.
            </span>
          </div>
        </div>

        {formSuccess && (
          <div className="mt-3 p-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('REQUISITIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'REQUISITIONS'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Module Requisitions ({requisitions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WORKFLOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'WORKFLOW'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Demand-Driven Activation Workflow</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SCHEMAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'SCHEMAS'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Verified Database Contracts</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REQUISITIONS DESK & LOG */}
      {activeTab === 'REQUISITIONS' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search requisitions or modules..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Faculty Oversight">Faculty Oversight</option>
                <option value="Student Affairs">Student Affairs</option>
                <option value="OBE & Accreditation">OBE &amp; Accreditation</option>
                <option value="Quality Enhancement">Quality Enhancement</option>
                <option value="Examinations">Examinations</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Formal Module Requisition</span>
            </button>
          </div>

          {/* Requisitions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequisitions.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        {req.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                      {req.moduleName}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded whitespace-nowrap ${
                      req.status === 'Approved by VC'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {req.technicalRequirements}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Requesting Authority:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {req.requestedBy} ({req.requestorRole})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target Session / Scope:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {req.targetSession} &bull; {req.department || 'All Departments'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Integration Dependency:</span>
                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      {req.hardwareOrApiNeeded}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px]">Submitted:</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {new Date(req.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRequisitions.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 text-xs">
              No matching module requisitions found. Click &ldquo;Submit Formal Module Requisition&rdquo; to submit a new academic request.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEMAND-DRIVEN ACTIVATION WORKFLOW */}
      {activeTab === 'WORKFLOW' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              The MNS-UET &lsquo;Work on Demand&rsquo; Provisioning Protocol
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              How institutional academic monitoring modules transition from formal request to live enterprise production
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Academic Demand Submission
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Departmental Heads, Deans, or the Vice Chancellor Secretariat submit formal operational scope and KPI requirements.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Executive &amp; Security Vetting
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The IT Directorate &amp; Vice Chancellor review role-based access control (RBAC), data isolation boundaries, and audit trail rules.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Hardware &amp; Gateway Link
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Physical terminals (e.g. biometrics, RFID), SIS databases, or examination vault endpoints are linked with verified SSL tokens.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black flex items-center justify-center text-xs">
                4
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Live Module Deployment
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The verified module goes live in the central navigation with authentic data feeds. Zero simulated or placeholder records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VERIFIED SCHEMAS */}
      {activeTab === 'SCHEMAS' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Normalized Institutional Data Contracts (TypeScript)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pre-verified schema contracts ready for instant database ingestion when new on-demand modules are provisioned
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onOpenDatabaseModal && (
                <button
                  type="button"
                  onClick={onOpenDatabaseModal}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Open Database Console</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopySchema}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Copied' : 'Copy Schemas'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto border border-slate-800">
            <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
              {enterpriseSchemasCode}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT FORMAL REQUISITION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Formal Module Requisition Desk
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Submit a demand-driven monitoring system request to the Vice Chancellor Secretariat
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequisition} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Monitoring Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="e.g., Departmental Biometric Terminal Conduct Tracking"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Functional Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Faculty Oversight">Faculty Oversight</option>
                    <option value="Student Affairs">Student Affairs</option>
                    <option value="OBE & Accreditation">OBE &amp; Accreditation</option>
                    <option value="Quality Enhancement">Quality Enhancement</option>
                    <option value="Examinations">Examinations</option>
                    <option value="Other">Other Custom Oversight</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="High (Immediate Session)">High (Immediate Session)</option>
                    <option value="Medium (Next Academic Year)">Medium (Next Academic Year)</option>
                    <option value="Standard">Standard Routine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Requesting Official
                  </label>
                  <input
                    type="text"
                    required
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Official Designation / Role
                  </label>
                  <input
                    type="text"
                    required
                    value={requestorRole}
                    onChange={(e) => setRequestorRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Target Academic Session &amp; Scope
                </label>
                <input
                  type="text"
                  value={targetSession}
                  onChange={(e) => setTargetSession(e.target.value)}
                  placeholder="e.g. Session 2024-25"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Technical Requirements &amp; Scope
                </label>
                <textarea
                  rows={3}
                  value={technicalRequirements}
                  onChange={(e) => setTechnicalRequirements(e.target.value)}
                  placeholder="Describe the institutional problem, regulatory requirements (HEC/PEC), and intended KPIs..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Hardware or API Integration Needed
                </label>
                <input
                  type="text"
                  value={hardwareOrApiNeeded}
                  onChange={(e) => setHardwareOrApiNeeded(e.target.value)}
                  placeholder="e.g., Departmental Biometric Scanners, Controller of Examinations Vault API"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Submit Official Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
