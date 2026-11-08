import { useTranslation } from "react-i18next";
import { brand } from "@/config/brand";
import { formatDate } from "@/lib/dates";
import { toBanglaDigits } from "@/lib/money";
import { PRIVACY, TERMS } from "./legal";
import { useGuestDigits } from "./parts";

// The terms of use or the privacy policy, in the reader's language.
export const LegalPage = ({ page }: { page: "terms" | "privacy" }) => {
  const { t, i18n } = useTranslation("public");
  const digitStyle = useGuestDigits();
  const document = page === "terms" ? TERMS : PRIVACY;
  const bangla = i18n.language.startsWith("bn");
  const sections = bangla ? document.sections.bn : document.sections.en;

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 md:py-16">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">{t(`${page}_title`)}</h1>
        <p className="text-sm text-muted-foreground">{t("legal_updated", { date: formatDate(document.updated, bangla ? "bn-BD" : "en", digitStyle) })}</p>
        <p className="text-sm text-muted-foreground">{t("legal_draft")}</p>
      </header>
      <ol className="space-y-7">
        {sections.map((section, index) => (
          <li key={section.title} className="space-y-2">
            <h2 className="text-lg font-semibold">
              <span className="mr-2 text-muted-foreground tabular-nums">{bangla ? toBanglaDigits(String(index + 1)) : index + 1}.</span>
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </li>
        ))}
      </ol>
      {brand.contactEmail ? (
        <p className="border-t pt-6 text-sm text-muted-foreground">
          {t("legal_contact", { email: brand.contactEmail })}
        </p>
      ) : null}
    </article>
  );
};
