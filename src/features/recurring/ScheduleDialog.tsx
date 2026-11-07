import { Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { Business } from "@/features/businesses/api";
import { useAccounts, useCategories } from "@/features/finance/api";
import { categoryName } from "@/features/finance/names";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { useFormatting } from "@/lib/preferences";
import { ruleFor } from "@/lib/repeat";
import { useCreateSchedule } from "./api";
import { describeRepeat, SCHEDULE_REPEATS, type ScheduleRepeat } from "./parts";

type Kind = "TRANSACTION" | "SALARY";
type Type = "INCOME" | "EXPENSE" | "TRANSFER";

export const REMIND_DAYS = [0, 1, 3, 7] as const;

// A new repeating transaction or salary. Only the parts that change between kinds are shown.
export const ScheduleDialog = ({ businessId, business, canPost, onClose, onCreated }: { businessId: string; business: Business; canPost: boolean; onClose: () => void; onCreated: (id: string) => void }) => {
  const { t } = useTranslation(["recurring", "finance", "common"]);
  const { locale, digitStyle } = useFormatting();
  const accounts = useAccounts(businessId);
  const categories = useCategories(businessId);
  const create = useCreateSchedule(businessId);
  const today = todayIn(business.timezone);
  const [kind, setKind] = useState<Kind>("TRANSACTION");
  const [type, setType] = useState<Type>("EXPENSE");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [repeat, setRepeat] = useState<ScheduleRepeat>("MONTHLY");
  const [startDate, setStartDate] = useState(today);
  const [autoPost, setAutoPost] = useState(false);
  const [remind, setRemind] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const usable = (accounts.data ?? []).filter((account) => account.isActive);
  const account = usable.find((item) => item.id === accountId);
  const currency = account?.currency ?? business.baseCurrency;
  const salary = kind === "SALARY";
  const transfer = !salary && type === "TRANSFER";
  const choices = (categories.data ?? [])
    .filter((category) => category.isActive && category.type === (type === "INCOME" ? "INCOME" : "EXPENSE"))
    .sort((a, b) => categoryName(a, locale).localeCompare(categoryName(b, locale)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amountMinor = parseMoney(amount, currency);
    if (!name.trim() || !accountId) return setProblem(t("recurring:incomplete"));
    if (!amountMinor || amountMinor === "0") return setProblem(t("recurring:amountNeeded"));
    if (transfer && (!toAccountId || toAccountId === accountId)) return setProblem(t("recurring:toAccountNeeded"));
    if (!salary && !transfer && !categoryId) return setProblem(t("recurring:categoryNeeded"));
    if (startDate < today) return setProblem(t("recurring:startInPast"));
    setProblem(null);
    create.mutate(
      {
        name: name.trim(),
        kind,
        ...(salary ? {} : { type }),
        rrule: ruleFor(repeat, startDate)!,
        startDate,
        timezone: business.timezone,
        accountId,
        ...(transfer ? { toAccountId } : {}),
        ...(!salary && !transfer ? { categoryId } : {}),
        amountMinor,
        autoPost: canPost && autoPost,
        ...(remind !== "" ? { remindDaysBefore: Number(remind) } : {}),
      },
      {
        onSuccess: (schedule) => {
          toast.success(t("recurring:added"));
          onClose();
          onCreated(schedule.id);
        },
      },
    );
  };

  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={t("recurring:newSchedule")} description={t("recurring:newScheduleHint")} className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto">
        {!accounts.data || !categories.data ? (
          <Spinner className="my-10" />
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {problem ? <Alert tone="danger">{problem}</Alert> : null}
            {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
            <Segmented
              label={t("recurring:kind")}
              value={kind}
              onChange={setKind}
              className="flex w-full"
              options={[
                { value: "TRANSACTION", label: t("recurring:kind_TRANSACTION") },
                { value: "SALARY", label: t("recurring:kind_SALARY") },
              ]}
            />
            {salary ? <p className="text-sm text-muted-foreground">{t("recurring:salaryHint")}</p> : null}
            <Field label={t("recurring:name")}>
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder={t(salary ? "recurring:salaryPlaceholder" : "recurring:namePlaceholder")} />
            </Field>
            {!salary ? (
              <Segmented
                label={t("recurring:type")}
                value={type}
                onChange={(next) => {
                  setType(next);
                  setCategoryId("");
                }}
                className="flex w-full"
                options={(["EXPENSE", "INCOME", "TRANSFER"] as const).map((value) => ({ value, label: t(`finance:type_${value}`) }))}
              />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={transfer ? t("recurring:fromAccount") : salary ? t("recurring:payFrom") : t("finance:account")}>
                <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                  <option value="">{t("recurring:choose")}</option>
                  {usable.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {transfer ? (
                <Field label={t("recurring:toAccount")}>
                  <Select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
                    <option value="">{t("recurring:choose")}</option>
                    {usable
                      .filter((item) => item.id !== accountId && item.currency === currency)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </Select>
                </Field>
              ) : !salary ? (
                <Field label={t("finance:category")}>
                  <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                    <option value="">{t("recurring:choose")}</option>
                    {choices.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryName(category, locale)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label={t("recurring:amount")}>
                <MoneyInput currency={currency} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
              </Field>
              <Field label={t("recurring:repeats")}>
                <Select value={repeat} onChange={(event) => setRepeat(event.target.value as ScheduleRepeat)}>
                  {SCHEDULE_REPEATS.map((value) => (
                    <option key={value} value={value}>
                      {t(`recurring:repeat_${value}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("recurring:startDate")}>
                <Input type="date" value={startDate} min={today} onChange={(event) => setStartDate(event.target.value)} />
              </Field>
              <Field label={t("recurring:remindMe")}>
                <Select value={remind} onChange={(event) => setRemind(event.target.value)}>
                  <option value="">{t("recurring:noReminder")}</option>
                  {REMIND_DAYS.map((days) => (
                    <option key={days} value={days}>
                      {t("recurring:daysBefore", { count: days })}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {startDate ? <p className="rounded-md bg-muted px-3 py-2 text-sm">{describeRepeat(t, repeat, startDate, locale, digitStyle)}</p> : null}
            {canPost ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-checked:border-foreground">
                <input type="checkbox" checked={autoPost} onChange={(event) => setAutoPost(event.target.checked)} className="mt-0.5 size-4 accent-foreground" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Zap className="size-3.5" />
                    {t("recurring:autoPost")}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t("recurring:autoPostHint")}</span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">{t("recurring:draftsOnly")}</p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {t("recurring:addSchedule")}
              </Button>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};
