import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, Loader2, Sparkles, KeyRound } from "@/components/icons/gsb";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

type AuthMode = "login" | "signup" | "reset" | "magic";

const Auth = () => {
  const { t } = useTranslation();
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
        title: t("auth.resetSent"),
        description: t("auth.resetSentText"),
      });
      setMode("login");
    } catch (err: any) {
      toast({
        title: t("auth.error"),
        description: err.message || t("auth.couldNotSendReset"),
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
        title: t("auth.magicSent"),
        description: t("auth.magicSentText"),
      });
    } catch (err: any) {
      toast({
        title: t("auth.error"),
        description: err.message || t("auth.couldNotSendMagic"),
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
      toast({ title: t("auth.passwordUpdated") });
      navigate("/");
    } catch (err: any) {
      toast({
        title: t("auth.error"),
        description: err.message || t("auth.couldNotUpdatePassword"),
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
        toast({ title: t("auth.signedIn") });
        navigate(redirect);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/#/` },
        });
        if (error) throw error;
        toast({
          title: t("auth.accountCreated"),
          description: t("auth.accountCreatedText"),
        });
      }
    } catch (err: any) {
      toast({
        title: t("auth.error"),
        description: err.message || t("auth.somethingWrong"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isUpdatePassword = searchParams.get("mode") === "update-password";

  const getTitle = () => {
    if (isUpdatePassword) return "auth.titleUpdate";
    if (mode === "login") return "auth.titleLogin";
    if (mode === "signup") return "auth.titleSignup";
    if (mode === "reset") return "auth.titleReset";
    if (mode === "magic") return "auth.titleMagic";
    return "auth.titleLogin";
  };

  const getSubtitle = () => {
    if (isUpdatePassword) return "auth.subtitleUpdate";
    if (mode === "login") return "auth.subtitleLogin";
    if (mode === "signup") return "auth.subtitleSignup";
    if (mode === "reset") return "auth.subtitleReset";
    if (mode === "magic") return "auth.subtitleMagic";
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
            {t(getTitle())}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(getSubtitle())}
          </p>
        </div>

        <Card className="bg-card border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isUpdatePassword && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
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
                    {isUpdatePassword ? t("auth.newPassword") : t("auth.password")}
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
                {isUpdatePassword ? t("auth.updatePassword") : (
                  mode === "login" ? t("auth.signIn") : 
                  mode === "signup" ? t("auth.signUp") : 
                  mode === "reset" ? t("auth.sendReset") : t("auth.sendMagic")
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
                        {t("auth.noAccount")}
                      </button>
                      <button
                        onClick={() => setMode("magic")}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t("auth.magicLogin")}
                      </button>
                      <button
                        onClick={() => setMode("reset")}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 bg-transparent border-none cursor-pointer mt-2"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                  )}

                  {mode === "signup" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setMode("login")}
                        className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                      >
                        {t("auth.haveAccount")}
                      </button>
                      <p className="text-[10px] text-muted-foreground px-4">
                        {t("auth.termsAgree")}{" "}
                        <Link to="/terms" className="underline hover:text-primary">{t("auth.terms")}</Link>{" "}
                        {t("auth.and")}{" "}
                        <Link to="/privacy" className="underline hover:text-primary">{t("auth.privacy")}</Link>.
                      </p>
                    </div>
                  )}

                  {(mode === "reset" || mode === "magic") && (
                    <button
                      onClick={() => setMode("login")}
                      className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                    >
                      {t("auth.backToSignIn")}
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
            {t("auth.backHome")}
          </Link>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default Auth;
