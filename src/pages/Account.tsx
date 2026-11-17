import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Loader2, LogIn } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import AppHeader, { headerLink } from "@/components/AppHeader";
import SectionHead from "@/components/SectionHead";
import PressPass from "@/components/PressPass";
import PageTransition from "@/components/PageTransition";
import { numberFromId } from "@/components/Barcode";
import { PenNote } from "@/components/RedPen";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";
import { restorePurchases } from "@/integrations/revenuecat";

const longDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/** One ruled line of the form: label on the left, value on the right. */
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[112px_1fr] gap-3 items-baseline py-3.5 border-b border-foreground/25">
    <dt className="label text-foreground">{label}</dt>
    <dd className="font-serif text-[18px] leading-snug text-foreground min-w-0 break-words">{children}</dd>
  </div>
);

const Account = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { active, daysLeft, expiresAt, refresh } = usePremiumStatus();
  const push = usePushNotifications({ userId: user?.id, premiumActive: active });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [restoring, setRestoring] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await refresh(info);
        toast({ title: "Purchases restored" });
      } else {
        toast({ title: "No active purchases found", variant: "destructive" });
      }
    } catch {
      toast({ title: "Restore failed", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/");
    } finally {
      setSigningOut(false);
    }
  };

  const header = (
    <AppHeader
      right={
        <Link to="/" className={headerLink}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Tips
        </Link>
      }
    />
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </div>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background pb-14">
          {header}
          <main className="max-w-xl mx-auto px-4 pt-7 space-y-8">
            <SectionHead tone="red">Reader's account</SectionHead>
            <h1 className="font-display font-black uppercase text-[clamp(56px,17vw,96px)] leading-[0.82] tracking-[-0.01em]">
              Who's<br />reading?
            </h1>
            <p className="font-serif text-[19px] leading-[1.5] text-secondary-foreground">
              Sign in to see your membership, manage notifications and restore purchases on this device.
            </p>
            <Link
              to="/auth?redirect=/account"
              className="flex items-center justify-center gap-2 h-14 bg-foreground text-background font-mono text-[13.5px] font-semibold uppercase tracking-[0.1em] shadow-[4px_4px_0_hsl(var(--red))]"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          </main>
        </div>
      </PageTransition>
    );
  }

  const handle = user.email?.split("@")[0] ?? null;
  const memberNo = numberFromId(user.id);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-14">
        {header}
        <main className="max-w-xl mx-auto px-4 pt-7 space-y-12">
          <section>
            <SectionHead tone="red">Reader's account</SectionHead>
            <h1 className="font-display font-black uppercase text-[clamp(56px,17vw,96px)] leading-[0.82] tracking-[-0.01em] mt-4">
              Your<br />copy.
            </h1>
            <p className="font-serif italic text-[19px] text-secondary-foreground mt-3">
              Good to have you back, {handle}.
            </p>
          </section>

          <section className="pt-6">
            <PressPass issued={active} name={handle} memberNo={memberNo} validUntil={expiresAt} daysLeft={daysLeft} />
            {!active && (
              <p className="text-center mt-1">
                <Link to="/premium">
                  <PenNote rotate={-3} delay={0.8} className="text-[28px] underline decoration-1 underline-offset-4">get it stamped →</PenNote>
                </Link>
              </p>
            )}
          </section>

          <section>
            <SectionHead>The particulars</SectionHead>
            <dl className="mt-1">
              <Row label="Email">{user.email}</Row>
              <Row label="Reader no.">GSB-{memberNo}</Row>
              <Row label="Reading since">{longDate(user.created_at)}</Row>
              <Row label="Membership">
                {active ? (
                  <>
                    <span className="font-semibold">Active</span>, {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                    {expiresAt && <span className="block text-[15px] text-muted-foreground">Renews or ends {longDate(expiresAt)}</span>}
                  </>
                ) : (
                  <span className="flex items-baseline justify-between gap-3">
                    <span>Free reader</span>
                    <Link to="/premium" className="shrink-0 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-red underline underline-offset-4">
                      Subscribe
                    </Link>
                  </span>
                )}
              </Row>
            </dl>
          </section>

          <section>
            <SectionHead>Settings</SectionHead>
            <div className="mt-1">
              <div className="flex items-center justify-between gap-4 py-3.5 border-b border-foreground/25">
                <div>
                  <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em]">Push notifications</p>
                  <p className="font-serif italic text-[16px] text-muted-foreground mt-0.5">
                    {!push.isNative
                      ? "Available in the Android and iOS app"
                      : active
                      ? "A ping for each new members' pick"
                      : "Comes with membership"}
                  </p>
                </div>
                <Switch
                  checked={push.enabled}
                  disabled={!push.isNative || !active || push.loading}
                  onCheckedChange={async (val) => {
                    try {
                      await push.setPushEnabled(val);
                      toast({ title: val ? "Notifications on" : "Notifications off" });
                    } catch (e: any) {
                      toast({ title: "Error", description: e.message, variant: "destructive" });
                    }
                  }}
                  className="data-[state=checked]:bg-red"
                />
              </div>

              {Capacitor.isNativePlatform() && (
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="w-full flex items-center justify-between gap-4 py-3.5 border-b border-foreground/25 text-left disabled:opacity-60"
                >
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em]">Restore purchases</span>
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                </button>
              )}

              <Link to="/auth?mode=update-password" className="flex items-center justify-between gap-4 py-3.5 border-b border-foreground/25">
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em]">Change password</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              {[
                ["Privacy policy", "/privacy"],
                ["Terms of service", "/terms"],
              ].map(([label, to]) => (
                <Link key={to} to={to} className="flex items-center justify-between gap-4 py-3.5 border-b border-foreground/25">
                  <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em]">{label}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              ))}
              <Link to="/deletion" className="flex items-center justify-between gap-4 py-3.5 border-b border-foreground/25 text-red">
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em]">Delete account</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full h-14 border-[2px] border-foreground font-mono text-[13.5px] font-semibold uppercase tracking-[0.1em] flex items-center justify-center gap-2 shadow-[4px_4px_0_hsl(var(--foreground))] active:translate-y-px disabled:opacity-60"
          >
            {signingOut && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign out
          </button>
        </main>
      </div>
    </PageTransition>
  );
};

export default Account;
