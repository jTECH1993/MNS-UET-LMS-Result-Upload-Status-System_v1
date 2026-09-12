import React from 'react';
import { MonitoringModuleId, ActiveUserSession } from '../types';
import { MnsUetLogo } from './MnsUetLogo';
import {
  FileSpreadsheet,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  X,
  Briefcase,
  Layers,
} from 'lucide-react';

interface Props {
  activeModule: MonitoringModuleId;
  onSelectModule: (module: MonitoringModuleId) => void;
  activeView: 'HOD' | 'VC';
  onViewChange: (view: 'HOD' | 'VC') => void;
  currentUser: ActiveUserSession | null;
  currentSession: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  savedCount: number;
}


export const SidebarNavigation: React.FC<Props> = ({
  activeModule,
  onSelectModule,
  activeView,
  onViewChange,
  currentUser,
  currentSession,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapsed,
  savedCount,
}) => {
  const isVC = currentUser?.role === 'VC';
  const isAdmin = currentUser?.role === 'ADMIN';

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-slate-900 text-slate-200 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <MnsUetLogo size="sm" className="shrink-0" />
            {!isCollapsed && (
              <div className="leading-tight truncate">
                <h1 className="text-xs font-black tracking-tight text-white uppercase truncate">
                  Central Monitoring Portal
                </h1>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                  MNS-UET General Oversight
                </p>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden md:flex text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* System Active Status indicator */}
        {!isCollapsed && (
          <div className="mt-3.5 bg-slate-800/80 rounded-lg p-2 flex items-center justify-between text-[11px] border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>General Monitoring Portal</span>
            </div>
            <span className="font-mono text-slate-400 text-[10px]">
              Session {currentSession}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* SECTION 1: Active Monitoring Module */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-slate-400">
              <span>Active Monitoring Task</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded">
                Operational
              </span>
            </div>
          )}

          <div className="space-y-1">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  onSelectModule('LMS');
                  onCloseMobile();
                }}
                title="LMS Result Upload Status"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeModule === 'LMS'
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-500/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileSpreadsheet
                  className={`w-4 h-4 shrink-0 ${
                    activeModule === 'LMS' ? 'text-white' : 'text-emerald-400'
                  }`}
                />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between text-left truncate">
                    <span className="truncate">LMS Result Upload Status</span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ml-1.5 ${
                        activeModule === 'LMS'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                      }`}
                    >
                      LIVE
                    </span>
                  </div>
                )}
              </button>

              {/* Sub-items for LMS Result Monitoring */}
              {activeModule === 'LMS' && !isCollapsed && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-800/80 ml-4 my-1">
                  {(isVC || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        onViewChange('VC');
                        onCloseMobile();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        activeView === 'VC'
                          ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        VC Executive Analytics
                      </span>
                      <span className="text-[10px] text-slate-500">Overview</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onViewChange('HOD');
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      activeView === 'HOD'
                        ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      {isVC ? 'Department Inspection' : 'Course Result Sheet'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {savedCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: WORK ON DEMAND (Zero Dummy Data Enterprise Framework) */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-slate-400">
              <span>Enterprise Modules</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono text-[9px]">
                On Demand
              </span>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onSelectModule('WORK_ON_DEMAND');
                onCloseMobile();
              }}
              title="Work on Demand (Institutional Module Requisitions)"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeModule === 'WORK_ON_DEMAND'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-500/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
              }`}
            >
              <Briefcase
                className={`w-4 h-4 shrink-0 ${
                  activeModule === 'WORK_ON_DEMAND' ? 'text-white' : 'text-emerald-400'
                }`}
              />
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between text-left truncate">
                  <span className="truncate">Work on Demand</span>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ml-1.5 ${
                      activeModule === 'WORK_ON_DEMAND'
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-800 text-emerald-400 border border-slate-700'
                    }`}
                  >
                    REQUISITION
                  </span>
                </div>
              )}
            </button>

            {!isCollapsed && (
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[10px] text-slate-400 leading-relaxed">
                <span className="text-emerald-400 font-bold block mb-0.5">
                  Zero Dummy Data Policy
                </span>
                Academic modules are activated on institutional demand upon Vice Chancellor approval. No fake screens.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-800 border border-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          {!isCollapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-white truncate">
                {currentUser?.name || 'Authorized User'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="text-emerald-400 font-bold">
                  {currentUser?.role || 'GUEST'}
                </span>
                <span>•</span>
                <span className="truncate">
                  {currentUser?.role === 'VC'
                    ? 'Vice Chancellor'
                    : currentUser?.role === 'ADMIN'
                    ? 'Directorate'
                    : currentUser?.department
                    ? currentUser.department.replace('Department of ', '')
                    : 'MNS-UET'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Docked) */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out z-20 ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-72'
        }`}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer (Slide-over) */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
