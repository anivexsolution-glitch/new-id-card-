import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ActiveNavTab, ExportHistoryRecord, SchoolSettings, Student } from '../../types';
import { CR80Card } from '../cards/CR80Card';
import { exportElementAsPng, exportSingleCardPdf, formatExportError } from '../../utils/export';
import { hasValidStudentPhoto } from '../../utils/photoUtils';
import { BulkPhotoZipModal } from '../import/BulkPhotoZipModal';
import { CardSurface, EmptyState, PageHeader, StatusText } from '../ui/EnterpriseUI';
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Sliders,
  Download,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileArchive,
  Printer,
  ChevronDown,
  MoreHorizontal,
  Users,
  Edit3,
  GraduationCap,
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
  isLoading?: boolean;
  onOpenAddModal: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onToggleCardGenerated: (studentId: string) => void;
  onBulkGenerate?: (studentIds: string[]) => void;
  onBulkDelete?: (studentIds: string[]) => void;
  onNavigate?: (tab: ActiveNavTab) => void;
  onSelectStudentForEditor: (studentId: string) => void;
  onUpdateStudentPhoto?: (studentId: string, photoUrl: string) => void;
  onUpdateStudentsBulk?: (students: Student[]) => void;
  onLogExport?: (entry: Omit<ExportHistoryRecord, 'id' | 'timestamp'>) => void;
  onOpenPromotionModal?: () => void;
  initialStatusFilter?: {
    value: 'all' | 'generated' | 'pending' | 'missing_photo';
    nonce: number;
  } | null;
}

