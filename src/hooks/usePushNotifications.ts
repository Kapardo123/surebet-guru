import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
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
    
    // Jeśli użytkownik nie jest premium, wyłączamy powiadomienia wizualnie
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
    loadEnabled();
    
    if (isNative && userId && premiumActive && !hasAutoRegistered.current) {
      hasAutoRegistered.current = true;
      // Automatyczna rejestracja dla użytkowników premium przy starcie aplikacji
      const autoRegister = async () => {
        try {
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'granted') {
            await registerAndUpsert();
          }
        } catch (e) {
          console.error("Auto-registration failed:", e);
        }
      };
      autoRegister();
    }
  }, [isNative, userId, premiumActive, registerAndUpsert, loadEnabled]);

  useEffect(() => {
    if (!isNative) return;

    let receivedHandle: PluginListenerHandle | null = null;
    let actionHandle: PluginListenerHandle | null = null;

    const setupListeners = async () => {
      // Create channel for Android
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
    };

    setupListeners();

    return () => {
      receivedHandle?.remove();
      actionHandle?.remove();
    };
  }, [isNative]);

  const registerAndUpsert = useCallback(async () => {
    if (!userId) throw new Error("Not authenticated");
    if (!isNative) throw new Error("Push notifications are available only in the mobile app");
    
    // Kluczowa blokada dla użytkowników non-premium
    if (!premiumActive) throw new Error("Push notifications are available for Premium users only");

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== "granted") {
      throw new Error("Permission denied. Enable notifications in system settings.");
    }

    const token = await new Promise<string>((resolve, reject) => {
      let regHandle: PluginListenerHandle | null = null;
      let errHandle: PluginListenerHandle | null = null;
      let settled = false;

      const cleanup = () => {
        const tasks: Promise<void>[] = [];
        if (regHandle) tasks.push(regHandle.remove());
        if (errHandle) tasks.push(errHandle.remove());
        return Promise.all(tasks).then(() => undefined);
      };

      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup().finally(() => reject(new Error("Timed out waiting for push token. Is Firebase configured?")));
      }, 15000);

      const settleOk = (value: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        cleanup().finally(() => resolve(value));
      };

      const settleErr = (error: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        cleanup().finally(() =>
          reject(new Error(typeof error === "string" ? error : JSON.stringify(error))),
        );
      };

      void PushNotifications.addListener("registration", (t) => settleOk(t.value))
        .then((h) => {
          regHandle = h;
        })
        .catch(settleErr);

      void PushNotifications.addListener("registrationError", (e) => settleErr(e))
        .then((h) => {
          errHandle = h;
        })
        .catch(settleErr);

      PushNotifications.register().catch(settleErr);
    });

    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    // Create a notification channel for Android (required for high priority)
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'fcm_default_channel',
        name: 'Default',
        description: 'Default notification channel',
        importance: 5, // high
        visibility: 1,
        sound: 'default'
      }).catch(err => console.error("Error creating channel:", err));
    }

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );
    
    if (error) throw error;
  }, [isNative, platform, premiumActive, userId]);

  const disableToken = useCallback(async () => {
    if (!userId) return;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    try {
      await PushNotifications.unregister().catch(() => {});
      await supabase
        .from("push_tokens")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("token", token);
    } catch (error) {
      console.error("Error disabling push:", error);
    }
  }, [userId]);

  const setPushEnabled = useCallback(
    async (next: boolean) => {
      setLoading(true);
      try {
        if (next) {
          await registerAndUpsert();
          setEnabled(true);
        } else {
          await disableToken();
          setEnabled(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [disableToken, registerAndUpsert],
  );

  return { enabled, loading, platform, isNative, refresh: loadEnabled, setPushEnabled };
};
