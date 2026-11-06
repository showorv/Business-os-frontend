import { Calendar, Check, ChevronDown } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatMonthRange } from "@/lib/months";
import { useFormatting } from "@/lib/preferences";
import type { MonthRange } from "./api";
import { PRESETS, type Preset } from "./period";

// Presets as rows (nobody wants to fight a calendar for "last 12 months"), the chosen one ticked,
// and a custom month range at the bottom.
export const PeriodPicker = ({ preset, range, onChoose }: { preset: Preset; range: MonthRange; onChoose: (preset: Preset, custom?: MonthRange) => void }) => {
  const { t } = useTranslation("analytics");
  const { locale, digitStyle } = useFormatting();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(range.fromMonth);
  const [to, setTo] = useState(range.toMonth);

  const applyCustom = (event: FormEvent) => {
    event.preventDefault();
    if (!from || !to) return;
    const [start, end] = from <= to ? [from, to] : [to, from];
    onChoose("custom", { fromMonth: start, toMonth: end });
    setOpen(false);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFrom(range.fromMonth);
          setTo(range.toMonth);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between gap-3" aria-label={t("period")}>
          <Calendar className="text-muted-foreground" />
          <span className="flex flex-col items-start leading-tight">
            <span className="font-medium">{t(`preset_${preset}`)}</span>
          </span>
          <span className="hidden text-muted-foreground sm:inline">{formatMonthRange(range.fromMonth, range.toMonth, locale, digitStyle)}</span>
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {PRESETS.filter((item) => item !== "custom").map((item) => (
          <DropdownMenuItem key={item} onSelect={() => onChoose(item)} className="justify-between">
            {t(`preset_${item}`)}
            {preset === item ? <Check className="size-4 stroke-[2.5]" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form onSubmit={applyCustom} className="space-y-2 p-2" onKeyDown={(event) => event.stopPropagation()}>
          <p className="text-xs font-medium text-muted-foreground">{t("customRange")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="month" aria-label={t("fromMonth")} value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 px-2 text-sm" />
            <Input type="month" aria-label={t("toMonth")} value={to} onChange={(event) => setTo(event.target.value)} className="h-9 px-2 text-sm" />
          </div>
          <Button type="submit" size="sm" className="w-full">
            {t("apply")}
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
