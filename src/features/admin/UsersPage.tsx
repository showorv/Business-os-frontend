import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { useUsers } from "./api";
import { Cell, PageTitle, Pager, Table, useAdminFormat } from "./parts";
import { SearchBox } from "@/components/ui/search-box";

export const UsersPage = () => {
  const { t } = useTranslation("admin");
  const { day, count } = useAdminFormat();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const users = useUsers({ search: search || undefined, page });
  return (
    <div>
      <PageTitle title={t("nav_users")} hint={t("usersHint")} />
      <div className="mb-4">
        <SearchBox value={search} onChange={(value) => (setSearch(value), setPage(1))} placeholder={t("searchPeople")} />
      </div>
      {users.isError ? <Alert tone="danger">{errorMessage(users.error)}</Alert> : null}
      {users.isLoading ? <Spinner className="mt-12" /> : null}
      {users.data ? (
        <>
          <Table head={[t("person"), t("businessesCol"), t("twoStep"), t("lastSignIn"), t("joined")]} testId="users-table">
            {users.data.items.map((user) => (
              <tr key={user.id}>
                <Cell>
                  {user.workspaceId ? (
                    <Link to={`/admin/workspaces/${user.workspaceId}`} className="font-medium underline-offset-4 hover:underline">
                      {user.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{user.name}</span>
                  )}
                  {user.isPlatformAdmin ? <Badge className="ml-2 border bg-transparent">{t("badge")}</Badge> : null}
                  {user.status !== "ACTIVE" ? <Badge className="ml-2 border border-danger/40 bg-transparent text-danger">{t("disabled")}</Badge> : null}
                  <span className="block text-xs text-muted-foreground">{user.email}</span>
                </Cell>
                <Cell className="tabular-nums">{count(user.businesses)}</Cell>
                <Cell>{user.mfaEnabled ? t("mfaOn") : t("mfaOff")}</Cell>
                <Cell className="tabular-nums text-muted-foreground">{day(user.lastLoginAt)}</Cell>
                <Cell className="tabular-nums text-muted-foreground">{day(user.createdAt)}</Cell>
              </tr>
            ))}
          </Table>
          {users.data.items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{t("noMatches")}</p> : null}
          <Pager page={users.data.page} pages={users.data.pages} total={users.data.total} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
};
