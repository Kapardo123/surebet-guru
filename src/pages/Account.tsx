import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Loader2, LogIn } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import AppHeader, { headerLink, goldButton } from "@/components/AppHeader";
import StadiumBackdrop from "@/components/StadiumBackdrop";
import MemberCard from "@/components/MemberCard";
import PageTransition from "@/components/PageTransition";
import { numberFromId } from "@/components/Barcode";
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

/** One line of the stats panel: label left, value right. */
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 px-4 py-3.5 border-b border-white/[0.06] last:border-b-0">
    <dt className="text-[14px] text-muted-foreground shrink-0">{label}</dt>
    <dd className="text-[15px] font-semibold text-right min-w-0 break-words">{children}</dd>
  </div>
);

const panel = "rounded-[20px] bg-white/[0.04] border border-white/[0.07] overflow-hidden";
const linkRow = "flex items-center justify-between gap-4 px-4 py-3.5 border-b border-white/[0.06] last:border-b-0 text-[15px] font-medium hover:bg-white/[0.03]";

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
          <ArrowLeft className="w-4 h-4" />
          Cards
        </Link>
      }
    />
  );

  if (authLoading) {
    return (
      <div className="min-h-screen">
        {header}
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </div>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="relative isolate min-h-screen pb-16">
          <StadiumBackdrop height={460} />
          {header}
          <main className="max-w-xl mx-auto px-4 pt-7 space-y-8 text-center">
            <MemberCard issued={false} />
            <div>
              <h1 className="font-display font-black uppercase text-[30px] leading-[1.02] tracking-[-0.02em]">Start your collection</h1>
              <p className="text-[16px] leading-relaxed text-muted-foreground mt-2">
                Sign in to see your membership, manage alerts and restore purchases on this device.
              </p>
            </div>
            <Link
              to="/auth?redirect=/account"
              className="flex items-center justify-center gap-2 h-14 rounded-full bg-primary text-primary-foreground text-[16px] font-bold shadow-[0_8px_24px_-6px_hsl(var(--primary)/.6)]"
            >
              <LogIn className="w-5 h-5" />
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
      <div className="relative isolate min-h-screen pb-16">
          <StadiumBackdrop height={460} />
        {header}
        <main className="max-w-xl mx-auto px-4 pt-7 space-y-8">
          <section className="text-center">
            <p className="label">Your collection</p>
            <h1 className="font-display font-black uppercase text-[30px] leading-[1.02] tracking-[-0.02em] mt-1.5">
              Hey, {handle}
            </h1>
          </section>

          <MemberCard issued={active} name={handle} memberNo={memberNo} validUntil={expiresAt} daysLeft={daysLeft} />

          {!active && (
            <Link to="/premium" className={`${goldButton} w-full h-14 justify-center text-[16px]`}>
              Pull your Gold card
            </Link>
          )}

          <section>
            <h2 className="label px-1 mb-2">Card stats</h2>
            <dl className={panel}>
              <Row label="Email">{user.email}</Row>
              <Row label="Collector no.">{memberNo}</Row>
              <Row label="Collecting since">{longDate(user.created_at)}</Row>
              <Row label="Membership">
                {active ? (
                  <span className="foil-gold-text">Gold · {daysLeft} {daysLeft === 1 ? "day" : "days"} left</span>
                ) : (
                  "Common"
                )}
              </Row>
              {active && expiresAt && <Row label="Ends">{longDate(expiresAt)}</Row>}
            </dl>
          </section>

          <section>
            <h2 className="label px-1 mb-2">Settings</h2>
            <div className={panel}>
              <div className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-white/[0.06]">
                <div>
                  <p className="text-[15px] font-medium">New card alerts</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {!push.isNative ? "Available in the Android and iOS app" : active ? "A push for every Gold pick" : "Comes with Gold"}
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
                />
              </div>
              {Capacitor.isNativePlatform() && (
                <button onClick={handleRestore} disabled={restoring} className={`${linkRow} w-full text-left disabled:opacity-60`}>
                  Restore purchases
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              )}
              <Link to="/auth?mode=update-password" className={linkRow}>
                Change password <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link to="/privacy" className={linkRow}>
                Privacy policy <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link to="/terms" className={linkRow}>
                Terms of service <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link to="/deletion" className={`${linkRow} text-red`}>
                Delete account <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full h-14 rounded-full bg-white/[0.07] border border-white/10 text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
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
