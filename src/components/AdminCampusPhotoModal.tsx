import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  RotateCcw,
  CheckCircle2,
  Shield,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Maximize2,
  Eye,
  Check,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpdated?: () => void;
}

export const AdminCampusPhotoModal: React.FC<Props> = ({ isOpen, onClose, onPhotoUpdated }) => {
  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    return localStorage.getItem('MNS_UET_CUSTOM_CAMPUS_IMAGE') || '/c3.jpeg';
  });
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>(() => {
    return (localStorage.getItem('MNS_UET_CAMPUS_FIT_MODE') as 'cover' | 'contain') || 'cover';
  });
  const [urlInput, setUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('presets');
  const [isFullScreenPreview, setIsFullScreenPreview] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch the active server-persisted image URL
    fetch('/api/campus-photo')
      .then((res) => res.json())
      .then((data) => {
        if (data?.photoUrl) {
          setPreviewUrl(data.photoUrl);
          if (data.fitMode) setFitMode(data.fitMode);
          if (data.isCustom && data.photoUrl.startsWith('data:')) {
            try {
              localStorage.setItem('MNS_UET_CUSTOM_CAMPUS_IMAGE', data.photoUrl);
            } catch (e) {}
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const persistPhoto = async (targetUrl: string, selectedFit: 'cover' | 'contain' = fitMode) => {
    setIsUploading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/campus-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: targetUrl,
          photoUrl: targetUrl.startsWith('data:') ? undefined : targetUrl,
          fitMode: selectedFit,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error status while saving campus photo');
      }

      try {
        localStorage.setItem('MNS_UET_CUSTOM_CAMPUS_IMAGE', targetUrl);
        localStorage.setItem('MNS_UET_CAMPUS_FIT_MODE', selectedFit);
      } catch (e) {
        console.warn('LocalStorage limit exceeded, server copy active.');
      }

      setPreviewUrl(targetUrl);
      setSuccessMsg('Campus photo permanently updated and synchronized across all user portals!');
      window.dispatchEvent(
        new CustomEvent('mnsuet_campus_photo_updated', {
          detail: { url: targetUrl, fitMode: selectedFit },
        })
      );
      onPhotoUpdated?.();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      try {
        localStorage.setItem('MNS_UET_CUSTOM_CAMPUS_IMAGE', targetUrl);
        localStorage.setItem('MNS_UET_CAMPUS_FIT_MODE', selectedFit);
        setPreviewUrl(targetUrl);
        setSuccessMsg('Campus photo saved locally in browser storage.');
        window.dispatchEvent(
          new CustomEvent('mnsuet_campus_photo_updated', {
            detail: { url: targetUrl, fitMode: selectedFit },
          })
        );
        onPhotoUpdated?.();
      } catch (storageErr) {
        setErrorMsg('Failed to persist photo. Please select a smaller image or use preset.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Image file size is too large (maximum 25MB allowed).');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        await persistPhoto(base64, fitMode);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = async () => {
    if (!urlInput.trim()) {
      setErrorMsg('Please enter a valid image URL');
      return;
    }
    await persistPhoto(urlInput.trim(), fitMode);
    setUrlInput('');
  };

  const handleSelectPreset = async (presetUrl: string) => {
    await persistPhoto(presetUrl, fitMode);
  };

  const handleResetToDefault = async () => {
    setIsUploading(true);
    setErrorMsg('');
    try {
      await fetch('/api/campus-photo', { method: 'DELETE' });
    } catch (e) {}

    try {
      localStorage.removeItem('MNS_UET_CUSTOM_CAMPUS_IMAGE');
      localStorage.setItem('MNS_UET_CAMPUS_FIT_MODE', 'cover');
    } catch (e) {}

    const defaultUrl = `/c3.jpeg?v=${Date.now()}`;
    setPreviewUrl(defaultUrl);
    setFitMode('cover');
    setSuccessMsg('Campus photo restored to the official MNS-UET Multan Main Academic Block photograph.');
    window.dispatchEvent(
      new CustomEvent('mnsuet_campus_photo_updated', {
        detail: { url: defaultUrl, fitMode: 'cover' },
      })
    );
    onPhotoUpdated?.();
    setIsUploading(false);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
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
                  Update and adjust how the official university facade appears across login and portal views
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
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium animate-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium animate-in slide-in-from-top-1">
                <X className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current Photo Preview Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Active Portal Campus Showcase
                </label>
                <div className="flex items-center gap-2">
                  {/* Fit Mode Switcher */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setFitMode('cover');
                        persistPhoto(previewUrl, 'cover');
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        fitMode === 'cover'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                      title="Fill card with dynamic crop"
                    >
                      Fill (Cover)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFitMode('contain');
                        persistPhoto(previewUrl, 'contain');
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        fitMode === 'contain'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                      title="Show entire building and lawns uncropped"
                    >
                      Full Fit (Contain)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFullScreenPreview(true)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs flex items-center gap-1 transition-colors"
                    title="Inspect Full High-Resolution Image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Visual Preview Box */}
              <div className="relative h-60 sm:h-64 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 shadow-inner flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="MNS UET Multan Main Campus Building"
                  className={`w-full h-full select-none transition-all duration-300 ${
                    fitMode === 'contain' ? 'object-contain p-2' : 'object-cover object-center'
                  }`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('c3.jpeg')) {
                      target.src = `/c3.jpeg?v=${Date.now()}`;
                    } else if (!target.src.includes('mns-uet-campus.jpg')) {
                      target.src = `/mns-uet-campus.jpg?v=${Date.now()}`;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-semibold flex items-center justify-between">
                  <div>
                    <span className="block font-bold">MNS UET Multan Main Academic Block</span>
                    <span className="text-[10px] text-slate-300">
                      Display Mode: {fitMode === 'contain' ? 'Uncropped Full Width (Contain)' : 'Panoramic Fill (Cover)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Portal View
                  </span>
                </div>
              </div>
            </div>

            {/* Selection Methods Tabs */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'presets'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 inline mr-1" />
                  Official Presets
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'upload'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  Upload Local File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'url'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
                  Direct Image URL
                </button>
              </div>

              {/* Tab 1: Official Presets */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Select from verified high-resolution institutional campus images:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => handleSelectPreset('/c3.jpeg')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        previewUrl.includes('c3.jpeg')
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-24 rounded-lg overflow-hidden mb-2 bg-slate-900 border border-slate-300 dark:border-slate-700">
                        <img src="/c3.jpeg" alt="MNS UET Real Campus Photo" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            Real Campus Photo (c3.jpeg)
                            {previewUrl.includes('c3.jpeg') && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">1600 &times; 900 High-Res Facade with Lawns</p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => handleSelectPreset('/mns-uet-campus.jpg')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        previewUrl.includes('mns-uet-campus.jpg')
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-24 rounded-lg overflow-hidden mb-2 bg-slate-900 border border-slate-300 dark:border-slate-700">
                        <img src="/mns-uet-campus.jpg" alt="Institutional Campus Facade" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            Institutional Campus Asset
                            {previewUrl.includes('mns-uet-campus.jpg') && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">Official Multan Academic Block Banner</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Upload Local File */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Upload any photograph from your device (PNG, JPG, WEBP up to 25MB). When saved, it automatically applies across the portal.
                  </p>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing &amp; Saving...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Select Photo from Computer</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                </div>
              )}

              {/* Tab 3: Direct URL */}
              {activeTab === 'url' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Paste an image web URL or relative path (e.g. <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">/c3.jpeg</code> or an external HTTPS link):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... or /c3.jpeg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploading || !urlInput.trim()}
                      onClick={handleApplyUrl}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Photo</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Changes apply instantly across all login screens and client sessions.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              MNS UET Multan &bull; Institutional Monitoring Portal
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Lightbox View */}
      {isFullScreenPreview && (
        <div
          onClick={() => setIsFullScreenPreview(false)}
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <span className="text-xs text-slate-300 font-semibold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              Click anywhere or press Esc to close
            </span>
            <button
              type="button"
              onClick={() => setIsFullScreenPreview(false)}
              className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-800">
            <img
              src={previewUrl}
              alt="MNS UET Multan Full View"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Muhammad Nawaz Sharif University of Engineering &amp; Technology (MNS UET) Multan &bull; Main Academic Block
          </p>
        </div>
      )}
    </>
  );
};
