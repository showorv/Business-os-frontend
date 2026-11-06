import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Modal, ModalContent } from "./sheet";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  // Red button, for things that remove or end something.
  danger?: boolean;
  children?: ReactNode;
}

// "Are you sure?" before an action that can't simply be undone.
export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmLabel, onConfirm, pending, danger, children }: ConfirmDialogProps) => {
  const { t } = useTranslation("common");
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title={title} description={description}>
        {children}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
};
