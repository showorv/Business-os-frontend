import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { StepUpModal } from "./StepUpModal";

// Some actions need a code from the last 10 minutes (the server answers MFA_REQUIRED).
export const needsStepUp = (error: unknown) => error instanceof ApiError && error.code === "MFA_REQUIRED";

// Runs an action. If the server asks for a fresh code, shows the code box, then runs the action again.
//   const { run, stepUpModal } = useStepUpRetry();
//   run(() => updateMember.mutateAsync(body));   ...   {stepUpModal}
// Other errors stay on the mutation (mutation.error), so screens show them as usual.
export const useStepUpRetry = () => {
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => Promise<unknown>) | null>(null);

  const run = (action: () => Promise<unknown>) => {
    pending.current = action;
    action().catch((error: unknown) => {
      if (needsStepUp(error)) setOpen(true);
    });
  };

  const stepUpModal = (
    <StepUpModal
      open={open}
      onOpenChange={setOpen}
      onConfirmed={() => {
        if (pending.current) run(pending.current);
      }}
    />
  );

  return { run, stepUpModal };
};
