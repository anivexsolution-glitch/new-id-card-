import React, { useState } from 'react';
import JSZip from 'jszip';
import { Student } from '../../types';
import {
  X,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Image as ImageIcon,
  Search,
} from 'lucide-react';

interface BulkPhotoZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onApplyPhotos: (updatedStudents: Student[]) => void;
}

interface MatchResult {
  studentId: string;
  studentName: string;
  rollNo?: string;
  idCardNumber?: string;
  matchedFilename: string;
  photoDataUrl: string;
  isExistingReplaced: boolean;
}

export const BulkPhotoZipModal: React.FC<BulkPhotoZipModalProps> = ({
  isOpen,
  onClose,
  students,
  onApplyPhotos,
}) => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [matchCriteria, setMatchCriteria] = useState<'smart' | 'rollNo' | 'idCardNumber' | 'name'>('smart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [matchedResults, setMatchedResults] = useState<MatchResult[]>([]);
  const [unmatchedFiles, setUnmatchedFiles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const normalizeStr = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Please select a valid .zip file archive containing student photos.');
      return;
    }

    setZipFile(file);
    setErrorMsg('');
    await processZipArchive(file, matchCriteria);
  };

  const processZipArchive = async (file: File, criteria: typeof matchCriteria) => {
    setIsProcessing(true);
    setProgressText('Extracting photos from ZIP archive...');
    setErrorMsg('');
    setMatchedResults([]);
    setUnmatchedFiles([]);

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);

      // Find all image files
      const imageEntries: { name: string; entry: JSZip.JSZipObject }[] = [];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      loadedZip.forEach((relativePath, entry) => {
        if (entry.dir) return;
        // Ignore macOS hidden files like __MACOSX/ or .DS_Store
        if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) return;

        const lowerName = relativePath.toLowerCase();
        if (validExtensions.some((ext) => lowerName.endsWith(ext))) {
          // Extract base filename without folder path
          const filename = relativePath.split('/').pop() || relativePath;
          imageEntries.push({ name: filename, entry });
        }
      });

      if (imageEntries.length === 0) {
        setErrorMsg('No valid image files (.jpg, .jpeg, .png, .webp) were found inside this ZIP archive.');
        setIsProcessing(false);
        return;
      }

      setProgressText(`Matching ${imageEntries.length} photos against ${students.length} student records...`);

      const matches: MatchResult[] = [];
      const unmatched: string[] = [];

      // Extract image data and match
      for (let i = 0; i < imageEntries.length; i++) {
        const { name: filename, entry } = imageEntries[i];
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        
        // Base name without extension
        const baseName = filename.substring(0, filename.lastIndexOf('.')).trim();
        const normBaseName = normalizeStr(baseName);

        // Find matching student
        let matchedStudent: Student | undefined;

        if (criteria === 'rollNo') {
          matchedStudent = students.find((s) => s.rollNo && normalizeStr(s.rollNo) === normBaseName);
        } else if (criteria === 'idCardNumber') {
          matchedStudent = students.find(
            (s) =>
              (s.idCardNumber && normalizeStr(s.idCardNumber) === normBaseName) ||
              normalizeStr(s.id) === normBaseName
          );
        } else if (criteria === 'name') {
          matchedStudent = students.find(
            (s) => normalizeStr(s.name) === normBaseName || normBaseName.includes(normalizeStr(s.name))
          );
        } else {
          // SMART MATCH: Try ID, then Roll Number, then Name
          matchedStudent = students.find(
            (s) =>
              (s.idCardNumber && normalizeStr(s.idCardNumber) === normBaseName) ||
              (s.id && normalizeStr(s.id) === normBaseName)
          );

          if (!matchedStudent) {
            matchedStudent = students.find((s) => s.rollNo && normalizeStr(s.rollNo) === normBaseName);
          }

          if (!matchedStudent) {
            matchedStudent = students.find((s) => {
              const normStudentName = normalizeStr(s.name);
              return (
                normBaseName === normStudentName ||
                normBaseName.replace(/[^a-z]/g, '') === normStudentName.replace(/[^a-z]/g, '')
              );
            });
          }
        }

        if (matchedStudent) {
          const base64Data = await entry.async('base64');
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          matches.push({
            studentId: matchedStudent.id,
            studentName: matchedStudent.name,
            rollNo: matchedStudent.rollNo,
            idCardNumber: matchedStudent.idCardNumber,
            matchedFilename: filename,
            photoDataUrl: dataUrl,
            isExistingReplaced: !!matchedStudent.photoUrl,
          });
        } else {
          unmatched.push(filename);
        }
      }

      setMatchedResults(matches);
      setUnmatchedFiles(unmatched);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to read or extract the ZIP file: ' + (err.message || 'Corrupted archive.'));
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleApply = () => {
    if (matchedResults.length === 0) return;

    // Create lookup map
    const photoMap = new Map<string, string>();
    matchedResults.forEach((m) => {
      photoMap.set(m.studentId, m.photoDataUrl);
    });

    const updated = students.map((s) => {
      if (photoMap.has(s.id)) {
        return {
          ...s,
          photoUrl: photoMap.get(s.id)!,
        };
      }
      return s;
    });

    onApplyPhotos(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bulk Student Photo ZIP Matcher
              </h3>
              <p className="text-xs text-slate-500">
                Upload a .zip file to automatically attach photographs to student ID cards in bulk.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload & Criteria Zone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Criteria Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Filename Matching Strategy
              </label>
              <select
                value={matchCriteria}
                onChange={(e) => {
                  const newCriteria = e.target.value as any;
                  setMatchCriteria(newCriteria);
                  if (zipFile) {
                    processZipArchive(zipFile, newCriteria);
                  }
                }}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="smart">Auto Smart Match (ID → Roll → Name)</option>
                <option value="rollNo">Match by Roll Number (e.g. 101.jpg)</option>
                <option value="idCardNumber">Match by Student ID / Adm No (STD-01.jpg)</option>
                <option value="name">Match by Student Name (Aarav_Sharma.jpg)</option>
              </select>
              <p className="text-[11px] text-slate-400 leading-tight">
                Photos inside folders or subdirectories will be extracted automatically.
              </p>
            </div>

            {/* ZIP File Picker Dropzone */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Upload Photo ZIP Archive
              </label>
              <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer transition-colors">
                <UploadCloud className="w-6 h-6 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {zipFile ? zipFile.name : 'Select or drag & drop student_photos.zip'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {zipFile ? `${(zipFile.size / (1024 * 1024)).toFixed(2)} MB archive` : 'Supports JPG, PNG, WEBP images inside ZIP'}
                  </p>
                </div>
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleZipFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="p-8 text-center bg-blue-50/50 rounded-xl border border-blue-200">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-blue-900">{progressText}</p>
              <p className="text-[11px] text-blue-700/80 mt-1">Extracting and optimizing images in browser memory...</p>
            </div>
          )}

          {/* Results Summary & Preview */}
          {!isProcessing && matchedResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    {matchedResults.length} student photos matched successfully!
                  </span>
                </div>
                {unmatchedFiles.length > 0 && (
                  <span className="text-[11px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-mono">
                    {unmatchedFiles.length} files unmatched
                  </span>
                )}
              </div>

              {/* Matched Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Photo Preview</th>
                      <th className="py-2.5 px-3">Matched Student</th>
                      <th className="py-2.5 px-3">Roll / ID</th>
                      <th className="py-2.5 px-3">ZIP Filename</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matchedResults.map((m) => (
                      <tr key={m.studentId} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3">
                          <img
                            src={m.photoDataUrl}
                            alt={m.studentName}
                            className="w-8 h-8 rounded-md object-cover border border-slate-200 shadow-xs"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {m.studentName}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                          Roll: {m.rollNo || '—'} · {m.idCardNumber || m.studentId}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 text-[11px] truncate max-w-[140px]">
                          {m.matchedFilename}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {m.isExistingReplaced ? 'Replaces Photo' : 'New Photo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmatched Files details if any */}
          {!isProcessing && unmatchedFiles.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800 block mb-1">
                Unmatched Files ({unmatchedFiles.length}):
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                These photos could not be linked to any student with current match criteria ({matchCriteria}):
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {unmatchedFiles.map((fn, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600"
                  >
                    {fn}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={matchedResults.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply {matchedResults.length} Photos to ID Cards</span>
          </button>
        </div>
      </div>
    </div>
  );
};
