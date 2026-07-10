import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";

const PrivacyPolicy = () => {
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
              <CardTitle className="text-2xl font-bold text-white">Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h2 className="text-xl font-semibold text-white mb-2">1. Information We Collect</h2>
                <p>
                  Great Sport Bets collects minimal personal information necessary for account creation and premium access, 
                  including email addresses and payment details processed securely via Stripe.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">2. How We Use Information</h2>
                <p>
                  We use your information to provide access to our betting tips, process payments, and manage the referral system. 
                  We do not sell your personal data to third parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">3. Data Security</h2>
                <p>
                  We implement industry-standard security measures via Supabase and Stripe to protect your data. 
                  However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">4. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us within the app.
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

export default PrivacyPolicy;
