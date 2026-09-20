import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HODEntryForm } from './components/HODEntryForm';
import { VCDashboard } from './components/VCDashboard';
import { FirebaseSchemaModal } from './components/FirebaseSchemaModal';
import { UserIdentificationModal } from './components/UserIdentificationModal';
import { UserAccountsModal } from './components/UserAccountsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthScreen } from './components/AuthScreen';
import { StorageService } from './services/storageService';
import { AuthService } from './services/authService';
import { SubmissionRecord, ActiveUserSession, AcademicShift, MonitoringModuleId } from './types';
import { UNIVERSITY_DEPARTMENTS } from './data/departmentsData';
import { SidebarNavigation } from './components/SidebarNavigation';
import { WorkOnDemandView } from './components/WorkOnDemandView';
import { Session2023SelectorModal } from './components/Session2023SelectorModal';
import { CoordinatorAssignmentModal } from './components/CoordinatorAssignmentModal';
import { AdminDataMigrationModal } from './components/AdminDataMigrationModal';
import { SyncEvidenceToast } from './components/SyncEvidenceToast';
import { SplashScreen } from './components/SplashScreen';
import { JtechLogo } from './components/JtechLogo';
import { RolePerspectiveComparisonModal } from './components/RolePerspectiveComparisonModal';
import { UserAccount } from './types';
import {
  CheckCircle2,
  Database,
  Building,
  User,
  Users,
  ShieldCheck,
  GraduationCap,
  Layers,
  Lock,
  BookOpen,
  Briefcase,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Sparkles,
  Calendar,
  Ban,
  Eye,
  HelpCircle,
  ArrowRight,
  Shield,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  // Application initial splash screen state
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authenticated user session
  const [currentUser, setCurrentUser] = useState<ActiveUserSession | null>(() =>
    AuthService.getCurrentSession()
  );

  const [activeModule, setActiveModule] = useState<MonitoringModuleId>('LMS');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isInspectionMode, setIsInspectionMode] = useState<boolean>(false);

  // Department dropdown menu state (to choose specific program when clicking a department)
  const [openDeptDropdown, setOpenDeptDropdown] = useState<string | null>(null);
  const deptDropdownContainerRef = useRef<HTMLDivElement>(null);

  // Close department dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        deptDropdownContainerRef.current &&
        !deptDropdownContainerRef.current.contains(e.target as Node)
      ) {
        setOpenDeptDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [activeView, setActiveView] = useState<'HOD' | 'VC'>(() => {
    const session = AuthService.getCurrentSession();
    if (session?.role === 'VC') return 'VC';
    return 'HOD';
  });
  const [allRecords, setAllRecords] = useState<SubmissionRecord[]>([]);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isUserAccountsModalOpen, setIsUserAccountsModalOpen] = useState<boolean>(false);
  const [isDataMigrationModalOpen, setIsDataMigrationModalOpen] = useState<boolean>(false);
  const [isCoordinatorAssignModalOpen, setIsCoordinatorAssignModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);

  // Admin Role Preview Simulation Mode: Allows System Admin to view page exactly as HOD or Coordinator
  const [adminPreviewMode, setAdminPreviewMode] = useState<'OFF' | 'HOD' | 'COORDINATOR'>('OFF');
  const [simulatedAccount, setSimulatedAccount] = useState<UserAccount | null>(null);

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
  const [activeSessions, setActiveSessions] = useState<string[]>(() => StorageService.getActiveSessions());
  const [targetSemester, setTargetSemester] = useState<string>('1');
  const [targetAcademicSection, setTargetAcademicSection] = useState<string>('A');

  // Roster configuration modal for coordinators and VC
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [rosterModalDept, setRosterModalDept] = useState<string>('Department of Computer Science');

  // Auto-refresh control state
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mnsuet_auto_refresh_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleToggleAutoRefresh = (enabled: boolean) => {
    setIsAutoRefreshEnabled(enabled);
    try {
      localStorage.setItem('mnsuet_auto_refresh_enabled', JSON.stringify(enabled));
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await StorageService.apiSyncSubmissions();
      reloadRecords();
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const reloadRecords = () => {
    const list = StorageService.getAllSubmissions();
    setAllRecords(list);
    console.log('DEBUG ALLRECORDS:', list);
  };

  useEffect(() => {
    // Initialize Theme on startup
    const savedTheme = AuthService.getCurrentTheme();
    AuthService.applyTheme(savedTheme);

    StorageService.initFirebaseSync();
    StorageService.apiSyncSubmissions().then(() => {
      reloadRecords();
    });
    StorageService.logAccess('Accessed MNS-UET Result Portal', targetDept);
  }, []);

  // Live database data polling controlled by user toggle
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      StorageService.apiSyncSubmissions().then(() => {
        reloadRecords();
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled]);

  // Listen for storage changes, active session switches and roster changes
  useEffect(() => {
    const handleStorageUpdate = () => {
      reloadRecords();
    };
    const handleAuthUpdate = () => {
      const session = AuthService.getCurrentSession();
      setCurrentUser(session);
    };
    const handleSessionsUpdate = () => {
      const currentActive = StorageService.getActiveSessions();
      setActiveSessions(currentActive);
      setTargetSession(StorageService.getSelectedSession());
      reloadRecords();
    };
    const handleRosterUpdate = () => {
      setActiveSessions([...StorageService.getActiveSessions()]);
      reloadRecords();
    };

    window.addEventListener('mnsuet_storage_updated', handleStorageUpdate);
    window.addEventListener('mnsuet_auth_changed', handleAuthUpdate);
    window.addEventListener('mnsuet_sessions_updated', handleSessionsUpdate);
    window.addEventListener('mnsuet_roster_updated', handleRosterUpdate);

    return () => {
      window.removeEventListener('mnsuet_storage_updated', handleStorageUpdate);
      window.removeEventListener('mnsuet_auth_changed', handleAuthUpdate);
      window.removeEventListener('mnsuet_sessions_updated', handleSessionsUpdate);
      window.removeEventListener('mnsuet_roster_updated', handleRosterUpdate);
    };
  }, []);

  // Set default view depending on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'VC') {
        setActiveView('VC');
      } else {
        setActiveView('HOD');
        const userDeptValid = currentUser.department && UNIVERSITY_DEPARTMENTS.some((d) => d.name.trim().toLowerCase() === currentUser.department.trim().toLowerCase() || d.code.trim().toLowerCase() === currentUser.department.trim().toLowerCase());
        if (userDeptValid) {
          setTargetDept(currentUser.department);
        } else {
          setTargetDept(UNIVERSITY_DEPARTMENTS[0].name);
        }

        if (currentUser.program) {
          setTargetProg(currentUser.program);
        } else {
          const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name.trim().toLowerCase() === (currentUser.department || '').trim().toLowerCase()) || UNIVERSITY_DEPARTMENTS[0];
          if (deptObj && deptObj.programs.length > 0) {
            setTargetProg(deptObj.programs[0].name);
          }
        }
        if (currentUser.assignedShifts && currentUser.assignedShifts.length === 1) {
          setTargetShift(currentUser.assignedShifts[0]);
        } else if (currentUser.program && currentUser.department) {
          const eve = StorageService.getSubmission(currentUser.department, currentUser.program, undefined, 'Evening', targetSession, targetSemester, targetAcademicSection);
          const morn = StorageService.getSubmission(currentUser.department, currentUser.program, undefined, 'Morning', targetSession, targetSemester, targetAcademicSection);
          if (eve && !morn) {
            setTargetShift('Evening');
          }
        }
      }
    }
  }, [currentUser]);

  // Validate that targetProg belongs to targetDept; if not, select the first valid program of targetDept
  useEffect(() => {
    if (!targetDept) return;
    const deptObj = UNIVERSITY_DEPARTMENTS.find(
      (d) => d.name.trim().toLowerCase() === targetDept.trim().toLowerCase() || d.code.trim().toLowerCase() === targetDept.trim().toLowerCase()
    );
    if (!deptObj) {
      setTargetDept(UNIVERSITY_DEPARTMENTS[0].name);
      setTargetProg(UNIVERSITY_DEPARTMENTS[0].programs[0].name);
    } else if (deptObj.programs.length > 0) {
      const isValid = deptObj.programs.some((p) => p.name.trim().toLowerCase() === (targetProg || '').trim().toLowerCase());
      if (!isValid) {
        setTargetProg(deptObj.programs[0].name);
      }
    }
  }, [targetDept]);

  const handleAuthenticated = (session: ActiveUserSession) => {
    setCurrentUser(session);
    setActiveModule('LMS');
    if (session.role === 'VC') {
      setActiveView('VC');
      setIsInspectionMode(false);
    } else {
      setActiveView('HOD');
      setIsInspectionMode(false);
      const isAcademicDept = session.department && UNIVERSITY_DEPARTMENTS.some((d) => d.name.trim().toLowerCase() === session.department.trim().toLowerCase() || d.code.trim().toLowerCase() === session.department.trim().toLowerCase());
      if (isAcademicDept) {
        setTargetDept(session.department);
      } else {
        setTargetDept(UNIVERSITY_DEPARTMENTS[0].name);
      }
      const userAssignedProgs = session.assignedPrograms && session.assignedPrograms.length > 0
        ? session.assignedPrograms
        : session.program
        ? [session.program]
        : [];
      if (userAssignedProgs.length > 0) {
        setTargetProg(userAssignedProgs[0]);
        if (session.programShiftAssignments && session.programShiftAssignments[userAssignedProgs[0]]) {
          const shs = session.programShiftAssignments[userAssignedProgs[0]];
          if (shs && shs.length > 0) {
            setTargetShift(shs[0]);
          }
        } else if (session.assignedShifts && session.assignedShifts.length > 0) {
          setTargetShift(session.assignedShifts[0]);
        }
      } else {
        const deptObj = UNIVERSITY_DEPARTMENTS.find((d) => isAcademicDept && d.name.trim().toLowerCase() === session.department.trim().toLowerCase()) || UNIVERSITY_DEPARTMENTS[0];
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
    semester?: string,
    section?: string
  ) => {
    // Only Admin / VC can jump to HOD entry for other departments from VC dashboard
    if (currentUser?.role === 'HOD' && currentUser.department !== dept) {
      setToastMessage('Department Isolation: You can only edit results for your assigned department.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    // Program Coordinator restriction: Only HOD has privilege to select other program coordinator data
    if (currentUser?.role === 'COORDINATOR') {
      const allowed = currentUser.assignedPrograms || (currentUser.program ? [currentUser.program] : []);
      if (allowed.length > 0 && !allowed.some(p => p.trim().toLowerCase() === prog.trim().toLowerCase())) {
        setToastMessage(`Access Restricted: Only Head of Department (HOD) has privilege to select other program coordinators' data. You are assigned to: ${allowed.join(', ')}`);
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
    }

    const normProg = StorageService.normalizeProgramName(prog, dept) || prog;
    setTargetDept(dept);
    setTargetProg(normProg);

    // Intelligently find matching record to inspect if shift/semester/section are not specific or are 'ALL'
    const matchingRecords = StorageService.getAllSubmissions().filter(
      (r) => StorageService._isDeptMatch(r.department, dept) && StorageService._isProgMatch(r.program, normProg)
    );

    const recWithSubjects = matchingRecords.find((r) => r.subjects && r.subjects.some(s => s.courseCode || s.subjectTitle || s.status) && (!shift || shift === ('ALL' as any) || r.shift === shift));

    const validShift = shift && shift !== ('ALL' as any) ? shift : (recWithSubjects?.shift || matchingRecords[0]?.shift || 'Morning');
    setTargetShift(validShift);

    const validSession = session && session !== 'ALL' ? session : (recWithSubjects?.session || matchingRecords[0]?.session || StorageService.getSelectedSession());
    setTargetSession(validSession);

    // If semester was passed as 'ALL' or undefined, select the semester that has actual course rows or default to '1'
    let targetSem = semester && semester !== 'ALL' ? semester : '';
    if (!targetSem) {
      targetSem = recWithSubjects?.semester || matchingRecords[0]?.semester || '1';
    }
    setTargetSemester(targetSem);

    const validSection = section && section !== 'ALL' ? section.trim().toUpperCase() : (recWithSubjects?.section || matchingRecords[0]?.section || 'A');
    setTargetAcademicSection(validSection);

    setIsInspectionMode(true);
    setActiveView('HOD');
    setActiveModule('LMS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If initial splash screen is active, show the splash screen
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // If no user is logged in, show the Authentication screen
  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  const isRootAdmin = currentUser.role === 'ADMIN';

  // Compute effective user session based on Admin Simulator Mode
  const effectiveUser: ActiveUserSession = (() => {
    if (!isRootAdmin) return currentUser;

    if (simulatedAccount) {
      return {
        id: simulatedAccount.id,
        username: simulatedAccount.username,
        name: `${simulatedAccount.name} [Simulated ${simulatedAccount.role}]`,
        email: simulatedAccount.email,
        role: simulatedAccount.role,
        department: simulatedAccount.department || targetDept,
        program: simulatedAccount.program || targetProg,
        assignedPrograms: simulatedAccount.assignedPrograms || (simulatedAccount.program ? [simulatedAccount.program] : [targetProg]),
        assignedShifts: simulatedAccount.assignedShifts,
        programShiftAssignments: simulatedAccount.programShiftAssignments,
        designation: simulatedAccount.designation,
        approvalStatus: simulatedAccount.approvalStatus || 'APPROVED',
        avatarUrl: simulatedAccount.avatarUrl,
      };
    }

    if (adminPreviewMode === 'HOD') {
      return {
        ...currentUser,
        role: 'HOD',
        department: targetDept,
        name: `${currentUser.name} (HOD Simulation)`,
        designation: `Head of Department - ${targetDept}`,
      };
    }

    if (adminPreviewMode === 'COORDINATOR') {
      return {
        ...currentUser,
        role: 'COORDINATOR',
        department: targetDept,
        program: targetProg,
        assignedPrograms: [targetProg],
        approvalStatus: 'APPROVED',
        name: `${currentUser.name} (Coordinator Simulation)`,
        designation: `Program Coordinator - ${targetProg}`,
      };
    }

    return currentUser;
  })();

  const selectedDeptObj = UNIVERSITY_DEPARTMENTS.find((d) => d.name === targetDept);
  const selectedProgObj = selectedDeptObj?.programs.find((p) => p.name === targetProg);
  const targetDegreeLevel = selectedProgObj?.degreeLevel || 'BS';

  const currentRecord = StorageService.getSubmission(
    targetDept,
    targetProg,
    targetDegreeLevel,
    targetShift,
    targetSession,
    targetSemester,
    targetAcademicSection
  );

  const isAdmin = effectiveUser.role === 'ADMIN';
  const isVC = effectiveUser.role === 'VC';
  const isCoordinator = effectiveUser.role === 'COORDINATOR';
  const isLecturer = effectiveUser.role === 'LECTURER';
  const isVisitingLecturer = effectiveUser.role === 'VISITING_LECTURER';
  const isHOD = effectiveUser.role === 'HOD';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* Institutional Left-Side Monitoring Tabs Sidebar */}
      <SidebarNavigation
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          if (mod === 'LMS') {
            if (effectiveUser.role === 'VC') {
              setActiveView('VC');
              setIsInspectionMode(false);
            }
          }
        }}
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          if (view === 'HOD' && effectiveUser.role === 'VC') {
            setIsInspectionMode(true);
          } else if (view === 'VC') {
            setIsInspectionMode(false);
          }
        }}
        currentUser={effectiveUser}
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
            if (view === 'HOD' && effectiveUser.role === 'VC') {
              setIsInspectionMode(true);
            } else if (view === 'VC') {
              setIsInspectionMode(false);
            }
          }}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          onOpenUserAccountsModal={() => setIsUserAccountsModalOpen(true)}
          onOpenDataMigrationModal={() => setIsDataMigrationModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onLogout={handleLogout}
          currentUser={effectiveUser}
          savedCount={allRecords.length}
          currentSession={targetSession}
          currentSemester={targetSemester}
          onToggleMobileSidebar={() => setIsSidebarOpenMobile((prev) => !prev)}
          activeModule={activeModule}
          isAutoRefreshEnabled={isAutoRefreshEnabled}
          onToggleAutoRefresh={handleToggleAutoRefresh}
          onManualRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Main Container */}
        <main className="max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 space-y-4 sm:space-y-6">
          {/* Admin Role Simulation & Perspective Guide Bar (Visible to Administrator) */}
          {isRootAdmin && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 rounded-xl border border-indigo-500/30 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>Admin Role Simulator:</span>
                    {adminPreviewMode === 'OFF' && !simulatedAccount && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">
                        Master Admin View (Full Access)
                      </span>
                    )}
                    {adminPreviewMode === 'HOD' && (
                      <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        Simulating HOD Page ({targetDept})
                      </span>
                    )}
                    {adminPreviewMode === 'COORDINATOR' && (
                      <span className="bg-teal-500/30 text-teal-300 border border-teal-400/40 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        Simulating Coordinator Page ({targetProg})
                      </span>
                    )}
                    {simulatedAccount && (
                      <span className="bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Simulating Account: {simulatedAccount.name} ({simulatedAccount.role})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Switch between HOD and Coordinator views to experience their page layout, banners, and access controls in real time.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View Switch Buttons */}
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedAccount(null);
                    setAdminPreviewMode('OFF');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    adminPreviewMode === 'OFF' && !simulatedAccount
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title="Switch to Full Institutional Admin View"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Master</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimulatedAccount(null);
                    setAdminPreviewMode('HOD');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    adminPreviewMode === 'HOD'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title="Simulate Head of Department (HOD) page with department isolation and delegation tools"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Preview HOD Page</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimulatedAccount(null);
                    setAdminPreviewMode('COORDINATOR');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    adminPreviewMode === 'COORDINATOR'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title="Simulate Program Coordinator page with strict program isolation and HOD notification banner"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Preview Coordinator Page</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsComparisonModalOpen(true)}
                  className="px-2.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-400/40 text-indigo-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open visual breakdown of HOD vs Coordinator interface features"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Comparison Guide</span>
                </button>
              </div>
            </div>
          )}

          {activeModule === 'WORK_ON_DEMAND' ? (
            <WorkOnDemandView
              currentUser={effectiveUser}
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

              <div ref={deptDropdownContainerRef} className="flex flex-wrap items-center gap-2 relative">
                <div className="flex flex-wrap items-center gap-1.5">
                  {UNIVERSITY_DEPARTMENTS.map((dept) => {
                    const isActive = targetDept === dept.name;
                    const isMenuOpen = openDeptDropdown === dept.name;

                    return (
                      <div key={dept.name} className="relative">
                        <button
                          key={dept.name}
                          type="button"
                          id={`btn-dept-${dept.code}`}
                          onClick={() => {
                            setTargetDept(dept.name);
                            // Auto select first applicable program of clicked department
                            const firstProg =
                              dept.programs.find((p) => {
                                const detail = StorageService.getProgramSessionDetail(
                                  dept.name,
                                  p.name,
                                  activeSessions,
                                  allRecords
                                );
                                return detail.isApplicableInSelected;
                              }) || dept.programs[0];
                            if (firstProg) {
                              setTargetProg(firstProg.name);
                            }
                            setOpenDeptDropdown((prev) => (prev === dept.name ? null : dept.name));
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-500/50'
                              : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                          title={`Click to select ${dept.name} (${dept.code}) and view its ${dept.programs.length} programs`}
                        >
                          <span>{dept.code}</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              isMenuOpen ? 'rotate-180 text-emerald-300' : 'opacity-70'
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu showing programs for this department with session-awareness */}
                        {isMenuOpen && (() => {
                          const deptProgDetails = dept.programs.map((prog) => ({
                            prog,
                            detail: StorageService.getProgramSessionDetail(
                              dept.name,
                              prog.name,
                              activeSessions,
                              allRecords
                            ),
                          }));
                          const enrolled = deptProgDetails.filter((d) => d.detail.isApplicableInSelected);
                          const other = deptProgDetails.filter((d) => !d.detail.isApplicableInSelected);
                          const isMulti = activeSessions.length > 1;

                          return (
                            <div
                              id={`dropdown-menu-${dept.code}`}
                              className="absolute left-0 sm:left-auto top-full mt-1.5 w-80 sm:w-96 max-h-[28rem] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-2.5 animate-in fade-in slide-in-from-top-1"
                            >
                              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2 bg-slate-50 dark:bg-slate-850 rounded-lg">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {dept.name}
                                  </span>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded shrink-0">
                                    {dept.programs.length} Offerings
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-750 text-[11px]">
                                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                                    {isMulti ? (
                                      <span>Sessions: <strong className="text-emerald-700 dark:text-emerald-400">{activeSessions.join(' & ')}</strong></span>
                                    ) : (
                                      <span>Session <strong className="text-emerald-700 dark:text-emerald-400">{targetSession}</strong>: {enrolled.length} enrolled</span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRosterModalDept(dept.name);
                                      setIsRosterModalOpen(true);
                                      setOpenDeptDropdown(null);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 cursor-pointer transition-colors"
                                    title="Configure which programs are enrolled in this academic session"
                                  >
                                    <SlidersHorizontal className="w-2.5 h-2.5" />
                                    <span>Configure Roster</span>
                                  </button>
                                </div>
                              </div>

                              {/* If multi-session: show active programs with their applicable session badges */}
                              {isMulti ? (
                                <div className="space-y-1">
                                  <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5">
                                    Session Applicability Matrix ({deptProgDetails.filter(({ detail }) => detail.isApplicableInSelected).length} Programs)
                                  </div>
                                  {deptProgDetails.filter(({ detail }) => detail.isApplicableInSelected).map(({ prog, detail }) => {
                                    const isSelected =
                                      targetDept === dept.name && targetProg === prog.name;

                                    return (
                                      <button
                                        key={prog.name}
                                        type="button"
                                        id={`prog-opt-${dept.code}-${prog.name.replace(/\s+/g, '-').toLowerCase()}`}
                                        onClick={() => {
                                          setTargetDept(dept.name);
                                          setTargetProg(prog.name);
                                          if (currentUser.role === 'VC' || currentUser.role === 'ADMIN') {
                                            setIsInspectionMode(true);
                                          }
                                          setActiveView('HOD');
                                          setActiveModule('LMS');
                                          setOpenDeptDropdown(null);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-1 cursor-pointer ${
                                          isSelected
                                            ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`truncate font-semibold ${isSelected ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                              {prog.name}
                                            </span>
                                            <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold shrink-0">
                                              {prog.degreeLevel}
                                            </span>
                                          </div>
                                          {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${detail.badgeClass}`}>
                                            {detail.statusLabel}
                                          </span>
                                          {detail.hasUploadedRecords && (
                                            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5">
                                              <CheckCircle2 className="w-2.5 h-2.5" />
                                              LMS Active
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                /* Single session mode: cleanly group enrolled vs other offerings */
                                <div className="space-y-2">
                                  {/* Section 1: Enrolled in Target Session */}
                                  <div>
                                    <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded mb-1 flex items-center justify-between">
                                      <span>Session {targetSession} Enrolled Offerings</span>
                                      <span className="font-extrabold">{enrolled.length}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {enrolled.map(({ prog, detail }) => {
                                        const isSelected =
                                          targetDept === dept.name && targetProg === prog.name;
                                        return (
                                          <button
                                            key={prog.name}
                                            type="button"
                                            id={`prog-opt-${dept.code}-${prog.name.replace(/\s+/g, '-').toLowerCase()}`}
                                            onClick={() => {
                                              setTargetDept(dept.name);
                                              setTargetProg(prog.name);
                                              if (currentUser.role === 'VC' || currentUser.role === 'ADMIN') {
                                                setIsInspectionMode(true);
                                              }
                                              setActiveView('HOD');
                                              setActiveModule('LMS');
                                              setOpenDeptDropdown(null);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                              isSelected
                                                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-800'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="truncate">{prog.name}</span>
                                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold shrink-0">
                                                {prog.degreeLevel}
                                              </span>
                                              {detail.hasUploadedRecords && (
                                                <span className="text-[9px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                                                  LMS Active
                                                </span>
                                              )}
                                            </div>
                                            {isSelected && (
                                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* Inline Active Department & Program Quick Selector */}
                {selectedDeptObj && (() => {
                  const deptProgDetails = selectedDeptObj.programs.map((prog) => ({
                    prog,
                    detail: StorageService.getProgramSessionDetail(
                      selectedDeptObj.name,
                      prog.name,
                      activeSessions,
                      allRecords
                    ),
                  }));
                  const enrolled = deptProgDetails.filter((d) => d.detail.isApplicableInSelected);
                  const other = deptProgDetails.filter((d) => !d.detail.isApplicableInSelected);
                  const isMulti = activeSessions.length > 1;

                  return (
                    <div className="flex items-center gap-1.5 bg-emerald-50/90 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-600/50 rounded-lg px-2.5 py-1 shadow-2xs">
                      {/* Department Switcher Dropdown */}
                      <div className="flex items-center gap-1 border-r border-emerald-200 dark:border-slate-700 pr-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-400 whitespace-nowrap">
                          Dept:
                        </span>
                        <select
                          id="top-bar-active-department-select"
                          value={targetDept}
                          onChange={(e) => {
                            const newDeptName = e.target.value;
                            setTargetDept(newDeptName);
                            const targetDeptData = UNIVERSITY_DEPARTMENTS.find((d) => d.name === newDeptName);
                            if (targetDeptData) {
                              const firstApplicable =
                                targetDeptData.programs.find((p) => {
                                  const detail = StorageService.getProgramSessionDetail(
                                    targetDeptData.name,
                                    p.name,
                                    activeSessions,
                                    allRecords
                                  );
                                  return detail.isApplicableInSelected;
                                }) || targetDeptData.programs[0];
                              if (firstApplicable) {
                                setTargetProg(firstApplicable.name);
                              }
                            }
                            if (currentUser.role === 'VC' || currentUser.role === 'ADMIN') {
                              setIsInspectionMode(true);
                            }
                          }}
                          className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 bg-transparent focus:outline-none cursor-pointer pr-1 max-w-[90px] sm:max-w-[130px] truncate"
                          title="Switch department focus"
                        >
                          {UNIVERSITY_DEPARTMENTS.map((d) => (
                            <option
                              key={d.name}
                              value={d.name}
                              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                            >
                              {d.code} ({d.name.replace('Department of ', '')})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Program Selector */}
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-400 whitespace-nowrap">
                        {selectedDeptObj.code} Program:
                      </span>
                      <select
                        id="top-bar-active-program-select"
                        value={targetProg}
                        onChange={(e) => {
                          const newProg = e.target.value;
                          setTargetProg(newProg);
                          if (currentUser.role === 'VC' || currentUser.role === 'ADMIN') {
                            setIsInspectionMode(true);
                          }
                          setActiveView('HOD');
                          setActiveModule('LMS');
                        }}
                        className="text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none cursor-pointer pr-1 max-w-[200px] sm:max-w-[320px] truncate"
                        title={`Select program in ${selectedDeptObj.name}`}
                      >
                        {isMulti ? (
                          deptProgDetails.map(({ prog, detail }) => {
                            const isApplicable = detail.isApplicableInSelected;
                            return (
                              <option
                                key={prog.name}
                                value={prog.name}
                                disabled={!isApplicable}
                                title={!isApplicable ? `Not applicable in selected sessions (${activeSessions.join(', ')})` : undefined}
                                className={
                                  isApplicable
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 italic'
                                }
                              >
                                {prog.name} ({prog.degreeLevel}) — [{detail.statusLabel}]{!isApplicable ? ' (Off-cycle)' : ''}
                              </option>
                            );
                          })
                        ) : (
                          <>
                            {enrolled.length > 0 && (
                              <optgroup label={`Session ${targetSession} Active Offerings (${enrolled.length})`}>
                                {enrolled.map(({ prog, detail }) => (
                                  <option
                                    key={prog.name}
                                    value={prog.name}
                                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                                  >
                                    {prog.name} ({prog.degreeLevel}) {detail.hasUploadedRecords ? '✓ (LMS Active)' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {other.length > 0 && (
                              <optgroup label={`Other Programs (Off-cycle in Session ${targetSession})`}>
                                {other.map(({ prog }) => (
                                  <option
                                    key={prog.name}
                                    value={prog.name}
                                    disabled
                                    className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 italic"
                                  >
                                    {prog.name} ({prog.degreeLevel}) — [Off-cycle in Session {targetSession}]
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setRosterModalDept(selectedDeptObj.name);
                          setIsRosterModalOpen(true);
                        }}
                        className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                        title={`Configure ${selectedDeptObj.code} session roster`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })()}
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

            {(currentUser.role === 'HOD' || currentUser.role === 'ADMIN') && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setIsCoordinatorAssignModalOpen(true)}
                  className="flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100/90 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded cursor-pointer transition-colors text-[11px]"
                  title="Assign and shift coordinators to other programs, or change role to Regular/Visiting faculty"
                >
                  <Users className="w-3 h-3" />
                  <span className="hidden sm:inline">Coordinators &amp; Faculty</span>
                  <span className="sm:hidden">Staff</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Switching: HOD Entry Form (Read-only for VC / Inspection) or VC Dashboard */}
        {activeView === 'HOD' ? (
          <HODEntryForm
            readOnly={effectiveUser.role === 'VC' || (isInspectionMode && !isRootAdmin)}
            onRecordSavedOrDeleted={reloadRecords}
            selectedDepartmentProp={targetDept}
            selectedProgramProp={targetProg}
            selectedShiftProp={targetShift}
            selectedSessionProp={targetSession}
            selectedSemesterProp={targetSemester}
            selectedSectionProp={targetAcademicSection}
            onSessionChangedProp={(newSess) => setTargetSession(newSess)}
            onSemesterChangedProp={(newSem) => setTargetSemester(newSem)}
            onSectionChangedProp={(newSec) => setTargetAcademicSection(newSec)}
            onDepartmentChangedProp={(newDept) => setTargetDept(newDept)}
            onProgramChangedProp={(newProg) => setTargetProg(newProg)}
            onShiftChangedProp={(newShift) => setTargetShift(newShift)}
            currentUser={effectiveUser}
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
              <span>•</span>
              <div className="inline-flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
                <div className="w-3.5 h-3.5 shrink-0">
                  <JtechLogo className="w-full h-full" />
                </div>
                <span className="text-[11px] text-slate-400">
                  Created by <span className="font-bold text-slate-200">Jtech Solutions</span>
                </span>
              </div>
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
      {isRootAdmin && (
        <UserAccountsModal
          isOpen={isUserAccountsModalOpen}
          onClose={() => setIsUserAccountsModalOpen(false)}
          onPreviewUser={(acc) => {
            setSimulatedAccount(acc);
            setAdminPreviewMode('OFF');
            if (acc.department) setTargetDept(acc.department);
            if (acc.program) setTargetProg(acc.program);
          }}
        />
      )}

      {/* Role Perspective Comparison Modal (Admin reference) */}
      <RolePerspectiveComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        onSelectPreviewMode={(mode) => {
          setSimulatedAccount(null);
          setAdminPreviewMode(mode);
        }}
      />

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

      {/* Admin Bulk Data Migration & Re-allocation Modal */}
      {isAdmin && (
        <AdminDataMigrationModal
          isOpen={isDataMigrationModalOpen}
          onClose={() => setIsDataMigrationModalOpen(false)}
        />
      )}
      {/* Session Program Roster Selector Modal for Coordinator / VC */}
      <Session2023SelectorModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        departmentName={rosterModalDept}
        sessionName={targetSession}
        onRosterUpdated={() => {
          setActiveSessions([...StorageService.getActiveSessions()]);
          reloadRecords();
        }}
      />

      {/* Coordinator & Faculty Program Allocation Modal (HOD / Admin / VC Control) */}
      <CoordinatorAssignmentModal
        isOpen={isCoordinatorAssignModalOpen}
        onClose={() => setIsCoordinatorAssignModalOpen(false)}
        defaultDepartment={currentUser.department || targetDept}
        currentUserRole={currentUser.role}
        onCoordinatorUpdated={(updatedAcc) => {
          if (updatedAcc.id === currentUser.id) {
            setCurrentUser(AuthService.getCurrentSession() || currentUser);
          }
          reloadRecords();
        }}
      />

      {/* Global Real-Time Sync & Save Evidence Toast */}
      <SyncEvidenceToast />
    </div>
  );
}
