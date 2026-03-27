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
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

export default function Premium() {
  const [logs, setLogs] = useState<string[]>(["v1.8.7 Init"]);
  const addLog = (m: string) => setLogs(p => [...p, `${new Date().toLocaleTimeString()}: ${m}`].slice(-10));

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState<number | null>(null);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);
  
  // Use icons from lucide-react inside the component to avoid TDZ errors during minification
  const Icons = {
    Crown, ArrowLeft, Zap, Shield, TrendingUp, Star, Loader2, LogIn, LogOut, Bell, Smartphone
  };

  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  useEffect(() => {
    addLog("Mounted");
    const statusTimer = setTimeout(() => {
      addLog("Refreshing status...");
      refresh().catch(e => addLog("Status error"));
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

  const getPlanDetails = (plan: any) => {
    if (Capacitor.getPlatform() !== 'web' && rcOfferings?.current) {
      let rcPackage = null;
      if (plan.duration === 7) rcPackage = rcOfferings.current.weekly;
      if (plan.duration === 30) rcPackage = rcOfferings.current.monthly;
      if (!rcPackage && Array.isArray(rcOfferings.current.availablePackages)) {
        rcPackage = rcOfferings.current.availablePackages.find((p: any) => {
          const id = p.identifier.toLowerCase();
          if (plan.duration === 7) return id.includes('7') || id.includes('week');
          if (plan.duration === 15) return id.includes('15') || id.includes('half');
          if (plan.duration === 30) return id.includes('30') || id.includes('month');
          return false;
        });
      }
      if (rcPackage && rcPackage.product) {
        return {
          ...plan,
          price: rcPackage.product.priceString || plan.price,
          perDay: `${(rcPackage.product.price / plan.duration).toFixed(2)}$/day`,
        };
      }
    }
    return plan;
  };

  const plans = [
    { duration: 7, label: "7 Days", price: "$3.99", paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03" },
    { duration: 15, label: "15 Days", price: "$6.99", popular: true, paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04" },
    { duration: 30, label: "30 Days", price: "$9.99", paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut}><Icons.LogOut className="w-4 h-4" /></Button>
            ) : (
              <Link to="/auth?redirect=/premium"><Button variant="ghost" size="sm">Sign In</Button></Link>
            )}
            <Link to="/"><Button variant="ghost" size="sm"><Icons.ArrowLeft className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-10 space-y-10">
        <div className="text-center space-y-4">
          <Icons.Crown className="w-12 h-12 text-accent mx-auto" />
          <h1 className="text-3xl font-bold">Go Premium</h1>
        </div>

        {active && (
          <Card className="glass border-accent/30"><CardContent className="p-6 text-center font-bold text-accent">
            Active: {daysLeft} days left
          </CardContent></Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const plan = getPlanDetails(p);
            return (
              <Card key={plan.duration} className="bg-card">
                <CardContent className="p-6 text-center space-y-4">
                  <p className="font-bold">{plan.label}</p>
                  <p className="text-3xl font-bold">{plan.price}</p>
                  <Button onClick={() => handleBuy(plan.duration, plan.paymentLink)} disabled={loading !== null} className="w-full">
                    {loading === plan.duration ? <Icons.Loader2 className="animate-spin" /> : "Buy Now"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#000', color: '#0f0', fontSize: '9px', padding: '5px', zIndex: 9999 }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
