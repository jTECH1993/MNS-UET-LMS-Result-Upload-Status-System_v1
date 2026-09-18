import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount, UserRole, AcademicShift } from '../types';
import { AuthService } from '../services/authService';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import {
  Users,
  X,
  UserCheck,
  Building,
  GraduationCap,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  SunMoon,
  ArrowRightLeft,
  UserPlus,
  Briefcase,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDepartment?: string;
  currentUserRole?: UserRole;
  onCoordinatorUpdated?: (updatedAccount: UserAccount) => void;
}

export const CoordinatorAssignmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultDepartment = 'Department of Computer Science',
  currentUserRole,
  onCoordinatorUpdated,
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(defaultDepartment);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Form Fields for Selected User
  const [role, setRole] = useState<UserRole>('COORDINATOR');
  const [designation, setDesignation] = useState<string>('');
  const [primaryProgram, setPrimaryProgram] = useState<string>('');
  const [assignedPrograms, setAssignedPrograms] = useState<string[]>([]);
  const [programToAdd, setProgramToAdd] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'Both' | 'Morning' | 'Evening'>('Both');

  // New Faculty Member Creation Mode
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('COORDINATOR');
  const [newProgram, setNewProgram] = useState<string>('');

  // Feedback status
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Active department object and programs list
  const currentDeptObj = useMemo(() => {
    return (
      UNIVERSITY_DEPARTMENTS.find(
        (d) => d.name.trim().toLowerCase() === selectedDept.trim().toLowerCase()
      ) || UNIVERSITY_DEPARTMENTS[0]
    );
  }, [selectedDept]);

  const departmentPrograms = useMemo(() => {
    return currentDeptObj.programs || [];
  }, [currentDeptObj]);

  // Load accounts from AuthService
  const reloadAccounts = () => {
    const all = AuthService.getAccounts();
    setAccounts(all);
  };

  useEffect(() => {
    if (isOpen) {
      reloadAccounts();
      if (defaultDepartment) {
        setSelectedDept(defaultDepartment);
      }
      setSuccessMessage('');
      setErrorMessage('');
      setIsCreatingNew(false);
    }
  }, [isOpen, defaultDepartment]);

  // Filter department coordinators & faculty (exclude root Admin & VC)
  const deptAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (a.username.toLowerCase() === 'admin' || a.username.toLowerCase() === 'vc') return false;
      return a.department?.trim().toLowerCase() === selectedDept.trim().toLowerCase();
    });
  }, [accounts, selectedDept]);

  // Initialize selected user when accounts or department changes
  useEffect(() => {
    if (!isOpen) return;

    if (deptAccounts.length > 0) {
      // Keep existing selection if valid, otherwise pick first coordinator or first faculty
      const found = deptAccounts.find((a) => a.id === selectedUserId);
      if (!found) {
        const firstCoord = deptAccounts.find((a) => a.role === 'COORDINATOR') || deptAccounts[0];
        setSelectedUserId(firstCoord.id);
      }
    } else {
      setSelectedUserId('');
    }
  }, [deptAccounts, isOpen]);

  // Populate editor form whenever selected user changes
  useEffect(() => {
    if (!selectedUserId || isCreatingNew) return;

    const targetUser = accounts.find((a) => a.id === selectedUserId);
    if (!targetUser) return;

    setRole(targetUser.role || 'COORDINATOR');
    setDesignation(targetUser.designation || '');

    const defaultProg =
      targetUser.program ||
      (departmentPrograms[0] ? departmentPrograms[0].name : 'BS Computer Science');
    setPrimaryProgram(defaultProg);

    const initialAssigned = targetUser.assignedPrograms && targetUser.assignedPrograms.length > 0
      ? targetUser.assignedPrograms
      : [defaultProg];
    setAssignedPrograms(initialAssigned);

    // Initial shifts
    if (targetUser.assignedShifts && targetUser.assignedShifts.length > 0) {
      if (targetUser.assignedShifts.includes('Morning') && targetUser.assignedShifts.includes('Evening')) {
        setSelectedShift('Both');
      } else if (targetUser.assignedShifts.includes('Morning')) {
        setSelectedShift('Morning');
      } else {
        setSelectedShift('Evening');
      }
    } else {
      setSelectedShift('Both');
    }

    // Set fallback program to add
    const unassigned = departmentPrograms.find((p) => !initialAssigned.includes(p.name));
    setProgramToAdd(unassigned ? unassigned.name : '');
  }, [selectedUserId, accounts, departmentPrograms, isCreatingNew]);

  if (!isOpen) return null;

  // Change user role with smart designation suggestion
  const handleRoleChange = (newRoleValue: UserRole) => {
    setRole(newRoleValue);
    if (newRoleValue === 'COORDINATOR') {
      setDesignation((prev) => {
        if (!prev || prev.includes('Lecturer') || prev.includes('Faculty')) {
          return `Program Coordinator (${primaryProgram || 'Program'})`;
        }
        return prev;
      });
    } else if (newRoleValue === 'LECTURER') {
      setDesignation((prev) => {
        if (!prev || prev.includes('Coordinator')) {
          return 'Lecturer / Regular Faculty';
        }
        return prev;
      });
    } else if (newRoleValue === 'VISITING_LECTURER') {
      setDesignation((prev) => {
        if (!prev || prev.includes('Coordinator') || prev.includes('Regular')) {
          return 'Visiting Lecturer';
        }
        return prev;
      });
    }
  };

  // Primary Program change (Shift coordinator to any other program)
  const handlePrimaryProgramChange = (newProg: string) => {
    setPrimaryProgram(newProg);
    // Ensure primary program is in assigned programs list
    if (!assignedPrograms.includes(newProg)) {
      setAssignedPrograms((prev) => [newProg, ...prev]);
    }
    // Update designation if it explicitly references old program
    if (role === 'COORDINATOR' && designation.includes('Coordinator (')) {
      setDesignation(`Program Coordinator (${newProg})`);
    }
  };

  // Add another program to coordinator's portfolio
  const handleAddProgram = () => {
    if (!programToAdd) return;
    if (!assignedPrograms.includes(programToAdd)) {
      setAssignedPrograms((prev) => [...prev, programToAdd]);
      setSuccessMessage(`Added "${programToAdd}" to coordinator's scope.`);
      setTimeout(() => setSuccessMessage(''), 2500);
    }
    // Pick next unassigned program for the add dropdown
    const remaining = departmentPrograms.find(
      (p) => p.name !== programToAdd && !assignedPrograms.includes(p.name)
    );
    setProgramToAdd(remaining ? remaining.name : '');
  };

  // Delete / Remove program from coordinator's portfolio
  const handleDeleteProgram = (progToDelete: string) => {
    if (assignedPrograms.length <= 1) {
      setErrorMessage('A coordinator or faculty member must have at least one assigned program.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const nextAssigned = assignedPrograms.filter((p) => p !== progToDelete);
    setAssignedPrograms(nextAssigned);

    // If deleted program was primary, pick the first remaining as primary
    if (primaryProgram === progToDelete) {
      setPrimaryProgram(nextAssigned[0]);
    }

    setSuccessMessage(`Removed "${progToDelete}" from coordinator's scope.`);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  // Save changes to selected user account
  const handleSaveChanges = async () => {
    if (!selectedUserId) {
      setErrorMessage('Please select a faculty member or coordinator from the dropdown.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const shiftsArray: AcademicShift[] =
      selectedShift === 'Both' ? ['Morning', 'Evening'] : [selectedShift];

    // Build per-program shifts map
    const progShifts: Record<string, AcademicShift[]> = {};
    assignedPrograms.forEach((p) => {
      progShifts[p] = shiftsArray;
    });

    const updateRes = AuthService.updateProfile(selectedUserId, {
      role,
      designation: designation.trim() || undefined,
      department: selectedDept,
      program: primaryProgram,
      assignedPrograms,
      assignedShifts: shiftsArray,
      programShiftAssignments: progShifts,
    });

    setIsSaving(false);

    if (updateRes.success) {
      setSuccessMessage(
        `Profile successfully updated! ${selectedTargetUser?.name || 'User'} is now allocated as ${
          role === 'COORDINATOR'
            ? 'Program Coordinator'
            : role === 'LECTURER'
            ? 'Regular Faculty'
            : 'Visiting Faculty'
        } for ${primaryProgram} (${assignedPrograms.length} program(s) assigned).`
      );
      reloadAccounts();

      const updatedAcc = AuthService.getAccounts().find((a) => a.id === selectedUserId);
      if (updatedAcc && onCoordinatorUpdated) {
        onCoordinatorUpdated(updatedAcc);
      }
    } else {
      setErrorMessage(updateRes.message || 'Failed to update coordinator profile.');
    }
  };

  // Create & Register New Faculty/Coordinator
  const handleCreateNewAccount = () => {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim() || !newEmail.trim()) {
      setErrorMessage('All fields (Full Name, Email, Username, Password) are required.');
      return;
    }

    const targetProg = newProgram || (departmentPrograms[0]?.name || 'BS Computer Science');
    const shiftsArray: AcademicShift[] =
      selectedShift === 'Both' ? ['Morning', 'Evening'] : [selectedShift];

    const defaultDesig =
      newRole === 'COORDINATOR'
        ? `Program Coordinator (${targetProg})`
        : newRole === 'LECTURER'
        ? 'Lecturer / Regular Faculty'
        : 'Visiting Lecturer';

    const result = AuthService.registerAccount({
      name: newName.trim(),
      email: newEmail.trim(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      department: selectedDept,
      role: newRole,
      designation: defaultDesig,
      program: targetProg,
      assignedPrograms: [targetProg],
      assignedShifts: shiftsArray,
      programShiftAssignments: { [targetProg]: shiftsArray },
    });

    if (result.success) {
      setSuccessMessage(
        `New ${newRole === 'COORDINATOR' ? 'Coordinator' : 'Faculty Member'} "${newName}" created successfully and registered under ${selectedDept}!`
      );
      reloadAccounts();
      setIsCreatingNew(false);
      setNewName('');
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');

      const created = AuthService.getAccounts().find((a) => a.username === newUsername.trim());
      if (created) {
        setSelectedUserId(created.id);
      }
    } else {
      setErrorMessage(result.message);
    }
  };

  const selectedTargetUser = accounts.find((a) => a.id === selectedUserId);
  const isHOD = currentUserRole === 'HOD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Coordinator &amp; Faculty Program Allocation Manager
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  HOD Administrative Control
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reallocate coordinators to other degree programs, add/delete programs, and switch roles between Coordinator, Regular Faculty, and Visiting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Notifications */}
        {successMessage && (
          <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 text-rose-950 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Top Bar: Department & New Faculty Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-500 font-medium">Department: </span>
                {isHOD ? (
                  <strong className="text-slate-900 font-bold">{selectedDept}</strong>
                ) : (
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {UNIVERSITY_DEPARTMENTS.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                  {deptAccounts.length} Staff Registered
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCreatingNew
                    ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs'
                }`}
              >
                {isCreatingNew ? (
                  <>
                    <Users className="w-3.5 h-3.5" /> Back to Existing Faculty
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> + Register New Faculty / Coordinator
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MODE 1: CREATE NEW FACULTY MEMBER / COORDINATOR */}
          {isCreatingNew ? (
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-5 space-y-4 animate-in fade-in">
              <div className="border-b border-emerald-200 pb-2.5">
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  Register New Department Coordinator or Faculty Member
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Create an institutional login account and assign their degree program and administrative role.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Engr. Muhammad Talha Jahangir"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. faculty@mnsuet.edu.pk"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. talha_coord"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. Qwe12!@!@"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Role <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="COORDINATOR">Program Coordinator (Can Upload &amp; Monitor LMS)</option>
                    <option value="LECTURER">Regular Faculty / Lecturer</option>
                    <option value="VISITING_LECTURER">Visiting Faculty / Lecturer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Degree Program <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newProgram || (departmentPrograms[0]?.name || '')}
                    onChange={(e) => setNewProgram(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {departmentPrograms.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.degreeLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewAccount}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Register Faculty
                </button>
              </div>
            </div>
          ) : (
            /* MODE 2: REASSIGN / SHIFT PROGRAM & EDIT EXISTING FACULTY */
            <div className="space-y-6">
              {/* Coordinator / Faculty Dropdown Selector */}
              <div className="bg-white border-2 border-emerald-500/60 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <label
                      htmlFor="select-coordinator-dropdown"
                      className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      Select Coordinator or Faculty Member (Drop-down Menu):
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose any departmental coordinator or faculty member to shift their degree program or change their role.
                    </p>
                  </div>
                  {selectedTargetUser && (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        role === 'COORDINATOR'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : role === 'LECTURER'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-purple-100 text-purple-900 border border-purple-300'
                      }`}
                    >
                      Current: {role === 'COORDINATOR' ? 'Program Coordinator' : role === 'LECTURER' ? 'Regular Faculty' : 'Visiting Lecturer'}
                    </span>
                  )}
                </div>

                {deptAccounts.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    <p>No faculty or coordinator accounts found for {selectedDept}.</p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="mt-2 text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                    >
                      + Register the first Coordinator or Faculty Member now
                    </button>
                  </div>
                ) : (
                  <div>
                    <select
                      id="select-coordinator-dropdown"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-300 hover:border-emerald-500 focus:border-emerald-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                    >
                      {/* Group coordinators first */}
                      <optgroup label="Program Coordinators">
                        {deptAccounts
                          .filter((a) => a.role === 'COORDINATOR')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              ★ {a.name} — Coordinator [{a.program || 'No Program'}] ({a.designation || 'Coordinator'})
                            </option>
                          ))}
                      </optgroup>
                      {/* Regular faculty */}
                      <optgroup label="Regular Faculty / Lecturers">
                        {deptAccounts
                          .filter((a) => a.role === 'LECTURER')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              ● {a.name} — Regular Faculty [{a.program || 'Faculty'}] ({a.designation || 'Lecturer'})
                            </option>
                          ))}
                      </optgroup>
                      {/* Visiting faculty */}
                      <optgroup label="Visiting Faculty / Lecturers">
                        {deptAccounts
                          .filter((a) => a.role === 'VISITING_LECTURER')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              ○ {a.name} — Visiting Lecturer [{a.program || 'Visiting'}]
                            </option>
                          ))}
                      </optgroup>
                      {/* Other staff if any */}
                      {deptAccounts.some(
                        (a) => a.role !== 'COORDINATOR' && a.role !== 'LECTURER' && a.role !== 'VISITING_LECTURER'
                      ) && (
                        <optgroup label="Other Department Accounts">
                          {deptAccounts
                            .filter(
                              (a) =>
                                a.role !== 'COORDINATOR' &&
                                a.role !== 'LECTURER' &&
                                a.role !== 'VISITING_LECTURER'
                            )
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.role})
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {/* Form Controls for Selected User */}
                {selectedTargetUser && (
                  <div className="pt-3 border-t border-slate-100 space-y-5">
                    {/* User Identity Info Card */}
                    <div className="bg-slate-50 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs border border-slate-200">
                      <div>
                        <span className="text-slate-500 font-medium">Managing: </span>
                        <strong className="text-slate-900 font-bold">{selectedTargetUser.name}</strong>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-600 font-mono text-[11px]">{selectedTargetUser.username}</span>
                        {selectedTargetUser.email && (
                          <>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-slate-600">{selectedTargetUser.email}</span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {selectedTargetUser.department}
                      </div>
                    </div>

                    {/* SECTION A: ROLE SELECTION (Coordinator -> Regular Faculty -> Visiting) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                        Role Allocation (Automatically changes his profile):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleRoleChange('COORDINATOR')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            role === 'COORDINATOR'
                              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/30'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">Program Coordinator</span>
                            {role === 'COORDINATOR' && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Granted administrative privileges to submit &amp; monitor LMS result uploads for assigned programs.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRoleChange('LECTURER')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            role === 'LECTURER'
                              ? 'bg-blue-50/90 border-blue-500 text-blue-950 ring-2 ring-blue-500/30'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">Regular Faculty</span>
                            {role === 'LECTURER' && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Standard department faculty / Lecturer / Assistant Professor profile with academic teaching scope.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRoleChange('VISITING_LECTURER')}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            role === 'VISITING_LECTURER'
                              ? 'bg-purple-50/90 border-purple-500 text-purple-950 ring-2 ring-purple-500/30'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">Visiting Faculty</span>
                            {role === 'VISITING_LECTURER' && (
                              <CheckCircle2 className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Visiting Lecturer profile allocated for session-based courses and guest faculty roles.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Official Designation Field */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Official Academic Designation (Displayed on records &amp; reports):
                      </label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Assistant Professor & Program Coordinator"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    {/* SECTION B: SHIFT PROGRAM (PRIMARY DEGREE PROGRAM) */}
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                      <div>
                        <label
                          htmlFor="select-primary-program"
                          className="text-xs font-bold text-emerald-950 flex items-center gap-1.5"
                        >
                          <GraduationCap className="w-4 h-4 text-emerald-700" />
                          Shift / Reassign Primary Program (Shift Coordinator to any Program):
                        </label>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Select the program from the dropdown below to immediately shift this coordinator/faculty to that program.
                        </p>
                      </div>

                      <select
                        id="select-primary-program"
                        value={primaryProgram}
                        onChange={(e) => handlePrimaryProgramChange(e.target.value)}
                        className="w-full bg-white border-2 border-emerald-300 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                      >
                        {departmentPrograms.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} ({p.degreeLevel}) {p.name === primaryProgram ? '★ [CURRENT PRIMARY]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SECTION C: ADD OR DELETE PROGRAMS (MULTI-PROGRAM COORDINATOR SCOPE) */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-700" />
                            Multi-Program Scope: Add or Delete Programs
                          </label>
                          <p className="text-[11px] text-slate-500">
                            A coordinator can oversee single or multiple degree programs simultaneously.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                          {assignedPrograms.length} Assigned Program(s)
                        </span>
                      </div>

                      {/* Chips of currently assigned programs with DELETE button */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {assignedPrograms.map((pName) => {
                          const isPrimary = pName === primaryProgram;
                          return (
                            <div
                              key={pName}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                                isPrimary
                                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            >
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span className="truncate max-w-[240px]">{pName}</span>
                              {isPrimary && (
                                <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                                  Primary
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteProgram(pName)}
                                disabled={assignedPrograms.length <= 1}
                                className={`p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${
                                  assignedPrograms.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                                }`}
                                title={
                                  assignedPrograms.length <= 1
                                    ? 'Cannot delete the only assigned program'
                                    : `Delete "${pName}" from coordinator's programs`
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Another Program Row */}
                      {departmentPrograms.some((p) => !assignedPrograms.includes(p.name)) ? (
                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={programToAdd}
                            onChange={(e) => setProgramToAdd(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="">-- Choose additional program to add --</option>
                            {departmentPrograms
                              .filter((p) => !assignedPrograms.includes(p.name))
                              .map((p) => (
                                <option key={p.name} value={p.name}>
                                  + {p.name} ({p.degreeLevel})
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAddProgram}
                            disabled={!programToAdd}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                              programToAdd
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Program
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-800 italic pt-1">
                          ✓ All {departmentPrograms.length} department degree programs are already assigned to this coordinator.
                        </p>
                      )}
                    </div>

                    {/* SECTION D: SHIFT COORDINATION SCOPE (MORNING / EVENING / BOTH) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Coordinated Shifts (Morning / Evening / Both):
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedShift('Morning')}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            selectedShift === 'Morning'
                              ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Morning Only</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedShift('Evening')}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            selectedShift === 'Evening'
                              ? 'bg-indigo-700 border-indigo-800 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Evening Only</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedShift('Both')}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            selectedShift === 'Both'
                              ? 'bg-emerald-700 border-emerald-800 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <SunMoon className="w-3.5 h-3.5" />
                          <span>Both Shifts</span>
                        </button>
                      </div>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500">
                        Changes automatically sync to profile, Firestore cloud, and authentication sessions.
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSaving ? (
                          <span>Updating Profile...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Save &amp; Apply to Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Department Faculty & Coordinator Roster Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    {selectedDept} — Faculty &amp; Coordinator Roster ({deptAccounts.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Click &quot;Edit / Reassign&quot; to load into editor</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="py-2.5 px-3">Faculty / Coordinator</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Primary Program</th>
                          <th className="py-2.5 px-3">Assigned Programs</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deptAccounts.map((acc) => {
                          const isSelected = acc.id === selectedUserId;
                          const isCoord = acc.role === 'COORDINATOR';
                          const isLecturer = acc.role === 'LECTURER';
                          const isVisiting = acc.role === 'VISITING_LECTURER';

                          const programsList =
                            acc.assignedPrograms && acc.assignedPrograms.length > 0
                              ? acc.assignedPrograms
                              : acc.program
                              ? [acc.program]
                              : [];

                          return (
                            <tr
                              key={acc.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                isSelected ? 'bg-emerald-50/60 font-medium' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{acc.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {acc.username} {acc.email ? `• ${acc.email}` : ''}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isCoord
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : isLecturer
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                      : isVisiting
                                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {isCoord ? 'Coordinator' : isLecturer ? 'Regular Faculty' : isVisiting ? 'Visiting Faculty' : acc.role}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {acc.program || '—'}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {programsList.map((p) => (
                                    <span
                                      key={p}
                                      className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                  {programsList.length === 0 && <span className="text-slate-400">—</span>}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                {acc.assignedShifts && acc.assignedShifts.length > 0
                                  ? acc.assignedShifts.join(' & ')
                                  : 'Both'}
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserId(acc.id);
                                    setIsCreatingNew(false);
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-950 border border-emerald-300 rounded font-bold text-[11px] cursor-pointer shadow-2xs transition-colors"
                                >
                                  Edit / Reassign
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Institutional Role &amp; Program Isolation Enforcement</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
