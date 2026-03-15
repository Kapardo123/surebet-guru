import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, AlertTriangle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";

const DataDeletion = () => {
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
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="w-6 h-6 text-red-500" />
                <CardTitle className="text-2xl font-bold text-white">Account & Data Deletion</CardTitle>
              </div>
              <p className="text-sm text-gray-400">
                At Great Sport Bets, we respect your privacy and provide a clear path to delete your account and personal data.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-500 mb-1">Important: Permanent Action</h3>
                  <p className="text-sm text-gray-300">
                    Deleting your account is permanent. You will lose access to your Premium status, referral bonuses, and history. This action cannot be undone.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">How to request deletion</h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p className="text-sm">
                      Send an email to <a href="mailto:greatsportbets@gmail.com" className="text-primary hover:underline">greatsportbets@gmail.com</a> from the email address associated with your Great Sport Bets account.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p className="text-sm">
                      Include "Account Deletion Request" in the subject line.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p className="text-sm">
                      Your request will be processed within 7 business days. You will receive a confirmation email once the deletion is complete.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-white">What data will be deleted?</h2>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                  <li>Email address and authentication profile</li>
                  <li>Premium access records and payment history</li>
                  <li>Referral links, codes, and history</li>
                  <li>User settings and preferences</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-white">What data is kept?</h2>
                <p className="text-sm text-gray-400">
                  For legal and financial compliance (e.g., tax reporting for Stripe payments), we may retain transaction IDs and metadata for up to 5 years. This data is disconnected from your personal identity and used only for auditing.
                </p>
              </section>

              <div className="pt-6 border-t border-zinc-800 flex justify-center">
                <a href="mailto:greatsportbets@gmail.com">
                  <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                    <Mail className="w-4 h-4" />
                    Email Deletion Request
                  </Button>
                </a>
              </div>

              <p className="text-xs text-gray-500 text-center mt-8">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default DataDeletion;
