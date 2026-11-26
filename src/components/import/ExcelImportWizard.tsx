import React, { useState } from 'react';
import { ActiveNavTab, SchoolSettings, Student } from '../../types';
import {
  autoDetectColumnMapping,
  ColumnMapping,
  downloadSampleRosterCSV,
  parseExcelFile,
  ParsedWorkbook,
  validateMappedRows,
  ValidatedRecord,
} from '../../utils/excel';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  AlertCircle,
  Check,
  RefreshCw,
} from 'lucide-react';

interface ExcelImportWizardProps {
  schoolSettings: SchoolSettings;
  onImportComplete: (importedStudents: Student[], mode: 'append' | 'replace') => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  schoolSettings,
  onImportComplete,
  onNavigate,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    fatherName: '',
    motherName: '',
    contactNumber: '',
    dob: '',
    address: '',
    conveyance: '',
    session: '',
    rollNo: '',
    classGrade: '',
    bloodGroup: '',
    photoUrl: '',
  });

  const [validatedRecords, setValidatedRecords] = useState<ValidatedRecord[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Step 1: File Upload Handler
  const handleFileUpload = async (uploadedFile: File) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const parsed = await parseExcelFile(uploadedFile);
      setFile(uploadedFile);
      setParsedWorkbook(parsed);
      setSelectedSheet(parsed.activeSheet);

      // Auto detect columns
      const autoMap = autoDetectColumnMapping(parsed.headers);
      setColumnMapping(autoMap);

      // Move to Step 2 if multiple sheets, or Step 3 if single sheet
      if (parsed.sheetNames.length > 1) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error parsing Excel file. Ensure valid format.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3 -> 4: Validate mapped rows
  const handleProceedToValidation = () => {
    if (!parsedWorkbook) return;
    if (!columnMapping.name) {
      setErrorMessage("Please map at least the 'Student Name' column.");
      return;
    }
    setErrorMessage('');

    const records = validateMappedRows(
      parsedWorkbook.rows,
      columnMapping,
      schoolSettings.academicSession
    );
    setValidatedRecords(records);
    setCurrentStep(4);
  };

  // Step 5: Update record inline
  const handleUpdateRecordField = (rowIndex: number, field: keyof Student, val: string) => {
    setValidatedRecords((prev) =>
      prev.map((rec) => {
        if (rec.index !== rowIndex) return rec;
        const updatedData = { ...rec.data, [field]: val };
        // Clear errors for that field if resolved
        const updatedErrors = rec.errors.filter((e) => e.field !== field);
        return {
          ...rec,
          data: updatedData,
          errors: updatedErrors,
          isValid: !updatedErrors.some((e) => e.severity === 'error'),
        };
      })
    );
  };

  // Step 6: Execute Import
  const handleConfirmImport = () => {
    const validStudents: Student[] = validatedRecords
      .filter((r) => r.isValid)
      .map((r) => r.data as Student);

    if (validStudents.length === 0) {
      setErrorMessage('No valid student records to import. Please resolve validation errors.');
      return;
    }

    onImportComplete(validStudents, importMode);
    onNavigate('students');
  };

  const errorCount = validatedRecords.filter((r) => !r.isValid).length;
  const warningCount = validatedRecords.reduce(
    (acc, r) => acc + r.errors.filter((e) => e.severity === 'warning').length,
    0
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Guided Excel & CSV Import Wizard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk onboard students with automatic schema mapping, duplicate prevention, and Indian data normalization.
          </p>
        </div>

        <button
          onClick={downloadSampleRosterCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* 6 Step Progress Indicator */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="grid grid-cols-6 gap-2 text-center text-xs">
          {[
            { num: 1, label: 'Upload File' },
            { num: 2, label: 'Select Sheet' },
            { num: 3, label: 'Map Columns' },
            { num: 4, label: 'Validate Data' },
            { num: 5, label: 'Resolve Issues' },
            { num: 6, label: 'Confirm Import' },
          ].map((st) => {
            const isPassed = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <div
                key={st.num}
                className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : isPassed
                    ? 'text-slate-800'
                    : 'text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mb-1 ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isPassed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isPassed ? <Check className="w-3.5 h-3.5" /> : st.num}
                </div>
                <span className="text-[11px] truncate w-full">{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {currentStep === 1 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-6">
          <div className="max-w-md mx-auto p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 transition-colors flex flex-col items-center justify-center">
            <UploadCloud className="w-12 h-12 text-blue-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Select or Drop Excel Workbook (.xlsx, .xls, .csv)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Local parsing in browser. Student privacy is strictly preserved.
            </p>
            <label className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-sm">
              <span>Browse Files</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Don't have a file ready?</span>
            <button
              onClick={downloadSampleRosterCSV}
              className="text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Download Sample CSV Roster Template
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT SHEET */}
      {currentStep === 2 && parsedWorkbook && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Multiple Worksheets Detected in {parsedWorkbook.fileName}
          </h3>
          <p className="text-xs text-slate-500">Select the sheet containing your student enrollment data:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {parsedWorkbook.sheetNames.map((sheet) => (
              <button
                key={sheet}
                onClick={() => setSelectedSheet(sheet)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedSheet === sheet
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 mb-2 text-blue-600" />
                <span className="text-xs font-bold block">{sheet}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-3.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <span>Next: Map Columns</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MAP COLUMNS */}
      {currentStep === 3 && parsedWorkbook && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Map Excel Columns to Card Fields</h3>
              <p className="text-xs text-slate-500">
                Matches were auto-detected. Adjust any dropdown to match your spreadsheet columns.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Found {parsedWorkbook.rows.length} rows in sheet
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Student Full Name', required: true },
              { key: 'fatherName', label: "Father's Name", required: true },
              { key: 'motherName', label: "Mother's Name", required: true },
              { key: 'contactNumber', label: 'Contact Phone Number', required: true },
              { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)', required: true },
              { key: 'address', label: 'Residential Address', required: true },
              { key: 'conveyance', label: 'Conveyance / Bus Pass (Yes/No)', required: true },
              { key: 'session', label: 'Academic Session (e.g. 2025-2026)', required: true },
              { key: 'rollNo', label: 'Roll Number / Admission No', required: false },
              { key: 'classGrade', label: 'Class & Section', required: false },
              { key: 'bloodGroup', label: 'Blood Group', required: false },
              { key: 'photoUrl', label: 'Photo URL / Image File', required: false },
            ].map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </span>
                </div>
                <select
                  value={(columnMapping as any)[field.key] || ''}
                  onChange={(e) =>
                    setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                  }
                  className="text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 max-w-[200px]"
                >
                  <option value="">-- Unmapped --</option>
                  {parsedWorkbook.headers.map((hdr) => (
                    <option key={hdr} value={hdr}>
                      {hdr}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(parsedWorkbook.sheetNames.length > 1 ? 2 : 1)}
              className="px-3.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={handleProceedToValidation}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <span>Validate {parsedWorkbook.rows.length} Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 & 5: VALIDATION & RESOLVE */}
      {(currentStep === 4 || currentStep === 5) && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Data Validation & Integrity Review
              </h3>
              <p className="text-xs text-slate-500">
                {validatedRecords.length} records processed · {validatedRecords.length - errorCount} valid · {errorCount} errors
              </p>
            </div>

            <div className="flex items-center gap-2">
              {errorCount > 0 ? (
                <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>{errorCount} rows require attention</span>
                </span>
              ) : (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All records verified</span>
                </span>
              )}
            </div>
          </div>

          {/* Validation Table */}
          <div className="overflow-x-auto max-h-[50vh] border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr className="text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Father's Name</th>
                  <th className="py-2.5 px-3">Mother's Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">D.O.B.</th>
                  <th className="py-2.5 px-3">Conveyance</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validatedRecords.map((rec) => {
                  const hasErr = !rec.isValid;
                  return (
                    <tr
                      key={rec.index}
                      className={`hover:bg-slate-50 transition-colors ${
                        hasErr ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-400">
                        {rec.index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rec.data.name || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'name', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rec.data.fatherName || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'fatherName', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rec.data.motherName || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'motherName', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="text"
                          value={rec.data.contactNumber || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'contactNumber', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="text"
                          value={rec.data.dob || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'dob', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={rec.data.conveyance || 'No'}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'conveyance', e.target.value)}
                          className="text-xs bg-transparent border border-slate-200 rounded px-1.5 py-0.5"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 truncate max-w-[150px]">
                        <input
                          type="text"
                          value={rec.data.address || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'address', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white px-1 py-0.5 rounded text-xs truncate"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {rec.isValid ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Valid
                          </span>
                        ) : (
                          <span
                            title={rec.errors.map((e) => e.message).join(', ')}
                            className="text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full cursor-help"
                          >
                            Fix ({rec.errors.length})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-3.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg"
            >
              Back to Column Mapping
            </button>
            <button
              onClick={() => setCurrentStep(6)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <span>Next: Confirm Import</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: CONFIRM IMPORT */}
      {currentStep === 6 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Confirm Student Roster Import</h3>
            <p className="text-xs text-slate-500">
              Review destination options before committing records to the active database.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Import Strategy
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${
                  importMode === 'append'
                    ? 'border-blue-600 bg-white shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Append to Existing Records
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Preserves previously imported students and adds the new records.
                  </span>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${
                  importMode === 'replace'
                    ? 'border-blue-600 bg-white shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Replace School Roster
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Clears demo or prior students and sets this workbook as the exclusive roster.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-900">
                Ready to Import: {validatedRecords.filter((r) => r.isValid).length} Valid Student Records
              </p>
              <p className="text-slate-500 mt-0.5">
                Session: {schoolSettings.academicSession} · Ready for CR80 card generation
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-3.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Review Records
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Commit & Import to Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
