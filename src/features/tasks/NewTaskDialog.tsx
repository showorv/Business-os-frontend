import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Modal, ModalContent } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/errors";
import { PRIORITIES, useCreateTask, type TaskPriority } from "./api";
import { fromLocalInput, useMemberNames } from "./parts";

export const NewTaskDialog = ({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated?: (taskId: string) => void }) => {
  const { t } = useTranslation(["tasks", "common"]);
  const create = useCreateTask(businessId);
  const { members } = useMemberNames(businessId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [due, setDue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setProblem(t("tasks:titleNeeded"));
    const dueAt = fromLocalInput(due);
    setProblem(null);
    create.mutate(
      {
        title: title.trim(),
        priority,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(dueAt ? { dueAt } : {}),
      },
      {
        onSuccess: (task) => {
          toast.success(t("tasks:taskAdded"));
          onClose();
          onCreated?.(task.id);
        },
      },
    );
  };

  return (
    <Modal open onOpenChange={(next) => !next && onClose()}>
      <ModalContent title={t("tasks:newTask")} description={t("tasks:newTaskHint")}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {problem ? <Alert tone="danger">{problem}</Alert> : null}
          {create.isError ? <Alert tone="danger">{errorMessage(create.error)}</Alert> : null}
          <Field label={t("tasks:title")}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder={t("tasks:titlePlaceholder")} autoFocus />
          </Field>
          <Field label={`${t("tasks:description")} (${t("tasks:optional")})`}>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={3}
              className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/10"
            />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("tasks:priority")}</p>
            <Segmented label={t("tasks:priority")} value={priority} onChange={setPriority} className="flex w-full" options={PRIORITIES.map((value) => ({ value, label: t(`tasks:priority_${value}`) }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("tasks:assignee")}>
              <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">{t("tasks:nobody")}</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("tasks:due")} hint={t("tasks:dueHint")}>
              <Input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("tasks:addTask")}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
