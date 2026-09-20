import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount } from '../types';
import { AuthService } from '../services/authService';
import { CoordinatorAssignmentModal } from './CoordinatorAssignmentModal';
import {
  Users,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Edit3,
  Search,
  Check,
  Clock,
  XCircle,
  Sun,
  Moon,
  Eye,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPreviewUser?: (account: UserAccount) => void;
}

export const UserAccountsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPreviewUser,
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);
  const [isCoordinatorAssignModalOpen, setIsCoordinatorAssignModalOpen] = useState<boolean>(false);
  const [selectedDeptForAssign, setSelectedDeptForAssign] = useState<string | undefined>(undefined);
  const [selectedUserIdForAssign, setSelectedUserIdForAssign] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadAccounts = () => {
    setAccounts(AuthService.getAccounts());
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setFeedback('');
      setErrorMessage('');
      setConfirmDeleteId(null);
      setShowClearAllConfirm(false);
      setSearchQuery('');
      setRoleFilter('ALL');
      setStatusFilter('ALL');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleAccountsUpdate = () => {
      if (isOpen) loadAccounts();
    };
    window.addEventListener('mnsuet_accounts_updated', handleAccountsUpdate);
    window.addEventListener('mnsuet_auth_changed', handleAccountsUpdate);
    return () => {
      window.removeEventListener('mnsuet_accounts_updated', handleAccountsUpdate);
      window.removeEventListener('mnsuet_auth_changed', handleAccountsUpdate);
    };
  }, [isOpen]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Role filter
      if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
      
      // Status filter
      if (statusFilter !== 'ALL') {
        const accStatus = acc.approvalStatus || (acc.role === 'COORDINATOR' ? 'PENDING' : 'APPROVED');
        if (accStatus !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = acc.name?.toLowerCase().includes(q);
        const matchesUsername = acc.username?.toLowerCase().includes(q);
        const matchesEmail = acc.email?.toLowerCase().includes(q);
        const matchesDept = acc.department?.toLowerCase().includes(q);
        const matchesProg = acc.program?.toLowerCase().includes(q) ||
          acc.assignedPrograms?.some((p) => p.toLowerCase().includes(q));
        const matchesDesig = acc.designation?.toLowerCase().includes(q);
        return matchesName || matchesUsername || matchesEmail || matchesDept || matchesProg || matchesDesig;
      }

      return true;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  const pendingCount = useMemo(() => {
    return accounts.filter((a) => a.role === 'COORDINATOR' && a.approvalStatus === 'PENDING').length;
  }, [accounts]);

  if (!isOpen) return null;

  const executeDelete = (id: string, username: string) => {
    const res = AuthService.deleteAccount(id);
    setConfirmDeleteId(null);
    if (res.success) {
      setFeedback(`Account "${username}" was deleted successfully.`);
      setErrorMessage('');
      loadAccounts();
    } else {
      setErrorMessage(res.message);
      setFeedback('');
    }
  };

  const executeQuickApprove = (accountId: string, coordinatorName: string) => {
    const res = AuthService.approveCoordinatorAccount(accountId, 'Admin Approval');
    if (res.success) {
      setFeedback(`Coordinator "${coordinatorName}" was approved successfully.`);
      setErrorMessage('');
      loadAccounts();
    } else {
      setErrorMessage(res.message);
      setFeedback('');
    }
  };

  const executeClearAllNonMaster = () => {
    const res = AuthService.clearNonMasterAccounts();
    setShowClearAllConfirm(false);
    if (res.success) {
      setFeedback(res.message);
      setErrorMessage('');
      loadAccounts();
    } else {
      setErrorMessage('Failed to clear accounts.');
      setFeedback('');
    }
  };

  const nonMasterCount = accounts.filter(
    (a) => a.username.toLowerCase() !== 'admin' && a.username.toLowerCase() !== 'vc'
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white shadow-xs">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">University Accounts &amp; Global Access Management</h2>
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full animate-pulse">
                    {pendingCount} Pending Approvals
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Admin Control Panel • Total {accounts.length} Accounts ({nonMasterCount} registered faculty members)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{feedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-rose-700 hover:text-rose-900 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search, Filter & Action Toolbar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, username, department, program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="HOD">HODs</option>
              <option value="COORDINATOR">Coordinators</option>
              <option value="LECTURER">Regular Faculty</option>
              <option value="VISITING_LECTURER">Visiting Faculty</option>
              <option value="VC">Vice Chancellor</option>
              <option value="ADMIN">System Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved Active</option>
              <option value="PENDING">Pending Approval ({pendingCount})</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedDeptForAssign(undefined);
              setSelectedUserIdForAssign(undefined);
              setIsCoordinatorAssignModalOpen(true);
            }}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
            title="Open Coordinator & Faculty Program Allocation Manager"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Reassign Programs &amp; Roles</span>
          </button>
        </div>

        {/* Accounts Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">User &amp; Username</th>
                  <th className="p-3">Role &amp; Programs</th>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                      No user accounts found matching current search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => {
                    const isProtected =
                      acc.username.toLowerCase() === 'admin' ||
                      acc.username.toLowerCase() === 'vc';
                    const isPending = acc.role === 'COORDINATOR' && acc.approvalStatus === 'PENDING';
                    const isRejected = acc.role === 'COORDINATOR' && acc.approvalStatus === 'REJECTED';

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="font-bold text-slate-900 text-xs">{acc.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">@{acc.username}</div>
                          {acc.email && (
                            <div className="text-[10px] text-emerald-700 font-medium truncate max-w-[190px]" title={acc.email}>
                              {acc.email}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">{acc.designation}</div>
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              acc.role === 'ADMIN'
                                ? 'bg-rose-100 text-rose-800'
                                : acc.role === 'VC'
                                ? 'bg-indigo-100 text-indigo-800'
                                : acc.role === 'COORDINATOR'
                                ? 'bg-teal-100 text-teal-800'
                                : acc.role === 'LECTURER'
                                ? 'bg-sky-100 text-sky-800'
                                : acc.role === 'VISITING_LECTURER'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {acc.role === 'COORDINATOR'
                              ? 'COORDINATOR'
                              : acc.role === 'VISITING_LECTURER'
                              ? 'VISITING FACULTY'
                              : acc.role === 'LECTURER'
                              ? 'REGULAR FACULTY'
                              : acc.role}
                          </span>

                          {/* Coordinated / Assigned Programs */}
                          {acc.assignedPrograms && acc.assignedPrograms.length > 1 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="w-full text-[9px] font-bold text-teal-900">
                                {acc.assignedPrograms.length} Programs Coordinated:
                              </span>
                              {acc.assignedPrograms.map((p) => (
                                <span
                                  key={p}
                                  className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                                    p === acc.program
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                      : 'bg-teal-50 text-teal-800 border-teal-200'
                                  }`}
                                  title={p === acc.program ? 'Primary Program' : p}
                                >
                                  {p === acc.program ? `★ ${p}` : p}
                                </span>
                              ))}
                            </div>
                          ) : acc.program ? (
                            <div className="text-[10px] text-teal-800 font-semibold mt-0.5">
                              {acc.program}
                            </div>
                          ) : null}

                          {/* Shifts */}
                          {acc.assignedShifts && acc.assignedShifts.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {acc.assignedShifts.includes('Morning') && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Sun className="w-2 h-2" /> Morning
                                </span>
                              )}
                              {acc.assignedShifts.includes('Evening') && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <Moon className="w-2 h-2" /> Evening
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-slate-700">
                          <span className="font-medium line-clamp-2" title={acc.department}>
                            {acc.department || '—'}
                          </span>
                        </td>

                        {/* Approval Status */}
                        <td className="p-3 text-center">
                          {isPending ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending HOD</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => executeQuickApprove(acc.id, acc.name)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Instantly approve and authorize this coordinator"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Approve</span>
                              </button>
                            </div>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right whitespace-nowrap">
                          {isProtected ? (
                            <span className="text-[10px] text-slate-400 italic font-medium">Protected Master</span>
                          ) : confirmDeleteId === acc.id ? (
                            <div className="flex items-center justify-end gap-1.5 animate-in fade-in">
                              <span className="text-[10px] text-rose-700 font-bold">Delete?</span>
                              <button
                                type="button"
                                onClick={() => executeDelete(acc.id, acc.username)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                Yes, Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {onPreviewUser && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onPreviewUser(acc);
                                    onClose();
                                  }}
                                  className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title={`Preview portal UI exactly as ${acc.name} (${acc.role})`}
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeptForAssign(acc.department || undefined);
                                  setSelectedUserIdForAssign(acc.id);
                                  setIsCoordinatorAssignModalOpen(true);
                                }}
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Reassign degree program, shift, or convert role"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(acc.id);
                                  setFeedback('');
                                  setErrorMessage('');
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer inline-flex items-center gap-1 group"
                                title="Delete this account (Admin privilege)"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-rose-700" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {nonMasterCount > 0 && (
            <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-amber-900">
                <strong className="font-semibold">Reset for Genuine Faculty Data:</strong> You can purge all test/registered faculty accounts leaving only Admin &amp; VC accounts.
              </div>
              {showClearAllConfirm ? (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <span className="text-[11px] text-rose-700 font-bold">Confirm purge?</span>
                  <button
                    type="button"
                    onClick={executeClearAllNonMaster}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Yes, Purge
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearAllConfirm(false)}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(true)}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-xs font-semibold cursor-pointer transition-colors self-end sm:self-auto"
                >
                  Purge Test Accounts
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredAccounts.length} of {accounts.length} total accounts
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Sub-Modal: Coordinator Program Allocation & Role Switching */}
      <CoordinatorAssignmentModal
        isOpen={isCoordinatorAssignModalOpen}
        onClose={() => {
          setIsCoordinatorAssignModalOpen(false);
          setSelectedDeptForAssign(undefined);
          setSelectedUserIdForAssign(undefined);
          loadAccounts();
        }}
        defaultDepartment={selectedDeptForAssign}
        initialUserId={selectedUserIdForAssign}
        onCoordinatorUpdated={() => {
          loadAccounts();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mnsuet_accounts_updated'));
          }
        }}
      />
    </div>
  );
};
