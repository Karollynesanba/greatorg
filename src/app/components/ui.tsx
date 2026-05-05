import clsx from "clsx";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock3,
  File,
  FileImage,
  FileText,
  Film,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from "react";
import type { ContentType, PostFile, PostStatus } from "../data/mockData";
import { statusColors, typeColors } from "../data/mockData";

export const cn = (...values: Array<string | false | null | undefined>) => clsx(values);

export const pageContainerClass =
  "mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8";

export const getProgressTone = (progress: number) => {
  if (progress >= 100) {
    return "bg-success";
  }

  if (progress >= 70) {
    return "bg-warning text-[#5c4700]";
  }

  return "bg-destructive";
};

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatLongNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

export const formatPercent = (value: number, digits = 1) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;

export const animatedItem = {
  hidden: { opacity: 0, y: 18 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function PageTransition({ children }: PropsWithChildren) {
  return <div className={pageContainerClass}>{children}</div>;
}

export function GlassPanel({
  children,
  className,
  style,
  index = 0,
}: PropsWithChildren<{ className?: string; index?: number; style?: CSSProperties }>) {
  return (
    <motion.section
      custom={index}
      variants={animatedItem}
      initial="hidden"
      animate="visible"
      className={cn(
        "rounded-3xl border border-border/70 bg-card/96 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] dark:border-white/8 dark:bg-card/98",
        className,
      )}
      style={style}
    >
      {children}
    </motion.section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      custom={0}
      variants={animatedItem}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="space-y-2">
        {eyebrow ? (
          <span className="inline-flex rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </motion.header>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ActionButton({
  children,
  className,
  variant = "primary",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
}) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
    secondary:
      "bg-muted text-foreground hover:bg-muted/80",
    ghost: "bg-transparent text-foreground hover:bg-muted/70",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-200",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export type RoundedDropdownOption<T extends string | number> = {
  label: string;
  value: T;
  color?: string;
};

export function RoundedDropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecionar",
}: {
  label: string;
  value: T;
  options: Array<RoundedDropdownOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-4 py-3 text-sm transition hover:border-primary/25 hover:shadow-sm dark:bg-card/90 dark:hover:bg-card"
      >
        <span className="flex items-center gap-3 text-left">
          {selectedOption?.color ? (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedOption.color }} />
          ) : null}
          <span className="font-medium text-foreground">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.75rem] border border-border/70 bg-background p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-border/60 dark:bg-card dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <div className="space-y-1">
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition hover:bg-muted"
                  style={{
                    backgroundColor: selected ? "rgb(var(--muted) / 1)" : undefined,
                    boxShadow: selected ? "inset 0 0 0 1px rgb(var(--border) / 0.7)" : undefined,
                  }}
                >
                  <span className="flex items-center gap-3">
                    {option.color ? (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.color }} />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                    )}
                    <span
                      className="font-medium"
                      style={{
                        color: option.color ?? "rgb(var(--foreground) / 1)",
                      }}
                    >
                      {option.label}
                    </span>
                  </span>
                  {selected ? <span className="text-xs font-semibold text-muted-foreground">Ativo</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pad(number: number) {
  return String(number).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(value: string) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthGrid(date: Date) {
  const firstDay = startOfMonth(date);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);
  gridStart.setHours(12, 0, 0, 0);

  return Array.from({ length: 42 }, (_, index) => {
    const nextDate = new Date(gridStart);
    nextDate.setDate(gridStart.getDate() + index);
    return nextDate;
  });
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function formatDateLabel(value: string) {
  const date = parseDateKey(value);

  if (!date) {
    return "Selecionar data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function RoundedDatePicker({
  value,
  onChange,
  label = "Data",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseDateKey(value) ?? new Date());

  useEffect(() => {
    const nextDate = parseDateKey(value);
    if (nextDate) {
      setCursor(nextDate);
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const todayKey = formatDateKey(new Date());
  const selectedKey = value || todayKey;
  const monthGrid = buildMonthGrid(cursor);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-4 py-3 text-left text-sm transition hover:border-primary/25 hover:shadow-sm dark:bg-card/90 dark:hover:bg-card"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            <span className="block font-medium text-foreground">{formatDateLabel(value)}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[340px] overflow-hidden rounded-[1.75rem] border border-border/70 bg-background shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-border/60 dark:bg-card dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Selecionar data</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatMonthTitle(cursor)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {monthGrid.map((date) => {
                const key = formatDateKey(date);
                const isCurrentMonth = date.getMonth() === cursor.getMonth();
                const isSelected = key === selectedKey;
                const isToday = key === todayKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-full text-sm transition",
                      isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                      !isSelected && isToday && "border border-primary/30 bg-primary/8 text-primary",
                      !isSelected && !isToday && isCurrentMonth && "text-foreground hover:bg-muted",
                      !isCurrentMonth && "text-muted-foreground/35",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  onChange(formatDateKey(now));
                  setCursor(now);
                  setOpen(false);
                }}
                className="rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/70"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border/60 bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground dark:bg-card/80"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RoundedTimePicker({
  value,
  onChange,
  label = "Hora",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const hours = Array.from({ length: 24 }, (_, index) => pad(index));
  const minutes = Array.from({ length: 12 }, (_, index) => pad(index * 5));
  const [hour, minute] = value.split(":");
  const selectedHour = hours.includes(hour) ? hour : "09";
  const selectedMinute = minutes.includes(minute) ? minute : "00";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background px-4 py-3 text-left text-sm transition hover:border-primary/25 hover:shadow-sm dark:bg-card/90 dark:hover:bg-card"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock3 className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            <span className="block font-medium text-foreground">{value || "09:00"}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-[1.75rem] border border-border/70 bg-background shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-border/60 dark:bg-card dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="border-b border-border/60 px-4 py-4 text-center">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Selecionar hora</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{`${selectedHour}:${selectedMinute}`}</p>
          </div>
          <div className="grid grid-cols-2 gap-0 p-3">
            <div className="max-h-56 overflow-auto pr-1">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Hora</p>
              <div className="space-y-1">
                {hours.map((item) => {
                  const active = item === selectedHour;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onChange(`${item}:${selectedMinute}`)}
                      className="flex w-full items-center justify-between rounded-full px-3 py-2 text-sm transition hover:bg-muted"
                      style={{
                        backgroundColor: active ? "rgb(var(--muted) / 1)" : undefined,
                      }}
                    >
                      <span className="font-medium text-foreground">{item}</span>
                      {active ? <span className="text-xs font-semibold text-muted-foreground">Ativo</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="max-h-56 overflow-auto pl-1">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Minuto</p>
              <div className="space-y-1">
                {minutes.map((item) => {
                  const active = item === selectedMinute;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onChange(`${selectedHour}:${item}`)}
                      className="flex w-full items-center justify-between rounded-full px-3 py-2 text-sm transition hover:bg-muted"
                      style={{
                        backgroundColor: active ? "rgb(var(--muted) / 1)" : undefined,
                      }}
                    >
                      <span className="font-medium text-foreground">{item}</span>
                      {active ? <span className="text-xs font-semibold text-muted-foreground">Ativo</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
            <button
              type="button"
              onClick={() => onChange("09:00")}
              className="rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/70"
            >
              09:00
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border/60 bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground dark:bg-card/80"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function IconActionButton({
  icon: Icon,
  label,
  onClick,
  className,
  tone = "neutral",
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
  tone?: "neutral" | "danger";
  title?: string;
}) {
  const tones = {
    neutral:
      "border-border/70 bg-white/95 text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow-md dark:border-white/8 dark:bg-card/95 dark:text-muted-foreground dark:hover:bg-card",
    danger:
      "border-rose-200 bg-white/95 text-rose-500 shadow-sm hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 hover:shadow-md dark:border-[#ff8da5]/20 dark:bg-card/95 dark:text-[#ff8da5] dark:hover:bg-[#2a171b]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200",
        tones[tone],
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function DeleteIconButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return <IconActionButton icon={Trash2} label="Apagar" onClick={onClick} tone="danger" className={className} />;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Apagar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-white/8 dark:bg-card/96 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-[#2a171b] dark:text-[#ff8da5]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ActionButton variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </ActionButton>
          <ActionButton
            onClick={onConfirm}
            className="bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700"
          >
            {confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition duration-200",
        active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function Avatar({
  name,
  color,
  src,
  size = "md",
}: {
  name: string;
  color: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-xl",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl font-semibold text-white shadow-lg",
        sizes[size],
      )}
      style={{ backgroundColor: color }}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name.charAt(0)}
    </div>
  );
}

export function MemberChip({
  name,
  role,
  color,
  src,
}: {
  name: string;
  role?: string;
  color: string;
  src?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} color={color} src={src} size="sm" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{name}</p>
        {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
      </div>
    </div>
  );
}

export function StatusBadge({ value }: { value: PostStatus | string }) {
  const extraColors: Record<string, string> = {
    Atenção: "#FF3B30",
    Ideia: "#8E8E93",
    Pronto: "#34C759",
  };
  const color = statusColors[value as PostStatus] ?? extraColors[value] ?? "#6E6E73";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {value}
    </span>
  );
}

export function TypeBadge({ value }: { value: ContentType | string }) {
  const color = typeColors[value as ContentType] ?? "#6E6E73";

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {value}
    </span>
  );
}

export function MetricStat({
  icon: Icon,
  label,
  value,
  change,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  change: number;
  detail: string;
}) {
  const positive = change >= 0;

  return (
    <GlassPanel className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
            positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {change > 0 ? "+" : ""}
          {change}%
        </span>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <h3 className="text-3xl font-semibold tracking-tight text-foreground">{value}</h3>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", positive ? "bg-success" : "bg-destructive")}
          style={{ width: `${Math.min(Math.abs(change) * 6, 100)}%` }}
        />
      </div>
    </GlassPanel>
  );
}

export function HealthScoreRing({ score }: { score: number }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "rgb(var(--success) / 1)" : score >= 60 ? "rgb(var(--warning) / 1)" : "rgb(var(--destructive) / 1)";

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg className="-rotate-90 h-56 w-56" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgb(var(--border) / 0.55)" strokeWidth="12" />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="12"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm text-muted-foreground">Saúde do Perfil</span>
        <strong className="text-5xl font-semibold tracking-tight text-foreground">{score}</strong>
        <span className="text-sm font-medium text-muted-foreground">de 100</span>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const progress = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="space-y-2">
      {label ? <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span><span>{progress.toFixed(0)}%</span></div> : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full", getProgressTone(progress))}
        />
      </div>
    </div>
  );
}

export function DetailGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-muted/65 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-base font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/50 p-8 text-center dark:border-white/10 dark:bg-white/3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function fileIcon(kind: PostFile["kind"]) {
  switch (kind) {
    case "video":
      return Film;
    case "image":
      return FileImage;
    case "pdf":
      return FileText;
    default:
      return File;
  }
}

export function FileBadge({ file }: { file: PostFile }) {
  const Icon = fileIcon(file.kind);

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 dark:border-white/8 dark:bg-white/4">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-semibold text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">{file.size}</p>
      </div>
    </div>
  );
}

export function ChecklistItem({
  label,
  done,
  onClick,
}: {
  label: string;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 text-left transition hover:bg-muted dark:bg-white/4 dark:hover:bg-white/7"
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full border transition",
          done ? "border-success bg-success text-white" : "border-border bg-background text-transparent",
        )}
      >
        <Check className="h-4 w-4" />
      </span>
      <span className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
    </button>
  );
}
