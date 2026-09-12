import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HODEntryForm } from './components/HODEntryForm';
import { VCDashboard } from './components/VCDashboard';
import { FirebaseSchemaModal } from './components/FirebaseSchemaModal';
import { UserIdentificationModal } from './components/UserIdentificationModal';
import { UserAccountsModal } from './components/UserAccountsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { SubmissionRecord, ActiveUserSession, AcademicShift, MonitoringModuleId } from './types';
import { UNIVERSITY_DEPARTMENTS } from './data/departmentsData';
import { SidebarNavigation } from './components/SidebarNavigation';
import { WorkOnDemandView } from './components/WorkOnDemandView';
import {
  CheckCircle2,
  Database,
  Building,
  User,
  ShieldCheck,
  GraduationCap,
  Layers,
  Lock,
  BookOpen,
  Briefcase,
} from 'lucide-react';

export default function App() {
  // Splash screen state: show once on fresh launch
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authenticated user session
  const [currentUser, setCurrentUser] = useState<ActiveUserSession | null>(() =>
    AuthService.getCurrentSession()
  );

  const [activeModule, setActiveModule] = useState<MonitoringModuleId>('LMS');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isInspectionMode, setIsInspectionMode] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<'HOD' | 'VC'>(() => {
    const session = AuthService.getCurrentSession();
    if (session?.role === 'VC') return 'VC';
    return 'HOD';
  });
  const [allRecords, setAllRecords] = useState<SubmissionRecord[]>([]);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isUserAccountsModalOpen, setIsUserAccountsModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Initialize theme on app boot
  useEffect(() => {
    AuthService.initTheme();
  }, []);

  // Program, Shift, and Semester selection state
  const [targetDept, setTargetDept] = useState<string>(() => {
    const session = AuthService.getCurrentSession();
    if (session?.role === 'HOD' && session.department) {
      return session.department;
    }
    return 'Department of Computer Science';
  });

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
    StorageService.logAccess('Accessed MNS-UET Result Portal', targetDept);
  }, []);

  // Listen for storage changes across tabs
  useEffect(() => {
    const handleStorageUpdate = () => {
      reloadRecords();
    };
    const handleAuthUpdate = () => {
      const session = AuthService.getCurrentSession();
      setCurrentUser(session);
    };
    window.addEventListener('mnsuet_storage_updated', handleStorageUpdate);
    window.addEventListener('mnsuet_auth_changed', handleAuthUpdate);
    return () => {
      window.removeEventListener('mnsuet_storage_updated', handleStorageUpdate);
      window.removeEventListener('mnsuet_auth_changed', handleAuthUpdate);
    };
  }, []);

  // Set default view depending on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'VC') {
        setActiveView('VC');
      } else {
        setActiveView('HOD');
        if (currentUser.department) {
          setTargetDept(currentUser.department);
        }
        if (currentUser.program) {
          setTargetProg(currentUser.program);
        } else if (currentUser.department) {
          const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === currentUser.department);
          if (deptObj && deptObj.programs.length > 0) {
            setTargetProg(deptObj.programs[0].name);
          }
        }
      }
    }
  }, [currentUser]);

  const handleAuthenticated = (session: ActiveUserSession) => {
    setCurrentUser(session);
    setActiveModule('LMS');
    if (session.role === 'VC') {
      setActiveView('VC');
      setIsInspectionMode(false);
    } else {
      setActiveView('HOD');
      setIsInspectionMode(false);
      if (session.department) {
        setTargetDept(session.department);
      }
      if (session.program) {
        setTargetProg(session.program);
      } else if (session.department) {
        const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === session.department);
        if (deptObj && deptObj.programs.length > 0) {
          setTargetProg(deptObj.programs[0].name);
        }
      }
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    try {
      localStorage.removeItem('mnsuet_active_user_v2');
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleInspectProgramFromVC = (
    dept: string,
    prog: string,
    shift?: AcademicShift,
    session?: string,
    semester?: string
  ) => {
    // Only Admin can jump to HOD entry for other departments from VC dashboard
    if (currentUser?.role === 'HOD' && currentUser.department !== dept) {
      setToastMessage('Department Isolation: You can only edit results for your assigned department.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setTargetDept(dept);
    setTargetProg(prog);
    if (shift) setTargetShift(shift);
    if (session) setTargetSession(session);
    if (semester) setTargetSemester(semester);
    setIsInspectionMode(true);
    setActiveView('HOD');
    setActiveModule('LMS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If splash screen is still active, show it
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // If no user is logged in, show the Authentication screen
  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

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

  const isAdmin = currentUser.role === 'ADMIN';
  const isVC = currentUser.role === 'VC';
  const isCoordinator = currentUser.role === 'COORDINATOR';
  const isLecturer = currentUser.role === 'LECTURER';
  const isVisitingLecturer = currentUser.role === 'VISITING_LECTURER';
  const isHOD = currentUser.role === 'HOD';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* Institutional Left-Side Monitoring Tabs Sidebar */}
      <SidebarNavigation
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          if (mod === 'LMS') {
            if (currentUser.role === 'VC') {
              setActiveView('VC');
              setIsInspectionMode(false);
            }
          }
        }}
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          if (view === 'HOD' && currentUser.role === 'VC') {
            setIsInspectionMode(true);
          } else if (view === 'VC') {
            setIsInspectionMode(false);
          }
        }}
        currentUser={currentUser}
        currentSession={targetSession}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((prev) => !prev)}
        savedCount={allRecords.length}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Institutional Top Navigation Header */}
        <Header
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            if (view === 'HOD' && currentUser.role === 'VC') {
              setIsInspectionMode(true);
            } else if (view === 'VC') {
              setIsInspectionMode(false);
            }
          }}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          onOpenUserAccountsModal={() => setIsUserAccountsModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onLogout={handleLogout}
          currentUser={currentUser}
          savedCount={allRecords.length}
          currentSession={targetSession}
          currentSemester={targetSemester}
          onToggleMobileSidebar={() => setIsSidebarOpenMobile((prev) => !prev)}
          activeModule={activeModule}
        />

        {/* Main Container */}
        <main className="max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 space-y-4 sm:space-y-6">
          {activeModule === 'WORK_ON_DEMAND' ? (
            <WorkOnDemandView
              currentUser={currentUser}
              currentSession={targetSession}
              onSwitchToLMS={() => setActiveModule('LMS')}
              onOpenDatabaseModal={() => setIsFirebaseModalOpen(true)}
            />
          ) : (
            <>
              {toastMessage && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 px-4 py-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
                  <span>{toastMessage}</span>
                  <button
                    type="button"
                    onClick={() => setToastMessage(null)}
                    className="text-rose-700 hover:text-rose-900 font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

        {/* Department Quick Switcher Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-300 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* If Coordinator, Lecturer, Visiting Lecturer, or HOD */}
          {isCoordinator ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-teal-800 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-teal-300" />
                Coordinated Program: {currentUser.program || targetProg}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded border border-slate-300 dark:border-slate-700">
                {currentUser.department}
              </span>
            </div>
          ) : isLecturer ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-sky-800 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-sky-300" />
                Lecturer: {currentUser.program || targetProg}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded border border-slate-300 dark:border-slate-700">
                {currentUser.department}
              </span>
            </div>
          ) : isVisitingLecturer ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-800 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                Visiting Lecturer: {currentUser.program || targetProg}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded border border-slate-300 dark:border-slate-700">
                {currentUser.department}
              </span>
            </div>
          ) : isHOD ? (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-800 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3 h-3 text-emerald-300" />
                Department Isolation Active
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded border border-slate-300 dark:border-slate-700">
                {currentUser.department}
              </span>
            </div>
          ) : (
            /* If Admin or VC: Show quick switcher buttons */
            <>
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 dark:bg-slate-800 text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
                  {isAdmin ? 'Admin Department Switcher' : 'University Departments (Audit Inspection)'}
                </span>
                <span className="hidden md:inline text-slate-500 dark:text-slate-400">
                  {isVC ? 'Click to inspect department:' : 'Switch department:'}
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
                        if (currentUser.role === 'VC') {
                          setIsInspectionMode(true);
                        }
                        setActiveView('HOD');
                        setActiveModule('LMS');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                        isActive && activeView === 'HOD'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {dept.code}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Database indicator & User profile quick trigger */}
          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Database: </span>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsFirebaseModalOpen(true)}
                  className="font-bold text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                >
                  {allRecords.length} Saved Record(s) (Manage)
                </button>
              ) : (
                <strong className="text-emerald-800 dark:text-emerald-400 font-bold">
                  {allRecords.length} Total Saved
                </strong>
              )}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer font-bold transition-colors group"
              title="Click to adjust your profile image, name, password, or theme"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-4 h-4 rounded-full object-cover border border-emerald-500 shrink-0"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600" />
              )}
              <span className="max-w-[150px] truncate">{currentUser.name}</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 underline font-normal hidden sm:inline">
                (Edit Profile)
              </span>
            </button>
          </div>
        </div>

        {/* View Switching: HOD Entry Form (Read-only for VC / Inspection) or VC Dashboard */}
        {activeView === 'HOD' ? (
          <HODEntryForm
            readOnly={currentUser.role === 'VC' || isInspectionMode}
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
            onSwitchToVC={() => {
              setIsInspectionMode(false);
              setActiveView('VC');
            }}
          />
        ) : (
          <VCDashboard
            onSelectProgramToEdit={handleInspectProgramFromVC}
            allRecords={allRecords}
          />
        )}
            </>
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
              <span className="text-slate-400">
                Role: <strong className="text-white">{currentUser.role}</strong>
              </span>
              {/* ONLY ADMIN SEES DATABASE LINK */}
              {isAdmin && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setIsFirebaseModalOpen(true)}
                    className="text-red-400 hover:text-red-300 font-semibold underline cursor-pointer"
                  >
                    Admin Database Control & Danger Zone
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* User Profile Management Modal (Photo, Name, Password, Day/Night Theme) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updatedSession) => {
          setCurrentUser(updatedSession);
          reloadRecords();
        }}
      />

      {/* User Identification / Profile View Modal */}
      <UserIdentificationModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
        onUserSaved={(updatedUser) => {
          setCurrentUser(updatedUser);
          reloadRecords();
        }}
      />

      {/* Admin User Accounts Management Modal */}
      {isAdmin && (
        <UserAccountsModal
          isOpen={isUserAccountsModalOpen}
          onClose={() => setIsUserAccountsModalOpen(false)}
        />
      )}

      {/* Database Schema & Danger Zone Modal (Admin only) */}
      {isAdmin && (
        <FirebaseSchemaModal
          isOpen={isFirebaseModalOpen}
          onClose={() => setIsFirebaseModalOpen(false)}
          currentRecord={currentRecord}
          allRecords={allRecords}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
