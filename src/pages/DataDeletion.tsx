import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, AlertTriangle, Mail } from "@/components/icons/gsb";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import PageTransition from "@/components/PageTransition";

const DataDeletion = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const email = "greatsportbets@gmail.com";

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
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="w-6 h-6 text-red-500" />
                <CardTitle className="text-2xl font-bold text-white">{t("legal.deletion.title")}</CardTitle>
              </div>
              <p className="text-sm text-gray-400">{t("legal.deletion.intro")}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-500 mb-1">{t("legal.deletion.warningTitle")}</h3>
                  <p className="text-sm text-gray-300">{t("legal.deletion.warningBody")}</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">{t("legal.deletion.howTitle")}</h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p className="text-sm">
                      <Trans
                        i18nKey="legal.deletion.step1"
                        values={{ email }}
                        components={{ email: <a href={`mailto:${email}`} className="text-primary hover:underline" /> }}
                      />
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p className="text-sm">{t("legal.deletion.step2")}</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p className="text-sm">{t("legal.deletion.step3")}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-white">{t("legal.deletion.deletedTitle")}</h2>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-400">
                  <li>{t("legal.deletion.deleted1")}</li>
                  <li>{t("legal.deletion.deleted2")}</li>
                  <li>{t("legal.deletion.deleted3")}</li>
                  <li>{t("legal.deletion.deleted4")}</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-white">{t("legal.deletion.keptTitle")}</h2>
                <p className="text-sm text-gray-400">{t("legal.deletion.keptBody")}</p>
              </section>

              <div className="pt-6 border-t border-zinc-800 flex justify-center">
                <a href={`mailto:${email}`}>
                  <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                    <Mail className="w-4 h-4" />
                    {t("legal.deletion.emailCta")}
                  </Button>
                </a>
              </div>

              <p className="text-xs text-gray-500 text-center mt-8">
                {t("legal.lastUpdated", { date: new Date().toLocaleDateString(locale) })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default DataDeletion;
