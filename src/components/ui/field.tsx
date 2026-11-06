import { useId, type ReactElement, type ReactNode } from "react";
import { cloneElement } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}

// A label, its control, and the hint or error under it, linked so screen readers read them together.
export const Field = ({ label, error, hint, children }: FieldProps) => {
  const id = useId();
  const describedBy = error || hint ? `${id}-note` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, { id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={describedBy} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
