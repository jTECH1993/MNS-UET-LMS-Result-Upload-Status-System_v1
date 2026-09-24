import React, { useState, useRef } from 'react';
import { X, Camera, Upload, RotateCcw, Image, CheckCircle2, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpdated?: () => void;
}

export const AdminCampusPhotoModal: React.FC<Props> = ({ isOpen, onClose, onPhotoUpdated }) => {
  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    return localStorage.getItem('MNS_UET_CUSTOM_CAMPUS_IMAGE') || '/mns-uet-campus.jpg';
  });
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image file size is too large (maximum 8MB allowed).');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPreviewUrl(base64);
        try {
          localStorage.setItem('MNS_UET_CUSTOM_CAMPUS_IMAGE', base64);
          setSuccessMsg('Campus photo successfully updated for the portal!');
          onPhotoUpdated?.();
          setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
          setErrorMsg('Failed to persist photo in browser storage.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('MNS_UET_CUSTOM_CAMPUS_IMAGE');
    setPreviewUrl('/mns-uet-campus.jpg');
    setSuccessMsg('Campus photo restored to the official university default.');
    onPhotoUpdated?.();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Portal Campus Photo Management</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  <Shield className="w-3 h-3" /> Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Change or update the official university facade photograph on the login portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Photo Preview */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
              Active Portal Campus Banner
            </label>
            <div className="relative h-64 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 shadow-inner">
              <img
                src={previewUrl}
                alt="MNS UET Multan Main Campus Building"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('mns-uet-campus.png')) {
                    target.src = '/mns-uet-campus.png';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-semibold flex items-center justify-between">
                <span>MNS UET Multan Academic Block</span>
                <span className="text-[11px] text-emerald-300 bg-slate-900/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                  Live View
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Admin Upload Instructions
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload an updated high-resolution photograph of the MNS UET Multan campus. The image will automatically appear on the main login screen for all institutional users.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload New Campus Photo</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore Official Default</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Protected Administrator Function &bull; MNS UET Multan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
