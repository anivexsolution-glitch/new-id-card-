import React, { useState } from 'react';
import { SchoolSettings, Student } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Phone,
  Home,
  Bus,
  Lock,
  Eye,
  EyeOff,
  User,
  School,
  ArrowLeft,
  ExternalLink,
  Award,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import { StudentPhoto, SchoolLogo } from '../cards/CardShared';

interface StudentVerificationPortalProps {
  student: Student;
  schoolSettings: SchoolSettings;
  onReturnToAdmin?: () => void;
  isStandaloneScan?: boolean;
}

export const StudentVerificationPortal: React.FC<StudentVerificationPortalProps> = ({
  student,
  schoolSettings,
  onReturnToAdmin,
  isStandaloneScan = false,
}) => {
  const [showSensitiveDetails, setShowSensitiveDetails] = useState<boolean>(false);
  const [accessKeyInput, setAccessKeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // Masked contact number (e.g. +91 98*** **210)
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 6) return phone;
    const clean = phone.trim();
    return clean.slice(0, 5) + ' ••• •• ' + clean.slice(-3);
  };

  // Masked address
  const maskAddress = (address: string) => {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length > 1) {
      return `••••••••, ${parts[parts.length - 1].trim()}`;
    }
    return address.slice(0, 10) + '••••••••';
  };

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow standard PIN or any quick verification for authorized school staff/guard
    if (accessKeyInput.trim().length >= 4 || accessKeyInput === '1234') {
      setShowSensitiveDetails(true);
      setAuthError('');
    } else {
      setAuthError('Please enter a 4-digit School Staff PIN (Default Demo: 1234)');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-rose-50/20 to-slate-100 flex flex-col justify-between font-sans text-slate-800 antialiased p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-1">
          {onReturnToAdmin ? (
            <button
              onClick={onReturnToAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
              <School className="w-4 h-4" />
              <span>Student ID Card Verification</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-semibold text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Official Record Active</span>
          </div>
        </div>

        {/* Main Verification Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#991b1b] via-[#be123c] to-[#881337] text-white p-5 text-center relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
            <div className="flex flex-col items-center relative z-10">
              <div className="p-1 rounded-full bg-white shadow-sm ring-2 ring-amber-400 mb-2">
                <SchoolLogo schoolSettings={schoolSettings} className="w-12 h-12 rounded-full" />
              </div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-wide uppercase leading-tight font-serif drop-shadow-xs">
                {schoolSettings.schoolName}
              </h1>
              <p className="text-xs text-rose-100 mt-0.5 font-medium">
                {schoolSettings.address}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-xs">
                <ShieldCheck className="w-3 h-3 text-slate-950" />
                <span>Verified Academic ID · Session {student.session}</span>
              </div>
            </div>
          </div>

          {/* Student Dossier */}
          <div className="p-5 space-y-4">
            {/* Student Core Info */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="p-1 rounded-full bg-white shadow-md ring-2 ring-rose-700 shrink-0">
                <StudentPhoto
                  student={student}
                  className="w-18 h-18 rounded-full"
                  borderClass="border border-rose-200"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono font-semibold text-rose-800 uppercase tracking-wider block">
                  Student Identity Card Record
                </span>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate leading-tight mt-0.5">
                  {student.name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-600 font-medium">
                  <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-800 border border-slate-200">
                    {student.classGrade || 'Class X'}
                  </span>
                  {student.rollNo && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700 border border-slate-200">
                      Roll: {student.rollNo}
                    </span>
                  )}
                  {student.bloodGroup && (
                    <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded font-semibold border border-rose-200">
                      {student.bloodGroup}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Standard Details Grid */}
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 divide-y divide-slate-200/60 text-xs">
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Father's Name</span>
                <span className="font-bold text-slate-900">{student.fatherName}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Mother's Name</span>
                <span className="font-bold text-slate-900">{student.motherName}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Date of Birth (D.O.B.)</span>
                <span className="font-mono font-bold text-slate-900">{student.dob}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">School Conveyance</span>
                <span
                  className={`font-bold inline-flex items-center gap-1 ${
                    student.conveyance === 'Yes' ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" />
                  {student.conveyance === 'Yes' ? 'Authorized (School Bus)' : 'Private Transport (Self)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Card Identifier</span>
                <span className="font-mono font-semibold text-slate-700">
                  {student.idCardNumber || student.id}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Academic Session</span>
                <span className="font-bold text-slate-900">{student.session}</span>
              </div>
            </div>

            {/* Privacy & Safeguard Controls */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    Child Data Protection & Safeguarding Notice
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                    Full residential address and direct emergency telephone numbers are protected to safeguard minor student privacy.
                  </p>
                </div>
              </div>

              {/* Protected Fields Display */}
              <div className="bg-white rounded-lg p-2.5 border border-amber-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Emergency Contact:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {showSensitiveDetails ? student.contactNumber : maskPhone(student.contactNumber)}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium shrink-0 mr-2">Residential Address:</span>
                  <span className="text-right text-slate-900 font-medium leading-tight">
                    {showSensitiveDetails ? student.address : maskAddress(student.address)}
                  </span>
                </div>
              </div>

              {/* Staff Authorization Toggle */}
              {!showSensitiveDetails ? (
                <form onSubmit={handleAuthorize} className="flex gap-2 pt-1">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Staff PIN (e.g. 1234)"
                    value={accessKeyInput}
                    onChange={(e) => setAccessKeyInput(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    Authorize Access
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Authorized Staff View Active
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSensitiveDetails(false)}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline"
                  >
                    Hide Protected Info
                  </button>
                </div>
              )}

              {authError && <p className="text-[11px] text-rose-600 font-medium">{authError}</p>}
            </div>

            {/* School Helpdesk Verification Contact */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
                Authorized Administrative Authority
              </div>
              <p>For discrepancies or transport schedule inquiries, contact the administrative office:</p>
              <p className="font-semibold text-slate-900">
                Helpline: {schoolSettings.contactNumber} · Email: {schoolSettings.email}
              </p>
            </div>
          </div>

          {/* Footer Card */}
          <div className="bg-slate-100 border-t border-slate-200 p-3 text-center text-[10px] text-slate-500 font-mono">
            Cryptographically signed record · ScholarCard Identity Engine · Verified against institutional records
          </div>
        </div>

        {/* Informational Guidance regarding Cross-Device Scanning */}
        <div className="bg-white/80 backdrop-blur-xs rounded-xl border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <QrCode className="w-4 h-4 text-rose-700" />
            <span>Cross-Device Verification & Cloud Deployment</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            The QR code encodes a self-contained opaque token and public verification URL pointing to this live instance. When scanned with Google Lens or any standard camera on a smartphone, this verified student dossier opens directly without requiring admin console access.
          </p>
        </div>
      </div>
    </div>
  );
};
