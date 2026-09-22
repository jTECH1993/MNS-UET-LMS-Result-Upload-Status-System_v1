import React, { useState } from 'react';
import { Shield, ArrowRightLeft, UserCheck, Merge, Trash2, CheckSquare, AlertTriangle, Cpu, Network, History, Check, X, Award, BarChart4, Database } from 'lucide-react';
import { DataIntegritySyncDashboard } from './DataIntegritySyncDashboard';

interface SafeguardRequest {
  id: string;
  operation: string; // 'MOVE' | 'REASSIGN' | 'MERGE'
  description: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'Pending Approval' | 'Approved' | 'Declined';
  affectedRecordsCount: number;
  timestamp: string;
  reason: string;
}

export function AdminGodModePanel({ allRecords, onDataUpdate }: { allRecords: any[], onDataUpdate?: () => void }) {
  // 1. Four-Eyes Safeguard State
  const [requests, setRequests] = useState<SafeguardRequest[]>([
    {
      id: 'req-1',
      operation: 'MOVE',
      description: 'Move 10 submissions from "Mechanical Engineering" to "Mechanical Engineering Technology"',
      requestedBy: 'Admin A (Talha)',
      status: 'Pending Approval',
      affectedRecordsCount: 10,
      timestamp: 'Today, 11:24 AM',
      reason: 'Correction of session-level naming discrepancy'
    },
    {
      id: 'req-2',
      operation: 'REASSIGN',
      description: 'Reassign coordinator globally from "Engr. Muhammad Arslan" to "Dr. Hafiz Umar"',
      requestedBy: 'Admin A (Talha)',
      approvedBy: 'Admin B (Dean FoE)',
      status: 'Approved',
      affectedRecordsCount: 29,
      timestamp: 'Yesterday, 4:51 PM',
      reason: 'HOD reallocated departmental workload'
    }
  ]);

  // 2. Anomaly Detection
  const [anomalies] = useState([
    {
      id: 'an-1',
      department: 'Mechanical Engineering',
      type: 'Unusual Bulk Submission',
      details: '10 subjects updated within 1.5 minutes',
      time: '18 Sep, 10:43 AM',
      severity: 'Medium'
    },
    {
      id: 'an-2',
      department: 'Computer Science',
      type: 'Off-hours Upload Activity',
      details: 'Coordinator updated records at 02:14 AM',
      time: '18 Sep, 02:14 AM',
      severity: 'Low'
    }
  ]);

  // 3. Academic Structure States
  const [academicStructure, setAcademicStructure] = useState({
    faculties: ['Engineering & Technology', 'Basic Sciences', 'Social Sciences'],
    departments: ['Mechanical Engineering', 'Computer Science', 'Electrical Engineering', 'Civil Engineering'],
    shifts: ['Morning', 'Evening'],
    sections: ['A', 'B', 'C']
  });

  // God Mode Operations Form
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [reassignFrom, setReassignFrom] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  // Longitudinal Performance Data
  const longitudinalData = [
    { department: 'Computer Science', '2021-22': 85, '2022-23': 91, '2023-24': 95 },
    { department: 'Mechanical Engineering', '2021-22': 78, '2022-23': 84, '2023-24': 100 },
    { department: 'Electrical Engineering', '2021-22': 81, '2022-23': 89, '2023-24': 95 },
    { department: 'Civil Engineering', '2021-22': 64, '2022-23': 73, '2023-24': 0 }
  ];

  // Recognition data
  const achievements = [
    { title: 'Fastest Completion', dept: 'Electrical Engineering & Technology', reward: '⏱️ Finished 5 Days Ahead of Deadline' },
    { title: 'Most Improved Department', dept: 'Mechanical Engineering', reward: '📈 +16% Completion Jump over last session' },
    { title: 'Highest Consistency', dept: 'Computer Science', reward: '🎯 Zero Pending Course Sheets for 3 semesters' }
  ];

  const handleCreateSafeguardRequest = (op: 'MOVE' | 'REASSIGN', desc: string, count: number, details: string) => {
    const item: SafeguardRequest = {
      id: `req-${Date.now()}`,
      operation: op,
      description: desc,
      requestedBy: 'Admin A (Talha)',
      status: 'Pending Approval',
      affectedRecordsCount: count,
      timestamp: new Date().toLocaleString(),
      reason: details
    };
    setRequests(prev => [item, ...prev]);
  };

  const approveRequest = (id: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      return { ...r, status: 'Approved', approvedBy: 'Admin B (Dean FoE)' };
    }));
  };

  const declineRequest = (id: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      return { ...r, status: 'Declined' };
    }));
  };

  const [adminTab, setAdminTab] = useState<'GOD_MODE' | 'DATA_INTEGRITY'>('GOD_MODE');

  return (
    <div className="space-y-6 w-full overflow-hidden">
      {/* ADMIN PANEL TOP TABS BAR */}
      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdminTab('GOD_MODE')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === 'GOD_MODE'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-300" />
            <span>1. God Mode Safeguards & Structure</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('DATA_INTEGRITY')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === 'DATA_INTEGRITY'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-300" />
            <span>2. Data Integrity & Sync Status</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono font-bold px-3 py-1 bg-slate-950 rounded-lg border border-slate-800">
          Administrator Privileged Console
        </span>
      </div>

      {adminTab === 'DATA_INTEGRITY' ? (
        <DataIntegritySyncDashboard />
      ) : (
        <>
      {/* SECTION 1: ADMIN GOD MODE & FOUR-EYES APPROVALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* God Mode Form Controls */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              👑 Enterprise "Admin God Mode" (Safeguarded)
            </h3>
          </div>

          <div className="space-y-4">
            {/* Operation A: Move Records */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg space-y-2.5">
              <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Move Submission Records Mapping
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="FROM: Mechanical Engineering"
                  value={moveFrom}
                  onChange={e => setMoveFrom(e.target.value)}
                  className="p-1.5 text-[11px] border rounded dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="TO: Mechanical Engineering Tech."
                  value={moveTo}
                  onChange={e => setMoveTo(e.target.value)}
                  className="p-1.5 text-[11px] border rounded dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!moveFrom || !moveTo) return;
                  handleCreateSafeguardRequest(
                    'MOVE',
                    `Move all records from "${moveFrom}" to "${moveTo}"`,
                    10,
                    'Requested correction of structural database program naming'
                  );
                  setMoveFrom('');
                  setMoveTo('');
                }}
                className="w-full text-center py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded cursor-pointer uppercase tracking-wider"
              >
                Queue Move Operation (4-Eyes Approval Required)
              </button>
            </div>

            {/* Operation B: Global Coordinator Reassignment */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg space-y-2.5">
              <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Global Coordinator Reassignment
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="FROM: Coordinator A"
                  value={reassignFrom}
                  onChange={e => setReassignFrom(e.target.value)}
                  className="p-1.5 text-[11px] border rounded dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="TO: Coordinator B"
                  value={reassignTo}
                  onChange={e => setReassignTo(e.target.value)}
                  className="p-1.5 text-[11px] border rounded dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!reassignFrom || !reassignTo) return;
                  handleCreateSafeguardRequest(
                    'REASSIGN',
                    `Global reassignment from "${reassignFrom}" to "${reassignTo}"`,
                    29,
                    'HOD reallocated responsibilities'
                  );
                  setReassignFrom('');
                  setReassignTo('');
                }}
                className="w-full text-center py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded cursor-pointer uppercase tracking-wider"
              >
                Queue Global Reassign (4-Eyes Approval Required)
              </button>
            </div>
          </div>
        </div>

        {/* Four-Eyes / Critical Change Approvals Pending */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <History className="w-5 h-5 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              🛡️ Dual-Control / Four-Eyes Security Approvals Roster
            </h3>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {requests.map(req => (
              <div key={req.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-250 dark:border-slate-850 space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'Declined' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {req.id}</span>
                </div>
                <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{req.description}</strong>
                <p className="text-[11px] text-slate-500">Requested by: <span className="font-semibold">{req.requestedBy}</span> | Affected records: <span className="font-black text-slate-700 dark:text-slate-300">{req.affectedRecordsCount} rows</span></p>
                <p className="text-[10px] text-slate-400 italic">Reason: "{req.reason}"</p>
                {req.approvedBy && (
                  <p className="text-[10px] text-emerald-600 font-bold">Approved by: {req.approvedBy} at {req.timestamp}</p>
                )}

                {req.status === 'Pending Approval' && (
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-900">
                    <button
                      onClick={() => approveRequest(req.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Approve &amp; Execute
                    </button>
                    <button
                      onClick={() => declineRequest(req.id)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 2: LONGITUDINAL COMPARISONS & RECOGNITION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Longitudinal Performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <BarChart4 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Department Performance Comparative Index (3-Year Longitudinal Track)
            </h3>
          </div>

          <div className="space-y-4">
            {longitudinalData.map((data, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>{data.department}</span>
                  <span className="font-mono text-emerald-600">{data['2023-24']}% (Current)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-mono">
                  <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded">
                    <span>2021-22: </span>
                    <strong className="text-slate-700 dark:text-slate-300">{data['2021-22']}%</strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded">
                    <span>2022-23: </span>
                    <strong className="text-slate-700 dark:text-slate-300">{data['2022-23']}%</strong>
                  </div>
                  <div className="bg-emerald-950/20 dark:bg-emerald-950/40 p-1.5 rounded border border-emerald-900/20 text-emerald-600 font-bold">
                    <span>2023-24: </span>
                    <span>{data['2023-24']}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recognition Dashboard */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Award className="w-5 h-5 text-amber-500 animate-bounce" />
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              🏆 Institutional Academic Recognition &amp; Accolades
            </h3>
          </div>

          <div className="space-y-3.5">
            {achievements.map((ach, idx) => (
              <div key={idx} className="p-3 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 rounded-lg border border-amber-500/20 flex gap-3 items-start">
                <div className="text-xl">🌟</div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{ach.title}</span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">{ach.dept}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{ach.reward}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 3: DATA QUALITY ENGINE & ANOMALY DETECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Anomaly Detection Alerts */}
        <div className="bg-slate-950 border border-red-900/40 rounded-xl p-4 text-slate-200">
          <div className="flex items-center justify-between border-b border-red-900/30 pb-2 mb-3">
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              🧠 Real-time Operational Anomaly Inspector
            </span>
            <span className="text-[9px] bg-rose-950 border border-rose-800 text-rose-400 px-1.5 rounded uppercase font-mono">Active Monitoring</span>
          </div>

          <div className="space-y-3">
            {anomalies.map(an => (
              <div key={an.id} className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg flex items-start gap-3">
                <span className="text-base text-rose-500">⚠️</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-400 uppercase">{an.type}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{an.time}</span>
                  </div>
                  <strong className="text-xs font-black text-slate-100 block">{an.department}</strong>
                  <p className="text-[11px] text-slate-400">{an.details}</p>
                  <span className="text-[9px] text-slate-500 font-mono">Severity Flag: {an.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Structure & Quality Constraints */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Network className="w-4 h-4 text-indigo-500" />
              🧮 Data Quality Constraint Checks
            </span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 rounded uppercase font-bold">100% Guarded</span>
          </div>

          <div className="space-y-2.5">
            {[
              { rule: 'Duplicate Submissions Check', status: 'Blocked automatically inside local storage and state keys.' },
              { rule: 'HOD Department Alignment Guard', status: 'Enforces that only coordinators assigned to active rosters are registered.' },
              { rule: 'Session Active Lockouts', status: 'Restricts roster insertions outside selected active sessions unless override granted.' },
              { rule: 'Structural Section Existence validation', status: 'Restricts Section input strictly to permitted shifts / cohorts.' }
            ].map((guard, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs font-medium text-slate-700 dark:text-slate-300">
                <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 text-[11px] block font-bold">{guard.rule}</strong>
                  <p className="text-[10px] text-slate-500">{guard.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      </>
      )}

    </div>
  );
}
