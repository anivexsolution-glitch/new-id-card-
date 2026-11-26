import React from 'react';
import { ActiveNavTab } from '../../types';
import { Plus, UploadCloud, Printer, Sliders, LogOut } from 'lucide-react';

interface TopBarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenAddModal: () => void;
  totalStudents: number;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  totalStudents,
  onLogout,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'students':
        return 'Student Directory & Records';
      case 'import':
        return 'Excel & CSV Import Wizard';
      case 'templates':
        return 'Official ID Card Templates';
      case 'editor':
        return 'Card Customization Studio';
      case 'export':
        return 'Batch Print & PDF Export';
      case 'settings':
        return 'School Administration & Branding';
      default:
        return 'ID Card System';
    }
  };

  return (
    <header className="no-print h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0 z-20">
      {/* Zone 1: Single text element wordmark / breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          ScholarCard Pro
        </span>
        <span className="text-slate-300 font-light hidden sm:inline">/</span>
        <h1 className="text-sm font-medium text-slate-600 truncate hidden sm:inline">
          {getTabTitle()}
        </h1>
      </div>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onSelectTab('students')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'students' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Students ({totalStudents})
        </button>
        <button
          onClick={() => onSelectTab('templates')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'templates' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          30 Templates
        </button>
        <button
          onClick={() => onSelectTab('editor')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'editor' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Customizer
        </button>
        <button
          onClick={() => onSelectTab('export')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'export' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          Print Sheets
        </button>
      </nav>

      {/* Zone 3: 1 Primary contextual action */}
      <div className="flex items-center gap-3 shrink-0">
        {activeTab === 'students' ? (
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current View</span>
          </button>
        ) : activeTab === 'templates' ? (
          <button
            onClick={() => onSelectTab('editor')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm"
          >
            <Sliders className="w-4 h-4" />
            <span>Open in Editor</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectTab('import')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Excel Roster</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
            title="Log out of school administrator portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
};
