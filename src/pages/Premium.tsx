import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Zap, Shield, TrendingUp, Star, Loader2, LogIn, LogOut, Bell, Smartphone, AlertTriangle } from "lucide-react";
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

// DEBUG COMPONENT
const DebugOverlay = ({ logs, errors }: { logs: string[], errors: string[] }) => (
  <div style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40vh',
    backgroundColor: 'rgba(0,0,0,0.9)',
    color: '#00ff00',
    fontSize: '10px',
    fontFamily: 'monospace',
    overflowY: 'auto',
    zIndex: 99999,
    padding: '10px',
    borderTop: '2px solid #333',
    pointerEvents: 'auto'
  }}>
    <div style={{ color: '#ff0000', fontWeight: 'bold', marginBottom: '5px' }}>
      ERRORS ({errors.length}):
      {errors.map((err, i) => <div key={i} style={{ borderBottom: '1px solid #500', padding: '2px 0' }}>{err}</div>)}
    </div>
    <div style={{ color: '#aaa', fontWeight: 'bold', marginTop: '10px' }}>
      LOGS ({logs.length}):
      {logs.slice().reverse().map((log, i) => <div key={i}>{log}</div>)}
    </div>
  </div>
);

const Premium = () => {
  const [debugLogs, setDebugLogs] = useState<string[]>(["Initial render v1.8.5"]);
  const [debugErrors, setDebugErrors] = useState<string[]>([]);
  
  const addLog = (msg: string) => setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  const addError = (msg: string) => setDebugErrors(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  // Global error capture
  useEffect(() => {
    const handleError = (e: ErrorEvent) => addError(`Global: ${e.message} at ${e.filename}:${e.lineno}`);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh, loading: statusLoading } = usePremiumStatus();
  const [loading, setLoading] = useState<number | null>(null);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);
  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  const plans = useMemo(() => [
    {
      duration: 7,
      label: "7 Days",
      price: "$3.99",
      perDay: "$0.57/day",
      popular: false,
      paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03",
    },
    {
      duration: 15,
      label: "15 Days",
      price: "$6.99",
      perDay: "$0.47/day",
      popular: true,
      save: "Save 18%",
      paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04",
    },
    {
      duration: 30,
      label: "30 Days",
      price: "$9.99",
      perDay: "$0.33/day",
      popular: false,
      save: "Best Value",
      paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05",
    },
  ], []);

  const features = useMemo(() => [
    { text: "Access all Premium picks", icon: Crown },
    { text: "Highest confidence tips", icon: TrendingUp },
    { text: "Early access to picks", icon: Zap },
    { text: "Exclusive match analysis", icon: Star },
  ], []);

  useEffect(() => {
    addLog("Premium Mounted");
    
    const statusTimer = setTimeout(() => {
      addLog("Refreshing status...");
      refresh().catch(e => addError(`Status Error: ${e.message}`));
    }, 500);

    const rcTimer = setTimeout(() => {
      const fetchRC = async () => {
        if (Capacitor.getPlatform() !== 'web') {
          addLog("Fetching RC offerings...");
          try {
            const offerings = await getOfferings();
            addLog(offerings ? "RC Success" : "RC Null");
            if (offerings) setRcOfferings(offerings);
          } catch (e: any) {
            addError(`RC Fetch Error: ${e.message}`);
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
      toast({ title: "Login Required", description: "Please log in to purchase premium access." });
      navigate("/auth?redirect=/premium");
      return;
    }

    setLoading(duration);
    addLog(`Initiating purchase: ${duration} days`);
    
    try {
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const info = await presentPaywall();
          if (info) {
            addLog("Purchase success from paywall");
            await refresh(info, duration);
            return;
          } else if (rcOfferings?.current) {
            addLog("Paywall closed, trying direct package...");
            let rcPackage = null;
            if (duration === 7) rcPackage = rcOfferings.current.weekly;
            else if (duration === 30) rcPackage = rcOfferings.current.monthly;
            else if (duration === 15) {
              rcPackage = rcOfferings.current.availablePackages.find((p: any) => 
                p.identifier.includes('15') || p.identifier.includes('half')
              );
            }

            if (rcPackage) {
              const directInfo = await purchasePackage(rcPackage);
              if (directInfo) {
                addLog("Direct purchase success");
                await refresh(directInfo, duration);
                return;
              }
            }
          }
        } catch (e: any) {
          addError(`RC Purchase Error: ${e.message}`);
          toast({ title: "RevenueCat Error", description: e.message, variant: "destructive" });
        }
        return;
      }

      if (paymentLink) {
        window.location.href = `${paymentLink}?client_reference_id=${user.id}&customer_email=${encodeURIComponent(user.email || "")}`;
      }
    } catch (error: any) {
      addError(`Buy Error: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const getPlanDetails = (plan: any) => {
    if (Capacitor.getPlatform() !== 'web' && rcOfferings?.current) {
      let rcPackage = null;
      if (plan.duration === 7) rcPackage = rcOfferings.current.weekly;
      else if (plan.duration === 30) rcPackage = rcOfferings.current.monthly;
      
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

  return (
    <div className="min-h-screen bg-background pb-[40vh]">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
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
          <p className="text-muted-foreground">Unlock exclusive analysts picks</p>
        </div>

        {active && (
          <Card className="glass border-accent/30">
            <CardContent className="p-6 text-center">
              <p className="font-bold text-accent">Premium Active: {daysLeft} days left</p>
            </CardContent>
          </Card>
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
                    {loading === plan.duration ? <Loader2 className="animate-spin" /> : "Buy Now"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <DebugOverlay logs={debugLogs} errors={debugErrors} />
    </div>
  );
};

export default Premium;
