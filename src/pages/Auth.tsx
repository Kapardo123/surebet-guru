import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, Loader2, Sparkles, KeyRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

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

  // Check if we are returning from a password reset link
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
  }, []);

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
    if (isUpdatePassword) return "Update Password";
    if (mode === "login") return "Sign In";
    if (mode === "signup") return "Create Account";
    if (mode === "reset") return "Reset Password";
    if (mode === "magic") return "Magic Link";
    return "Auth";
  };

  const getSubtitle = () => {
    if (isUpdatePassword) return "Enter your new password";
    if (mode === "login") return "Access your account";
    if (mode === "signup") return "Sign up to get Premium";
    if (mode === "reset") return "Send a recovery link to your email";
    if (mode === "magic") return "Log in without a password";
    return "";
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
           <h1 className="font-display text-2xl font-bold text-foreground">
            {getTitle()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {getSubtitle()}
          </p>
        </div>

        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isUpdatePassword && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      maxLength={255}
                    />
                  </div>
                </div>
              )}

              {((mode === "login" || mode === "signup") || isUpdatePassword) && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">
                    {isUpdatePassword ? "New Password" : "Password"}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isUpdatePassword ? "Update Password" : (
                  mode === "login" ? "Sign In" : 
                  mode === "signup" ? "Sign Up" : 
                  mode === "reset" ? "Send Reset Link" : "Send Magic Link"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center space-y-4">
              {!isUpdatePassword && (
                <>
                  {mode === "login" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setMode("signup")}
                        className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Don't have an account? Sign Up
                      </button>
                      <button
                        onClick={() => setMode("magic")}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Log in with Magic Link
                      </button>
                      <button
                        onClick={() => setMode("reset")}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer mt-2"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {mode === "signup" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setMode("login")}
                        className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Already have an account? Sign In
                      </button>
                      <p className="text-[10px] text-muted-foreground px-4">
                        By signing up, you agree to our{" "}
                        <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>{" "}
                        and{" "}
                        <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
                      </p>
                    </div>
                  )}

                  {(mode === "reset" || mode === "magic") && (
                    <button
                      onClick={() => setMode("login")}
                      className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default Auth;
