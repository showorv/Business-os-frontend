import { Check, Clock, Copy, Mail, MessageCircle, Phone } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { MANUAL_METHODS, paymentPlanName, useCancelClaim, useClaimPayment, type BillingCycle, type ManualInfo, type ManualMethod, type Payment } from "./api";
import { priceText } from "./parts";

// Paying by hand, while there's no online payment: send the money the usual way (bKash, Nagad, Rocket or a
// bank), then tell us the transaction ID here. The admin checks it arrived and Pro starts.

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const { t } = useTranslation("billing");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} aria-label={label}>
      {copied ? <Check /> : <Copy />}
      <span className="hidden sm:inline">{copied ? t("copied") : t("copy")}</span>
    </Button>
  );
};

// WhatsApp, phone and email, whichever the admin filled in.
export const ContactLinks = ({ info }: { info: Pick<ManualInfo, "whatsapp" | "phone" | "email"> }) => {
  const { t } = useTranslation("billing");
  const digits = info.whatsapp.replace(/\D/g, "");
  const links = [
    digits ? { href: `https://wa.me/${digits}`, icon: MessageCircle, label: t("contactWhatsapp"), text: info.whatsapp, external: true } : null,
    info.phone ? { href: `tel:${info.phone.replace(/[^\d+]/g, "")}`, icon: Phone, label: t("contactPhone"), text: info.phone, external: false } : null,
    info.email ? { href: `mailto:${info.email}`, icon: Mail, label: t("contactEmail"), text: info.email, external: false } : null,
  ].filter((link) => link !== null);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="pay-contact">
      {links.map((link) => (
        <Button key={link.href} asChild variant="outline" size="sm">
          <a href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined} aria-label={`${link.label}: ${link.text}`}>
            <link.icon />
            {link.label}
          </a>
        </Button>
      ))}
    </div>
  );
};

const Step = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h3 className="flex items-center gap-2.5 text-sm font-semibold">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-background">{n}</span>
      {title}
    </h3>
    <div className="pl-8.5">{children}</div>
  </section>
);

interface ManualPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: ManualInfo;
  planKey: string;
  planLabel: string;
  cycle: BillingCycle;
  // What it costs, after any coupon, in poisha.
  amountMinor: string;
  currency: string;
  couponCode?: string;
  // When online payment works too, the person can still go that way.
  onPayOnline?: () => void;
}

export const ManualPayDialog = ({ open, onOpenChange, info, planKey, planLabel, cycle, amountMinor, currency, couponCode, onPayOnline }: ManualPayDialogProps) => {
  const { t, i18n } = useTranslation("billing");
  const { digitStyle } = useFormatting();
  const claim = useClaimPayment();
  const offered = info.methods.length > 0 ? [...new Set(info.methods.map((item) => item.method))] : MANUAL_METHODS;
  const [method, setMethod] = useState<ManualMethod>(offered[0]!);
  const [reference, setReference] = useState("");
  const amount = priceText(amountMinor, currency, digitStyle);
  const note = (i18n.language.startsWith("bn") && info.noteBn) || info.noteEn;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    claim.mutate(
      { planKey, billingCycle: cycle, couponCode, method, reference: reference.trim() },
      {
        onSuccess: () => {
          toast.success(t("claimSent"));
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={t("manualTitle", { plan: planLabel })}
        description={t("manualIntro", { amount, plan: planLabel, period: t(cycle === "YEARLY" ? "oneYear" : "oneMonth") })}
        className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
      >
        <div className="space-y-6" data-testid="manual-pay">
          <Step n={1} title={t("stepSend", { amount })}>
            {info.methods.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {info.methods.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 px-3 py-2.5" data-testid="pay-method">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t(`method_${item.method}`)}</p>
                      <p className="text-sm break-words text-muted-foreground">{item.details}</p>
                    </div>
                    <CopyButton text={item.details} label={t("copyWhat", { what: t(`method_${item.method}`) })} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noMethods")}</p>
            )}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{t("yourReference")}</p>
                <p className="font-mono text-sm font-semibold tracking-wide" data-testid="pay-reference">
                  {info.reference}
                </p>
              </div>
              <CopyButton text={info.reference} label={t("copyWhat", { what: t("yourReference") })} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("referenceHint")}</p>
          </Step>

          <Step n={2} title={t("stepTell")}>
            <form onSubmit={submit} className="space-y-4">
              <Field label={t("paidWith")}>
                <Select value={method} onChange={(event) => setMethod(event.target.value as ManualMethod)}>
                  {offered.map((value) => (
                    <option key={value} value={value}>
                      {t(`method_${value}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("transactionId")} hint={t(method === "bank" ? "transactionIdHintBank" : "transactionIdHint")}>
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  required
                  minLength={4}
                  maxLength={60}
                  autoComplete="off"
                  className="font-mono"
                  placeholder={method === "bank" ? "" : "8AB3CD9EF1"}
                />
              </Field>
              {claim.isError ? <Alert tone="danger">{errorMessage(claim.error)}</Alert> : null}
              <Button type="submit" className="w-full" disabled={claim.isPending || reference.trim().length < 4}>
                {t("iHavePaid", { amount })}
              </Button>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Clock className="mt-0.5 size-3.5 shrink-0" />
                {t("whatNext")}
              </p>
            </form>
          </Step>

          {note || info.whatsapp || info.phone || info.email ? (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">{t("questions")}</p>
              {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
              <ContactLinks info={info} />
            </div>
          ) : null}

          {onPayOnline ? (
            <div className="border-t pt-4 text-center">
              <Button variant="link" onClick={onPayOnline}>
                {t("payOnlineInstead")}
              </Button>
            </div>
          ) : null}
        </div>
      </ModalContent>
    </Modal>
  );
};

// At the top of the Plan page while the admin hasn't checked the payment yet.
export const PendingPayment = ({ payment, info }: { payment: Payment; info: ManualInfo | null }) => {
  const { t, i18n } = useTranslation("billing");
  const { locale, digitStyle } = useFormatting();
  const cancel = useCancelClaim(() => toast.success(t("claimCancelled")));
  return (
    <Card className="space-y-3 border-foreground p-5" data-testid="pending-payment">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Clock className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{t("pendingTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("pendingBody", {
              amount: priceText(payment.amountMinor, payment.currency, digitStyle),
              method: t(`method_${payment.method}`, { defaultValue: payment.method ?? "" }),
              reference: payment.gatewayRef,
              plan: paymentPlanName(payment, i18n.language),
              period: t(payment.billingCycle === "YEARLY" ? "oneYear" : "oneMonth"),
              when: formatDateTime(payment.createdAt, locale, digitStyle),
            })}
          </p>
          <p className="text-sm text-muted-foreground">{t("pendingNext")}</p>
        </div>
      </div>
      {cancel.isError ? <Alert tone="danger">{errorMessage(cancel.error)}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2 pl-12">
        <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(payment.id)}>
          {t("takeBack")}
        </Button>
        {info ? <ContactLinks info={info} /> : null}
      </div>
    </Card>
  );
};
