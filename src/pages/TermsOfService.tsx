import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6 text-gray-400 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Card className="bg-zinc-900/50 border-zinc-800 text-gray-300">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Terms of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h2 className="text-xl font-semibold text-white mb-2">1. Use of Service</h2>
                <p>
                  Great Sport Bets provides informational betting tips and surebets. We do not provide 
                  gambling services or financial advice. All betting activities are at your own risk.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">2. Subscription & Payments</h2>
                <p>
                  Premium access is provided via subscriptions processed through Stripe. 
                  All sales are final, and we do not offer refunds once access has been granted.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">3. Referral System</h2>
                <p>
                  Our referral system is intended for personal use. Abuse, including self-referral 
                  or fraudulent account creation, will result in account suspension and loss of bonuses.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">4. Disclaimers</h2>
                <p>
                  Great Sport Bets does not guarantee winnings. Past performance is not indicative of future results. 
                  Always gamble responsibly.
                </p>
              </section>

              <p className="text-sm text-gray-500 mt-8">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default TermsOfService;
