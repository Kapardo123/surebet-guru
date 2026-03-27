import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Zap, Shield, TrendingUp, Star, Loader2, LogIn, LogOut, Bell, Smartphone } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall } from "@/integrations/revenuecat";

export default function Premium() {
  const [logs, setLogs] = useState<string[]>(["v1.8.9 Init"]);
  const addLog = (m: string) => setLogs(p => [...p, `${new Date().toLocaleTimeString()}: ${m}`].slice(-10));

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState<number | null>(null);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();
  
  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  useEffect(() => {
    addLog("Mounted");
    const statusTimer = setTimeout(() => {
      addLog("Refreshing status...");
      refresh()
        .then(() => addLog("Status OK"))
        .catch(e => addLog("Status ERR"));
    }, 500);

    const rcTimer = setTimeout(() => {
      const fetchRC = async () => {
        if (Capacitor.getPlatform() !== 'web') {
          addLog("Fetching RC...");
          try {
            const offerings = await getOfferings();
            addLog(offerings ? "RC OK" : "RC NULL");
            if (offerings) setRcOfferings(offerings);
          } catch (e) {
            addLog("RC Catch");
          }
        } else {
          addLog("Web: skip RC");
        }
      };
      fetchRC();
    }, 2000);

    return () => {
      clearTimeout(statusTimer);
      clearTimeout(rcTimer);
    };
  }, [refresh]);

  const handleBuy = async (duration: number, paymentLink?: string) => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }
    setLoading(duration);
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const info = await presentPaywall();
        if (info) {
          await refresh(info, duration);
        } else if (rcOfferings?.current) {
          let pkg = null;
          if (duration === 7) pkg = rcOfferings.current.weekly;
          else if (duration === 30) pkg = rcOfferings.current.monthly;
          else {
            pkg = rcOfferings.current.availablePackages.find((p: any) => p.identifier.includes('15'));
          }
          if (pkg) {
            const dInfo = await purchasePackage(pkg);
            if (dInfo) await refresh(dInfo, duration);
          }
        }
      } else if (paymentLink) {
        window.location.href = `${paymentLink}?client_reference_id=${user.id}&customer_email=${encodeURIComponent(user.email || "")}`;
      }
    } catch (e) {
      addLog("Buy error");
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    { duration: 7, label: "7 Days", price: "$3.99", paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03" },
    { duration: 15, label: "15 Days", price: "$6.99", popular: true, paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04" },
    { duration: 30, label: "30 Days", price: "$9.99", paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
            ) : (
              <Link to="/auth?redirect=/premium"><Button variant="ghost" size="sm">Sign In</Button></Link>
            )}
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-10 space-y-10">
        <div className="text-center space-y-4">
          <Crown className="w-12 h-12 text-accent mx-auto" />
          <h1 className="text-3xl font-bold">Go Premium</h1>
        </div>

        {active && (
          <div className="space-y-6">
            <Card className="border-accent/30">
              <CardContent className="p-6 text-center font-bold text-accent">
                Active: {daysLeft} days left
              </CardContent>
            </Card>

            <Card className="border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Push Notifications
                    </p>
                    <p className="text-xs text-muted-foreground">Daily picks and alerts</p>
                  </div>
                  <Switch 
                    checked={push.enabled} 
                    onCheckedChange={async (val) => {
                      try {
                        await push.setPushEnabled(val);
                        toast({ title: val ? "Enabled! 🔔" : "Disabled" });
                      } catch (e: any) {
                        toast({ title: "Error", description: e.message, variant: "destructive" });
                      }
                    }}
                    disabled={push.loading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.duration} className="bg-card border-border/50">
              <CardContent className="p-6 text-center space-y-4">
                <p className="font-bold">{plan.label}</p>
                <p className="text-3xl font-bold">{plan.price}</p>
                <Button 
                  onClick={() => handleBuy(plan.duration, plan.paymentLink)} 
                  disabled={loading !== null} 
                  className="w-full"
                >
                  {loading === plan.duration ? "Loading..." : "Buy Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Debug Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-[#0f0] text-[8px] p-1 z-[10000] opacity-80 pointer-events-none max-h-20 overflow-hidden">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
