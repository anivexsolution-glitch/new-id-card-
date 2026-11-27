import React, { useState } from 'react';
import JSZip from 'jszip';
import { Student } from '../../types';
import { hasValidStudentPhoto } from '../../utils/photoUtils';
import { StatusText } from '../ui/EnterpriseUI';
import {
  X,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertCircle,
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

  const normalizeStr = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Please select a valid .zip archive containing student photos.');
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

      const imageEntries: { name: string; entry: JSZip.JSZipObject }[] = [];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

      loadedZip.forEach((relativePath, entry) => {
        if (entry.dir) return;
        if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) return;

        const lowerName = relativePath.toLowerCase();
        if (validExtensions.some((ext) => lowerName.endsWith(ext))) {
          const filename = relativePath.split('/').pop() || relativePath;
          imageEntries.push({ name: filename, entry });
        }
      });

      if (imageEntries.length === 0) {
        setErrorMsg('No valid image files (.jpg, .jpeg, .png, .webp) were found inside this ZIP archive.');
        setIsProcessing(false);
        return;
      }

      setProgressText(`Matching ${imageEntries.length} photos against ${students.length} records...`);

      const matches: MatchResult[] = [];
      const unmatched: string[] = [];

      for (let i = 0; i < imageEntries.length; i++) {
        const { name: filename, entry } = imageEntries[i];
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const baseName = filename.substring(0, filename.lastIndexOf('.')).trim();
        const normBaseName = normalizeStr(baseName);

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
            isExistingReplaced: hasValidStudentPhoto(matchedStudent.photoUrl),
          });
        } else {
          unmatched.push(filename);
        }
      }

      setMatchedResults(matches);
      setUnmatchedFiles(unmatched);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to extract ZIP archive: ' + (err.message || 'Corrupted archive.'));
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  const handleApply = () => {
    if (matchedResults.length === 0) return;

    const photoMap = new Map<string, string>();
    matchedResults.forEach((m) => {
      photoMap.set(m.studentId, m.photoDataUrl);
    });

    const updated = students.map((s) =>
      photoMap.has(s.id) ? { ...s, photoUrl: photoMap.get(s.id)! } : s
    );

    onApplyPhotos(updated);
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-[#202B38]/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-[12px] shadow-xl border border-[#E3E7EB] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E3E7EB] flex items-center justify-between bg-[#F5F6F7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#24364B] text-white flex items-center justify-center">
              <FileArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202B38]">
                Bulk Student Photo Upload (ZIP)
              </h3>
              <p className="text-xs text-[#75808C]">
                Match and attach student portraits automatically from a ZIP archive.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#C44949]/10 border border-[#C44949]/30 flex items-center gap-2 text-xs text-[#C44949]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#202B38]">
                Matching Strategy
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
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] focus:outline-none focus:border-[#24364B]"
              >
                <option value="smart">Auto Match (ID → Roll → Name)</option>
                <option value="rollNo">Roll Number (101.jpg)</option>
                <option value="idCardNumber">Student ID (SCH-01.jpg)</option>
                <option value="name">Student Name (Aarav_Sharma.jpg)</option>
              </select>
              <p className="text-[11px] text-[#75808C]">
                Images inside subfolders are scanned automatically.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#202B38] mb-1.5">
                ZIP Archive File
              </label>
              <label className="border border-dashed border-[#E3E7EB] hover:border-[#24364B] bg-[#F5F6F7] hover:bg-[#F0F2F4] rounded-[10px] p-4 flex items-center justify-center gap-3 cursor-pointer transition-colors">
                <UploadCloud className="w-5 h-5 text-[#24364B] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#202B38] truncate">
                    {zipFile ? zipFile.name : 'Select student_photos.zip'}
                  </p>
                  <p className="text-[11px] text-[#75808C]">
                    {zipFile
                      ? `${(zipFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : 'Supports JPG, PNG, and WebP portraits'}
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

          {isProcessing && (
            <div className="p-6 text-center bg-[#F5F6F7] rounded-[10px] border border-[#E3E7EB]">
              <div className="w-6 h-6 border-2 border-[#24364B] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
              <p className="text-xs font-semibold text-[#202B38]">{progressText}</p>
            </div>
          )}

          {!isProcessing && matchedResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#F5F6F7] border border-[#E3E7EB] px-4 py-2.5 rounded-lg text-xs">
                <StatusText
                  tone="success"
                  label={`${matchedResults.length} photos matched`}
                />
                {unmatchedFiles.length > 0 && (
                  <span className="text-[11px] font-mono text-[#C18A38]">
                    {unmatchedFiles.length} unmatched files
                  </span>
                )}
              </div>

              <div className="border border-[#E3E7EB] rounded-[10px] overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F5F6F7] sticky top-0 border-b border-[#E3E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#75808C]">
                    <tr>
                      <th className="py-2.5 px-3">Photo</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Roll / ID</th>
                      <th className="py-2.5 px-3">Filename</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E7EB]">
                    {matchedResults.map((m) => (
                      <tr key={m.studentId} className="hover:bg-[#F5F6F7]/70">
                        <td className="py-2 px-3">
                          <img
                            src={m.photoDataUrl}
                            alt={m.studentName}
                            className="w-8 h-8 rounded object-cover border border-[#E3E7EB]"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#202B38]">
                          {m.studentName}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#536477] text-[11px]">
                          {m.rollNo || '—'} · {m.idCardNumber || m.studentId}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#536477] text-[11px] truncate max-w-[140px]">
                          {m.matchedFilename}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <StatusText
                            tone={m.isExistingReplaced ? 'warning' : 'success'}
                            label={m.isExistingReplaced ? 'Replace' : 'Attach'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isProcessing && unmatchedFiles.length > 0 && (
            <div className="p-3 bg-[#F5F6F7] rounded-lg border border-[#E3E7EB] text-xs">
              <p className="font-semibold text-[#202B38] mb-1">
                Unmatched Files ({unmatchedFiles.length})
              </p>
              <p className="text-[11px] text-[#75808C] font-mono break-all">
                {unmatchedFiles.join(', ')}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E3E7EB] bg-[#F5F6F7] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={matchedResults.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] disabled:opacity-40 rounded-lg"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Apply {matchedResults.length} Photos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
