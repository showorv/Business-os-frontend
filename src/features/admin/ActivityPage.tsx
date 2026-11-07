import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { useActivity, type ActivityRow } from "./api";
import { PageTitle, Pager, useAdminFormat } from "./parts";

const ACTIONS = ["subscription_changed", "workspace_suspended", "workspace_unsuspended", "plan_created", "plan_updated", "coupon_created", "coupon_updated", "settings_updated"];

// What changed, as short "field: value" pairs, so a reader sees it without opening anything.
const changedText = (after: unknown) => {
  if (!after || typeof after !== "object") return "";
  return Object.entries(after as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && typeof value !== "object")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
};

export const ActivityList = ({ rows }: { rows: ActivityRow[] }) => {
  const { t } = useTranslation("admin");
  const { dateTime } = useAdminFormat();
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t("noActivity")}</p>;
  return (
    <ul className="divide-y rounded-lg border" data-testid="activity-list">
      {rows.map((row) => {
        const name = row.action.replace(/^platform\./, "");
        return (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{ACTIONS.includes(name) ? t(`action_${name}`) : name}</span>
              {row.workspaceId ? (
                <Link to={`/admin/workspaces/${row.workspaceId}`} className="ml-2 text-muted-foreground underline-offset-4 hover:underline">
                  {t("openAccount")}
                </Link>
              ) : null}
              <span className="block break-all text-xs text-muted-foreground">{changedText(row.after)}</span>
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.actor?.name ?? "—"} · {dateTime(row.at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export const ActivityPage = () => {
  const { t } = useTranslation("admin");
  const [page, setPage] = useState(1);
  const activity = useActivity(page);
  return (
    <div>
      <PageTitle title={t("nav_activity")} hint={t("activityHint")} />
      {activity.isError ? <Alert tone="danger">{errorMessage(activity.error)}</Alert> : null}
      {activity.isLoading ? <Spinner className="mt-12" /> : null}
      {activity.data ? (
        <>
          <ActivityList rows={activity.data.items} />
          <Pager page={activity.data.page} pages={activity.data.pages} total={activity.data.total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
};
