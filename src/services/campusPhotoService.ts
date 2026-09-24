import { useState, useEffect, useCallback } from 'react';
import { FirebaseStore } from '../lib/firebaseStore';

export type CampusFitMode = 'cover' | 'contain';

export interface CampusPhotoState {
  photoUrl: string;
  fitMode: CampusFitMode;
  isCustom: boolean;
  updatedAt: number | string;
  updatedBy?: string;
  isLiveSync: boolean;
}

export const DEFAULT_CAMPUS_PHOTO = '/c3.jpeg';
export const DEFAULT_FIT_MODE: CampusFitMode = 'cover';

const STORAGE_IMAGE_KEY = 'MNS_UET_CUSTOM_CAMPUS_IMAGE';
const STORAGE_FIT_KEY = 'MNS_UET_CAMPUS_FIT_MODE';
const STORAGE_CONFIG_KEY = 'mnsuet_campus_photo_config';
const STORAGE_PRESETS_KEY = 'mnsuet_custom_campus_presets';

export class CampusPhotoService {
  private static currentState: CampusPhotoState = {
    photoUrl: DEFAULT_CAMPUS_PHOTO,
    fitMode: DEFAULT_FIT_MODE,
    isCustom: false,
    updatedAt: Date.now(),
    isLiveSync: true,
  };

  private static isInitialized = false;
  private static listeners: Set<(state: CampusPhotoState) => void> = new Set();
  private static unsubscribeFirestore: (() => void) | null = null;

