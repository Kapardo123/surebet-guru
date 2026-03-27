import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Zap, Shield, TrendingUp, Star, Loader2, LogIn, LogOut, Bell, Lock, Smartphone } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

const plans = [
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
];

const features = [
  { text: "Access all Premium picks", icon: Crown },
  { text: "Highest confidence tips", icon: TrendingUp },
  { text: "Early access to picks", icon: Zap },
  { text: "Exclusive match analysis", icon: Star },
];

const Premium = () => {
  console.log("Premium component rendering start");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState<number | null>(null);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);
  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  useEffect(() => {
    console.log("Premium component mounted");
    const fetchRC = async () => {
      if (Capacitor.getPlatform() !== 'web') {
        console.log('Próba pobrania ofert z RevenueCat...');
        try {
          const offerings = await getOfferings();
          if (offerings) {
            console.log('Otrzymane oferty z RevenueCat');
            if (!offerings.current) {
              console.warn('Otrzymano oferty, ale brak "Current Offering" w panelu RevenueCat!');
            }
            setRcOfferings(offerings);
          } else {
            console.error('getOfferings() zwróciło null');
          }
        } catch (e) {
          console.error('Błąd w fetchRC:', e);
        }
      }
    };
    fetchRC();
  }, []);

  console.log("Premium status:", { active, daysLeft });
  console.log("User:", user?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-white text-center space-y-4 bg-card p-8 rounded-2xl border border-border">
        <Crown className="w-12 h-12 text-accent mx-auto animate-pulse" />
        <h1 className="text-2xl font-bold">Premium Page Loaded</h1>
        <p className="text-muted-foreground">Status: {active ? "Active" : "Inactive"}</p>
        <p className="text-xs">User ID: {user?.id || "Not logged in"}</p>
        <Link to="/">
          <Button variant="outline" className="mt-4">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
};

export default Premium;
