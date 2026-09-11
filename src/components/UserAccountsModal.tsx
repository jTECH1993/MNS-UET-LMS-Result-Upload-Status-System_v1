import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { AuthService } from '../services/authService';
import { ShieldCheck, Users, Trash2, X, AlertCircle, Building, CheckCircle2, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAccountsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);

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
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-800 flex items-center justify-center text-white">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">University User Accounts & Department Access</h2>
              <p className="text-xs text-slate-400">
                Admin Control Panel • Total {accounts.length} Accounts ({nonMasterCount} registered faculty)
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
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
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
              className="text-rose-700 hover:text-rose-900 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Accounts Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">User</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Department</th>
                  <th className="p-2.5">Designation</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => {
                  const isProtected =
                    acc.username.toLowerCase() === 'admin' ||
                    acc.username.toLowerCase() === 'vc';

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-medium">
                        <div className="font-bold text-slate-800">{acc.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">@{acc.username}</div>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            ? 'VISITING'
                            : acc.role}
                        </span>
                        {acc.program && (
                          <span className="block text-[9px] text-teal-700 font-semibold mt-0.5">
                            {acc.program}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        <span className="line-clamp-1" title={acc.department}>
                          {acc.department}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{acc.designation}</td>
                      <td className="p-2.5 text-right whitespace-nowrap">
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
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(acc.id);
                              setFeedback('');
                              setErrorMessage('');
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer inline-flex items-center gap-1 group"
                            title="Delete this account"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-rose-700" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {nonMasterCount > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <div className="text-amber-900">
                <strong className="font-semibold">Reset for Genuine Faculty Data:</strong> You can purge all test/registered faculty accounts leaving only Admin & VC.
              </div>
              {showClearAllConfirm ? (
                <div className="flex items-center gap-1.5">
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
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded font-bold cursor-pointer text-xs transition-colors shrink-0"
                >
                  Purge All Registered Accounts
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Protected master accounts (admin, VC) cannot be deleted.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
