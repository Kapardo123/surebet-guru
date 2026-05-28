import { useState, useEffect, useCallback } from 'react';
import { AdMob, AdRewardItem, RewardAdOptions, AdLoadOptions, AdShowOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = Capacitor.isNativePlatform();

export const useAdMob = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRewardedAdReady, setIsRewardedAdReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (!isNativePlatform) {
      console.log('AdMob: Nie działamy na natywnej platformie, pomijamy inicjalizację');
      return;
    }
    try {
      await AdMob.initialize();
      console.log('AdMob: Zainicjalizowano pomyślnie');
    } catch (err) {
      console.error('AdMob: Błąd inicjalizacji:', err);
      setError('Błąd inicjalizacji AdMob');
    }
  }, []);

  const loadRewardedAd = useCallback(async (adUnitId?: string) => {
    if (!isNativePlatform) {
      console.log('🌐 AdMob: Web mode - reklama zawsze gotowa');
      setIsRewardedAdReady(true);
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      const options: AdLoadOptions = {
        adId: adUnitId || (Capacitor.getPlatform() === 'android'
          ? 'ca-app-pub-1532874051579555/1810109997'
          : 'ca-app-pub-3940256099942544/1712485313'
        ),
      };

      await AdMob.prepareRewardVideoAd(options);
      setIsRewardedAdReady(true);
      console.log('AdMob: ✅ Rewarded ad załadowana');
      return true;
    } catch (err) {
      console.error('AdMob: ❌ Błąd ładowania rewarded ad:', err);
      setError('Nie udało się załadować reklamy');
      setIsRewardedAdReady(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform) {
      console.log('AdMob: Web mode - symulacja nagrody');
      return true;
    }

    if (!isRewardedAdReady) {
      console.log('AdMob: Brak załadowanej reklamy, ładowam...');
      const loaded = await loadRewardedAd();
      if (!loaded) return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      let didReceiveReward = false;

      console.log('⏳ AdMob: Rejestrowanie listenera nagrody...');
      
      const rewardPromise = new Promise<boolean>((resolve) => {
        let resolved = false;
        
        const cleanup = async () => {
          try {
            await handler.remove();
          } catch (e) {}
        };

        const handler = AdMob.addListener('onUserEarnedReward', (info: any) => {
          console.log('🎁 AdMob: EVENT - Nagroda odebrana!', info);
          didReceiveReward = true;
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(true);
          }
        });

        setTimeout(async () => {
          if (!resolved) {
            resolved = true;
            console.log('⏰ AdMob: Timeout - sprawdzam result');
            await cleanup();
            resolve(didReceiveReward);
          }
        }, 3000);

        (async () => {
          try {
            console.log('📺 AdMob: Wyświetlanie reklamy...');
            const result = await AdMob.showRewardVideoAd();
            console.log('📊 AdMob: Reklama zamknięta, result:', JSON.stringify(result));
            
            if (result && (result as any).reward) {
              didReceiveReward = true;
              console.log('✅ AdMOB: Nagroda w result!');
            }
            
            if (!resolved) {
              resolved = true;
              await cleanup();
              setTimeout(() => resolve(didReceiveReward), 500);
            }
          } catch (err: any) {
            console.error('❌ AdMob: Błąd reklamy:', err?.message || err);
            
            if (!resolved) {
              resolved = true;
              await cleanup();
              resolve(false);
            }
          }
        })();
      });

      const gotReward = await rewardPromise;
      
      setIsRewardedAdReady(false);

      if (gotReward) {
        console.log('✅ AdMob: NAGRODA PRZYZNANA!');
        setTimeout(() => loadRewardedAd(), 1500);
        return true;
      } else {
        console.log('❌ AdMob: BRAK NAGRODY');
        setTimeout(() => loadRewardedAd(), 2000);
        return false;
      }
    } catch (err: any) {
      console.error('❌ AdMob: Błąd wyświetlania rewarded ad:', err);
      setError('Błąd reklamy: ' + (err?.message || 'Unknown error'));
      setIsRewardedAdReady(false);
      setTimeout(() => loadRewardedAd(), 2500);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isRewardedAdReady, loadRewardedAd]);

  useEffect(() => {
    if (isNativePlatform) {
      initialize().then(() => {
        console.log('🔄 AdMob: Początkowe ładowanie reklamy...');
        loadRewardedAd();
      });
    } else {
      console.log('🌐 AdMob: Web mode - ustawiam gotowość reklamy');
      setIsRewardedAdReady(true);
    }

    // Cleanup listeners przy unmount
    return () => {
      if (isNativePlatform) {
        console.log('🧹 AdMob: Cleanup listeners');
        AdMob.removeAllListeners().catch(() => {});
      }
    };
  }, [initialize, loadRewardedAd]);

  return {
    isLoading,
    isRewardedAdReady,
    isNativePlatform,
    error,
    initialize,
    loadRewardedAd,
    showRewardedAd,
  };
};
