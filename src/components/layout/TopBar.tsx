import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ActiveNavTab, SchoolSettings, Student } from '../../types';
import {
  Menu,
  Search,
  Bell,
  Plus,
  Printer,
  Sliders,
  UploadCloud,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  User,
  LogOut,
  Settings,
} from 'lucide-react';

interface TopBarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenAddModal: () => void;
  onOpenMobileMenu: () => void;
  onSelectStudentForEditor: (studentId: string) => void;
  students: Student[];
  schoolSettings: SchoolSettings;
  isDemoMode: boolean;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  onOpenMobileMenu,
  onSelectStudentForEditor,
  students,
  schoolSettings,
  isDemoMode,
  onLogout,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const sectionLabel = useMemo(() => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'students':
        return 'Students';
      case 'import':
        return 'Bulk Generation';
      case 'templates':
        return 'Templates';
      case 'editor':
        return 'ID Card Studio';
      case 'export':
        return 'Batch Print';
      case 'history':
        return 'Export History';
      case 'settings':
        return 'Settings';
      default:
        return 'Workspace';
    }
  }, [activeTab]);

  // Real data-backed search matches
  const matchedStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
          (s.classGrade && s.classGrade.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searchTerm, students]);

  // Real operational notifications derived from actual state
  const notifications = useMemo(() => {
    const list: { id: string; title: string; detail: string; actionTab: ActiveNavTab; tone: 'warning' | 'info' }[] = [];
    const missingPhotos = students.filter((s) => !s.photoUrl).length;
    const pendingCards = students.filter((s) => !s.isCardGenerated).length;

    if (missingPhotos > 0) {
      list.push({
        id: 'missing_photos',
        title: `${missingPhotos} student ${missingPhotos === 1 ? 'photo' : 'photos'} missing`,
        detail: 'Upload individual portraits or use Bulk Photo ZIP.',
        actionTab: 'students',
        tone: 'warning',
      });
    }
    if (pendingCards > 0) {
      list.push({
        id: 'pending_cards',
        title: `${pendingCards} ID ${pendingCards === 1 ? 'card' : 'cards'} pending generation`,
        detail: 'Ready for batch print sheets or CR80 export.',
        actionTab: 'export',
        tone: 'info',
      });
    }
    if (isDemoMode) {
      list.push({
        id: 'demo_mode',
        title: 'Sample demonstration roster active',
        detail: 'Import your school Excel/CSV file to replace demo records.',
        actionTab: 'import',
        tone: 'info',
      });
    }
    return list;
  }, [students, isDemoMode]);

  return (
    <header className="no-print h-16 bg-white border-b border-[#E3E7EB] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Left: Mobile Drawer Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-1 rounded-lg text-[#536477] hover:text-[#202B38] hover:bg-[#F0F2F4] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="font-semibold text-[#75808C] hover:text-[#202B38] transition-colors whitespace-nowrap hidden sm:inline"
          >
            THE ID MAKER
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#75808C] shrink-0 hidden sm:inline" />
          <span className="font-bold text-[#202B38] truncate">{sectionLabel}</span>
        </nav>
      </div>

      {/* Right: Search, Notifications, Profile, Contextual Action */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Quick Student Search */}
        <div ref={searchRef} className="relative hidden md:block w-56 lg:w-64">
          <Search className="w-4 h-4 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => setShowSearchResults(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchResults(true);
            }}
            placeholder="Search student or roll no..."
            aria-label="Quick student search"
            className="w-full h-9 pl-9 pr-3 text-xs bg-[#F5F6F7] border border-[#E3E7EB] rounded-lg text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:bg-white focus:border-[#24364B] transition-colors"
          />
          {showSearchResults && searchTerm.trim().length > 0 && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white border border-[#E3E7EB] rounded-[10px] shadow-lg py-1.5 z-40">
              {matchedStudents.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-[#75808C]">
                  No students match &ldquo;{searchTerm}&rdquo;
                </div>
              ) : (
                matchedStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectStudentForEditor(s.id);
                      onSelectTab('editor');
                      setSearchTerm('');
                      setShowSearchResults(false);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#F5F6F7] flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#202B38] truncate">{s.name}</p>
                      <p className="text-[11px] text-[#75808C] truncate">
                        {s.classGrade || 'Unassigned'} · Roll {s.rollNo || '—'}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-[#24364B] shrink-0">Open</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Operational Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((v) => !v)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg border border-[#E3E7EB] bg-white text-[#536477] hover:text-[#202B38] hover:bg-[#F5F6F7] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#A77C50]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white border border-[#E3E7EB] rounded-[10px] shadow-lg overflow-hidden z-40">
              <div className="px-4 py-2.5 border-b border-[#E3E7EB] bg-[#F5F6F7] flex items-center justify-between">
                <span className="text-xs font-bold text-[#202B38]">Workspace Alerts</span>
                <span className="text-[11px] font-mono tabular-nums text-[#75808C]">
                  {notifications.length}
                </span>
              </div>
              {notifications.length === 0 ? (
                <div className="p-4 text-xs text-[#75808C] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#25845A]" />
                  <span>All student photos and ID cards are ready.</span>
                </div>
              ) : (
                <div className="divide-y divide-[#E3E7EB]">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(n.actionTab);
                        setShowNotifications(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[#F5F6F7] flex items-start gap-2.5 transition-colors"
                    >
                      <AlertCircle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          n.tone === 'warning' ? 'text-[#C18A38]' : 'text-[#24364B]'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#202B38]">{n.title}</p>
                        <p className="text-[11px] text-[#75808C] mt-0.5">{n.detail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((v) => !v)}
            aria-label="User Profile Menu"
            className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-[#E3E7EB] bg-white hover:bg-[#F5F6F7] transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-[#24364B] text-white text-[11px] font-bold flex items-center justify-center uppercase">
              {(schoolSettings.adminUsername || 'A').charAt(0)}
            </div>
            <span className="hidden xl:inline text-xs font-semibold text-[#202B38] max-w-[100px] truncate">
              {schoolSettings.adminUsername || 'admin'}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E3E7EB] rounded-[10px] shadow-lg py-1.5 z-40">
              <div className="px-3.5 py-2 border-b border-[#E3E7EB]">
                <p className="text-xs font-semibold text-[#202B38] truncate">
                  {schoolSettings.adminUsername || 'admin'}
                </p>
                <p className="text-[11px] text-[#75808C] truncate">{schoolSettings.schoolName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-[#75808C]" />
                <span>School & Account Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('students');
                  setShowProfileMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-[#75808C]" />
                <span>Student Records ({students.length})</span>
              </button>
              <div className="my-1 border-t border-[#E3E7EB]" />
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-[#C44949] hover:bg-[#F5F6F7] flex items-center gap-2 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Single Contextual Primary Action */}
        {activeTab === 'students' ? (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        ) : activeTab === 'export' ? (
          <button
            type="button"
            onClick={() => {
              window.focus();
              window.print();
            }}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current View</span>
          </button>
        ) : activeTab === 'templates' ? (
          <button
            type="button"
            onClick={() => onSelectTab('editor')}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Sliders className="w-4 h-4" />
            <span>Open Card Studio</span>
          </button>
        ) : activeTab === 'editor' ? (
          <button
            type="button"
            onClick={() => onSelectTab('export')}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Batch Print A4</span>
          </button>
        ) : activeTab === 'import' ? (
          <button
            type="button"
            onClick={() => onSelectTab('export')}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheets</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('editor')}
            className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <UploadCloud className="w-4 h-4 hidden" />
            <Plus className="w-4 h-4" />
            <span>Create New ID Card</span>
          </button>
        )}
      </div>
    </header>
  );
};
