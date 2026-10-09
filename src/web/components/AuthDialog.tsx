import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Sparkles, KeyRound, ArrowRight } from "@/components/icons/gsb";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AuthMode = "login" | "signup" | "magic" | "reset" | "update";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
}

const titles: Record<AuthMode, string> = {
  login: "Sign In",
  signup: "Create Account",
  magic: "Magic Link",
  reset: "Reset Password",
  update: "Set New Password",
};

const subtitles: Record<AuthMode, string> = {
  login: "Access your account and Premium",
  signup: "Create an account to buy Premium",
  magic: "Log in without a password",
  reset: "We'll email you a recovery link",
  update: "Choose a new password for your account",
};

/** Inline login panel for the landing page — no navigation to an app. */
const AuthDialog = ({ open, onOpenChange, initialMode = "login" }: AuthDialogProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const finish = (title: string, description?: string) => {
    toast({ title, description });
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "login") {
        if (!email.trim() || !password) throw new Error("Enter your email and password");
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        finish("Signed in! 🎉");
      } else if (mode === "signup") {
        if (!email.trim() || password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/#/` },
        });
        if (error) throw error;
        finish("Account created! 📧", "Check your email to confirm your registration.");
      } else if (mode === "magic") {
        if (!email.trim()) throw new Error("Enter your email address");
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/#/` },
        });
        if (error) throw error;
        finish("Magic link sent! ✨", "Check your email to log in instantly.");
      } else if (mode === "reset") {
        if (!email.trim()) throw new Error("Enter your email address");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/#/auth?mode=update-password`,
        });
        if (error) throw error;
        finish("Reset link sent! 📧", "Check your email for the password reset link.");
      } else if (mode === "update") {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        window.history.replaceState(null, "", `${window.location.pathname}#/`);
        finish("Password updated! ✅");
      }
    } catch (err: any) {
      toast({
        title: "Something went wrong",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isPasswordMode = mode === "login" || mode === "signup" || mode === "update";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0d001a] p-0 text-white shadow-2xl shadow-black/60 [&>button]:text-white/50 [&>button]:hover:text-white">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-cyan-500" />

        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="text-left">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/10 ring-1 ring-pink-500/30">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </span>
              <div className="leading-tight">
                <DialogTitle className="text-xl font-black tracking-tight">{titles[mode]}</DialogTitle>
                <DialogDescription className="text-[13px] text-white/50">{subtitles[mode]}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {mode !== "update" && (
              <div className="space-y-2">
                <Label htmlFor="auth-email" className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    id="auth-email"
                    type="email"
                    required
                    maxLength={255}
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-white/[0.1] bg-white/[0.04] pl-10 text-white placeholder:text-white/30 focus-visible:ring-pink-500/50"
                  />
                </div>
              </div>
            )}

            {isPasswordMode && (
              <div className="space-y-2">
                <Label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  {mode === "update" ? "New Password" : "Password"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-white/[0.1] bg-white/[0.04] pl-10 text-white placeholder:text-white/30 focus-visible:ring-pink-500/50"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-pink-500/25 transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin brightness-0 invert" />}
              {mode === "login" ? "Sign In" : mode === "signup" ? "Sign Up" : mode === "magic" ? "Send Magic Link" : mode === "reset" ? "Send Reset Link" : "Update Password"}
            </button>
          </form>

          {/* Mode switchers */}
          <div className="mt-5 flex flex-col items-center gap-2 border-t border-white/[0.07] pt-4">
            {mode === "login" && (
              <>
                <button type="button" onClick={() => setMode("signup")} className="text-sm font-semibold text-pink-300 hover:text-pink-200 transition-colors">
                  Don't have an account? Sign Up
                </button>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setMode("magic")} className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white/75 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" /> Magic Link
                  </button>
                  <button type="button" onClick={() => setMode("reset")} className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white/75 transition-colors">
                    <KeyRound className="w-3.5 h-3.5" /> Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
              <>
                <button type="button" onClick={() => setMode("login")} className="text-sm font-semibold text-pink-300 hover:text-pink-200 transition-colors">
                  Already have an account? Sign In
                </button>
                <p className="px-6 text-center text-[10px] leading-relaxed text-white/35">
                  By signing up you agree to our Terms of Service and Privacy Policy.
                </p>
              </>
            )}

            {(mode === "magic" || mode === "reset" || mode === "update") && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink-300 hover:text-pink-200 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
