import React from 'react';
import { ActiveNavTab, SchoolSettings } from '../../types';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Palette,
  Sliders,
  Printer,
  Settings,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  schoolSettings: SchoolSettings;
  studentCount: number;
  isDemoMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  schoolSettings,
  studentCount,
  isDemoMode,
}) => {
  const navItems: { id: ActiveNavTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students Directory', icon: Users, badge: studentCount > 0 ? String(studentCount) : undefined },
    { id: 'import', label: 'Import Excel / CSV', icon: FileSpreadsheet },
    { id: 'templates', label: 'ID Card Designs', icon: Palette, badge: '30' },
    { id: 'editor', label: 'Card Customizer', icon: Sliders },
    { id: 'export', label: 'Print & Export', icon: Printer },
    { id: 'settings', label: 'School Settings', icon: Settings },
  ];

  return (
    <aside className="no-print w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none z-30">
      {/* Top School Brand Identity */}
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10">
            {schoolSettings.logoUrl ? (
              <img
                src={schoolSettings.logoUrl}
                alt="School Seal"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <CreditCard className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
              {schoolSettings.schoolName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-400 font-mono">
                {schoolSettings.academicSession}
              </span>
              {isDemoMode && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-medium">
                  Demo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/60 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-200 truncate">CR80 Compliant</p>
            <p className="text-[10px] text-slate-400 truncate">85.60 × 53.98 mm</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
