// Repeating things (reminders, recurring transactions) are stored as a calendar rule (RRULE).
// People pick from a few plain choices; these turn a choice into a rule and a rule back into words.

export const REPEATS = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type Repeat = (typeof REPEATS)[number];

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

// A rule that repeats on the same weekday or day of the month as `date` (YYYY-MM-DD).
export const ruleFor = (repeat: Repeat, date: string) => {
  const day = new Date(`${date}T00:00:00Z`);
  if (repeat === "DAILY") return "FREQ=DAILY";
  if (repeat === "WEEKLY") return `FREQ=WEEKLY;BYDAY=${WEEKDAYS[day.getUTCDay()]}`;
  if (repeat === "MONTHLY") return `FREQ=MONTHLY;BYMONTHDAY=${day.getUTCDate()}`;
  if (repeat === "YEARLY") return "FREQ=YEARLY";
  return null;
};

// The plain choice a stored rule matches, or "CUSTOM" for one made some other way.
export const repeatOf = (rule: string | null | undefined): Repeat | "CUSTOM" => {
  if (!rule) return "NONE";
  const parts = Object.fromEntries(rule.replace(/^RRULE:/i, "").split(";").map((part) => part.split("=") as [string, string]));
  if (parts.INTERVAL && parts.INTERVAL !== "1") return "CUSTOM";
  if (parts.COUNT || parts.UNTIL) return "CUSTOM";
  const freq = parts.FREQ;
  if (freq === "DAILY" && Object.keys(parts).length === 1) return "DAILY";
  if (freq === "WEEKLY" && (!parts.BYDAY || /^[A-Z]{2}$/.test(parts.BYDAY))) return "WEEKLY";
  if (freq === "MONTHLY" && (!parts.BYMONTHDAY || /^-?\d+$/.test(parts.BYMONTHDAY))) return "MONTHLY";
  if (freq === "YEARLY") return "YEARLY";
  return "CUSTOM";
};
