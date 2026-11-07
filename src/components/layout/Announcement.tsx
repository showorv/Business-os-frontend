import { Megaphone, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAnnouncement } from "@/features/admin/api";
import { cn } from "@/lib/cn";

// Remembers which message someone closed, so a new message shows again. Best effort only.
const STORE = "announcement-closed";
const readClosed = () => {
  try {
    return localStorage.getItem(STORE);
  } catch {
    return null;
  }
};

// The platform admin's message for everyone, at the top of the page. Closing it hides this message only.
export const Announcement = ({ className }: { className?: string }) => {
  const { t, i18n } = useTranslation("common");
  const announcement = useAnnouncement();
  const [closed, setClosed] = useState(readClosed);
  const note = announcement.data;
  if (!note) return null;
  const text = i18n.language === "bn" && note.bn ? note.bn : note.en;
  const id = `${note.tone}:${note.en}`;
  if (closed === id) return null;
  const warning = note.tone === "warning";
  const Icon = warning ? TriangleAlert : Megaphone;

  const close = () => {
    setClosed(id);
    try {
      localStorage.setItem(STORE, id);
    } catch {
      // Private windows can refuse storage; it then shows again next visit.
    }
  };

  return (
    <div
      role="status"
      data-testid="announcement"
      className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", warning ? "border-foreground bg-foreground text-background" : "bg-muted", className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">{text}</p>
      <button type="button" onClick={close} aria-label={t("close")} className="-m-1 rounded p-1 opacity-70 hover:opacity-100">
        <X className="size-4" />
      </button>
    </div>
  );
};
