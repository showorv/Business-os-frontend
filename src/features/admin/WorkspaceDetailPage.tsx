import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { bytesText, storageText, UsageMeter } from "@/features/billing/parts";
import { errorMessage } from "@/lib/errors";
import { useFormatting } from "@/lib/preferences";
import { useAdminPlans, useSetSubscription, useSuspend, useWorkspace, type WorkspaceDetail } from "./api";
import { ActivityList } from "./ActivityPage";
import { Cell, StateBadge, Table, useAdminFormat } from "./parts";

type Choice = "GRANT" | "TRIAL" | "FREE";

// Gives a plan free until a date or for good, sets a trial, or moves the account to Free.
const ChangePlan = ({ workspace }: { workspace: WorkspaceDetail }) => {
  const { t } = useTranslation("admin");
  const plans = useAdminPlans();
  const change = useSetSubscription(workspace.id);
  const paidPlans = (plans.data ?? []).filter((plan) => plan.key !== "free");
  const [choice, setChoice] = useState<Choice>("GRANT");
  const [planKey, setPlanKey] = useState("pro");
  const [until, setUntil] = useState("");
  const [forever, setForever] = useState(false);
  const [note, setNote] = useState("");
  const needsDate = choice === "TRIAL" || (choice === "GRANT" && !forever);

  const save = () =>
    change.mutate(
      {
        planKey: choice === "FREE" ? "free" : planKey,
        source: choice,
        // The end of the chosen day in Bangladesh.
        endsAt: needsDate && until ? new Date(`${until}T23:59:59+06:00`).toISOString() : null,
        note: note.trim() || undefined,
      },
      { onSuccess: () => (toast.success(t("planChanged")), setNote("")) },
    );

  return (
    <Card className="space-y-4 p-5" data-testid="change-plan">
      <div>
        <h2 className="font-semibold">{t("changePlan")}</h2>
        <p className="text-sm text-muted-foreground">{t("changePlanHint")}</p>
      </div>
      <Segmented
        label={t("changePlan")}
        value={choice}
        onChange={setChoice}
        options={[
          { value: "GRANT", label: t("giveFree") },
          { value: "TRIAL", label: t("setTrial") },
          { value: "FREE", label: t("moveToFree") },
        ]}
      />
      {choice !== "FREE" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("plan")}>
            <Select value={planKey} onChange={(event) => setPlanKey(event.target.value)}>
              {paidPlans.map((plan) => (
                <option key={plan.key} value={plan.key}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("until")} hint={choice === "GRANT" ? undefined : t("trialNeedsDate")}>
            <Input type="date" value={until} disabled={!needsDate} onChange={(event) => setUntil(event.target.value)} />
          </Field>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("moveToFreeHint")}</p>
      )}
      {choice === "GRANT" ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={forever} onChange={(event) => setForever(event.target.checked)} className="size-4 accent-foreground" />
          {t("noEndDate")}
        </label>
      ) : null}
      <Field label={t("note")} hint={t("noteHint")}>
        <Input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
      </Field>
      {change.isError ? <Alert tone="danger">{errorMessage(change.error)}</Alert> : null}
      <Button onClick={save} disabled={change.isPending || (needsDate && !until)}>
        {t("savePlan")}
      </Button>
    </Card>
  );
};

const Suspend = ({ workspace }: { workspace: WorkspaceDetail }) => {
  const { t } = useTranslation("admin");
  const suspend = useSuspend(workspace.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { day } = useAdminFormat();
  if (workspace.suspendedAt) {
    return (
      <Alert tone="danger" className="flex flex-wrap items-center justify-between gap-3" data-testid="suspended-alert">
        <span>{t("suspendedSince", { date: day(workspace.suspendedAt), reason: workspace.suspendedReason ?? "" })}</span>
        <Button size="sm" variant="outline" disabled={suspend.isPending} onClick={() => suspend.mutate(null, { onSuccess: () => toast.success(t("unsuspended")) })}>
          {t("unsuspend")}
        </Button>
      </Alert>
    );
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {t("suspend")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("suspendTitle")}
        description={t("suspendBody")}
        confirmLabel={t("suspend")}
        danger
        pending={suspend.isPending}
        onConfirm={() => suspend.mutate(reason.trim(), { onSuccess: () => (setOpen(false), setReason(""), toast.success(t("suspendedDone"))) })}
      >
        <Field label={t("reason")} error={suspend.isError ? errorMessage(suspend.error) : undefined}>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} />
        </Field>
      </ConfirmDialog>
    </>
  );
};

