import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Gift, Users, Check, Loader2, Share2, Crown, Lock } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Referral = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [myCode, setMyCode] = useState("");
  const [inputCode, setInputCode] = useState(searchParams.get("code") || "");
  const [stats, setStats] = useState({ total_referrals: 0, total_reward_days: 0 });
  const [copied, setCopied] = useState(false);
  const [using, setUsing] = useState(false);
  const { active: isPremium, refresh: refreshPremium } = usePremiumStatus();

  useEffect(() => {
    if (user) {
      fetchCode();
      fetchStats();
    }
  }, [user]);

  const fetchCode = async () => {
    const { data } = await supabase.functions.invoke("referral", {
      body: { action: "get-code" },
    });
    if (data?.code) setMyCode(data.code);
  };

  const fetchStats = async () => {
    const { data } = await supabase.functions.invoke("referral", {
      body: { action: "stats" },
    });
    if (data) setStats(data);
  };

  const copyCode = async () => {
    if (!myCode) return;
    const shareUrl = `${window.location.origin}/referral?code=${myCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Copied! 📋", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const useCode = async () => {
    if (!inputCode.trim()) return;
    setUsing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("referral", {
        body: { action: "use-code", code: inputCode.trim() },
      });
      if (fnError) throw new Error("Something went wrong. Please try again.");
      if (data?.error) {
        const friendlyMessages: Record<string, string> = {
          "You can't use your own code": "Hey, you can't refer yourself! 😄 Ask a friend for their code.",
          "Invalid or already used code": "This code is invalid or has already been used.",
        };
        throw new Error(friendlyMessages[data.error] || data.error);
      }
      if (data?.success) {
        await refreshPremium();
        toast({
          title: "Code redeemed! 🎉",
          description: "You got 3 free days of Premium!",
        });
        setInputCode("");
        fetchStats();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Invalid code",
        variant: "destructive",
      });
    } finally {
      setUsing(false);
    }
  };

  if (!user) {
    return (
      <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="bg-card border-border/50 max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Gift className="w-12 h-12 text-accent mx-auto" />
            <h2 className="font-display text-xl font-bold text-foreground">Referral Program</h2>
            <p className="text-sm text-muted-foreground">Sign in to refer friends and earn free Premium days</p>
            <Link to="/auth?redirect=/referral">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center mx-auto">
            <Gift className="w-8 h-8 text-accent" />
          </div>
           <h1 className="font-display text-3xl font-bold text-foreground">
            <span className="text-gradient">Refer a Friend</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Share your code. You and your friend both get <span className="text-accent font-bold">3 free days of Premium!</span>
          </p>
        </div>

        {isPremium ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card border-border/50">
                <CardContent className="p-5 text-center">
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-foreground">{stats.total_referrals}</p>
                  <p className="text-xs text-muted-foreground">Referred</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="p-5 text-center">
                  <Gift className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-foreground">{stats.total_reward_days}</p>
                  <p className="text-xs text-muted-foreground">Premium Days Earned</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border/50 gradient-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-display font-bold text-foreground">Your Referral Code</h2>
                <div className="flex gap-2">
                  <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-4 py-3 font-mono text-lg text-foreground text-center tracking-widest">
                    {myCode || "Loading..."}
                  </div>
                  <Button onClick={copyCode} variant="outline" className="gap-2 px-4" disabled={!myCode}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={copyCode} className="w-full gap-2" disabled={!myCode}>
                  <Share2 className="w-4 h-4" />
                  Share Link
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center space-y-4">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
              <h2 className="font-display text-xl font-bold text-foreground">Get Premium to Unlock Referrals</h2>
              <p className="text-sm text-muted-foreground">Purchase a Premium plan to get your unique referral code and start earning free days!</p>
              <Link to="/premium">
                <Button className="gap-2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
                  <Crown className="w-4 h-4" />
                  Go Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border/50">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-display font-bold text-foreground">Have a friend's code?</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code e.g. GSB-ABC123"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="font-mono tracking-wider"
              />
              <Button onClick={useCode} disabled={using || !inputCode.trim()} className="gap-2">
                {using ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Redeem
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    </PageTransition>
  );
};

export default Referral;
