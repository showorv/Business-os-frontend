import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ModalContent, Modal } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useAdminPlans, useCreatePlan, useUpdatePlan, type AdminPlan, type PlanBody } from "./api";
import { PageTitle, useAdminFormat } from "./parts";

// The form keeps everything as text; a blank limit means "no limit".
interface Draft {
  key: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  priceMonthly: string;
  priceYearly: string;
  maxBusinesses: string;
  maxMembers: string;
  storageMb: string;
  aiEnabled: boolean;
  aiDailyTokens: string;
  isPublic: boolean;
  sortOrder: string;
}

const blank: Draft = {
  key: "",
  name: "",
  nameBn: "",
  description: "",
  descriptionBn: "",
  priceMonthly: "0",
  priceYearly: "0",
  maxBusinesses: "1",
  maxMembers: "",
  storageMb: "",
  aiEnabled: false,
  aiDailyTokens: "0",
  isPublic: true,
  sortOrder: "10",
};

const toDraft = (plan: AdminPlan): Draft => ({
  key: plan.key,
  name: plan.name,
  nameBn: plan.nameBn ?? "",
  description: plan.description ?? "",
  descriptionBn: plan.descriptionBn ?? "",
  priceMonthly: minorToInput(plan.priceMonthlyMinor, plan.currency),
  priceYearly: minorToInput(plan.priceYearlyMinor, plan.currency),
  maxBusinesses: plan.maxBusinesses === null ? "" : String(plan.maxBusinesses),
  maxMembers: plan.maxMembers === null ? "" : String(plan.maxMembers),
  storageMb: plan.storageMb === null ? "" : String(plan.storageMb),
  aiEnabled: plan.aiEnabled,
  aiDailyTokens: String(plan.aiDailyTokens),
  isPublic: plan.isPublic,
  sortOrder: String(plan.sortOrder),
});

const limitOf = (text: string) => (text.trim() === "" ? null : Number(text));

const PlanForm = ({ plan, onDone }: { plan: AdminPlan | null; onDone: () => void }) => {
  const { t } = useTranslation("admin");
  const [draft, setDraft] = useState<Draft>(plan ? toDraft(plan) : blank);
  const [problem, setProblem] = useState<string | null>(null);
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const isFree = plan?.key === "free";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const monthly = parseMoney(draft.priceMonthly, "BDT");
    const yearly = parseMoney(draft.priceYearly, "BDT");
    if (monthly === null || yearly === null) return setProblem(t("badPrice"));
    setProblem(null);
    const body: Omit<PlanBody, "key"> = {
      name: draft.name.trim(),
      nameBn: draft.nameBn.trim() || null,
      description: draft.description.trim() || null,
      descriptionBn: draft.descriptionBn.trim() || null,
      priceMonthlyMinor: monthly,
      priceYearlyMinor: yearly,
      maxBusinesses: limitOf(draft.maxBusinesses),
      maxMembers: limitOf(draft.maxMembers),
      storageMb: limitOf(draft.storageMb),
      aiEnabled: draft.aiEnabled,
      aiDailyTokens: Number(draft.aiDailyTokens) || 0,
      isPublic: draft.isPublic,
      sortOrder: Number(draft.sortOrder) || 0,
    };
    const done = () => (toast.success(t("planSaved")), onDone());
    if (plan) update.mutate({ planKey: plan.key, body }, { onSuccess: done });
    else create.mutate({ ...body, key: draft.key.trim() }, { onSuccess: done });
  };

  const number = (field: keyof Draft, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input inputMode="numeric" value={draft[field] as string} onChange={(event) => set(field, event.target.value.replace(/\D/g, "") as never)} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="plan-form">
      {!plan ? (
        <Field label={t("planKey")} hint={t("planKeyHint")}>
          <Input value={draft.key} required pattern="[a-z0-9-]{2,40}" onChange={(event) => set("key", event.target.value.toLowerCase())} />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("nameEn")}>
          <Input value={draft.name} required maxLength={60} onChange={(event) => set("name", event.target.value)} />
        </Field>
        <Field label={t("nameBn")}>
          <Input value={draft.nameBn} maxLength={60} onChange={(event) => set("nameBn", event.target.value)} />
        </Field>
        <Field label={t("descriptionEn")}>
          <Input value={draft.description} maxLength={300} onChange={(event) => set("description", event.target.value)} />
        </Field>
        <Field label={t("descriptionBn")}>
          <Input value={draft.descriptionBn} maxLength={300} onChange={(event) => set("descriptionBn", event.target.value)} />
        </Field>
        <Field label={t("priceMonthly")} hint={isFree ? t("freeStaysFree") : undefined}>
          <MoneyInput currency="BDT" value={draft.priceMonthly} disabled={isFree} onChange={(event) => set("priceMonthly", event.target.value)} />
        </Field>
        <Field label={t("priceYearly")}>
          <MoneyInput currency="BDT" value={draft.priceYearly} disabled={isFree} onChange={(event) => set("priceYearly", event.target.value)} />
        </Field>
        {number("maxBusinesses", t("maxBusinesses"), t("blankNoLimit"))}
        {number("maxMembers", t("maxMembers"), t("blankNoLimit"))}
        {number("storageMb", t("storageMb"), t("blankNoLimit"))}
        {number("aiDailyTokens", t("aiDailyTokens"))}
        {number("sortOrder", t("sortOrder"))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.aiEnabled} onChange={(event) => set("aiEnabled", event.target.checked)} className="size-4 accent-foreground" />
          {t("aiIncluded")}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.isPublic} onChange={(event) => set("isPublic", event.target.checked)} className="size-4 accent-foreground" />
          {t("shownOnPricing")}
        </label>
      </div>
      {plan && plan.workspaces > 0 ? <p className="text-sm text-muted-foreground">{t("planChangeWarning", { count: plan.workspaces })}</p> : null}
      {problem ? <Alert tone="danger">{problem}</Alert> : error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {t("savePlan")}
      </Button>
    </form>
  );
};

