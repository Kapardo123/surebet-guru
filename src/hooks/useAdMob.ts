import { useState, useEffect, useCallback } from 'react';
import { AdMob, AdRewardItem, RewardAdOptions, AdLoadOptions, AdShowOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = Capacitor.isNativePlatform();

export const useAdMob = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRewardedAdReady, setIsRewardedAdReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardReceived, setRewardReceived] = useState<boolean>(false);

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
    if (!isNativePlatform) return false;

    setIsLoading(true);
    setError(null);
    setRewardReceived(false);

    try {
      const options: AdLoadOptions = {
        adId: adUnitId || (Capacitor.getPlatform() === 'android'
          ? 'ca-app-pub-1532874051579555/1810109997'
          : 'ca-app-pub-3940256099942544/1712485313'
        ),
      };

      await AdMob.prepareRewardVideoAd(options);
      setIsRewardedAdReady(true);
      console.log('AdMob: Rewarded ad załadowana');
      return true;
    } catch (err) {
      console.error('AdMob: Błąd ładowania rewarded ad:', err);
      setError('Nie udało się załadować reklamy');
      setIsRewardedAdReady(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showRewardedAd = useCallback(async (): Promise<AdRewardItem | null> => {
    if (!isNativePlatform) {
      console.log('AdMob: Tylko na natywne platformy');
      return null;
    }
    if (!isRewardedAdReady) {
      console.log('AdMob: Brak załadowanej reklamy, ładowam...');
      const loaded = await loadRewardedAd();
      if (!loaded) return null;
    }

    setIsLoading(true);
    setError(null);
    setRewardReceived(false);

    try {
      // Nasłuchuj na event nagrody
      const handler = await AdMob.addListener('onRewarded', (info: any) => {
        console.log('AdMob: Nagroda odebrana!', info);
        setRewardReceived(true);
      });

      // Pokaż reklamę
      const result = await AdMob.showRewardVideoAd();
      
      // Usuń listener
      await handler.remove();
      
      setIsRewardedAdReady(false);

      // Sprawdź czy otrzymaliśmy nagrodę przez event LUB przez result
      if (rewardReceived || result?.reward) {
        console.log('AdMob: ✅ Użytkownik otrzymał nagrodę!');
        
        // Załaduj następną reklamę w tle
        setTimeout(() => loadRewardedAd(), 1000);
        
        return result?.reward || { type: '', amount: 0 };
      } else {
        console.log('AdMob: ⚠️ Użytkownik nie dokończył reklamy lub brak nagrody');
        
        // Przeładuj reklamę na przyszłość
        setTimeout(() => loadRewardedAd(), 2000);
        
        return null;
      }
    } catch (err: any) {
      console.error('AdMob: Błąd wyświetlania rewarded ad:', err);
      
      // Jeśli błąd to "cancelled" - użytkownik zamknął reklamę
      if (err?.message?.includes('cancel') || err?.message?.includes('Cancel')) {
        console.log('AdMob: Użytkownik zamknął reklamę ręcznie');
        setTimeout(() => loadRewardedAd(), 2000);
      }
      
      setError('Nie udało się wyświetlić reklamy');
      setIsRewardedAdReady(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isRewardedAdReady, rewardReceived, loadRewardedAd]);

  useEffect(() => {
    if (isNativePlatform) {
      initialize().then(() => loadRewardedAd());
    }

    // Cleanup listeners przy unmount
    return () => {
      if (isNativePlatform) {
        AdMob.removeAllListeners().catch(() => {});
      }
    };
  }, [initialize, loadRewardedAd]);

  return {
    isLoading,
    isRewardedAdReady,
    isNativePlatform,
    error,
    rewardReceived,
    initialize,
    loadRewardedAd,
    showRewardedAd,
  };
};
