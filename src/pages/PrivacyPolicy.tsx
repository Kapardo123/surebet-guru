import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "@/components/icons/gsb";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTransition from "@/components/PageTransition";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en";

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
            {t("legal.back")}
          </Button>

          <Card className="bg-zinc-900/50 border-zinc-800 text-gray-300">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">{t("legal.privacy.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h2 className="text-xl font-semibold text-white mb-2">{t("legal.privacy.s1Title")}</h2>
                <p>{t("legal.privacy.s1Body")}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">{t("legal.privacy.s2Title")}</h2>
                <p>{t("legal.privacy.s2Body")}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">{t("legal.privacy.s3Title")}</h2>
                <p>{t("legal.privacy.s3Body")}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-2">{t("legal.privacy.s4Title")}</h2>
                <p>{t("legal.privacy.s4Body")}</p>
              </section>

              <p className="text-sm text-gray-500 mt-8">
                {t("legal.lastUpdated", { date: new Date().toLocaleDateString(locale) })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default PrivacyPolicy;
