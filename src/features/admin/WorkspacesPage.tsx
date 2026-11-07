import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { useWorkspaces, type WorkspaceRow } from "./api";
import { Cell, PageTitle, Pager, StateBadge, Table, useAdminFormat } from "./parts";
import { SearchBox } from "@/components/ui/search-box";

const STATES = ["trial", "active", "granted", "grace", "expired", "free"] as const;

export const WorkspacesPage = () => {
  const { t } = useTranslation(["admin", "billing"]);
  const { day, count } = useAdminFormat();
  const [search, setSearch] = useState("");
  const [state, setState] = useState<WorkspaceRow["state"] | "">("");
  const [suspended, setSuspended] = useState(false);
  const [page, setPage] = useState(1);
  const list = useWorkspaces({ search: search || undefined, state: state || undefined, suspended: suspended ? "true" : undefined, page });

  return (
    <div>
      <PageTitle title={t("nav_workspaces")} hint={t("workspacesHint")} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={(value) => (setSearch(value), setPage(1))} placeholder={t("searchAccounts")} />
        <Select value={state} onChange={(event) => (setState(event.target.value as WorkspaceRow["state"] | ""), setPage(1))} aria-label={t("filterState")} className="w-auto">
          <option value="">{t("allStates")}</option>
          {STATES.map((value) => (
            <option key={value} value={value}>
              {t(`state_${value}`)}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={suspended} onChange={(event) => (setSuspended(event.target.checked), setPage(1))} className="size-4 accent-foreground" />
          {t("onlySuspended")}
        </label>
      </div>
      {list.isError ? <Alert tone="danger">{errorMessage(list.error)}</Alert> : null}
      {list.isLoading ? (
        <Spinner className="mt-12" />
      ) : list.data ? (
        <>
          <Table head={[t("account"), t("plan"), t("state"), t("endsOn"), t("businessesCol"), t("joined")]} testId="workspaces-table">
            {list.data.items.map((row) => (
              <tr key={row.id} className="hover:bg-muted/50">
                <Cell>
                  <Link to={`/admin/workspaces/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                    {row.owner?.name ?? row.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{row.owner?.email}</span>
                </Cell>
                <Cell>
                  <span className="capitalize">{row.planKey}</span>
                </Cell>
                <Cell>
                  <span className="flex flex-wrap gap-1">
                    <StateBadge state={row.state} />
                    {row.suspendedAt ? <Badge className="border border-danger/40 bg-transparent text-danger">{t("suspended")}</Badge> : null}
                  </span>
                </Cell>
                <Cell className="tabular-nums">{row.endsAt ? day(row.endsAt) : "—"}</Cell>
                <Cell className="tabular-nums">{count(row.businesses)}</Cell>
                <Cell className="tabular-nums text-muted-foreground">{day(row.createdAt)}</Cell>
              </tr>
            ))}
          </Table>
          {list.data.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t("noMatches")}</p> : null}
          <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
};
