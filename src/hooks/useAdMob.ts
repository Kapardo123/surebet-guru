import { useState, useEffect, useCallback } from 'react';
import { AdMob, AdRewardItem, RewardAdOptions, AdLoadOptions, AdShowOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Sprawdź czy działamy na natywnej platformie (iOS/Android)
export const isNativePlatform = Capacitor.isNativePlatform();

export const useAdMob = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRewardedAdReady, setIsRewardedAdReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicjalizacja AdMob
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

  // Załaduj reklamę nagrodzoną
  const loadRewardedAd = useCallback(async (adUnitId?: string) => {
    if (!isNativePlatform) return false;

    setIsLoading(true);
    setError(null);

    try {
      const options: AdLoadOptions = {
        adId: adUnitId || (Capacitor.getPlatform() === 'android'
          ? 'ca-app-pub-1532874051579555/1810109997' // Produkcyjny Android Rewarded
          : 'ca-app-pub-3940256099942544/1712485313' // Testowy iOS Rewarded
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

  // Pokaż reklamę nagrodzoną
  const showRewardedAd = useCallback(async (): Promise<AdRewardItem | null> => {
    if (!isNativePlatform) {
      console.log('AdMob: Tylko na natywne platformy');
      return null;
    }
    if (!isRewardedAdReady) {
      console.log('AdMob: Brak załadowanej reklamy');
      // Spróbuj załadować ponownie
      const loaded = await loadRewardedAd();
      if (!loaded) return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await AdMob.showRewardVideoAd();
      setIsRewardedAdReady(false); // Po pokazaniu trzeba załadować ponownie

      if (result.reward) {
        console.log('AdMob: Użytkownik otrzymał nagrodę:', result.reward);
        return result.reward;
      } else {
        console.log('AdMob: Użytkownik nie otrzymał nagrody');
        return null;
      }
    } catch (err) {
      console.error('AdMob: Błąd wyświetlania rewarded ad:', err);
      setError('Nie udało się wyświetlić reklamy');
      setIsRewardedAdReady(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isRewardedAdReady, loadRewardedAd]);

  // Załaduj reklamę przy starcie
  useEffect(() => {
    if (isNativePlatform) {
      initialize().then(() => loadRewardedAd());
    }
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
