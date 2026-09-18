import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, Clock, ShieldAlert, CheckCircle2, Play, ChevronRight, User, HelpCircle, FileText, Send } from 'lucide-react';

interface ActionItem {
  id: string;
  title: string;
  target: string; // e.g. "Mechanical Engineering Semester 6"
  assignedTo: string; // HOD / Coordinator name
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  status: 'Open' | 'Acknowledged' | 'In Progress' | 'Resolved';
  createdAt: string;
}

interface EscalationRule {
  hours: number;
  targetRole: 'Coordinator' | 'HOD' | 'Dean' | 'VC';
}

interface SystemNotification {
  id: string;
  type: 'Critical' | 'Warning' | 'Update' | 'Resolved';
  message: string;
  timestamp: string;
  channelSent?: string[];
}

interface AuditTimelineEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export function ActionCenterPanel({ allRecords }: { allRecords: any[] }) {
  // 1. Actions State
  const [actions, setActions] = useState<ActionItem[]>(() => {
    const saved = localStorage.getItem('mnsuet_vc_actions_v1');
    return saved ? JSON.parse(saved) : [
      {
        id: 'act-1',
        title: 'Complete Semester 6 LMS submissions',
        target: 'Mechanical Engineering - Semester 6',
        assignedTo: 'HOD Mechanical Engineering',
        priority: 'High',
        deadline: 'Tomorrow 12:00 PM',
        status: 'Open',
        createdAt: new Date(Date.now() - 3600000 * 2).toLocaleString()
      },
      {
        id: 'act-2',
        title: 'Resolve Computer Science unassigned shift course sheets',
        target: 'Computer Science - Semester 1 Sec B',
        assignedTo: 'HOD Computer Science',
        priority: 'High',
        deadline: 'Sep 20, 2026 5:00 PM',
        status: 'In Progress',
        createdAt: new Date(Date.now() - 3600000 * 24).toLocaleString()
      }
    ];
  });

  // 2. Escalation Rules State
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>(() => {
    const saved = localStorage.getItem('mnsuet_escalation_rules_v1');
    return saved ? JSON.parse(saved) : [
      { hours: 24, targetRole: 'Coordinator' },
      { hours: 48, targetRole: 'HOD' },
      { hours: 72, targetRole: 'Dean' },
      { hours: 96, targetRole: 'VC' }
    ];
  });

