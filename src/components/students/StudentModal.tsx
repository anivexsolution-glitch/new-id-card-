import React, { useState, useEffect } from 'react';
import { SchoolSettings, Student } from '../../types';
import { X, Upload, User, AlertCircle, Camera, Check } from 'lucide-react';

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
    classGrade: 'Class X',
    bloodGroup: 'B+',
    photoUrl: '',
    photoCrop: { zoom: 1, x: 0, y: 0 },
    emergencyContact: '',
  });

  const [error, setError] = useState<string>('');
  const [showPhotoCrop, setShowPhotoCrop] = useState<boolean>(false);

  useEffect(() => {
    if (studentToEdit) {
      setFormData(studentToEdit);
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
        classGrade: 'Class X',
        bloodGroup: 'B+',
        photoUrl: '',
        photoCrop: { zoom: 1, x: 0, y: 0 },
        emergencyContact: '',
      });
    }
    setError('');
    setShowPhotoCrop(false);
  }, [studentToEdit, isOpen, schoolSettings]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, or WebP).');
      return;
    }

    // Validate size (max 5MB)
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
      photoUrl: formData.photoUrl,
      photoCrop: formData.photoCrop || { zoom: 1, x: 0, y: 0 },
      idCardNumber: formData.idCardNumber || `SCH-${(formData.session || '2025').split('-')[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      emergencyContact: formData.emergencyContact?.trim() || formData.contactNumber.trim(),
      isCardGenerated: studentToEdit ? studentToEdit.isCardGenerated : false,
      createdAt: studentToEdit ? studentToEdit.createdAt : new Date().toISOString(),
    };

    onSave(studentRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {studentToEdit ? 'Edit Student Record' : 'Enroll New Student'}
            </h3>
            <p className="text-xs text-slate-500">
              All 8 mandatory Indian school ID card fields are required for CR80 card generation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Photo & Core Name Row */}
          <div className="flex items-start gap-5">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-24 rounded-lg border border-slate-300 bg-slate-100 overflow-hidden flex items-center justify-center relative group">
                {formData.photoUrl ? (
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
                  <User className="w-8 h-8 text-slate-400" />
                )}
                <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload className="w-4 h-4 mb-0.5" />
                  <span>Change</span>
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              <div className="flex items-center gap-2 mt-1.5">
                <label className="text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                  Upload Photo
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {formData.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setShowPhotoCrop(!showPhotoCrop)}
                    className="text-[10px] text-slate-600 hover:text-slate-900 underline"
                  >
                    Adjust
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Student Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Grade</label>
                <input
                  type="text"
                  value={formData.classGrade || ''}
                  onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                  placeholder="e.g. Class X - Section A"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={formData.rollNo || ''}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  placeholder="e.g. 10-A-24"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Photo Crop Fine-tune slider */}
          {showPhotoCrop && formData.photoUrl && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-slate-600 mb-0.5">Zoom: {(formData.photoCrop?.zoom || 1).toFixed(1)}x</label>
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
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Horizontal: {formData.photoCrop?.x || 0}%</label>
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
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Vertical: {formData.photoCrop?.y || 0}%</label>
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
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* All 8 Required Fields Input Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Father's Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fatherName || ''}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="e.g. Rajesh Sharma"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. Mother's Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.motherName || ''}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                placeholder="e.g. Sunita Sharma"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactNumber || ''}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                5. Date of Birth (DD/MM/YYYY) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.dob || ''}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                placeholder="14/08/2009"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                7. Conveyance (Bus Pass) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.conveyance || 'No'}
                onChange={(e) => setFormData({ ...formData, conveyance: e.target.value as 'Yes' | 'No' })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
              >
                <option value="No">No (Private Commute)</option>
                <option value="Yes">Yes (School Bus Enrolled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                8. Academic Session <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.session || schoolSettings.academicSession}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                placeholder="2025-2026"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
          </div>

          {/* 6. Residential Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              6. Residential Address <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Flat 402, Shanti Heights, Sector 14, Rohini, New Delhi - 110085"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              {studentToEdit ? 'Save Changes' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
