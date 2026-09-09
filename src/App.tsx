import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HODEntryForm } from './components/HODEntryForm';
import { VCDashboard } from './components/VCDashboard';
import { FirebaseSchemaModal } from './components/FirebaseSchemaModal';
import { UserIdentificationModal } from './components/UserIdentificationModal';
import { StorageService } from './services/storageService';
import { SubmissionRecord, ActiveUserSession, AcademicShift } from './types';
import { UNIVERSITY_DEPARTMENTS } from './data/departmentsData';
import {
  CheckCircle2,
  Database,
  Building,
  User,
  ShieldCheck,
  GraduationCap,
  Layers,
} from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'HOD' | 'VC'>('HOD');
  const [allRecords, setAllRecords] = useState<SubmissionRecord[]>([]);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<ActiveUserSession>(() =>
    StorageService.getActiveUser()
  );

  // Program, Shift, and Semester selection state to coordinate between VC and HOD view
  const [targetDept, setTargetDept] = useState<string>('Department of Computer Science');
  const [targetProg, setTargetProg] = useState<string>('BS Computer Science');
  const [targetShift, setTargetShift] = useState<AcademicShift>('Morning');
  const [targetSession, setTargetSession] = useState<string>(() => StorageService.getSelectedSession());
  const [targetSemester, setTargetSemester] = useState<string>('1');

  const reloadRecords = () => {
    const list = StorageService.getAllSubmissions();
    setAllRecords(list);
  };

  useEffect(() => {
    reloadRecords();
    // Log application visit
    StorageService.logAccess('Accessed MNS-UET Result Portal', targetDept);
  }, []);

  const handleInspectProgramFromVC = (
    dept: string,
    prog: string,
    shift?: AcademicShift,
    session?: string,
    semester?: string
  ) => {
    setTargetDept(dept);
    setTargetProg(prog);
    if (shift) setTargetShift(shift);
    if (session) setTargetSession(session);
    if (semester) setTargetSemester(semester);
    setActiveView('HOD');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedDeptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === targetDept);
  const selectedProgObj = selectedDeptObj?.programs.find((p) => p.name === targetProg);
  const targetDegreeLevel = selectedProgObj?.degreeLevel || 'BS';

  const currentRecord = StorageService.getSubmission(
    targetDept,
    targetProg,
    targetDegreeLevel,
    targetShift,
    targetSession,
    targetSemester
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Institutional Top Navigation Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        currentUser={currentUser}
        savedCount={allRecords.length}
        currentSession={targetSession}
        currentSemester={targetSemester}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        {/* Department Quick Switcher Bar */}
        <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-800 text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
              Session 2023 Departments
            </span>
            <span className="hidden md:inline text-slate-500">
              Quick navigate department forms:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {UNIVERSITY_DEPARTMENTS.map((dept) => {
              const isActive = targetDept === dept.name;
              const session2023Prog =
                dept.programs.find((p) => p.session2023) || dept.programs[0];

              return (
                <button
                  key={dept.name}
                  type="button"
                  onClick={() => {
                    setTargetDept(dept.name);
                    if (session2023Prog) setTargetProg(session2023Prog.name);
                    setActiveView('HOD');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                    isActive && activeView === 'HOD'
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {dept.code}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              Database:{' '}
              {allRecords.length === 0 ? (
                <strong className="text-slate-500">Fresh (Clean, 0 records)</strong>
              ) : (
                <strong className="text-emerald-700">{allRecords.length} Saved Record(s)</strong>
              )}
            </span>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-1 text-slate-700 hover:text-emerald-900 underline cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              {currentUser.name}
            </button>
          </div>
        </div>

        {/* View Switching: HOD Entry Form or VC Dashboard */}
        {activeView === 'HOD' ? (
          <HODEntryForm
            onRecordSavedOrDeleted={reloadRecords}
            selectedDepartmentProp={targetDept}
            selectedProgramProp={targetProg}
            selectedShiftProp={targetShift}
            selectedSessionProp={targetSession}
            selectedSemesterProp={targetSemester}
            onSessionChangedProp={(newSess) => setTargetSession(newSess)}
            onSemesterChangedProp={(newSem) => setTargetSemester(newSem)}
            onDepartmentChangedProp={(newDept) => setTargetDept(newDept)}
            onProgramChangedProp={(newProg) => setTargetProg(newProg)}
            onShiftChangedProp={(newShift) => setTargetShift(newShift)}
            currentUser={currentUser}
            onOpenUserModal={() => setIsUserModalOpen(true)}
            onSwitchToVC={() => setActiveView('VC')}
          />
        ) : (
          <VCDashboard
            onSelectProgramToEdit={handleInspectProgramFromVC}
            allRecords={allRecords}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-slate-800 p-0.5 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <span className="font-semibold text-slate-200">
              Muhammad Nawaz Sharif University of Engineering & Technology (MNS-UET), Multan
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span className="text-emerald-300 font-medium">
              Academic Session {targetSession} – Semester {targetSemester} Portal
            </span>
            <span>•</span>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
            >
              Access Identity Traceability
            </button>
            <span>•</span>
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
            >
              Database Status & Schema
            </button>
          </div>
        </div>
      </footer>

      {/* User Identification / Traceability Modal */}
      <UserIdentificationModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
        onUserSaved={(user) => {
          setCurrentUser(user);
          reloadRecords();
        }}
      />

      {/* Database Schema & Audit Modal */}
      <FirebaseSchemaModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        currentRecord={currentRecord}
        allRecords={allRecords}
      />
    </div>
  );
}
