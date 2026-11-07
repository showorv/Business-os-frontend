import { Bell, ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Business } from "@/features/businesses/api";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { addMonths, formatMonth } from "@/lib/months";
import { useFormatting } from "@/lib/preferences";
import { useCalendar, type CalendarItem } from "./api";

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

// Six weeks starting on the Saturday before the 1st, the way Bangladeshi calendars start the week.
const gridFor = (month: string) => {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -((weekday + 1) % 7));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

// A month at a glance: tasks by their due date and reminders by when they go off.
export const CalendarTab = ({ businessId, business, onOpenTask }: { businessId: string; business: Business; onOpenTask: (taskId: string) => void }) => {
  const { t } = useTranslation("tasks");
  const { locale, digitStyle } = useFormatting();
  const today = todayIn(business.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);
  const days = gridFor(month);
  const calendar = useCalendar(businessId, days[0]!, days[41]!);
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of calendar.data ?? []) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item]);
  const weekdays = days.slice(0, 7).map((day) => new Intl.DateTimeFormat(locale === "bn-BD" ? "bn-BD" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)));
  const dayNumber = (day: string) => Number(day.slice(8)).toLocaleString(locale === "bn-BD" && digitStyle === "bangla" ? "bn-BD" : "en-GB");
  const pickedItems = picked ? (byDay.get(picked) ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{formatMonth(month, locale, digitStyle, "long")}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setMonth(today.slice(0, 7))}>
            {t("today")}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("previousMonth")} onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("nextMonth")} onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      {calendar.isError ? <Alert tone="danger">{errorMessage(calendar.error)}</Alert> : null}
      <Card className={cn("overflow-hidden transition-opacity", calendar.isFetching && "opacity-70")}>
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
          {weekdays.map((name) => (
            <div key={name} className="py-2">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = byDay.get(day) ?? [];
            const inMonth = day.startsWith(month);
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setPicked(day === picked ? null : day)}
                aria-label={t("dayItems", { day, count: items.length })}
                aria-pressed={picked === day}
                className={cn(
                  "flex min-h-16 flex-col gap-1 border-r border-b p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/50 sm:min-h-24 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-muted/30 text-muted-foreground",
                  picked === day && "bg-muted ring-1 ring-foreground ring-inset",
                )}
              >
                <span className={cn("flex size-6 items-center justify-center rounded-full text-xs tabular-nums", isToday && "bg-foreground font-semibold text-background")}>{dayNumber(day)}</span>
                {/* Titles on wider screens, dots on phones. */}
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {items.slice(0, 3).map((item) => (
                    <span key={`${item.kind}-${item.id}-${item.at}`} className={cn("truncate rounded px-1.5 py-0.5 text-[11px] leading-4", item.kind === "TASK" ? "bg-foreground text-background" : "border")}>
                      {item.title}
                    </span>
                  ))}
                  {items.length > 3 ? <span className="px-1 text-[11px] text-muted-foreground">{t("moreItems", { count: items.length - 3 })}</span> : null}
                </span>
                {items.length > 0 ? (
                  <span className="flex gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((item) => (
                      <span key={`${item.kind}-${item.id}-${item.at}`} className={cn("size-1.5 rounded-full", item.kind === "TASK" ? "bg-foreground" : "border border-foreground")} />
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-foreground" />
          {t("legendTask")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-foreground" />
          {t("legendReminder")}
        </span>
      </div>

      {picked ? (
        <Card className="p-4" data-testid="day-details">
          <p className="text-sm font-semibold">{new Intl.DateTimeFormat(locale === "bn-BD" ? "bn-BD" : "en-GB", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${picked}T00:00:00Z`))}</p>
          {pickedItems.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">{t("nothingThisDay")}</p> : null}
          <ul className="mt-2 space-y-1">
            {pickedItems.map((item) => (
              <li key={`${item.kind}-${item.id}-${item.at}`}>
                {item.kind === "TASK" ? (
                  <button type="button" onClick={() => onOpenTask(item.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                    <ListChecks className="size-4 shrink-0" />
                    <span className="flex-1 truncate font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{new Intl.DateTimeFormat(locale === "bn-BD" ? "bn-BD" : "en-GB", { timeStyle: "short" }).format(new Date(item.at))}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <Bell className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{new Intl.DateTimeFormat(locale === "bn-BD" ? "bn-BD" : "en-GB", { timeStyle: "short" }).format(new Date(item.at))}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
};
