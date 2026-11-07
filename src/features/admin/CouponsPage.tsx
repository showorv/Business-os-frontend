import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { useAdminPlans, useCoupons, useCreateCoupon, useUpdateCoupon, type Coupon } from "./api";
import { Cell, PageTitle, Table, useAdminFormat } from "./parts";

const CouponForm = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation("admin");
  const plans = useAdminPlans();
  const create = useCreateCoupon();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [percent, setPercent] = useState("20");
  const [amount, setAmount] = useState("");
  const [planKeys, setPlanKeys] = useState<string[]>([]);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [until, setUntil] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const paidPlans = (plans.data ?? []).filter((plan) => plan.key !== "free");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amountMinor = kind === "amount" ? parseMoney(amount, "BDT") : null;
    if (kind === "amount" && (amountMinor === null || amountMinor === "0")) return setProblem(t("badPrice"));
    setProblem(null);
    create.mutate(
      {
        code: code.trim(),
        description: description.trim() || null,
        percentOff: kind === "percent" ? Number(percent) : null,
        amountOffMinor: amountMinor,
        planKeys,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expiresAt: until ? new Date(`${until}T23:59:59+06:00`).toISOString() : null,
      },
      { onSuccess: () => (toast.success(t("couponCreated")), onDone()) },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="coupon-form">
      <Field label={t("couponCode")} hint={t("couponCodeHint")}>
        <Input value={code} required pattern="[A-Za-z0-9-]{3,40}" onChange={(event) => setCode(event.target.value.toUpperCase())} />
      </Field>
      <Field label={t("couponDescription")}>
        <Input value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Segmented
        label={t("discount")}
        value={kind}
        onChange={setKind}
        options={[
          { value: "percent", label: t("percentOff") },
          { value: "amount", label: t("amountOff") },
        ]}
      />
      {kind === "percent" ? (
        <Field label={t("percentOff")}>
          <Input type="number" min={1} max={100} required value={percent} onChange={(event) => setPercent(event.target.value)} />
        </Field>
      ) : (
        <Field label={t("amountOff")}>
          <MoneyInput currency="BDT" required value={amount} onChange={(event) => setAmount(event.target.value)} />
        </Field>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("forPlans")}</legend>
        <p className="text-xs text-muted-foreground">{t("forPlansHint")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {paidPlans.map((plan) => (
            <label key={plan.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-foreground"
                checked={planKeys.includes(plan.key)}
                onChange={(event) => setPlanKeys((keys) => (event.target.checked ? [...keys, plan.key] : keys.filter((key) => key !== plan.key)))}
              />
              {plan.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("maxRedemptions")} hint={t("blankNoLimit")}>
          <Input inputMode="numeric" value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label={t("expiresOn")} hint={t("blankNoEnd")}>
          <Input type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
        </Field>
      </div>
      {problem ? <Alert tone="danger">{problem}</Alert> : create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
      <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
        {t("createCoupon")}
      </Button>
    </form>
  );
};

export const CouponsPage = () => {
  const { t } = useTranslation("admin");
  const { money, day, count } = useAdminFormat();
  const coupons = useCoupons();
  const update = useUpdateCoupon();
  const [adding, setAdding] = useState(false);
  const discount = (coupon: Coupon) => (coupon.percentOff !== null ? `${count(coupon.percentOff)}%` : money(coupon.amountOffMinor ?? "0"));

  return (
    <div>
      <PageTitle
        title={t("nav_coupons")}
        hint={t("couponsHint")}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            {t("addCoupon")}
          </Button>
        }
      />
      {coupons.isError ? <Alert tone="danger">{errorMessage(coupons.error)}</Alert> : null}
      {update.isError ? <Alert tone="danger">{errorMessage(update.error)}</Alert> : null}
      {coupons.isLoading ? <Spinner className="mt-12" /> : null}
      {coupons.data ? (
        coupons.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noCoupons")}</p>
        ) : (
          <Table head={[t("couponCode"), t("discount"), t("forPlans"), t("used"), t("expiresOn"), ""]} testId="coupons-table">
            {coupons.data.map((coupon) => (
              <tr key={coupon.id} className={coupon.active ? undefined : "text-muted-foreground"}>
                <Cell>
                  <span className="font-mono font-medium">{coupon.code}</span>
                  {coupon.active ? null : <Badge className="ml-2 border bg-transparent">{t("off")}</Badge>}
                  {coupon.description ? <span className="block text-xs text-muted-foreground">{coupon.description}</span> : null}
                </Cell>
                <Cell className="tabular-nums">{discount(coupon)}</Cell>
                <Cell>{coupon.planKeys.length ? coupon.planKeys.join(", ") : t("allPlans")}</Cell>
                <Cell className="tabular-nums">
                  {count(coupon.redemptions)}
                  {coupon.maxRedemptions !== null ? ` / ${count(coupon.maxRedemptions)}` : ""}
                </Cell>
                <Cell className="tabular-nums">{day(coupon.expiresAt)}</Cell>
                <Cell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({ couponId: coupon.id, body: { active: !coupon.active } }, { onSuccess: () => toast.success(coupon.active ? t("couponOff") : t("couponOn")) })
                    }
                  >
                    {coupon.active ? t("turnOff") : t("turnOn")}
                  </Button>
                </Cell>
              </tr>
            ))}
          </Table>
        )
      ) : null}
      <Modal open={adding} onOpenChange={setAdding}>
        {adding ? (
          <ModalContent title={t("addCoupon")} className="max-h-[90dvh] max-w-lg overflow-y-auto">
            <CouponForm onDone={() => setAdding(false)} />
          </ModalContent>
        ) : null}
      </Modal>
    </div>
  );
};
