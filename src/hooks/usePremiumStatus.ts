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

    const { data, error } = await supabase.functions.invoke("premium-status", {
      body: {},
    });

    if (error || data?.error) {
      setState({ ...defaultState, loading: false });
      return;
    }

    setState({
      active: Boolean(data?.active),
      daysLeft: Number(data?.daysLeft ?? 0),
      expiresAt: data?.expiresAt ?? null,
      loading: false,
    });
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
};