  // 3. Notifications State
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    { id: 'not-1', type: 'Critical', message: 'Mechanical Engineering (Semester 6) overdue exceeds 48 hours without update', timestamp: '10 min ago', channelSent: ['In-app', 'Email'] },
    { id: 'not-2', type: 'Warning', message: 'HOD Computer Science requested an override for Section B program mapping', timestamp: '45 min ago', channelSent: ['In-app'] },
    { id: 'not-3', type: 'Update', message: 'Electrical Engineering results updated to 100% completion (8/8 uploaded)', timestamp: '2 hours ago', channelSent: ['In-app', 'WhatsApp'] },
    { id: 'not-4', type: 'Resolved', message: 'Action #act-3 "B.Sc. Civil Engineering verification" resolved by Dean', timestamp: 'Yesterday', channelSent: ['In-app'] }
  ]);

  // 4. Audit Timeline State
  const [timelineEvents, setTimelineEvents] = useState<AuditTimelineEvent[]>([
    { id: 'ev-1', timestamp: '18 Sep 10:43', user: 'Engr. Muhammad Arslan Qasim', action: 'LMS Upload', details: 'Status changed from Pending to Uploaded for ME-301 Thermodynamics' },
    { id: 'ev-2', timestamp: '18 Sep 09:20', user: 'Dr. Hafiz Muhammad Umar (HOD)', action: 'HOD Review', details: 'Reviewed submission record and verified grade validation screenshot' },
    { id: 'ev-3', timestamp: '17 Sep 16:31', user: 'Engr. Muhammad Arslan Qasim', action: 'LMS Upload Attempt', details: 'Course ME-302 Heat Transfer results uploaded to terminal' },
    { id: 'ev-4', timestamp: '17 Sep 16:20', user: 'System Generator', action: 'Auto Scan', details: 'Scanned 10 registered Mechanical engineering courses for Semester 1 Sec A' }
  ]);

  const [newActionForm, setNewActionForm] = useState({
    title: '',
    target: '',
    assignedTo: '',
    priority: 'High' as 'High' | 'Medium' | 'Low',
    deadline: 'Tomorrow 12:00 PM'
  });

  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newRuleHours, setNewRuleHours] = useState<number>(120);
  const [newRuleRole, setNewRuleRole] = useState<'Coordinator' | 'HOD' | 'Dean' | 'VC'>('VC');

  useEffect(() => {
    localStorage.setItem('mnsuet_vc_actions_v1', JSON.stringify(actions));
  }, [actions]);

  useEffect(() => {
    localStorage.setItem('mnsuet_escalation_rules_v1', JSON.stringify(escalationRules));
  }, [escalationRules]);

  // Handle action status transitions
  const advanceActionStatus = (actionId: string) => {
    setActions(prev => prev.map(act => {
      if (act.id !== actionId) return act;
      let nextStatus: 'Open' | 'Acknowledged' | 'In Progress' | 'Resolved' = act.status;
      if (act.status === 'Open') nextStatus = 'Acknowledged';
      else if (act.status === 'Acknowledged') nextStatus = 'In Progress';
      else if (act.status === 'In Progress') nextStatus = 'Resolved';
      
      // Log audit trail event
      const newEv: AuditTimelineEvent = {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        user: 'VC Controller',
        action: 'Action Center Update',
        details: `Action "${act.title}" state advanced from ${act.status} to ${nextStatus}`
      };
      setTimelineEvents(tPrev => [newEv, ...tPrev]);

      return { ...act, status: nextStatus };
    }));
  };

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionForm.title || !newActionForm.target) return;
    const item: ActionItem = {
      id: `act-${Date.now()}`,
      title: newActionForm.title,
      target: newActionForm.target,
      assignedTo: newActionForm.assignedTo || 'Unassigned',
      priority: newActionForm.priority,
      deadline: newActionForm.deadline,
      status: 'Open',
      createdAt: new Date().toLocaleString()
    };
    setActions(prev => [item, ...prev]);
    setIsAddingAction(false);
    setNewActionForm({
      title: '',
      target: '',
      assignedTo: '',
      priority: 'High',
      deadline: 'Tomorrow 12:00 PM'
    });

    // Log event
    const newEv: AuditTimelineEvent = {
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: 'VC Controller',
      action: 'Action Created',
      details: `Dispatched directive: "${item.title}" assigned to ${item.assignedTo}`
    };
    setTimelineEvents(tPrev => [newEv, ...tPrev]);
  };

  const addEscalationRule = () => {
    if (escalationRules.some(r => r.hours === newRuleHours)) return;
    const newRule: EscalationRule = { hours: newRuleHours, targetRole: newRuleRole };
    setEscalationRules(prev => [...prev, newRule].sort((a, b) => a.hours - b.hours));
  };

  const deleteEscalationRule = (hours: number) => {
    setEscalationRules(prev => prev.filter(r => r.hours !== hours));
  };

  // Filter systems on all records to auto-detect current laggy bottlenecks
  const detectedBottlenecks = allRecords.filter(r => {
    const hasUnsubmitted = r.subjects && r.subjects.some((s: any) => s.status !== 'Uploaded');
    return hasUnsubmitted;
  }).slice(0, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Actions Center & Bottlenecks */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Actions Controller List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-850 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                MNS-UET Accountability Actions Tracker
              </h3>
            </div>
            <button
              onClick={() => setIsAddingAction(!isAddingAction)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1"
            >
              {isAddingAction ? 'Cancel' : '+ New Directive'}
            </button>
          </div>

          {isAddingAction && (
            <form onSubmit={handleCreateAction} className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Create New Accountability Action</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Action Title (e.g., Complete Semester 6 LMS submissions)"
                  value={newActionForm.title}
                  onChange={e => setNewActionForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="p-2 border rounded text-xs dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="Target (e.g., Mechanical Engineering Semester 6)"
                  value={newActionForm.target}
                  onChange={e => setNewActionForm(prev => ({ ...prev, target: e.target.value }))}
                  required
                  className="p-2 border rounded text-xs dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="Assigned To (e.g., HOD Mechanical Engineering)"
                  value={newActionForm.assignedTo}
                  onChange={e => setNewActionForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  required
                  className="p-2 border rounded text-xs dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newActionForm.priority}
                    onChange={e => setNewActionForm(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="p-2 border rounded text-xs dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Deadline"
                    value={newActionForm.deadline}
                    onChange={e => setNewActionForm(prev => ({ ...prev, deadline: e.target.value }))}
                    required
                    className="p-2 border rounded text-xs dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-all cursor-pointer"
                >
                  Dispatch Accountability Order
                </button>
              </div>
            </form>
          )}

          <div className="p-4 space-y-3">
            {actions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No active actions configured.</p>
            ) : (
              actions.map(act => (
                <div key={act.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        act.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {act.priority}
                      </span>
                      <strong className="text-xs font-bold text-slate-900 dark:text-slate-100">{act.title}</strong>
                    </div>
                    <p className="text-[11px] text-slate-500">Target: <span className="font-semibold">{act.target}</span></p>
                    <p className="text-[11px] text-slate-400">Assigned: <span className="font-semibold text-slate-500">{act.assignedTo}</span> | Created: {act.createdAt}</p>
                    <div className="flex items-center gap-2 text-[10px] text-rose-500 font-bold">
                      <Clock className="w-3 h-3" />
                      <span>Deadline: {act.deadline}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col items-start md:items-end">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Status</span>
                      <span className={`text-xs font-black ${
                        act.status === 'Resolved' ? 'text-emerald-600' : act.status === 'In Progress' ? 'text-indigo-600' : 'text-amber-600'
                      }`}>
                        ● {act.status}
                      </span>
                    </div>
                    {act.status !== 'Resolved' && (
                      <button
                        onClick={() => advanceActionStatus(act.id)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>
                          {act.status === 'Open' ? 'Acknowledge' : act.status === 'Acknowledged' ? 'Start Progress' : 'Mark Resolved'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Detected Bottlenecks (Quick Action dispatcher) */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
            System Detected Bottlenecks (Action Recommended)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detectedBottlenecks.map((rec, idx) => {
              const pendingSubjects = rec.subjects.filter((s: any) => s.status !== 'Uploaded');
              return (
                <div key={idx} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg flex flex-col justify-between h-36">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded uppercase">
                        ⚠ {pendingSubjects.length} Overdue Courses
                      </span>
                      <span className="text-[10px] text-slate-400">{rec.shift}</span>
                    </div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1.5 line-clamp-1">{rec.program}</h5>
                    <p className="text-[10px] text-slate-500">Semester {rec.semester} | Assigned HOD: {rec.hodCoordinator}</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewActionForm({
                        title: `Complete Semester ${rec.semester} LMS uploads for ${rec.program}`,
                        target: `${rec.program} - Sem ${rec.semester} (${rec.shift})`,
                        assignedTo: `HOD of ${rec.department}`,
                        priority: 'High',
                        deadline: 'Tomorrow 12:00 PM'
                      });
                      setIsAddingAction(true);
                    }}
                    className="w-full text-center py-1 bg-rose-900 hover:bg-rose-800 text-white font-bold text-[10px] rounded transition-all mt-2 cursor-pointer uppercase tracking-wider"
                  >
                    Deploy Accountability Order
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Escalations & System Logs */}
      <div className="lg:col-span-4 space-y-6">

        {/* Escalation Config & Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Escalation Engine Rules
            </h3>
          </div>

          <div className="space-y-3">
            {escalationRules.map(rule => (
              <div key={rule.hours} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-150 dark:border-slate-850">
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Overdue &gt; <strong className="font-mono text-rose-600">{rule.hours} hrs</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                    Notify {rule.targetRole}
                  </span>
                  <button
                    onClick={() => deleteEscalationRule(rule.hours)}
                    className="text-[10px] text-slate-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-150 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Add Escalation Target</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={newRuleHours}
                onChange={e => setNewRuleHours(Number(e.target.value))}
                placeholder="Hours"
                className="p-1 border rounded text-xs dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
              <select
                value={newRuleRole}
                onChange={e => setNewRuleRole(e.target.value as any)}
                className="p-1 border rounded text-xs dark:bg-slate-950 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Coordinator">Coordinator</option>
                <option value="HOD">HOD</option>
                <option value="Dean">Dean</option>
                <option value="VC">VC</option>
              </select>
            </div>
            <button
              onClick={addEscalationRule}
              className="w-full text-center py-1 bg-slate-950 text-slate-200 text-xs font-bold rounded hover:bg-slate-850 cursor-pointer"
            >
              + Save Escalation Path
            </button>
          </div>
        </div>

        {/* Notification Center Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500 animate-swing" />
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Unified Notification Center
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">🔴 3 Critical</span>
            </div>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto">
            {notifications.map(not => (
              <div key={not.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-850">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    not.type === 'Critical' ? 'bg-rose-100 text-rose-700' : not.type === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {not.type}
                  </span>
                  <span className="text-[9px] text-slate-400">{not.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-1.5 font-medium leading-tight">{not.message}</p>
                {not.channelSent && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-[8px] text-slate-400 uppercase">Channels:</span>
                    {not.channelSent.map(ch => (
                      <span key={ch} className="text-[8px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 rounded">
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Audit Timeline Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Immutable Submission History Timeline
            </h3>
          </div>

          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2.5 pl-4 space-y-5">
            {timelineEvents.map(ev => (
              <div key={ev.id} className="relative">
                {/* Node Dot */}
                <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-mono">{ev.timestamp}</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">{ev.action}</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{ev.details}</p>
                  <span className="text-[9px] text-slate-400 italic block">By: {ev.user}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