export const PlansPage = () => {
  const { t, i18n } = useTranslation(["admin", "billing"]);
  const { money, count } = useAdminFormat();
  const plans = useAdminPlans();
  const [editing, setEditing] = useState<AdminPlan | "new" | null>(null);
  const unlimited = t("billing:unlimited");
  const limit = (value: number | null) => (value === null ? unlimited : count(value));

  return (
    <div>
      <PageTitle
        title={t("nav_plans")}
        hint={t("plansHint")}
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            {t("addPlan")}
          </Button>
        }
      />
      {plans.isError ? <Alert tone="danger">{errorMessage(plans.error)}</Alert> : null}
      {plans.isLoading ? <Spinner className="mt-12" /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(plans.data ?? []).map((plan) => (
          <Card key={plan.key} className="flex flex-col gap-3 p-5" data-testid={`plan-${plan.key}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{i18n.language === "bn" && plan.nameBn ? plan.nameBn : plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.key}</p>
              </div>
              {plan.isPublic ? null : <Badge className="border bg-transparent">{t("hidden")}</Badge>}
            </div>
            <p className="text-lg font-semibold tabular-nums">
              {money(plan.priceMonthlyMinor, plan.currency)}
              <span className="text-sm font-normal text-muted-foreground"> {t("billing:perMonth")}</span>
            </p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t("billing:businesses")}</dt>
              <dd className="tabular-nums">{limit(plan.maxBusinesses)}</dd>
              <dt className="text-muted-foreground">{t("billing:people")}</dt>
              <dd className="tabular-nums">{limit(plan.maxMembers)}</dd>
              <dt className="text-muted-foreground">{t("billing:storage")}</dt>
              <dd className="tabular-nums">{plan.storageMb === null ? unlimited : `${count(plan.storageMb)} MB`}</dd>
              <dt className="text-muted-foreground">{t("assistant")}</dt>
              <dd>{plan.aiEnabled ? t("yes") : t("no")}</dd>
              <dt className="text-muted-foreground">{t("nav_workspaces")}</dt>
              <dd className="tabular-nums">{count(plan.workspaces)}</dd>
            </dl>
            <Button variant="outline" className="mt-auto" onClick={() => setEditing(plan)}>
              {t("edit")}
            </Button>
          </Card>
        ))}
      </div>
      <Modal open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null ? (
          <ModalContent title={editing === "new" ? t("addPlan") : t("editPlan", { name: editing.name })} className="max-h-[90dvh] max-w-2xl overflow-y-auto">
            <PlanForm plan={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
          </ModalContent>
        ) : null}
      </Modal>
    </div>
  );
};
