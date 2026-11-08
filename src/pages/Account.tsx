import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bookmark, Globe } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { changeLanguage, getAvailableLanguages } from "@/i18n";
import { Gem, Bell, Shield, LogOut, LogIn, ChevronRight, Sparkles } from "@/components/icons/gsb";

const Account = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const { active, daysLeft } = usePremiumStatus();
  const push = usePushNotifications({ userId: user?.id, premiumActive: active });
  const { toast } = useToast();

  const initial = (user?.email || "U").trim().charAt(0).toUpperCase();
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  return (
    <div className="app-shell pb-24 md:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">{t("account.title")}</h1>

        {/* Language — available even before signing in. */}
        <div className="surface-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Globe className="w-4 h-4 text-white/60" />
            </span>
            <div>
              <p className="font-display font-semibold text-sm text-white">{t("account.language")}</p>
              <p className="text-[11px] text-white/45">{t("account.languageText")}</p>
            </div>
          </div>
          <select
            value={currentLanguage}
            onChange={(e) => void changeLanguage(e.target.value)}
            aria-label={t("account.language")}
            className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-white outline-none focus:border-pink-500/40"
          >
            {getAvailableLanguages().map(({ code, label }) => (
              <option key={code} value={code} className="bg-[#17141F] text-white">
                {label}
              </option>
            ))}
          </select>
        </div>

        {authLoading ? (
          <div className="surface-card p-6 text-center text-sm text-white/50">{t("common.loading")}</div>
        ) : !user ? (
          <div className="surface-card p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] mx-auto flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white/40" />
            </div>
            <p className="font-display font-semibold text-white/80">{t("account.notSignedIn")}</p>
            <p className="text-[12px] text-white/45">{t("account.signInText")}</p>
            <Link to="/auth" className="block">
              <button className="w-full h-11 rounded-xl bg-pink-500 text-white font-display font-bold text-sm active:scale-[0.99] transition-transform">
                {t("common.signIn")}
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Profile */}
            <div className="surface-card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-pink-500/15 border border-pink-500/25 flex items-center justify-center font-display font-bold text-pink-300">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-semibold">
                  {t("account.signedIn")}
                </p>
                <p className="text-sm font-semibold text-white truncate">{user.email}</p>
              </div>
            </div>

            {/* Premium */}
            {active ? (
              <Link to="/premium" className="block surface-card p-4 flex items-center justify-between gap-3 active:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-pink-500/12 border border-pink-500/25 flex items-center justify-center">
                    <Gem className="w-4 h-4 text-pink-400" />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-sm text-white">{t("account.premiumActive")}</p>
                    <p className="text-[11px] text-white/45">
                      {t("account.daysLeft", { count: daysLeft })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </Link>
            ) : (
              <Link to="/premium" className="block">
                <div className="rounded-2xl border border-pink-500/25 bg-pink-500/[0.07] p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
                      <Gem className="w-4 h-4 text-pink-400" />
                    </span>
                    <div>
                      <p className="font-display font-semibold text-sm text-white">{t("account.goPremium")}</p>
                      <p className="text-[11px] text-white/55">{t("account.goPremiumText")}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pink-300" />
                </div>
              </Link>
            )}

            {/* Push notifications */}
            <div className="surface-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Bell className="w-4 h-4 text-white/60" />
                </span>
                <div>
                  <p className="font-display font-semibold text-sm text-white">{t("account.push")}</p>
                  <p className="text-[11px] text-white/45">{t("account.pushText")}</p>
                </div>
              </div>
              <Switch
                checked={push.enabled}
                disabled={push.loading}
                onCheckedChange={async (val) => {
                  try {
                    await push.setPushEnabled(val);
                    toast({
                      title: val ? t("account.notificationsEnabled") : t("account.notificationsDisabled"),
                    });
                  } catch (e: any) {
                    toast({
                      title: t("account.updateError"),
                      description: e?.message,
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>

            {/* Links */}
            <div className="surface-card divide-y divide-white/[0.06] overflow-hidden">
              <Link to="/watched" className="flex items-center justify-between px-4 min-h-[52px] active:bg-white/[0.03]">
                <span className="flex items-center gap-3 text-sm text-white/80">
                  <Bookmark className="w-4 h-4 text-white/50" />
                  {t("account.watched")}
                </span>
                <ChevronRight className="w-4 h-4 text-white/35" />
              </Link>
              <Link to="/privacy" className="flex items-center justify-between px-4 min-h-[52px] active:bg-white/[0.03]">
                <span className="flex items-center gap-3 text-sm text-white/80">
                  <Shield className="w-4 h-4 text-white/50" />
                  {t("account.privacy")}
                </span>
                <ChevronRight className="w-4 h-4 text-white/35" />
              </Link>
              <Link to="/terms" className="flex items-center justify-between px-4 min-h-[52px] active:bg-white/[0.03]">
                <span className="flex items-center gap-3 text-sm text-white/80">
                  <Sparkles className="w-4 h-4 text-white/50" />
                  {t("account.terms")}
                </span>
                <ChevronRight className="w-4 h-4 text-white/35" />
              </Link>
              <Link to="/deletion" className="flex items-center justify-between px-4 min-h-[52px] active:bg-white/[0.03]">
                <span className="flex items-center gap-3 text-sm text-white/80">
                  <Shield className="w-4 h-4 text-white/50" />
                  {t("account.deleteAccount")}
                </span>
                <ChevronRight className="w-4 h-4 text-white/35" />
              </Link>
            </div>

            <button
              onClick={() => signOut()}
              className="w-full h-11 rounded-xl border border-red-500/25 text-red-300 text-sm font-semibold inline-flex items-center justify-center gap-2 active:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              {t("account.logout")}
            </button>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Account;
