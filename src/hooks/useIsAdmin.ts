import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** true / false, or null when the is_admin() RPC isn't deployed or failed. */
export const checkIsAdmin = async (): Promise<boolean | null> => {
  const { data, error } = await (supabase as any).rpc("is_admin");
  if (error) return null;
  return data === true;
};

/** Whether the signed-in user is listed in `admins`. undefined while loading. */
export const useIsAdmin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(undefined);
    checkIsAdmin().then((v) => setIsAdmin(v === true));
  }, [user, loading]);

  return isAdmin;
};
