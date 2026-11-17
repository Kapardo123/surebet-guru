import { useState } from "react";
import { ArrowLeft, Loader2, Scissors } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AppHeader, { headerLink } from "@/components/AppHeader";
import SectionHead from "@/components/SectionHead";
import { PenNote } from "@/components/RedPen";

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
    if (isUpdatePassword) return "New\npassword.";
    if (mode === "login") return "Welcome\nback.";
    if (mode === "signup") return "Join the\nreaders.";
    if (mode === "reset") return "Lost your\nkey?";
    if (mode === "magic") return "No password\nneeded.";
    return "Sign in";
  };

  const getSubtitle = () => {
    if (isUpdatePassword) return "Choose a new password for your account.";
    if (mode === "login") return "Sign in to pick up where you left off.";
    if (mode === "signup") return "A free account is all it takes. Membership comes later, if you want it.";
    if (mode === "reset") return "We'll post a recovery link to your inbox.";
    if (mode === "magic") return "We'll email you a link that signs you straight in.";
    return "";
  };

  const field = "w-full h-12 bg-transparent border-0 border-b-[2px] border-foreground px-0 font-serif text-[20px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-red transition-colors";
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
      className={`relative pb-2 font-display font-black uppercase text-[22px] leading-none transition-colors ${
        mode === m ? "text-foreground" : "text-foreground/30 hover:text-foreground/60"
      }`}
    >
      {label}
      {mode === m && <span className="absolute inset-x-0 -bottom-[2px] h-[3px] bg-red" />}
    </button>
  );

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-14">
      <AppHeader
        right={
          <Link to="/" className={headerLink}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Tips
          </Link>
        }
      />

      <main className="max-w-md mx-auto px-4 pt-7">
        <SectionHead tone="red">{isUpdatePassword ? "Account" : "Reader's desk"}</SectionHead>
        <h1 className="font-display font-black uppercase text-[clamp(54px,16vw,84px)] leading-[0.82] tracking-[-0.01em] mt-4 whitespace-pre-line">
          {getTitle()}
        </h1>
        <p className="font-serif text-[18px] leading-[1.5] text-secondary-foreground mt-3">{getSubtitle()}</p>

        {/* Cut-out coupon */}
        <div className="relative mt-8">
          <Scissors className="absolute -top-[9px] left-5 w-[18px] h-[18px] bg-background px-0.5 text-foreground -rotate-90" aria-hidden />
          <div className="border-[2px] border-dashed border-foreground/60 bg-card px-5 pt-6 pb-6">
            {!isUpdatePassword && (mode === "login" || mode === "signup") && (
              <div className="flex gap-5 border-b-[2px] border-foreground mb-6">
                {modeTab("login", "Sign in")}
                {modeTab("signup", "Join")}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isUpdatePassword && (
                <label className="block">
                  <span className="label text-foreground">Email address</span>
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
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="password" className="label text-foreground">{isUpdatePassword ? "New password" : "Password"}</label>
                    {mode === "login" && !isUpdatePassword && (
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="font-mono text-[11.5px] uppercase tracking-[0.05em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
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
                className="w-full h-14 bg-foreground text-background font-mono text-[13.5px] font-semibold uppercase tracking-[0.1em] flex items-center justify-center gap-2 shadow-[4px_4px_0_hsl(var(--red))] active:translate-y-px disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitLabel}
              </button>
            </form>

            {!isUpdatePassword && (
              <div className="mt-6 pt-4 border-t border-dashed border-foreground/40 text-center">
                {mode === "login" && (
                  <button
                    onClick={() => setMode("magic")}
                    className="font-mono text-[12px] font-medium uppercase tracking-[0.06em] underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground"
                  >
                    Email me a sign-in link instead
                  </button>
                )}
                {mode === "signup" && (
                  <p className="font-serif text-[15px] leading-relaxed text-muted-foreground">
                    By joining you agree to our{" "}
                    <Link to="/terms" className="underline underline-offset-2 text-foreground">Terms</Link> and{" "}
                    <Link to="/privacy" className="underline underline-offset-2 text-foreground">Privacy Policy</Link>.
                  </p>
                )}
                {(mode === "reset" || mode === "magic") && (
                  <button
                    onClick={() => setMode("login")}
                    className="font-mono text-[12px] font-medium uppercase tracking-[0.06em] underline underline-offset-4"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>
            )}
          </div>
          {mode === "signup" && !isUpdatePassword && (
            <div className="absolute -right-1 -bottom-8">
              <PenNote rotate={-8} delay={0.3} className="text-[28px]">it's free!</PenNote>
            </div>
          )}
        </div>
      </main>
    </div>
    </PageTransition>
  );
};

export default Auth;
