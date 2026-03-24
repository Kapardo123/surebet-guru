import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_ANDROID = 'goog_PMcXVrXdRFZbXgWXxomAfOmDSYn'; // Klucz produkcyjny użytkownika

export const initRevenueCat = async () => {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('RevenueCat nie jest wspierany w przeglądarce. Płatności natywne będą wyłączone.');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    console.log('Rozpoczynanie konfiguracji RevenueCat...');
    
    if (Capacitor.getPlatform() === 'android') {
      await Purchases.configure({ 
        apiKey: REVENUECAT_API_KEY_ANDROID 
      });
      console.log('RevenueCat zainicjalizowany pomyślnie na Androidzie');
    } else {
      console.log('RevenueCat: Platforma to nie Android, pomijam configure');
    }
  } catch (error) {
    console.error('Błąd krytyczny inicjalizacji RevenueCat:', error);
  }
};

export const loginRevenueCat = async (appUserId: string) => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    const { customerInfo } = await Purchases.logIn({ appUserId });
    console.log('Użytkownik zalogowany w RevenueCat:', appUserId);
    return customerInfo;
  } catch (error) {
    console.error('Błąd logowania w RevenueCat:', error);
    return null;
  }
};

export const logoutRevenueCat = async () => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    const customerInfo = await Purchases.logOut();
    console.log('Użytkownik wylogowany z RevenueCat');
    return customerInfo;
  } catch (error) {
    console.error('Błąd wylogowania z RevenueCat:', error);
    return null;
  }
};

export const restorePurchases = async () => {
  if (Capacitor.getPlatform() === 'web') return;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Błąd przywracania zakupów:', error);
    return null;
  }
};

export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('Błąd pobierania ofert RevenueCat:', error);
    return null;
  }
};

export const purchasePackage = async (rcPackage: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: rcPackage });
    return customerInfo;
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Błąd zakupu RevenueCat:', error);
    }
    return null;
  }
};

export const getCustomerInfo = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Błąd pobierania informacji o kliencie:', error);
    return null;
  }
};

export const presentPaywall = async () => {
  try {
    const { customerInfo } = await Purchases.presentPaywall();
    return customerInfo;
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Błąd wyświetlania Paywall:', error);
    }
    return null;
  }
};
