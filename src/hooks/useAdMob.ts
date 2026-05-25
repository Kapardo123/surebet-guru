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
    if (!isNativePlatform) return false;

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
      console.log('AdMob: Tylko na natywne platformy');
      return false;
    }

    if (!isRewardedAdReady) {
      console.log('AdMob: Brak załadowanej reklamy, ładowam...');
      const loaded = await loadRewardedAd();
      if (!loaded) return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Tworzymy Promise, który rozwiąże się gdy otrzymamy nagrodę
      let rewardResolved = false;
      let didReceiveReward = false;

      // Nasłuchuj na event nagrody
      const handler = await AdMob.addListener('onRewarded', (info: any) => {
        console.log('🎁 AdMob: EVENT - Nagroda odebrana!', info);
        didReceiveReward = true;
        rewardResolved = true;
      });

      // Pokaż reklamę i czekaj na wynik
      console.log('⏳ AdMob: Wyświetlanie reklamy...');
      const result = await AdMob.showRewardVideoAd();
      
      // Dajemy czas na event (500ms)
      if (!rewardResolved) {
        console.log('⏳ AdMob: Czekam na event nagrody...');
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Usuń listener
      await handler.remove();
      
      setIsRewardedAdReady(false);

      // Sprawdź czy dostaliśmy nagrodę przez EVENT lub RESULT
      const gotReward = didReceiveReward || !!result?.reward;

      if (gotReward) {
        console.log('✅ AdMob: NAGRODA PRZYZNANA! (event:', didReceiveReward, ', result:', !!result?.reward, ')');
        
        // Załaduj następną reklamę w tle
        setTimeout(() => loadRewardedAd(), 1500);
        
        return true;
      } else {
        console.log('❌ AdMob: BRAK NAGRODY - użytkownik zamknął reklamę przed końcem');
        
        // Przeładuj reklamę na przyszłość
        setTimeout(() => loadRewardedAd(), 2000);
        
        return false;
      }
    } catch (err: any) {
      console.error('❌ AdMob: Błąd wyświetlania rewarded ad:', err);
      
      // Jeśli błąd to "cancelled" - użytkownik zamknął reklamę
      if (err?.message?.includes('cancel') || err?.message?.includes('Cancel')) {
        console.log('🚫 AdMob: Użytkownik zamknął reklamę ręcznie');
      }
      
      setError('Błąd reklamy: ' + (err?.message || 'Unknown error'));
      setIsRewardedAdReady(false);
      
      // Przeładuj po błędzie
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