export const WorkspaceDetailPage = () => {
  const { t } = useTranslation(["admin", "billing"]);
  const { workspaceId = "" } = useParams();
  const { locale } = useFormatting();
  const { money, day, count } = useAdminFormat();
  const workspace = useWorkspace(workspaceId);
  if (workspace.isLoading) return <Spinner className="mt-12" />;
  if (workspace.isError) return <Alert tone="danger">{errorMessage(workspace.error)}</Alert>;
  const data = workspace.data!;
  const plan = data.plan;
  const unlimited = t("billing:unlimited");
  const limitText = (value: number | null) => (value === null ? unlimited : count(value));

  return (
    <div className="space-y-6">
      <Link to="/admin/workspaces" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("nav_workspaces")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="workspace-owner">
            {data.owner?.name ?? data.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.owner?.email} · {t("joinedOn", { date: day(data.createdAt) })} · {data.owner?.mfaEnabled ? t("mfaOn") : t("mfaOff")}
          </p>
        </div>
        <Suspend workspace={data} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold" data-testid="workspace-plan">
              {plan.name}
            </span>
            <StateBadge state={data.state} />
            {data.subscription && (data.state === "grace" || data.state === "expired") ? <Badge className="border bg-transparent">{t(`source_${data.subscription.source}`)}</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {data.subscription?.endsAt ? t("endsOnDate", { date: day(data.subscription.endsAt) }) : t("noEnd")}
            {data.subscription?.note ? ` · ${data.subscription.note}` : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <UsageMeter label={t("billing:businesses")} used={data.usage.businesses} limit={plan.maxBusinesses} usedText={count(data.usage.businesses)} limitText={limitText(plan.maxBusinesses)} />
            <UsageMeter label={t("billing:people")} used={data.usage.members} limit={plan.maxMembers} usedText={count(data.usage.members)} limitText={limitText(plan.maxMembers)} />
            <UsageMeter
              label={t("billing:storage")}
              used={Number(data.usage.storageBytes) / 1024 / 1024}
              limit={plan.storageMb}
              usedText={bytesText(Number(data.usage.storageBytes), locale)}
              limitText={storageText(plan.storageMb, locale, unlimited)}
            />
            <UsageMeter label={t("billing:aiToday")} used={data.usage.aiTokensToday} limit={plan.aiEnabled ? plan.aiDailyTokens : 0} usedText={count(data.usage.aiTokensToday)} limitText={plan.aiEnabled ? count(plan.aiDailyTokens) : "—"} />
          </div>
        </Card>
        <ChangePlan workspace={data} />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">{t("businessesCol")}</h2>
        <Table head={[t("business"), t("status"), t("members"), t("created")]}>
          {data.businesses.map((business) => (
            <tr key={business.id}>
              <Cell className="font-medium">
                {business.name}
                {business.locked ? <Badge className="ml-2 border bg-transparent">{t("locked")}</Badge> : null}
              </Cell>
              <Cell>{t(`businessStatus_${business.status}`)}</Cell>
              <Cell className="tabular-nums">{count(business.members)}</Cell>
              <Cell className="tabular-nums text-muted-foreground">{day(business.createdAt)}</Cell>
            </tr>
          ))}
        </Table>
      </section>

      {data.payments.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold">{t("nav_payments")}</h2>
          <Table head={[t("date"), t("plan"), t("amount"), t("status"), t("receiptCol")]}>
            {data.payments.map((payment) => (
              <tr key={payment.id}>
                <Cell className="tabular-nums">{day(payment.paidAt ?? payment.createdAt)}</Cell>
                <Cell>
                  {payment.planName} · {t(`billing:${payment.billingCycle === "YEARLY" ? "oneYear" : "oneMonth"}`)}
                </Cell>
                <Cell className="tabular-nums">{money(payment.amountMinor, payment.currency)}</Cell>
                <Cell>{t(`billing:status_${payment.status}`)}</Cell>
                <Cell className="tabular-nums text-muted-foreground">{payment.receiptNumber ?? "—"}</Cell>
              </tr>
            ))}
          </Table>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">{t("adminChanges")}</h2>
        <ActivityList rows={data.history} />
      </section>
    </div>
  );
};
