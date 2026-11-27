import React, { useEffect, useState, useMemo } from 'react';
import { SchoolSettings, Student } from '../../types';
import { generateStudentQRDataUrl, getStudentVerificationUrl, qrCache } from '../../utils/qrCodeGenerator';
import { QrCode } from 'lucide-react';

interface StudentQRCodeProps {
  student: Student;
  schoolSettings: SchoolSettings;
  size?: number; // width & height in px
  className?: string;
  showLabel?: boolean;
  labelPosition?: 'top' | 'bottom';
  onScanClick?: () => void;
}

export const StudentQRCode: React.FC<StudentQRCodeProps> = ({
  student,
  schoolSettings,
  size = 54,
  className = '',
  showLabel = true,
  labelPosition = 'bottom',
  onScanClick,
}) => {
  // Memoize verifyUrl with stable primitive dependencies
  const verifyUrl = useMemo(
    () => getStudentVerificationUrl(student, schoolSettings),
    [
      student.id,
      student.idCardNumber,
      student.name,
      student.fatherName,
      student.motherName,
      student.dob,
      student.contactNumber,
      student.address,
      student.conveyance,
      student.session,
      student.rollNo,
      student.classGrade,
      schoolSettings.schoolName,
      schoolSettings.schoolCode,
      schoolSettings.address,
      schoolSettings.contactNumber,
      schoolSettings.academicSession,
    ]
  );

  // Initialize with cached value if available, preventing empty flicker or extra render cycles
  const [qrDataUrl, setQrDataUrl] = useState<string>(() => qrCache.get(verifyUrl) || '');

  useEffect(() => {
    // If already cached, no need to re-generate
    const cached = qrCache.get(verifyUrl);
    if (cached) {
      setQrDataUrl((prev) => (prev === cached ? prev : cached));
      return;
    }

    let isMounted = true;
    generateStudentQRDataUrl(verifyUrl).then((url) => {
      if (isMounted && url) {
        setQrDataUrl((prev) => (prev === url ? prev : url));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [verifyUrl]);

  return (
    <div
      className={`inline-flex flex-col items-center justify-center shrink-0 group ${className}`}
      title="Scan with phone camera or Google Lens to verify student details"
      onClick={onScanClick}
    >
      {showLabel && labelPosition === 'top' && (
        <span className="text-[5px] font-mono font-bold tracking-tight uppercase text-slate-500 mb-0.5 leading-none">
          Scan to Verify
        </span>
      )}

      <div
        className="relative bg-white p-0.5 rounded-sm border border-slate-200/90 shadow-2xs overflow-hidden flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR code for ${student.name}`}
            className="w-full h-full object-contain block"
          />
        ) : (
          <div className="w-full h-full bg-slate-50 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>

      {showLabel && labelPosition === 'bottom' && (
        <span className="text-[5px] font-mono font-bold tracking-tight uppercase text-slate-500 mt-0.5 leading-none select-none">
          Scan to Verify
        </span>
      )}
    </div>
  );
};
