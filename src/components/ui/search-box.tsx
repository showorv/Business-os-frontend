import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Input } from "./input";

// A search box that searches when you press Enter or stop typing for a moment.
export const SearchBox = ({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) => {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const type = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next.trim()), 400);
  };
  return (
    <form
      className={cn("relative w-full max-w-xs", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onChange(text.trim());
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" value={text} onChange={(event) => type(event.target.value)} onBlur={() => onChange(text.trim())} placeholder={placeholder} aria-label={placeholder} className="pl-9" />
    </form>
  );
};
