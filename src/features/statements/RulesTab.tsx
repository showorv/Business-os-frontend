import { MoreHorizontal, Plus, Wand2, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useMoney } from "@/features/businesses/useMoney";
import { useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { minorToInput, parseMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { useCreateRule, useDeleteRule, useRules, useUpdateRule, type Rule } from "./api";
import { Toggle } from "./parts";

// Rules sort new lines by their text, so the same supplier never needs reviewing twice.
export const RulesTab = ({ businessId, business, canWrite, canPost }: { businessId: string; business: Business; canWrite: boolean; canPost: boolean }) => {
  const { t } = useTranslation("statements");
  const money = useMoney();
  const { locale } = useFormatting();
  const rules = useRules(businessId);
  const categories = useCategories(businessId);
  const update = useUpdateRule(businessId);
  const remove = useDeleteRule(businessId);
  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const categoryOf = (id: string) => categoryName(categories.data?.find((category) => category.id === id), locale);
  const list = rules.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("rulesHint")}</p>
        {canWrite && list.length > 0 ? (
          <Button variant="outline" onClick={() => setEditing("new")}>
            <Plus />
            {t("newRule")}
          </Button>
        ) : null}
      </div>

      {rules.isError ? <Alert tone="danger">{errorMessage(rules.error)}</Alert> : null}
      {rules.isLoading ? <Spinner className="mt-12" /> : null}
      {rules.isSuccess && list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wand2}
            title={t("noRules")}
            body={t("noRulesHint")}
            action={
              canWrite ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus />
                  {t("newRule")}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : null}

      {list.length > 0 ? (
        <Card className="overflow-hidden">
          <ol className="divide-y">
            {list.map((rule, index) => (
              <li key={rule.id} className={cn("flex items-start gap-3 px-4 py-4 sm:items-center sm:gap-4 sm:px-5", !rule.isActive && "opacity-60")}>
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs sm:mt-0" title={t("priorityN", { n: rule.priority })}>
                  {(index + 1).toLocaleString(locale)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{rule.name}</p>
                    {rule.autoPost ? (
                      <Badge className="gap-1 bg-foreground text-background">
                        <Zap className="size-3" />
                        {t("autoPosts")}
                      </Badge>
                    ) : null}
                    {!rule.isActive ? <Badge>{t("paused")}</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t(rule.direction === "IN" ? "ruleSentenceIn" : "ruleSentenceOut", { text: rule.containsText, category: categoryOf(rule.categoryId) })}
                    {rule.maxAmountMinor ? ` ${t("ruleUpTo", { amount: money(rule.maxAmountMinor, business.baseCurrency) })}` : ""}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Toggle
                      checked={rule.isActive}
                      label={t("ruleActive", { name: rule.name })}
                      disabled={update.isPending}
                      onChange={(isActive) =>
                        update.mutate({ ruleId: rule.id, isActive }, { onSuccess: () => toast.success(t(isActive ? "ruleOn" : "ruleOff")), onError: (error) => toast.error(errorMessage(error)) })
                      }
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t("ruleOptions", { name: rule.name })}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(rule)}>{t("edit")}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleting(rule)} className="text-danger">
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {editing ? (
        <RuleDialog businessId={businessId} business={business} canPost={canPost} rule={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteRuleTitle", { name: deleting?.name ?? "" })}
        description={t("deleteRuleBody")}
        confirmLabel={t("delete")}
        danger
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              toast.success(t("ruleDeleted"));
            },
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </div>
  );
};

interface RuleStart {
  name: string;
  containsText: string;
  direction: "IN" | "OUT";
}

// Adds a rule, edits one, or starts one from a statement line.
export const RuleDialog = ({
  businessId,
  business,
  canPost,
  rule,
  start,
  onClose,
}: {
  businessId: string;
  business: Business;
  canPost: boolean;
  rule?: Rule;
  start?: RuleStart;
  onClose: () => void;
}) => {
  const { t } = useTranslation(["statements", "common"]);
  const { locale } = useFormatting();
  const categories = useCategories(businessId);
  const create = useCreateRule(businessId);
  const update = useUpdateRule(businessId);
  const [name, setName] = useState(rule?.name ?? start?.name.slice(0, 120) ?? "");
  const [text, setText] = useState(rule?.containsText ?? start?.containsText ?? "");
  const [direction, setDirection] = useState<"IN" | "OUT">(rule?.direction ?? start?.direction ?? "OUT");
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [maxAmount, setMaxAmount] = useState(rule?.maxAmountMinor ? minorToInput(rule.maxAmountMinor, business.baseCurrency) : "");
  const [priority, setPriority] = useState(String(rule?.priority ?? 100));
  const [autoPost, setAutoPost] = useState(rule?.autoPost ?? false);
  const [problem, setProblem] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const usable = (categories.data ?? []).filter((category) => category.type === (direction === "IN" ? "INCOME" : "EXPENSE") && (category.isActive || category.id === categoryId));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const maxAmountMinor = maxAmount.trim() ? parseMoney(maxAmount, business.baseCurrency) : null;
    const order = Number(priority);
    if (!name.trim() || !text.trim() || !categoryId) return setProblem(t("ruleIncomplete"));
    if (maxAmount.trim() && (!maxAmountMinor || maxAmountMinor === "0")) return setProblem(t("ruleBadAmount"));
    if (!Number.isInteger(order) || order < 0 || order > 10_000) return setProblem(t("ruleBadPriority"));
    setProblem(null);
    const body = { name: name.trim(), containsText: text.trim(), categoryId, priority: order, autoPost: canPost && autoPost };
    const done = { onSuccess: () => (toast.success(t(rule ? "ruleSaved" : "ruleAdded")), onClose()) };
    if (rule) update.mutate({ ruleId: rule.id, ...body, maxAmountMinor }, done);
    else create.mutate({ ...body, direction, ...(maxAmountMinor ? { maxAmountMinor } : {}) }, done);
  };

  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={rule ? t("editRule") : t("newRule")} description={t("ruleDialogHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {error ? <Alert tone="danger">{errorMessage(error)}</Alert> : null}
          <Field label={t("ruleName")}>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder={t("ruleNamePlaceholder")} />
          </Field>
          {!rule ? (
            <Segmented
              label={t("direction")}
              value={direction}
              onChange={(next) => {
                setDirection(next);
                setCategoryId("");
              }}
              className="flex w-full"
              options={[
                { value: "OUT", label: t("moneyOut") },
                { value: "IN", label: t("moneyIn") },
              ]}
            />
          ) : null}
          <Field label={t("whenContains")} hint={t("whenContainsHint")}>
            <Input value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={t("whenContainsPlaceholder")} />
          </Field>
          <Field label={t("thenCategory")}>
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">{t("pickCategory")}</option>
              {usable.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryName(category, locale)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("upTo")} hint={t("upToHint")}>
              <MoneyInput currency={business.baseCurrency} value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder={t("anyAmount")} inputMode="decimal" />
            </Field>
            <Field label={t("priority")} hint={t("priorityHint")}>
              <Input type="number" min={0} max={10000} value={priority} onChange={(event) => setPriority(event.target.value)} inputMode="numeric" />
            </Field>
          </div>
          {canPost ? (
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <input type="checkbox" checked={autoPost} onChange={(event) => setAutoPost(event.target.checked)} className="mt-0.5 size-4 accent-foreground" />
              <span>
                <span className="font-medium">{t("autoPost")}</span>
                <span className="block text-muted-foreground">{t("autoPostHint")}</span>
              </span>
            </label>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {rule ? t("common:save") : t("addRule")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
