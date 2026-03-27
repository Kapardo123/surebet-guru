import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

type Platform = "android" | "ios" | "web";

const TOKEN_STORAGE_KEY = "gsb_push_token";

export const usePushNotifications = (params: { userId?: string; premiumActive: boolean }) => {
  const platform = useMemo(() => Capacitor.getPlatform() as Platform, []);
  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);
  const { userId, premiumActive } = params;

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadEnabled = useCallback(async () => {
    if (!userId) return;
    if (!isNative) return;
    
    if (!premiumActive) {
      setEnabled(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("push_tokens")
        .select("enabled, token")
        .eq("user_id", userId)
        .eq("platform", platform)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const row = data as { enabled?: boolean | null; token?: string | null } | null;

      if (row?.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, row.token);
      }

      setEnabled(Boolean(row?.enabled));
    } catch (error) {
      console.error("Error loading push status:", error);
    }
  }, [isNative, platform, premiumActive, userId]);

  const hasAutoRegistered = useRef(false);

  useEffect(() => {
    if (!isNative || !userId || !premiumActive || hasAutoRegistered.current) return;
    
    const timer = setTimeout(() => {
      hasAutoRegistered.current = true;
      const autoRegister = async () => {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'granted') {
            await registerAndUpsert();
          }
        } catch (e) {
          console.error("Auto-registration failed:", e);
        }
      };
      autoRegister();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isNative, userId, premiumActive]);

  useEffect(() => {
    const timer = setTimeout(loadEnabled, 1500);
    return () => clearTimeout(timer);
  }, [loadEnabled]);

  useEffect(() => {
    if (!isNative || !userId) return;

    let receivedHandle: any = null;
    let actionHandle: any = null;

    const setupListeners = async () => {
      try {
        console.log('PUSH: Setting up listeners (delayed)...');
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'fcm_default_channel',
            name: 'Default',
            description: 'Default notification channel',
            importance: 5,
            visibility: 1,
            sound: 'default'
          }).catch(err => console.error("Error creating channel:", err));
        }

        receivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received in foreground:', notification);
        });

        actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push action performed:', action);
        });
      } catch (e) {
        console.error("PUSH: Error in setupListeners:", e);
      }
    };

    const timer = setTimeout(setupListeners, 2000);

    return () => {
      clearTimeout(timer);
      receivedHandle?.remove();
      actionHandle?.remove();
    };
  }, [isNative, userId]);

  const registerAndUpsert = async () => {
    if (!userId) throw new Error("Not authenticated");
    if (!isNative) throw new Error("Push notifications are available only in the mobile app");
    if (!premiumActive) throw new Error("Push notifications are available for Premium users only");

    try {
      setLoading(true);
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error("Push permission not granted");
      }

      await PushNotifications.register();

      return new Promise((resolve, reject) => {
        const successListener = PushNotifications.addListener('registration', async ({ value: token }) => {
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
            const { error } = await supabase.from("push_tokens").upsert({
              user_id: userId,
              token,
              platform,
              enabled: true,
              updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            setEnabled(true);
            successListener.remove();
            resolve(token);
          } catch (err) {
            reject(err);
          }
        });

        const errorListener = PushNotifications.addListener('registrationError', (err) => {
          errorListener.remove();
          reject(new Error(err.error));
        });

        setTimeout(() => {
          successListener.remove();
          errorListener.remove();
          reject(new Error("Timed out waiting for token"));
        }, 10000);
      });
    } finally {
      setLoading(false);
    }
  };

  const setPushEnabled = async (shouldEnable: boolean) => {
    if (!userId) throw new Error("Not authenticated");
    if (!isNative) return;

    try {
      setLoading(true);
      if (shouldEnable) {
        await registerAndUpsert();
      } else {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const { error } = await supabase.from("push_tokens").upsert({
          user_id: userId,
          token: token || "unknown",
          platform,
          enabled: false,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return { enabled, loading, isNative, setPushEnabled };
};
