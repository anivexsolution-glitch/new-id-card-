import React, { useState, useEffect } from 'react';
import { CardStatus, SchoolSettings, Student } from '../../types';
import { hasValidStudentPhoto, sanitizeStudentPhotoUrl } from '../../utils/photoUtils';
import { X, Upload, User, AlertCircle, ShieldAlert } from 'lucide-react';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  studentToEdit?: Student | null;
  schoolSettings: SchoolSettings;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  schoolSettings,
}) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    fatherName: '',
    motherName: '',
    contactNumber: '',
    dob: '',
    address: '',
    conveyance: 'No',
    session: schoolSettings.academicSession,
    rollNo: '',
    classGrade: 'Class X - A',
    bloodGroup: 'B+',
    photoUrl: '',
    photoCrop: { zoom: 1, x: 0, y: 0 },
    emergencyContact: '',
    cardStatus: 'active',
    validUntil: schoolSettings.defaultCardValidUntil || '31/03/2026',
    statusReason: '',
  });

  const [error, setError] = useState<string>('');
  const [showPhotoCrop, setShowPhotoCrop] = useState<boolean>(false);

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        ...studentToEdit,
        photoUrl: sanitizeStudentPhotoUrl(studentToEdit.photoUrl) || '',
        cardStatus: studentToEdit.cardStatus || 'active',
        validUntil: studentToEdit.validUntil || schoolSettings.defaultCardValidUntil || '',
        statusReason: studentToEdit.statusReason || '',
      });
    } else {
      setFormData({
        name: '',
        fatherName: '',
        motherName: '',
        contactNumber: '',
        dob: '',
        address: '',
        conveyance: 'No',
        session: schoolSettings.academicSession,
        rollNo: '',
        classGrade: 'Class X - A',
        bloodGroup: 'B+',
        photoUrl: '',
        photoCrop: { zoom: 1, x: 0, y: 0 },
        emergencyContact: '',
        cardStatus: 'active',
        validUntil: schoolSettings.defaultCardValidUntil || '31/03/2026',
        statusReason: '',
      });
    }
    setError('');
    setShowPhotoCrop(false);
  }, [studentToEdit, isOpen, schoolSettings]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo size exceeds 5MB limit. Please upload an image under 5MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        photoUrl: uploadEvent.target?.result as string,
        photoCrop: { zoom: 1, x: 0, y: 0 },
      }));
      setShowPhotoCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Student Full Name is required.');
      return;
    }
    if (!formData.fatherName?.trim()) {
      setError("Father's Name is required.");
      return;
    }
    if (!formData.motherName?.trim()) {
      setError("Mother's Name is required.");
      return;
    }
    if (!formData.contactNumber?.trim()) {
      setError('Contact Number is required.');
      return;
    }
    if (!formData.dob?.trim()) {
      setError('Date of Birth (DD/MM/YYYY) is required.');
      return;
    }
    if (!formData.address?.trim()) {
      setError('Residential Address is required.');
      return;
    }

    const nextStatus = (formData.cardStatus || 'active') as CardStatus;
    const statusChanged =
      !studentToEdit || (studentToEdit.cardStatus || 'active') !== nextStatus;

    const studentRecord: Student = {
      id: studentToEdit ? studentToEdit.id : `std_${Date.now()}`,
      name: formData.name.trim(),
      fatherName: formData.fatherName.trim(),
      motherName: formData.motherName.trim(),
      contactNumber: formData.contactNumber.trim(),
      dob: formData.dob.trim(),
      address: formData.address.trim(),
      conveyance: formData.conveyance === 'Yes' ? 'Yes' : 'No',
      session: formData.session?.trim() || schoolSettings.academicSession,
      rollNo: formData.rollNo?.trim(),
      classGrade: formData.classGrade?.trim(),
      bloodGroup: formData.bloodGroup?.trim(),
      photoUrl: sanitizeStudentPhotoUrl(formData.photoUrl),
      photoCrop: formData.photoCrop || { zoom: 1, x: 0, y: 0 },
      idCardNumber:
        formData.idCardNumber ||
        `SCH-${(formData.session || '2025').split('-')[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      emergencyContact: formData.emergencyContact?.trim() || formData.contactNumber.trim(),
      isCardGenerated: studentToEdit ? studentToEdit.isCardGenerated : false,
      createdAt: studentToEdit ? studentToEdit.createdAt : new Date().toISOString(),
      cardStatus: nextStatus,
      validUntil: formData.validUntil?.trim() || schoolSettings.defaultCardValidUntil || '',
      statusReason: formData.statusReason?.trim() || '',
      statusUpdatedAt: statusChanged
        ? new Date().toISOString()
        : studentToEdit?.statusUpdatedAt || new Date().toISOString(),
      verificationId: studentToEdit?.verificationId,
    };

    onSave(studentRecord);
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
        className="bg-white rounded-[12px] border border-[#E3E7EB] shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E3E7EB] flex items-center justify-between bg-[#F5F6F7]">
          <div>
            <h3 className="text-base font-bold text-[#202B38]">
              {studentToEdit ? 'Edit Student Record' : 'Add Student'}
            </h3>
            <p className="text-xs text-[#75808C] mt-0.5">
              Complete the required student dossier fields for CR80 card printing and QR verification.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#75808C] hover:text-[#202B38] hover:bg-[#E3E7EB]/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#C44949]/10 border border-[#C44949]/30 flex items-center gap-2 text-xs text-[#C44949]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-24 rounded-lg border border-[#E3E7EB] bg-[#F5F6F7] overflow-hidden flex items-center justify-center relative group">
                {hasValidStudentPhoto(formData.photoUrl) ? (
                  <img
                    src={formData.photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${formData.photoCrop?.zoom || 1}) translate(${formData.photoCrop?.x || 0}%, ${formData.photoCrop?.y || 0}%)`,
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-8 h-8 text-[#75808C]" />
                )}
                <label className="absolute inset-0 bg-[#202B38]/60 text-white flex flex-col items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload className="w-4 h-4 mb-0.5" />
                  <span>Change</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
                <label className="text-[11px] text-[#24364B] hover:underline cursor-pointer font-semibold">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {hasValidStudentPhoto(formData.photoUrl) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowPhotoCrop(!showPhotoCrop)}
                      className="text-[11px] text-[#536477] hover:text-[#202B38] underline"
                    >
                      Adjust
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          photoUrl: '',
                          photoCrop: { zoom: 1, x: 0, y: 0 },
                        }));
                        setShowPhotoCrop(false);
                      }}
                      className="text-[11px] text-[#C44949] hover:underline"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Student Full Name <span className="text-[#C44949]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Class & Section
                </label>
                <input
                  type="text"
                  value={formData.classGrade || ''}
                  onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                  placeholder="e.g. Class X - A"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={formData.rollNo || ''}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  placeholder="e.g. 10-A-24"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
                />
              </div>
            </div>
          </div>

          {showPhotoCrop && formData.photoUrl && (
            <div className="bg-[#F5F6F7] p-3 rounded-lg border border-[#E3E7EB] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-[#536477] mb-0.5">
                  Zoom: {(formData.photoCrop?.zoom || 1).toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="1"
                  max="2.2"
                  step="0.1"
                  value={formData.photoCrop?.zoom || 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      photoCrop: { ...formData.photoCrop!, zoom: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
              <div>
                <label className="block text-[#536477] mb-0.5">
                  Horizontal: {formData.photoCrop?.x || 0}%
                </label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="2"
                  value={formData.photoCrop?.x || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      photoCrop: { ...formData.photoCrop!, x: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
              <div>
                <label className="block text-[#536477] mb-0.5">
                  Vertical: {formData.photoCrop?.y || 0}%
                </label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="2"
                  value={formData.photoCrop?.y || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      photoCrop: { ...formData.photoCrop!, y: parseInt(e.target.value) },
                    })
                  }
                  className="w-full accent-[#24364B]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E3E7EB]">
            <div>
              <label className="block text-xs font-semibold text-[#202B38] mb-1">
                Father&apos;s Name <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fatherName || ''}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B38] mb-1">
                Mother&apos;s Name <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.motherName || ''}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                placeholder="e.g. Sunita Sharma"
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B38] mb-1">
                Contact Number <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactNumber || ''}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B38] mb-1">
                Date of Birth (DD/MM/YYYY) <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.dob || ''}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                placeholder="14/08/2009"
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B38] mb-1">
                Conveyance (Bus Route) <span className="text-[#C44949]">*</span>
              </label>
              <select
                value={formData.conveyance || 'No'}
                onChange={(e) =>
                  setFormData({ ...formData, conveyance: e.target.value as 'Yes' | 'No' })
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B]"
              >
                <option value="No">No (Private Commute)</option>
                <option value="Yes">Yes (School Bus Enrolled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B38] mb-1">
                Academic Session <span className="text-[#C44949]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.session || schoolSettings.academicSession}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                placeholder="2025-2026"
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202B38] mb-1">
              Residential Address <span className="text-[#C44949]">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Flat 402, Shanti Heights, Sector 14, Rohini, New Delhi - 110085"
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] focus:outline-none focus:border-[#24364B] resize-none"
            />
          </div>

          <div className="p-3.5 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#202B38]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#24364B]" />
              <span>Card Validity &amp; Live QR Verification Status</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Valid Until (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={formData.validUntil || ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  placeholder={schoolSettings.defaultCardValidUntil || '31/03/2026'}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white focus:outline-none focus:border-[#24364B] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Card Status
                </label>
                <select
                  value={formData.cardStatus || 'active'}
                  onChange={(e) =>
                    setFormData({ ...formData, cardStatus: e.target.value as CardStatus })
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white focus:outline-none focus:border-[#24364B]"
                >
                  <option value="active">Active &amp; Valid</option>
                  <option value="lost">Reported Lost / Stolen</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {formData.cardStatus && formData.cardStatus !== 'active' && (
              <div>
                <label className="block text-xs font-semibold text-[#202B38] mb-1">
                  Status Reason / Incident Note (shown on QR scan)
                </label>
                <input
                  type="text"
                  value={formData.statusReason || ''}
                  onChange={(e) => setFormData({ ...formData, statusReason: e.target.value })}
                  placeholder="e.g. Reported lost on campus — replacement card issued"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E3E7EB] bg-white focus:outline-none focus:border-[#24364B]"
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#E3E7EB] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg transition-colors"
            >
              {studentToEdit ? 'Save Changes' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
