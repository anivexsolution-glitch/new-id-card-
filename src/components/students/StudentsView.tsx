import React, { useState, useMemo, useRef } from 'react';
import { ActiveNavTab, SchoolSettings, Student } from '../../types';
import { CR80Card } from '../cards/CR80Card';
import { exportElementAsPng, exportSingleCardPdf } from '../../utils/export';
import { BulkPhotoZipModal } from '../import/BulkPhotoZipModal';
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Eye,
  Sliders,
  Download,
  X,
  FileSpreadsheet,
  Bus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileArchive,
  GraduationCap,
  Printer,
  Sparkles,
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  schoolSettings: SchoolSettings;
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
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  schoolSettings,
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [conveyanceFilter, setConveyanceFilter] = useState<'all' | 'Yes' | 'No'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'generated' | 'pending'>('all');
  const [sortField, setSortField] = useState<'name' | 'rollNo' | 'classGrade' | 'id'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isZipModalOpen, setIsZipModalOpen] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Preview Modal State
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [isExporting, setIsExporting] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement>(null);

  // Class list with card generation metrics
  const classList = useMemo(() => {
    const classMap = new Map<string, { total: number; generated: number }>();
    students.forEach((s) => {
      const cls = (s.classGrade || 'Unassigned').trim();
      const curr = classMap.get(cls) || { total: 0, generated: 0 };
      curr.total += 1;
      if (s.isCardGenerated) curr.generated += 1;
      classMap.set(cls, curr);
    });

    return Array.from(classMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        generated: stats.generated,
        pending: stats.total - stats.generated,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [students]);

  // Filtered & Sorted Students
  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
        s.contactNumber.includes(q) ||
        (s.classGrade && s.classGrade.toLowerCase().includes(q));

      const matchConveyance =
        conveyanceFilter === 'all' || s.conveyance === conveyanceFilter;

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'generated' && s.isCardGenerated) ||
        (statusFilter === 'pending' && !s.isCardGenerated);

      const matchClass =
        classFilter === 'all' || (s.classGrade || 'Unassigned').trim() === classFilter;

      return matchSearch && matchConveyance && matchStatus && matchClass;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = String(a[sortField] || '').toLowerCase();
      let valB = String(b[sortField] || '').toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, searchQuery, conveyanceFilter, statusFilter, classFilter, sortField, sortOrder]);

  // Paginated chunk
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
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

  const handleSort = (field: 'name' | 'rollNo' | 'classGrade' | 'id') => {
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

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `School_Student_Roster_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPng = async () => {
    if (!cardPreviewRef.current || !previewStudent) return;
    setIsExporting(true);
    try {
      await exportElementAsPng(
        cardPreviewRef.current,
        `ID_Card_${previewStudent.name.replace(/\s+/g, '_')}_${previewSide}.png`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!cardPreviewRef.current || !previewStudent) return;
    setIsExporting(true);
    try {
      await exportSingleCardPdf(
        cardPreviewRef.current,
        previewStudent.name,
        schoolSettings.defaultOrientation
      );
    } catch (e) {
      console.error(e);
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full management of Indian school student records, parent dossiers, and CR80 card generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsZipModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-xs"
            title="Upload student photos in bulk via ZIP archive"
          >
            <FileArchive className="w-3.5 h-3.5 text-blue-600" />
            <span>Bulk Photo ZIP</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={filteredStudents.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('import')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* CLASS-WISE ID CARD SYSTEM TABS */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Class-Wise ID Card System
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {classList.length} Classes Enrolled · {students.filter((s) => s.isCardGenerated).length} / {students.length} Total Cards Ready
          </span>
        </div>

        {/* Scrollable Class Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => {
              setClassFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              classFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Classes ({students.length})
          </button>

          {classList.map((cls) => {
            const isSelected = classFilter === cls.name;
            const isAllGenerated = cls.total > 0 && cls.generated === cls.total;

            return (
              <button
                key={cls.name}
                onClick={() => {
                  setClassFilter(cls.name);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>{cls.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : isAllGenerated
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cls.generated}/{cls.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Class-Specific Batch Action Bar if single class is active */}
        {classFilter !== 'all' && (
          <div className="mt-2 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-blue-950">Active Class: {classFilter}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-600">
                {filteredStudents.length} students ({filteredStudents.filter((s) => s.isCardGenerated).length} generated, {filteredStudents.filter((s) => !s.isCardGenerated).length} pending)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const pendingIds = filteredStudents.filter((s) => !s.isCardGenerated).map((s) => s.id);
                  if (pendingIds.length > 0 && onBulkGenerate) {
                    onBulkGenerate(pendingIds);
                  }
                }}
                disabled={filteredStudents.filter((s) => !s.isCardGenerated).length === 0}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 rounded-md transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Generate All Cards for {classFilter}</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('export')}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print {classFilter} Cards</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by student name, contact number, roll number, father's name..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Conveyance Filter */}
          <select
            value={conveyanceFilter}
            onChange={(e) => {
              setConveyanceFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
          >
            <option value="all">All Conveyance</option>
            <option value="Yes">Bus Pass (Yes)</option>
            <option value="No">Private (No)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
          >
            <option value="all">All Card Statuses</option>
            <option value="generated">Cards Generated</option>
            <option value="pending">Pending Generation</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs px-2 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-mono"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Batch Operations Bar (Visible when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between animate-in fade-in">
          <span className="text-xs font-medium text-blue-900">
            {selectedIds.length} of {filteredStudents.length} students selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkGenerate && onBulkGenerate(selectedIds)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Generated</span>
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedIds.length} students?`)) {
                  onBulkDelete && onBulkDelete(selectedIds);
                  setSelectedIds([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Student Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Student Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Parents' Names</th>
                <th
                  onClick={() => handleSort('classGrade')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Class & Roll</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">D.O.B.</th>
                <th className="py-3 px-3">Conveyance</th>
                <th className="py-3 px-3 text-center">Card Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-600">No student records match your query.</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or importing an Excel roster.</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative group w-8 h-8 shrink-0">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.name}
                                className="w-8 h-8 rounded object-cover border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <span className="text-[10px] font-bold">
                                  {student.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <label
                              title="Upload Photo"
                              className="absolute inset-0 bg-black/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
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
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{student.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {student.idCardNumber || student.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <p className="truncate max-w-[150px]">F: {student.fatherName || '—'}</p>
                        <p className="truncate max-w-[150px] text-[10px] text-slate-400">
                          M: {student.motherName || '—'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="font-medium text-slate-800">{student.classGrade || 'Class X'}</span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          Roll: {student.rollNo || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                        {student.contactNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {student.dob}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            student.conveyance === 'Yes'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <Bus className="w-3 h-3" />
                          <span>{student.conveyance === 'Yes' ? 'Bus Route' : 'Private'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onToggleCardGenerated(student.id)}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                            student.isCardGenerated
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {student.isCardGenerated ? 'Generated' : 'Pending'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPreviewStudent(student);
                              setPreviewSide('front');
                            }}
                            title="Preview ID Card"
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              onSelectStudentForEditor(student.id);
                              onNavigate && onNavigate('editor');
                            }}
                            title="Customize Card"
                            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditStudent(student)}
                            title="Edit Student Info"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-1 py-0.5"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete student record for ${student.name}?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            title="Delete Student"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {previewStudent.name} — CR80 Identity Card
                </h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {schoolSettings.defaultOrientation}
                </span>
              </div>
              <button
                onClick={() => setPreviewStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-slate-100/60 flex flex-col items-center justify-center">
              {/* Card Container for html2canvas export */}
              <div
                ref={cardPreviewRef}
                className={`shadow-lg rounded-md overflow-hidden bg-white w-full ${
                  schoolSettings.defaultOrientation === 'portrait' ? 'max-w-[280px]' : 'max-w-[400px]'
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

              {/* Front / Back Switcher */}
              <div className="mt-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Card Side:</span>
                <button
                  onClick={() => setPreviewSide('front')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    previewSide === 'front' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Front Side
                </button>
                <button
                  onClick={() => setPreviewSide('back')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    previewSide === 'back' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Back Side
                </button>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white">
              <button
                onClick={() => {
                  onSelectStudentForEditor(previewStudent.id);
                  setPreviewStudent(null);
                  onNavigate && onNavigate('editor');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open in Customizer Studio</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPng}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Download PNG
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
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
          if (onUpdateStudentsBulk) {
            onUpdateStudentsBulk(updatedStudents);
          }
        }}
      />
    </div>
  );
};
