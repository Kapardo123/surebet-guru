import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { loginRevenueCat, logoutRevenueCat } from "@/integrations/revenuecat";


interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          // When the user clicks the password recovery link, Supabase fires this event.
          // We can then navigate them to the password update page.
          navigate("/auth?mode=update-password", { replace: true });
        }
        
        if (session?.user) {
          // Logowanie w RevenueCat po zalogowaniu w Supabase
          await loginRevenueCat(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          // Wylogowanie z RevenueCat
          await logoutRevenueCat();
        }

        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loginRevenueCat(session.user.id);
      }
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await logoutRevenueCat();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
