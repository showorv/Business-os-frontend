import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { errorMessage } from "@/lib/errors";
import { NEXT_STATUSES, useChangeBusinessStatus, type Business, type BusinessStatus } from "../api";

// Pausing (inactive) or archiving makes the business read-only. Either can be undone here.
export const StatusCard = ({ business }: { business: Business }) => {
  const { t } = useTranslation(["businesses", "common"]);
  const change = useChangeBusinessStatus(business.id);
  const [target, setTarget] = useState<BusinessStatus | null>(null);

  const confirm = () => {
    if (!target) return;
    change.mutate(target, {
      onSuccess: () => {
        setTarget(null);
        toast.success(t(`businesses:statusChanged${target}`));
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t("businesses:status")}</CardTitle>
          <CardDescription>{t(`businesses:statusHint${business.status}`)}</CardDescription>
        </div>
        <Badge>{t(`businesses:status${business.status}`)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {NEXT_STATUSES[business.status].map((status) => (
          <Button key={status} variant={status === "ARCHIVED" ? "danger" : "outline"} onClick={() => setTarget(status)}>
            {t(`businesses:moveTo${status}`)}
          </Button>
        ))}
      </CardContent>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target ? t(`businesses:moveTo${target}`) : ""}
        description={target ? t(`businesses:confirm${target}`, { name: business.name }) : undefined}
        confirmLabel={target ? t(`businesses:moveTo${target}`) : ""}
        danger={target === "ARCHIVED"}
        pending={change.isPending}
        onConfirm={confirm}
      >
        {change.isError ? <Alert tone="danger">{errorMessage(change.error)}</Alert> : null}
      </ConfirmDialog>
    </Card>
  );
};
