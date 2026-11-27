import React from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  QrCode,
  Layers,
  Building2,
  Globe,
  Mail,
  ShieldCheck,
} from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, meta, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E3E7EB]">
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold tracking-tight text-[#202B38]">{title}</h1>
        {meta && <div className="text-xs font-medium text-[#75808C]">{meta}</div>}
      </div>
      {subtitle && <p className="text-sm text-[#75808C] mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

interface CardSurfaceProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardSurface: React.FC<CardSurfaceProps> = ({
  children,
  className = '',
  padding = 'md',
}) => {
  const padClass =
    padding === 'none'
      ? ''
      : padding === 'sm'
      ? 'p-4'
      : padding === 'lg'
      ? 'p-6'
      : 'p-5';
  return (
    <div className={`bg-white border border-[#E3E7EB] rounded-[10px] ${padClass} ${className}`}>
      {children}
    </div>
  );
};

interface StatusTextProps {
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  label: string;
}

export const StatusText: React.FC<StatusTextProps> = ({ tone, label }) => {
  const colorMap = {
    success: 'text-[#25845A]',
    warning: 'text-[#C18A38]',
    danger: 'text-[#C44949]',
    neutral: 'text-[#75808C]',
  };
  const dotMap = {
    success: 'bg-[#25845A]',
    warning: 'bg-[#C18A38]',
    danger: 'bg-[#C44949]',
    neutral: 'bg-[#75808C]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colorMap[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotMap[tone]}`} />
      <span>{label}</span>
    </span>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="bg-white border border-dashed border-[#E3E7EB] rounded-[10px] py-12 px-6 text-center">
    <div className="w-11 h-11 rounded-[10px] bg-[#F0F2F4] text-[#536477] flex items-center justify-center mx-auto mb-3">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-[#202B38]">{title}</h3>
    <p className="text-xs text-[#75808C] mt-1 max-w-md mx-auto leading-relaxed">{description}</p>
    {action && <div className="mt-4 flex items-center justify-center gap-2.5">{action}</div>}
  </div>
);

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-[#202B38]/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="bg-white border border-[#E3E7EB] rounded-[12px] shadow-xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E3E7EB] flex items-center justify-between bg-[#F5F6F7]">
          <div>
            <h2 id="help-modal-title" className="text-base font-bold text-[#202B38]">
              THE ID MAKER · Quick Reference &amp; Support
            </h2>
            <p className="text-xs text-[#75808C] mt-0.5">
              CR80 Production Standards, Bulk Import &amp; Cloud Workspace Support
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help modal"
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-[#202B38]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#24364B]">
                <Layers className="w-4 h-4 text-[#A77C50]" />
                <span>CR80 Physical Standard</span>
              </div>
              <p className="text-[#75808C] leading-relaxed">
                Cards render at 85.60 × 53.98 mm (300 DPI PDF export). Print sheets support 6-up portrait, 8-up landscape, 10-up compact A4, and Epson/Canon PVC trays.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#24364B]">
                <FileSpreadsheet className="w-4 h-4 text-[#A77C50]" />
                <span>Bulk Excel & ZIP Photos</span>
              </div>
              <p className="text-[#75808C] leading-relaxed">
                Import .xlsx/.csv rosters with automatic column mapping, then match student portraits in bulk using a .zip archive named by Roll No, ID, or Student Name.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#24364B]">
                <QrCode className="w-4 h-4 text-[#A77C50]" />
                <span>Scannable QR Verification</span>
              </div>
              <p className="text-[#75808C] leading-relaxed">
                Each QR embeds formatted student details directly so any standard smartphone scanner reads Student Name, Father, Class, Contact, and Conveyance offline.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#24364B]">
                <Printer className="w-4 h-4 text-[#A77C50]" />
                <span>Clean A4 Sheet Printing</span>
              </div>
              <p className="text-[#75808C] leading-relaxed">
                Use &ldquo;Print Current View&rdquo; or &ldquo;Download A4 PDF&rdquo; to export pure ID card sheets with zero interface clutter.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#25845A] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-[#202B38]">Private Cloud Storage &amp; Multi-Device Sync</p>
              <p className="text-[#75808C] leading-relaxed">
                Your school settings, students, custom templates, and export history are stored in your private Firebase Firestore workspace, isolated to your verified account and synced across devices.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E3E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-[#A77C50] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#202B38]">Developed by Anivex Solution</p>
                <p className="text-[#75808C] mt-0.5">
                  Official Product Engineering &amp; Enterprise Support
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <a
                href="https://anivexsolution.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#24364B] hover:underline"
              >
                <Globe className="w-3.5 h-3.5 text-[#75808C]" />
                <span>anivexsolution.in</span>
              </a>
              <a
                href="mailto:info@anivexsolution.in"
                className="inline-flex items-center gap-1.5 text-[#24364B] hover:underline"
              >
                <Mail className="w-3.5 h-3.5 text-[#75808C]" />
                <span>info@anivexsolution.in</span>
              </a>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-[#E3E7EB] bg-[#F5F6F7] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#75808C]">
            © {new Date().getFullYear()} Anivex Solution · anivexsolution.in
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
