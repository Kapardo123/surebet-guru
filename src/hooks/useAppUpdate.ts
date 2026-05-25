import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface AppVersionInfo {
  version: string;
  build: number;
  forceUpdate: boolean;
  releaseDate: string;
  updateMessage: string;
  downloadUrl: string;
  minSupportedVersion: string;
}

interface UpdateStatus {
  needsUpdate: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  message: string;
  downloadUrl: string;
  loading: boolean;
}

const CURRENT_VERSION = "13.0.0";
const CURRENT_BUILD = 1300;

export const useAppUpdate = (): UpdateStatus => {
  const [status, setStatus] = useState<UpdateStatus>({
    needsUpdate: false,
    forceUpdate: false,
    currentVersion: CURRENT_VERSION,
    latestVersion: CURRENT_VERSION,
    message: '',
    downloadUrl: '',
    loading: true,
  });

  useEffect(() => {
    const checkForUpdates = async () => {
      if (!Capacitor.isNativePlatform()) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const response = await fetch('/api/app-version');
        
        if (!response.ok) throw new Error('Failed to fetch version');
        
        const data: AppVersionInfo = await response.json();
        
        const needsUpdate = compareVersions(CURRENT_VERSION, data.version) < 0;
        const forceUpdate = data.forceUpdate && needsUpdate;

        setStatus({
          needsUpdate,
          forceUpdate,
          currentVersion: CURRENT_VERSION,
          latestVersion: data.version,
          message: data.updateMessage || `New version ${data.version} available!`,
          downloadUrl: data.downloadUrl || 'https://play.google.com/store/apps/details?id=com.surebet.guru',
          loading: false,
        });

        if (needsUpdate) {
          console.log(`🔄 Update available: ${CURRENT_VERSION} → ${data.version} (Force: ${forceUpdate})`);
        }
      } catch (error) {
        console.error('❌ Error checking for updates:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkForUpdates();
  }, []);

  return status;
};

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}
