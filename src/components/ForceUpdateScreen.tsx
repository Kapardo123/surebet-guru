import { useTranslation } from "react-i18next";
import { AlertTriangle, Download } from "@/components/icons/gsb";

interface ForceUpdateScreenProps {
  currentVersion: string;
  latestVersion: string;
  message?: string;
  downloadUrl: string;
}

// Full-screen, non-dismissible gate. Rendered INSTEAD of the app UI, so an
// outdated build never mounts routes, splash or providers.
const ForceUpdateScreen = ({ currentVersion, latestVersion, message, downloadUrl }: ForceUpdateScreenProps) => {
  const { t } = useTranslation();
  const handleUpdate = () => {
    // In the Android WebView window.open still hands the Play Store link to the
    // system; fall back to a direct navigation if it is blocked.
    const win = window.open(downloadUrl, "_blank");
    if (!win) window.location.href = downloadUrl;
  };

  return (
    <div className="app-shell min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center gsb-safe-top">
      <div className="gsb-logo flex items-center gap-2 mb-6" aria-hidden="true">
        <span className="gsb-logo__badge">
          <span className="gsb-logo__badge-inner">
            <span className="gsb-logo__mono">GSB</span>
          </span>
        </span>
        <span className="gsb-logo__word">Great Sport Bets</span>
      </div>

      <div className="w-14 h-14 rounded-2xl bg-pink-500/12 border border-pink-500/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-pink-400" />
      </div>

      <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("forceUpdate.title")}</h1>
      <p className="text-sm text-white/55 mt-2 max-w-xs leading-relaxed">
        {message || t("forceUpdate.text")}
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
        <span className="text-sm text-white/45 line-through tabular-nums">{currentVersion}</span>
        <span className="text-white/30">→</span>
        <span className="text-sm font-bold text-emerald-300 tabular-nums">{latestVersion}</span>
      </div>

      <button
        onClick={handleUpdate}
        className="mt-6 w-full max-w-xs h-12 rounded-2xl bg-pink-500 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
      >
        <Download className="w-4 h-4 brightness-0 invert" />
        {t("forceUpdate.cta")}
      </button>

      <p className="mt-3 text-[11px] text-white/35">{t("forceUpdate.note")}</p>
    </div>
  );
};

export default ForceUpdateScreen;
