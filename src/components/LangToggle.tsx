import { useLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const [lang, setLang] = useLang();
  const Btn = ({ value, label }: { value: Lang; label: string }) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      className={cn(
        "px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors",
        lang === value
          ? "bg-primary text-primary-foreground"
          : "bg-transparent text-foreground hover:bg-muted",
      )}
      aria-pressed={lang === value}
    >
      {label}
    </button>
  );
  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-md border border-border",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <Btn value="gr" label="GR" />
      <span className="h-5 w-px bg-border" />
      <Btn value="en" label="EN" />
    </div>
  );
}