import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AppHeader, { headerLink } from "@/components/AppHeader";

type AuthMode = "login" | "signup" | "reset" | "magic";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#/auth?mode=update-password`,
      });
      if (error) throw error;
      toast({
        title: "Reset link sent! 📧",
        description: "Check your email for the password reset link.",
      });
      setMode("login");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not send reset link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/#/`,
        },
      });
      if (error) throw error;
      toast({
        title: "Magic link sent! ✨",
        description: "Check your email to log in instantly.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not send magic link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated! ✅" });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "reset") return handlePasswordReset(e);
    if (mode === "magic") return handleMagicLink(e);
    
    // Check if we are in "update-password" mode (via search params)
    const isUpdatePassword = searchParams.get("mode") === "update-password";
    if (isUpdatePassword) return handleUpdatePassword(e);

    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: "Signed in! 🎉" });
        navigate(redirect);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/#/` },
        });
        if (error) throw error;
        toast({
          title: "Account created! 📧",
          description: "Check your email to confirm your registration.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isUpdatePassword = searchParams.get("mode") === "update-password";

  const getTitle = () => {
    if (isUpdatePassword) return "New password";
    if (mode === "login") return "Welcome back";
    if (mode === "signup") return "Start your\ncollection";
    if (mode === "reset") return "Lost your key?";
    if (mode === "magic") return "No password\nneeded";
    return "Sign in";
  };

  const getSubtitle = () => {
    if (isUpdatePassword) return "Choose a new password for your account.";
    if (mode === "login") return "Sign in to pick up where you left off.";
    if (mode === "signup") return "A free account gets you every Common card. Gold comes later, if you want it.";
    if (mode === "reset") return "We'll post a recovery link to your inbox.";
    if (mode === "magic") return "We'll email you a link that signs you straight in.";
    return "";
  };

  const field = "w-full h-13 py-3.5 px-4 rounded-[14px] bg-white/[0.06] border border-white/10 text-[16px] text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary focus:bg-white/[0.08] transition-colors";
  const submitLabel = isUpdatePassword
    ? "Save password"
    : mode === "login"
    ? "Sign in"
    : mode === "signup"
    ? "Create account"
    : mode === "reset"
    ? "Send reset link"
    : "Send magic link";

  const modeTab = (m: AuthMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 h-10 rounded-full text-[14.5px] font-bold transition-colors ${
        mode === m ? "bg-foreground text-background" : "text-foreground/65 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <PageTransition>
    <div className="min-h-screen pb-16">
      <AppHeader
        right={
          <Link to="/" className={headerLink}>
            <ArrowLeft className="w-4 h-4" />
            Cards
          </Link>
        }
      />

      <main className="max-w-md mx-auto px-4 pt-8">
        {/* Three face-down cards fanned out */}
        <div className="relative h-[120px] flex justify-center" aria-hidden>
          {[
            { r: -16, x: -46, cls: "bg-stock" },
            { r: 14, x: 46, cls: "bg-[hsl(150_55%_34%)]" },
            { r: 0, x: 0, cls: "foil-gold" },
          ].map((c, i) => (
            <div
              key={i}
              className={`absolute top-0 w-[78px] h-[110px] rounded-[10px] p-[3px] shadow-[0_10px_24px_-8px_rgba(0,0,0,.8)] ${c.cls}`}
              style={{ transform: `translateX(${c.x}px) rotate(${c.r}deg)`, zIndex: i }}
            >
              <div className="h-full rounded-[7px] card-back grid place-items-center">
                <span className="font-display font-black text-[13px] foil-gold-text">GSB</span>
              </div>
            </div>
          ))}
        </div>

        <h1 className="font-display font-black uppercase text-[30px] leading-[1.02] tracking-[-0.02em] text-center mt-6 whitespace-pre-line">
          {getTitle()}
        </h1>
        <p className="text-[16px] leading-relaxed text-muted-foreground text-center mt-2">{getSubtitle()}</p>

        <div className="mt-7 rounded-[24px] bg-white/[0.04] border border-white/[0.08] p-5">
          {!isUpdatePassword && (mode === "login" || mode === "signup") && (
            <div className="flex p-1 rounded-full bg-black/25 mb-5">
              {modeTab("login", "Sign in")}
              {modeTab("signup", "Join free")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isUpdatePassword && (
              <label className="block">
                <span className="block text-[13px] font-semibold text-muted-foreground mb-1.5">Email</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  required
                  maxLength={255}
                />
              </label>
            )}

            {(mode === "login" || mode === "signup" || isUpdatePassword) && (
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label htmlFor="password" className="text-[13px] font-semibold text-muted-foreground">
                    {isUpdatePassword ? "New password" : "Password"}
                  </label>
                  {mode === "login" && !isUpdatePassword && (
                    <button type="button" onClick={() => setMode("reset")} className="text-[13px] font-semibold text-primary">
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" || isUpdatePassword ? "new-password" : "current-password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                  required
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-full bg-primary text-primary-foreground text-[16px] font-bold flex items-center justify-center gap-2 shadow-[0_8px_24px_-6px_hsl(var(--primary)/.6)] active:scale-[0.99] disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitLabel}
            </button>
          </form>

          {!isUpdatePassword && (
            <div className="mt-5 text-center">
              {mode === "login" && (
                <button onClick={() => setMode("magic")} className="text-[14px] font-semibold text-foreground/80 hover:text-foreground">
                  Email me a sign-in link instead
                </button>
              )}
              {mode === "signup" && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  By joining you agree to our{" "}
                  <Link to="/terms" className="underline underline-offset-2 text-foreground">Terms</Link> and{" "}
                  <Link to="/privacy" className="underline underline-offset-2 text-foreground">Privacy Policy</Link>.
                </p>
              )}
              {(mode === "reset" || mode === "magic") && (
                <button onClick={() => setMode("login")} className="text-[14px] font-semibold text-primary">
                  ← Back to sign in
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
    </PageTransition>
  );
};

export default Auth;