  public static getCustomPresets(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_PRESETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.filter((url) => typeof url === 'string' && url.trim().length > 0);
      }
    } catch {}
    return [];
  }

  public static addCustomPreset(url: string): void {
    if (!url || url === DEFAULT_CAMPUS_PHOTO || url === '/mns-uet-campus.jpg') return;
    try {
      const current = this.getCustomPresets();
      if (!current.includes(url)) {
        const updated = [url, ...current].slice(0, 12);
        localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(updated));
        FirebaseStore.syncGlobalState(STORAGE_PRESETS_KEY, updated).catch(() => {});
      }
    } catch {}
  }

  public static deleteCustomPreset(urlToDelete: string): void {
    try {
      const current = this.getCustomPresets();
      const updated = current.filter((u) => u !== urlToDelete);
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(updated));
      FirebaseStore.syncGlobalState(STORAGE_PRESETS_KEY, updated).catch(() => {});

      // If active photo was deleted, revert to default photo
      if (this.currentState.photoUrl === urlToDelete) {
        this.resetToDefault();
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mnsuet_campus_photo_updated', {
            detail: { url: this.currentState.photoUrl, photoUrl: this.currentState.photoUrl, fitMode: this.currentState.fitMode, updatedAt: Date.now() },
          })
        );
      }
    } catch {}
  }

  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Initial hydration from localStorage
    try {
      const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed?.photoUrl) {
          this.currentState = {
            photoUrl: parsed.photoUrl,
            fitMode: parsed.fitMode || DEFAULT_FIT_MODE,
            isCustom: parsed.isCustom ?? true,
            updatedAt: parsed.updatedAt || Date.now(),
            updatedBy: parsed.updatedBy,
            isLiveSync: true,
          };
        }
      } else {
        const savedImg = localStorage.getItem(STORAGE_IMAGE_KEY);
        const savedFit = localStorage.getItem(STORAGE_FIT_KEY) as CampusFitMode | null;
        if (savedImg) {
          this.currentState = {
            photoUrl: savedImg,
            fitMode: savedFit || DEFAULT_FIT_MODE,
            isCustom: true,
            updatedAt: Date.now(),
            isLiveSync: true,
          };
        }
      }
    } catch {
      // LocalStorage access fallback
    }

    // 2. Fetch latest server copy from backend
    if (typeof window !== 'undefined') {
      fetch('/api/campus-photo')
        .then((res) => res.json())
        .then((data) => {
          if (data?.photoUrl) {
            this.applyState({
              photoUrl: data.photoUrl,
              fitMode: (data.fitMode as CampusFitMode) || DEFAULT_FIT_MODE,
              isCustom: Boolean(data.isCustom),
              updatedAt: data.updatedAt || Date.now(),
              isLiveSync: true,
            }, false);
          }
        })
        .catch(() => {});
    }

    // 3. Connect real-time Firestore listener
    try {
      this.unsubscribeFirestore = FirebaseStore.listenCampusPhoto((doc) => {
        if (doc && doc.photoUrl) {
          this.applyState({
            photoUrl: doc.photoUrl,
            fitMode: doc.fitMode || DEFAULT_FIT_MODE,
            isCustom: doc.isCustom ?? true,
            updatedAt: doc.updatedAt || Date.now(),
            updatedBy: doc.updatedBy,
            isLiveSync: true,
          }, false);
        }
      });
    } catch (e) {
      console.warn('Could not attach Firestore campus photo listener:', e);
    }

    // 4. Cross-tab and window event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('mnsuet_campus_photo_updated', (e: Event) => {
        const customEv = e as CustomEvent;
        if (customEv.detail) {
          this.applyState({
            photoUrl: customEv.detail.url || customEv.detail.photoUrl || this.currentState.photoUrl,
            fitMode: customEv.detail.fitMode || this.currentState.fitMode,
            isCustom: customEv.detail.isCustom ?? true,
            updatedAt: customEv.detail.updatedAt || Date.now(),
            isLiveSync: true,
          }, false);
        }
      });

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_IMAGE_KEY || e.key === STORAGE_FIT_KEY || e.key === STORAGE_CONFIG_KEY) {
          this.refreshFromStorage();
        }
      });
    }
  }

  private static refreshFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed?.photoUrl) {
          this.applyState({
            photoUrl: parsed.photoUrl,
            fitMode: parsed.fitMode || DEFAULT_FIT_MODE,
            isCustom: parsed.isCustom ?? true,
            updatedAt: parsed.updatedAt || Date.now(),
            isLiveSync: true,
          }, false);
        }
      }
    } catch {}
  }

  public static getCurrentState(): CampusPhotoState {
    if (!this.isInitialized) {
      this.initialize();
    }
    return { ...this.currentState };
  }

  private static applyState(newState: Partial<CampusPhotoState>, persistToDb = false): void {
    const updated: CampusPhotoState = {
      ...this.currentState,
      ...newState,
      updatedAt: newState.updatedAt || Date.now(),
    };

    this.currentState = updated;

    // Cache in local storage for instant render on refresh
    try {
      localStorage.setItem(STORAGE_IMAGE_KEY, updated.photoUrl);
      localStorage.setItem(STORAGE_FIT_KEY, updated.fitMode);
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save skipped due to size:', e);
    }

    // Notify all active React hook subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(updated);
      } catch (err) {
        console.error('Error notifying campus photo listener:', err);
      }
    });

    if (persistToDb) {
      // 1. Sync to Cloud Firestore
      FirebaseStore.syncCampusPhoto({
        photoUrl: updated.photoUrl,
        fitMode: updated.fitMode,
        updatedAt: updated.updatedAt,
        updatedBy: updated.updatedBy || 'admin',
        isCustom: updated.isCustom,
      }).catch((err) => console.warn('Firestore campus photo sync error:', err));

      // 2. Sync to Global State config
      FirebaseStore.syncGlobalState('MNS_UET_CUSTOM_CAMPUS_IMAGE', updated.photoUrl).catch(() => {});
      FirebaseStore.syncGlobalState('MNS_UET_CAMPUS_FIT_MODE', updated.fitMode).catch(() => {});
      FirebaseStore.syncGlobalState('mnsuet_campus_photo_config', updated).catch(() => {});
    }
  }

  public static async updateCampusPhoto(
    targetUrl: string,
    fitMode: CampusFitMode = 'cover',
    updatedBy = 'admin'
  ): Promise<{ success: boolean; message?: string }> {
    this.initialize();

    const updatedAt = Date.now();
    const isDataUri = targetUrl.startsWith('data:');

    // 1. Send to server endpoint to update static public files and JSON config
    try {
      const response = await fetch('/api/campus-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: targetUrl,
          photoUrl: isDataUri ? undefined : targetUrl,
          fitMode,
          updatedAt,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error status while saving campus photo');
      }

      const resData = await response.json();
      const serverUrl = resData?.photoUrl || targetUrl;

      // Auto-register to custom presets gallery so it shows in Official Presets tab
      this.addCustomPreset(serverUrl);

      // 2. Broadcast and persist to Firestore database
      this.applyState(
        {
          photoUrl: serverUrl,
          fitMode,
          isCustom: true,
          updatedAt,
          updatedBy,
          isLiveSync: true,
        },
        true
      );

      // 3. Dispatch native window event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mnsuet_campus_photo_updated', {
            detail: { url: serverUrl, photoUrl: serverUrl, fitMode, updatedAt },
          })
        );
      }

      return { success: true, message: 'Campus photo successfully updated and synced with database!' };
    } catch (err: any) {
      console.warn('Backend server save failed, saving to Firestore & local storage directly:', err);

      // Fallback: Still broadcast to Firestore and local state
      this.applyState(
        {
          photoUrl: targetUrl,
          fitMode,
          isCustom: true,
          updatedAt,
          updatedBy,
          isLiveSync: true,
        },
        true
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mnsuet_campus_photo_updated', {
            detail: { url: targetUrl, photoUrl: targetUrl, fitMode, updatedAt },
          })
        );
      }

      return { success: true, message: 'Campus photo updated and synced with Cloud Firestore.' };
    }
  }

  public static async resetToDefault(): Promise<void> {
    this.initialize();
    const defaultUrl = DEFAULT_CAMPUS_PHOTO;
    const updatedAt = Date.now();

    try {
      await fetch('/api/campus-photo', { method: 'DELETE' });
    } catch {}

    this.applyState(
      {
        photoUrl: defaultUrl,
        fitMode: 'cover',
        isCustom: false,
        updatedAt,
        updatedBy: 'system',
        isLiveSync: true,
      },
      true
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mnsuet_campus_photo_updated', {
          detail: { url: defaultUrl, photoUrl: defaultUrl, fitMode: 'cover', updatedAt },
        })
      );
    }
  }

  public static subscribe(listener: (state: CampusPhotoState) => void): () => void {
    if (!this.isInitialized) {
      this.initialize();
    }
    this.listeners.add(listener);
    // Call immediately with current state
    listener({ ...this.currentState });

    return () => {
      this.listeners.delete(listener);
    };
  }
}

/**
 * Universal React Hook: provides live reactive campus photo state across any component
 */
export function useCampusPhoto() {
  const [state, setState] = useState<CampusPhotoState>(() => CampusPhotoService.getCurrentState());

  useEffect(() => {
    return CampusPhotoService.subscribe((updated) => {
      setState(updated);
    });
  }, []);

  const updatePhoto = useCallback(
    async (url: string, fitMode?: CampusFitMode, updatedBy?: string) => {
      return CampusPhotoService.updateCampusPhoto(url, fitMode, updatedBy);
    },
    []
  );

  const resetPhoto = useCallback(async () => {
    return CampusPhotoService.resetToDefault();
  }, []);

  return {
    ...state,
    updatePhoto,
    resetPhoto,
  };
}
