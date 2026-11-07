import { History, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAccess } from "@/features/businesses/api";
import { useMemberNames } from "@/features/tasks/parts";
import { errorMessage } from "@/lib/errors";
import { Permission } from "@/lib/permissions";
import { ACTION_GROUPS, useBusinessAudit, useMyAudit } from "./api";
import { AuditTimeline, useActionWords } from "./AuditTimeline";

// Who changed what, and when, in one business. Every entry is chained to the one before it, so the
// history can't be quietly edited.
export const AuditPage = () => {
  const { t } = useTranslation("audit");
  const businessId = useParams().businessId!;
  const access = useAccess(businessId);
  const [params, setParams] = useSearchParams();
  const person = params.get("person");
  const action = params.get("action");
  const { members, nameOf } = useMemberNames(businessId);
  const words = useActionWords();
  const allowed = access.can(Permission.AUDIT_READ);
  const entries = useBusinessAudit(businessId, { actorUserId: allowed ? person : null, action });

  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  };

  if (access.isLoading) return <Spinner className="mt-16" />;
  if (!allowed)
    return (
      <Card>
        <EmptyState icon={ShieldCheck} title={t("noAccess")} body={t("noAccessHint")} />
      </Card>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select aria-label={t("person")} value={person ?? ""} onChange={(event) => setFilter("person", event.target.value)}>
          <option value="">{t("everyone")}</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name || member.email}
            </option>
          ))}
        </Select>
        <Select aria-label={t("action")} value={action ?? ""} onChange={(event) => setFilter("action", event.target.value)}>
          <option value="">{t("everything")}</option>
          {ACTION_GROUPS.map((group) => (
            <optgroup key={group.key} label={t(`group_${group.key}`)}>
              {group.actions.map((value) => (
                <option key={value} value={value}>
                  {words(value)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <Entries query={entries} nameOf={nameOf} businessId={businessId} filtered={Boolean(person || action)} />
    </div>
  );
};

// Your own sign-ins and changes, across every business.
export const MyActivityPage = () => {
  const { t } = useTranslation("audit");
  const entries = useMyAudit();
  // Every entry here is the reader's own.
  const nameOf = () => t("you");
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("myTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("mySubtitle")}</p>
      </div>
      <Entries query={entries} nameOf={nameOf} businessId={null} filtered={false} />
    </section>
  );
};

const Entries = ({ query, nameOf, businessId, filtered }: { query: ReturnType<typeof useMyAudit>; nameOf: (userId: string | null) => string; businessId: string | null; filtered: boolean }) => {
  const { t } = useTranslation("audit");
  if (query.isLoading) return <Spinner className="mt-12" />;
  if (query.isError) return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  if (!query.data?.length)
    return (
      <Card>
        <EmptyState icon={History} title={filtered ? t("noneFiltered") : t("none")} body={filtered ? t("noneFilteredHint") : t("noneHint")} />
      </Card>
    );
  return (
    <>
      <AuditTimeline entries={query.data} nameOf={nameOf} businessId={businessId} />
      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
};