function parseClassAndSection(classGrade?: string): { className: string; section: string } {
  const raw = (classGrade || 'Unassigned').trim();
  const dashIdx = raw.indexOf('-');
  if (dashIdx === -1) {
    return { className: raw, section: '—' };
  }
  const left = raw.slice(0, dashIdx).trim() || 'Unassigned';
  const right = raw
    .slice(dashIdx + 1)
    .replace(/section/i, '')
    .trim();
  return { className: left, section: right || '—' };
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  schoolSettings,
  isLoading = false,
  onOpenAddModal,
  onEditStudent,
  onDeleteStudent,
  onToggleCardGenerated,
  onBulkGenerate,
  onBulkDelete,
  onNavigate,
  onSelectStudentForEditor,
  onUpdateStudentPhoto,
  onUpdateStudentsBulk,
  onLogExport,
  onOpenPromotionModal,
  initialStatusFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'pending' | 'missing_photo'>(
    initialStatusFilter?.value || 'all'
  );
  const [conveyanceFilter, setConveyanceFilter] = useState<'all' | 'Yes' | 'No'>('all');
  const [sortField, setSortField] = useState<'name' | 'rollNo' | 'classGrade'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const secondaryMenuRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [isExporting, setIsExporting] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter.value);
      setCurrentPage(1);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    setBrokenPhotoIds({});
  }, [students]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (secondaryMenuRef.current && !secondaryMenuRef.current.contains(e.target as Node)) {
        setIsSecondaryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Derive unique Class & Section options from live data
  const { classOptions, sectionOptions } = useMemo(() => {
    const clsSet = new Set<string>();
    const secSet = new Set<string>();
    students.forEach((s) => {
      const { className, section } = parseClassAndSection(s.classGrade);
      clsSet.add(className);
      if (section !== '—') secSet.add(section);
    });
    return {
      classOptions: Array.from(clsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      sectionOptions: Array.from(secSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = students.filter((s) => {
      const { className, section } = parseClassAndSection(s.classGrade);

      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
        s.contactNumber.toLowerCase().includes(q) ||
        (s.classGrade && s.classGrade.toLowerCase().includes(q)) ||
        (s.idCardNumber && s.idCardNumber.toLowerCase().includes(q));

      const matchClass = classFilter === 'all' || className === classFilter;
      const matchSection = sectionFilter === 'all' || section === sectionFilter;
      const matchConveyance = conveyanceFilter === 'all' || s.conveyance === conveyanceFilter;

      const hasPhoto = hasValidStudentPhoto(s.photoUrl) && !brokenPhotoIds[s.id];

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'generated' && s.isCardGenerated) ||
        (statusFilter === 'pending' && !s.isCardGenerated) ||
        (statusFilter === 'missing_photo' && !hasPhoto);

      return matchSearch && matchClass && matchSection && matchConveyance && matchStatus;
    });

    result.sort((a, b) => {
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    students,
    searchQuery,
    classFilter,
    sectionFilter,
    conveyanceFilter,
    statusFilter,
    sortField,
    sortOrder,
    brokenPhotoIds,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safePage, pageSize]);

  const generatedCount = useMemo(
    () => students.filter((s) => s.isCardGenerated).length,
    [students]
  );

  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSort = (field: 'name' | 'rollNo' | 'classGrade') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Name',
      "Father's Name",
      "Mother's Name",
      'Contact Number',
      'D.O.B.',
      'Address',
      'Conveyance',
      'Session',
      'Roll No',
      'Class',
      'Card Status',
    ];
    const rows = filteredStudents.map((s) => [
      s.name,
      s.fatherName,
      s.motherName,
      s.contactNumber,
      s.dob,
      s.address,
      s.conveyance,
      s.session,
      s.rollNo || '',
      s.classGrade || '',
      s.isCardGenerated ? 'Generated' : 'Pending',
    ]);

    const fileName = `Student_Roster_${Date.now()}.csv`;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onLogExport?.({
      format: 'CSV',
      fileName,
      cardCount: filteredStudents.length,
      templateName: 'Student Roster Export',
      orientation: schoolSettings.defaultOrientation,
    });
  };

  const handleExportPng = async () => {
    if (!cardPreviewRef.current || !previewStudent) return;
    setIsExporting(true);
    const fileName = `ID_Card_${previewStudent.name.replace(/\s+/g, '_')}_${previewSide}.png`;
    try {
      await exportElementAsPng(cardPreviewRef.current, fileName);
      onLogExport?.({
        format: 'PNG',
        fileName,
        cardCount: 1,
        templateName: schoolSettings.defaultTemplateId,
        orientation: schoolSettings.defaultOrientation,
      });
    } catch (e) {
      console.warn('PNG export failed:', formatExportError(e));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!cardPreviewRef.current || !previewStudent) return;
    setIsExporting(true);
    const fileName = `ID_Card_${previewStudent.name.replace(/\s+/g, '_')}.pdf`;
    try {
      await exportSingleCardPdf(
        cardPreviewRef.current,
        previewStudent.name,
        schoolSettings.defaultOrientation
      );
      onLogExport?.({
        format: 'CR80 PDF',
        fileName,
        cardCount: 1,
        templateName: schoolSettings.defaultTemplateId,
        orientation: schoolSettings.defaultOrientation,
      });
    } catch (e) {
      console.warn('PDF export failed:', formatExportError(e));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectPhotoUpload = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateStudentPhoto) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        onUpdateStudentPhoto(studentId, uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setClassFilter('all');
    setSectionFilter('all');
    setStatusFilter('all');
    setConveyanceFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    classFilter !== 'all' ||
    sectionFilter !== 'all' ||
    statusFilter !== 'all' ||
    conveyanceFilter !== 'all';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <PageHeader
        title="Students"
        meta={
          <span className="font-mono tabular-nums">
            {students.length} enrolled · {generatedCount} cards ready
          </span>
        }
        subtitle="Manage enrolled student records, parent contact details, portraits, and ID card readiness."
        actions={
          <>
            {/* Secondary actions organized in contextual toolbar + dropdown */}
            <div className="relative" ref={secondaryMenuRef}>
              <button
                type="button"
                onClick={() => setIsSecondaryMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-[#536477]" />
                <span>Bulk Tools</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#75808C]" />
              </button>

              {isSecondaryMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#E3E7EB] rounded-[10px] shadow-lg py-1.5 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSecondaryMenuOpen(false);
                      onNavigate?.('import');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#536477]" />
                    <span>Import Excel / CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSecondaryMenuOpen(false);
                      handleDownloadCsv();
                    }}
                    disabled={filteredStudents.length === 0}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] disabled:opacity-40 flex items-center gap-2.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#536477]" />
                    <span>Export CSV ({filteredStudents.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSecondaryMenuOpen(false);
                      setIsZipModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2.5"
                  >
                    <FileArchive className="w-3.5 h-3.5 text-[#536477]" />
                    <span>Bulk Photo Upload (ZIP)</span>
                  </button>
                  {onOpenPromotionModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        onOpenPromotionModal();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#202B38] hover:bg-[#F5F6F7] flex items-center gap-2.5 border-t border-[#E3E7EB] mt-1 pt-2"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-[#24364B]" />
                      <span>Class Promotion &amp; Rollover</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          </>
        }
      />

      {/* Search & Filters */}
      <CardSurface padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-[#75808C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, roll number, or contact..."
              className="w-full text-xs pl-8.5 pr-3 py-2 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7]/60 text-[#202B38] placeholder:text-[#75808C] focus:outline-none focus:bg-white focus:border-[#24364B]"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
            >
              <option value="all">All Classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Section"
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
            >
              <option value="all">All Sections</option>
              {sectionOptions.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
            >
              <option value="all">All Statuses</option>
              <option value="generated">Generated</option>
              <option value="pending">Pending</option>
              <option value="missing_photo">Missing Photo</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-2">
            <select
              aria-label="Filter by Conveyance"
              value={conveyanceFilter}
              onChange={(e) => {
                setConveyanceFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
            >
              <option value="all">All Commute</option>
              <option value="Yes">Bus Route</option>
              <option value="No">Private</option>
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                title="Reset filters"
                className="p-2 rounded-lg border border-[#E3E7EB] text-[#75808C] hover:text-[#202B38] hover:bg-[#F0F2F4] shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardSurface>

      {/* Contextual Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#24364B] text-white px-4 py-2.5 rounded-[10px] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold tabular-nums">
              {selectedIds.length} of {filteredStudents.length} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-white/75 hover:text-white underline text-[11px]"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onBulkGenerate?.(selectedIds)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-[#24364B] hover:bg-[#F0F2F4] rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#25845A]" />
              <span>Mark Generated</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('export')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#304A64] hover:bg-[#3d5c7a] text-white rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Batch Print</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.length} selected student records?`)) {
                  onBulkDelete?.(selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#C44949] hover:bg-[#a93b3b] text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <CardSurface padding="md" className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-[#F0F2F4] animate-pulse" />
          ))}
        </CardSurface>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No students match these filters"
          description={
            students.length === 0
              ? 'Add students individually or upload an Excel/CSV roster to begin designing ID cards.'
              : 'Try adjusting your search query, class, section, or status filter.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
              >
                Add First Student
              </button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Student Table */}
          <div className="hidden md:block bg-white border border-[#E3E7EB] rounded-[10px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F6F7] border-b border-[#E3E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#75808C]">
                    <th className="py-3 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredStudents.length > 0 &&
                          selectedIds.length === filteredStudents.length
                        }
                        onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                        className="rounded border-[#E3E7EB] accent-[#24364B] cursor-pointer"
                      />
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-3.5 cursor-pointer hover:text-[#202B38] select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        <span>Student</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('rollNo')}
                      className="py-3 px-3.5 cursor-pointer hover:text-[#202B38] select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        <span>Roll No</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('classGrade')}
                      className="py-3 px-3.5 cursor-pointer hover:text-[#202B38] select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        <span>Class</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="py-3 px-3.5">Section</th>
                    <th className="py-3 px-3.5">Contact</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7EB]">
                  {paginatedStudents.map((student) => {
                    const isSelected = selectedIds.includes(student.id);
                    const { className, section } = parseClassAndSection(student.classGrade);
                    return (
                      <tr
                        key={student.id}
                        className={`h-[60px] transition-colors ${
                          isSelected ? 'bg-[#F0F2F4]' : 'hover:bg-[#F5F6F7]/70'
                        }`}
                      >
                        <td className="px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(student.id)}
                            className="rounded border-[#E3E7EB] accent-[#24364B] cursor-pointer"
                          />
                        </td>
                        <td className="px-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative group w-9 h-9 shrink-0">
                              {hasValidStudentPhoto(student.photoUrl) && !brokenPhotoIds[student.id] ? (
                                <img
                                  src={student.photoUrl}
                                  alt={student.name}
                                  onError={() =>
                                    setBrokenPhotoIds((prev) => ({ ...prev, [student.id]: true }))
                                  }
                                  className="w-9 h-9 rounded-lg object-cover border border-[#E3E7EB]"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-[#F0F2F4] border border-[#E3E7EB] flex items-center justify-center text-[11px] font-bold text-[#536477]">
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <label
                                title="Upload portrait"
                                className="absolute inset-0 bg-[#202B38]/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                              >
                                <Upload className="w-3.5 h-3.5 text-white" />
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/webp"
                                  onChange={(e) => handleDirectPhotoUpload(student.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#202B38] truncate max-w-[190px]">
                                {student.name}
                              </p>
                              <p className="text-[11px] text-[#75808C] truncate max-w-[190px]">
                                F: {student.fatherName || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 font-mono tabular-nums text-[#202B38]">
                          {student.rollNo || '—'}
                        </td>
                        <td className="px-3.5 font-medium text-[#202B38]">{className}</td>
                        <td className="px-3.5 text-[#536477]">{section}</td>
                        <td className="px-3.5">
                          <p className="font-mono tabular-nums text-[#202B38] text-[11px]">
                            {student.contactNumber}
                          </p>
                          <p className="text-[10px] text-[#75808C]">
                            {student.conveyance === 'Yes' ? 'Bus Route' : 'Private'}
                          </p>
                        </td>
                        <td className="px-3.5">
                          <button
                            type="button"
                            onClick={() => onToggleCardGenerated(student.id)}
                            title="Toggle generated status"
                            className="text-left hover:opacity-80 transition-opacity"
                          >
                            <StatusText
                              tone={student.isCardGenerated ? 'success' : 'warning'}
                              label={student.isCardGenerated ? 'Generated' : 'Pending'}
                            />
                            {(!hasValidStudentPhoto(student.photoUrl) || brokenPhotoIds[student.id]) && (
                              <span className="block text-[10px] font-medium text-[#C44949] mt-0.5">
                                Missing photo
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewStudent(student);
                                setPreviewSide('front');
                              }}
                              title="Preview ID card"
                              className="p-1.5 rounded-lg text-[#536477] hover:text-[#24364B] hover:bg-[#F0F2F4] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectStudentForEditor(student.id);
                                onNavigate?.('editor');
                              }}
                              title="Customize in ID Card Studio"
                              className="p-1.5 rounded-lg text-[#536477] hover:text-[#24364B] hover:bg-[#F0F2F4] transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditStudent(student)}
                              title="Edit student"
                              className="p-1.5 rounded-lg text-[#536477] hover:text-[#24364B] hover:bg-[#F0F2F4] transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete student record for ${student.name}?`)) {
                                  onDeleteStudent(student.id);
                                }
                              }}
                              title="Delete student"
                              className="p-1.5 rounded-lg text-[#75808C] hover:text-[#C44949] hover:bg-[#F5F6F7] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-[#F5F6F7] border-t border-[#E3E7EB] flex items-center justify-between text-xs text-[#536477]">
              <div className="flex items-center gap-3">
                <span className="tabular-nums">
                  Showing {(safePage - 1) * pageSize + 1}–
                  {Math.min(safePage * pageSize, filteredStudents.length)} of {filteredStudents.length}
                </span>
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs px-2 py-1 rounded border border-[#E3E7EB] bg-white text-[#202B38] font-mono"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-[#E3E7EB] bg-white disabled:opacity-40 hover:bg-[#F0F2F4]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono tabular-nums text-[#202B38]">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-lg border border-[#E3E7EB] bg-white disabled:opacity-40 hover:bg-[#F0F2F4]"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Responsive Cards Layout */}
          <div className="md:hidden space-y-3">
            {paginatedStudents.map((student) => {
              const isSelected = selectedIds.includes(student.id);
              const { className, section } = parseClassAndSection(student.classGrade);
              return (
                <CardSurface key={student.id} padding="sm" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(student.id)}
                        className="rounded border-[#E3E7EB] accent-[#24364B] shrink-0"
                      />
                      {hasValidStudentPhoto(student.photoUrl) && !brokenPhotoIds[student.id] ? (
                        <img
                          src={student.photoUrl}
                          alt={student.name}
                          onError={() =>
                            setBrokenPhotoIds((prev) => ({ ...prev, [student.id]: true }))
                          }
                          className="w-10 h-10 rounded-lg object-cover border border-[#E3E7EB] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#F0F2F4] border border-[#E3E7EB] flex items-center justify-center text-xs font-bold text-[#536477] shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#202B38] truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-[#75808C] truncate">
                          {className}
                          {section !== '—' ? ` · Sec ${section}` : ''} · Roll {student.rollNo || '—'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleCardGenerated(student.id)}
                      className="shrink-0"
                    >
                      <StatusText
                        tone={student.isCardGenerated ? 'success' : 'warning'}
                        label={student.isCardGenerated ? 'Generated' : 'Pending'}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#536477] pt-2 border-t border-[#E3E7EB]">
                    <span className="font-mono tabular-nums">{student.contactNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewStudent(student);
                          setPreviewSide('front');
                        }}
                        className="px-2.5 py-1 text-xs font-medium bg-[#F5F6F7] border border-[#E3E7EB] rounded-lg text-[#202B38]"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStudentForEditor(student.id);
                          onNavigate?.('editor');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#24364B] text-white rounded-lg"
                      >
                        Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditStudent(student)}
                        className="p-1.5 border border-[#E3E7EB] rounded-lg text-[#536477]"
                        aria-label="Edit student"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardSurface>
              );
            })}

            {/* Mobile Pagination */}
            <div className="flex items-center justify-between pt-2 text-xs text-[#536477]">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg border border-[#E3E7EB] bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono tabular-nums">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#E3E7EB] bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Student Card Preview Modal */}
      {previewStudent && (
        <div
          className="no-print fixed inset-0 z-50 bg-[#202B38]/45 flex items-center justify-center p-4"
          onClick={() => setPreviewStudent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-xl w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-[#E3E7EB] flex items-center justify-between bg-[#F5F6F7]">
              <div>
                <h3 className="text-sm font-bold text-[#202B38]">
                  {previewStudent.name} · CR80 Preview
                </h3>
                <p className="text-[11px] text-[#75808C] capitalize">
                  {schoolSettings.defaultOrientation} orientation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 studio-grid-bg flex flex-col items-center justify-center">
              <div
                ref={cardPreviewRef}
                className={`rounded-md overflow-hidden bg-white w-full border border-[#E3E7EB] ${
                  schoolSettings.defaultOrientation === 'portrait'
                    ? 'max-w-[270px]'
                    : 'max-w-[390px]'
                }`}
              >
                <CR80Card
                  student={previewStudent}
                  schoolSettings={schoolSettings}
                  customization={{
                    side: previewSide,
                    templateId: schoolSettings.defaultTemplateId,
                    orientation: schoolSettings.defaultOrientation,
                  }}
                />
              </div>

              <div className="mt-4 inline-flex items-center bg-white border border-[#E3E7EB] rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewSide('front')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    previewSide === 'front'
                      ? 'bg-[#24364B] text-white'
                      : 'text-[#536477] hover:text-[#202B38]'
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSide('back')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    previewSide === 'back'
                      ? 'bg-[#24364B] text-white'
                      : 'text-[#536477] hover:text-[#202B38]'
                  }`}
                >
                  Back Side
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#E3E7EB] flex flex-wrap items-center justify-between gap-2 bg-white">
              <button
                type="button"
                onClick={() => {
                  onSelectStudentForEditor(previewStudent.id);
                  setPreviewStudent(null);
                  onNavigate?.('editor');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#24364B] hover:text-[#304A64]"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit in ID Card Studio</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPng}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg disabled:opacity-50"
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg disabled:opacity-50"
                >
                  Download CR80 PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Photo ZIP Matcher Modal */}
      <BulkPhotoZipModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        students={students}
        onApplyPhotos={(updatedStudents) => {
          onUpdateStudentsBulk?.(updatedStudents);
        }}
      />
    </div>
  );
};
