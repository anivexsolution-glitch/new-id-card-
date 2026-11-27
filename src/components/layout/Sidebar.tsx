import React from 'react';
import { ActiveNavTab, AuthenticatedUser, SchoolSettings } from '../../types';
import {
  LayoutDashboard,
  Users,
  Layers,
  Palette,
  FileSpreadsheet,
  Printer,
  History,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  schoolSettings: SchoolSettings;
  currentUser: AuthenticatedUser | null;
  studentCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  schoolSettings,
  currentUser,
  studentCount,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenHelp,
  onLogout,
}) => {
  const navItems: {
    id: ActiveNavTab;
    label: string;
    icon: React.ElementType;
    count?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users, count: studentCount },
    { id: 'editor', label: 'ID Card Studio', icon: Layers },
    { id: 'templates', label: 'Templates', icon: Palette, count: 30 },
    { id: 'import', label: 'Bulk Generation', icon: FileSpreadsheet },
    { id: 'export', label: 'Batch Print', icon: Printer },
    { id: 'history', label: 'Export History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: ActiveNavTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const renderSidebarBody = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between bg-white border-r border-[#E3E7EB] select-none">
      {/* Top Brand Lockup */}
      <div>
        <div
          className={`h-16 border-b border-[#E3E7EB] flex items-center ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#24364B] text-white flex items-center justify-center shrink-0 overflow-hidden">
              {schoolSettings.logoUrl ? (
                <img
                  src={schoolSettings.logoUrl}
                  alt={schoolSettings.schoolName}
                  className="w-full h-full object-contain bg-white p-0.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CreditCard className="w-4 h-4 text-[#A77C50]" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-[#202B38] block truncate">
                  THE ID MAKER
                </span>
                <span className="text-[11px] text-[#75808C] block truncate">
                  {schoolSettings.schoolName}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="hidden lg:flex p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#F0F2F4] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#F0F2F4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {collapsed && (
          <div className="hidden lg:flex justify-center pt-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#F0F2F4] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Workspace Navigation */}
        <nav className="p-2.5 space-y-0.5" aria-label="Primary Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2' : 'justify-between px-3'
                } py-2.5 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#24364B] text-white font-semibold'
                    : 'text-[#536477] hover:bg-[#F0F2F4] hover:text-[#202B38]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? 'text-white' : 'text-[#75808C]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.count !== undefined && (
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isActive ? 'text-white/80' : 'text-[#75808C]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Section: Help & Support + User Profile */}
      <div className="p-2.5 border-t border-[#E3E7EB] space-y-1.5">
        <button
          type="button"
          onClick={() => {
            onOpenHelp();
            onCloseMobile();
          }}
          title={collapsed ? 'Help & Support' : undefined}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
          } py-2 text-[13px] font-medium text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4] rounded-lg transition-colors whitespace-nowrap`}
        >
          <HelpCircle className="w-[18px] h-[18px] shrink-0 text-[#75808C]" />
          {!collapsed && <span>Help & Support</span>}
        </button>

        <div
          className={`flex items-center ${
            collapsed ? 'justify-center p-1.5' : 'justify-between px-3 py-2'
          } rounded-lg bg-[#F5F6F7] border border-[#E3E7EB]`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Account avatar'}
                  className="w-7 h-7 rounded-lg object-cover border border-[#E3E7EB] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#24364B] text-white text-xs font-bold flex items-center justify-center shrink-0 uppercase">
                  {(currentUser?.displayName || currentUser?.email || 'U').charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#202B38] truncate">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Account'}
                </p>
                <p className="text-[11px] text-[#75808C] truncate">
                  {currentUser?.email || 'Cloud Synced'}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#C44949] hover:bg-white transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`no-print hidden lg:block shrink-0 h-screen sticky top-0 z-30 transition-all duration-200 ${
          isCollapsed ? 'w-[68px]' : 'w-[244px]'
        }`}
      >
        {renderSidebarBody(isCollapsed)}
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileOpen && (
        <div
          className="no-print fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div
            className="fixed inset-0 bg-[#202B38]/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10 shadow-xl">
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}
    </>
  );
};
