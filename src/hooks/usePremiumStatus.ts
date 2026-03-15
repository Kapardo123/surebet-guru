import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PremiumStatusState {
  active: boolean;
  daysLeft: number;
  expiresAt: string | null;
  loading: boolean;
}

const defaultState: PremiumStatusState = {
  active: false,
  daysLeft: 0,
  expiresAt: null,
  loading: true,
};

export const usePremiumStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<PremiumStatusState>(defaultState);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setState({ ...defaultState, loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Direct query to premium_access table instead of Edge Function
      const { data, error } = await (supabase as any)
        .from("premium_access")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data?.expires_at) {
        setState({ ...defaultState, loading: false });
        return;
      }

      const expiryDate = new Date(data.expires_at);
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000));

      setState({
        active: daysLeft > 0,
        daysLeft,
        expiresAt: data.expires_at,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching premium status:", err);
      setState({ ...defaultState, loading: false });
    }
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
};
