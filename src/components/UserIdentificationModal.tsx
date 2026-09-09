import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Check, X, Building, Award } from 'lucide-react';
import { ActiveUserSession } from '../types';
import { UNIVERSITY_DEPARTMENTS } from '../data/departmentsData';
import { StorageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserSaved: (user: ActiveUserSession) => void;
  currentUser: ActiveUserSession;
}

export const UserIdentificationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onUserSaved,
  currentUser,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [designation, setDesignation] = useState(currentUser.designation || 'HOD / Chairman');
  const [department, setDepartment] = useState(
    currentUser.department || UNIVERSITY_DEPARTMENTS[0].name
  );

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setDesignation(currentUser.designation || 'HOD / Chairman');
      setDepartment(currentUser.department || UNIVERSITY_DEPARTMENTS[0].name);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const session: ActiveUserSession = {
      name: name.trim(),
      designation: designation.trim(),
      department: department.trim(),
    };

    StorageService.setActiveUser(session);
    onUserSaved(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">HOD & Faculty Access Traceability</h3>
              <p className="text-[11px] text-emerald-200">
                Identify yourself for MNS-UET audit records (No password needed)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-200 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900 leading-relaxed">
            Please enter your name and designation. Every result sheet you save or update will be
            clearly tracked with your name in the university database.
          </div>

          {/* User Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              Your Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Muhammad Tariq"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Official Designation */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              Designation / Role
            </label>
            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
            >
              <option value="HOD / Chairman">HOD / Chairman</option>
              <option value="Program Coordinator">Program Coordinator</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Lecturer / Teacher">Lecturer / Teacher</option>
              <option value="Dean of Faculty">Dean of Faculty</option>
              <option value="Office of Controller Examinations">Office of Controller Examinations</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-700" />
              Associated Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
            >
              {UNIVERSITY_DEPARTMENTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Identification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
