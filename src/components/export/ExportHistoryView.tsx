import React from 'react';
import { ActiveNavTab, ExportHistoryRecord } from '../../types';
import { CardSurface, EmptyState, PageHeader } from '../ui/EnterpriseUI';
import { History, Printer, Trash2, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';

interface ExportHistoryViewProps {
  history: ExportHistoryRecord[];
  onClearHistory: () => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const ExportHistoryView: React.FC<ExportHistoryViewProps> = ({
  history,
  onClearHistory,
  onNavigate,
}) => {
  const getFormatIcon = (format: ExportHistoryRecord['format']) => {
    switch (format) {
      case 'PNG':
        return <ImageIcon className="w-4 h-4 text-[#A77C50]" />;
      case 'CSV':
        return <FileSpreadsheet className="w-4 h-4 text-[#25845A]" />;
      case 'Browser Print':
        return <Printer className="w-4 h-4 text-[#24364B]" />;
      default:
        return <FileText className="w-4 h-4 text-[#24364B]" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Export History"
        subtitle="Audit log of generated A4 PDF sheets, CR80 cards, PNG exports, CSV rosters, and print runs."
        meta={
          <span className="font-mono tabular-nums">
            {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </span>
        }
        actions={
          <>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all recorded export history entries?')) {
                    onClearHistory();
                  }
                }}
                className="h-9 px-3.5 text-xs font-medium text-[#C44949] bg-white border border-[#E3E7EB] rounded-lg hover:bg-[#F5F6F7] flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('export')}
              className="h-9 px-4 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Open Batch Print Studio</span>
            </button>
          </>
        }
      />

      {history.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No exports recorded yet"
          description="Whenever you download an A4 PDF, export a CR80 card as PNG/PDF, export a student CSV, or print cards, each job will be logged here."
          action={
            <button
              type="button"
              onClick={() => onNavigate('export')}
              className="h-9 px-4 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
            >
              Go to Batch Print Studio
            </button>
          }
        />
      ) : (
        <CardSurface padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F6F7] border-b border-[#E3E7EB] text-[#75808C] font-semibold">
                  <th className="py-3 px-5">Format</th>
                  <th className="py-3 px-4">File / Job Name</th>
                  <th className="py-3 px-4">Template Used</th>
                  <th className="py-3 px-4">Orientation</th>
                  <th className="py-3 px-4 text-right">Cards</th>
                  <th className="py-3 px-5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E7EB]">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F6F7]/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2 font-semibold text-[#202B38]">
                        {getFormatIcon(item.format)}
                        <span>{item.format}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#202B38] max-w-[260px] truncate">
                      {item.fileName}
                    </td>
                    <td className="py-3.5 px-4 text-[#536477]">{item.templateName}</td>
                    <td className="py-3.5 px-4 capitalize text-[#536477]">{item.orientation}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#202B38]">
                      {item.cardCount}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-[#75808C]">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSurface>
      )}
    </div>
  );
};
