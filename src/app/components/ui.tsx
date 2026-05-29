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
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from "react";
import type { ContentType, PostFile, PostStatus } from "../data/mockData";
import { statusColors, typeColors } from "../data/mockData";
import { useThemeMode } from "../theme";

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
  dataCy,
}: PropsWithChildren<{ className?: string; index?: number; style?: CSSProperties; dataCy?: string }>) {
  const { isDark } = useThemeMode();

  return (
    <motion.section
      custom={index}
      variants={animatedItem}
      initial="hidden"
      animate="visible"
      data-cy={dataCy}
      className={cn(
        isDark
          ? "rounded-[2rem] border border-white/10 bg-[#111723] p-5 text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.38)]"
          : "rounded-[2rem] border border-border/70 bg-card p-5 text-card-foreground shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]",
        className,
      )}
      style={style}
    >
      {children}
    </motion.section>
  );
}

export function PageHeader({
  eyebrow: _eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
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
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
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
  dataCy,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  dataCy?: string;
}) {
  const { isDark } = useThemeMode();
  const variants = {
    primary:
      "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 dark:bg-[#ff3b4e] dark:shadow-[0_14px_34px_rgba(255,59,78,0.22)] dark:hover:bg-[#ff5161]",
    secondary:
      "border border-border/70 text-foreground shadow-sm",
    ghost: "bg-transparent text-foreground hover:bg-muted/70 dark:hover:bg-card/98",
  };

  const style = variant === "secondary"
    ? {
        backgroundColor: isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff",
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      data-cy={dataCy}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-200",
        variants[variant],
        className,
      )}
      style={style}
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
  forceLight = false,
  dataCy,
  optionDataCyPrefix,
}: {
  label: string;
  value: T;
  options: Array<RoundedDropdownOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  forceLight?: boolean;
  dataCy?: string;
  optionDataCyPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const { isDark } = useThemeMode();
  const lightSurface = forceLight || !isDark;

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
        data-cy={dataCy}
        className="flex w-full items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-3.5 text-sm text-foreground transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        style={{
          backgroundColor: lightSurface ? "#ffffff" : "rgb(var(--sidebar) / 1)",
          borderColor: lightSurface ? "rgb(var(--border) / 0.85)" : "rgb(255 255 255 / 0.08)",
        }}
      >
        <span className="flex min-w-0 items-center gap-3 text-left">
          {selectedOption?.color ? (
            <span
              className="inline-flex h-8 min-w-0 items-center rounded-full px-3 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: selectedOption.color }}
            >
              {selectedOption?.label ?? placeholder}
            </span>
          ) : (
            <span className="font-medium text-foreground">{selectedOption?.label ?? placeholder}</span>
          )}
        </span>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition duration-200"
          style={{
            backgroundColor: lightSurface ? "#ffffff" : "rgb(var(--sidebar) / 1)",
            borderColor: lightSurface ? "rgb(var(--border) / 0.75)" : "rgb(255 255 255 / 0.08)",
            color: lightSurface ? "rgb(var(--muted-foreground) / 1)" : "rgb(226 232 240 / 1)",
          }}
        >
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="absolute left-0 top-full z-50 mt-2 w-full rounded-[1.75rem] border p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
          style={{
            backgroundColor: lightSurface ? "#ffffff" : "rgb(var(--background) / 1)",
            borderColor: lightSurface ? "rgb(var(--border) / 0.85)" : "rgb(255 255 255 / 0.08)",
            boxShadow: lightSurface ? "0 24px 60px rgba(15,23,42,0.14)" : "0 24px 60px rgba(0,0,0,0.28)",
          }}
        >
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
                  data-cy={optionDataCyPrefix ? `${optionDataCyPrefix}-option-${String(option.value)}` : undefined}
                  className="flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  style={{
                    backgroundColor: selected
                      ? lightSurface
                        ? "rgb(var(--muted) / 1)"
                        : "rgb(var(--muted) / 1)"
                      : lightSurface
                        ? "#ffffff"
                        : "rgb(var(--background) / 1)",
                    boxShadow: selected ? "inset 0 0 0 1px rgb(var(--border) / 0.7)" : undefined,
                  }}
                >
                  <span className="flex items-center gap-3">
                    {option.color ? (
                      <span
                        className="inline-flex h-7 min-w-0 items-center rounded-full px-3 text-xs font-semibold text-white shadow-sm"
                        style={{ backgroundColor: option.color }}
                      >
                        {option.label}
                      </span>
                    ) : (
                      <span className="font-medium text-foreground">{option.label}</span>
                    )}
                  </span>
                  {selected ? <span className="text-xs font-semibold text-muted-foreground">Selecionado</span> : null}
                </button>
              );
            })}
          </div>
        </motion.div>
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useFloatingPopoverPosition({
  open,
  anchorRef,
  popoverRef,
  width,
  estimatedHeight,
}: {
  open: boolean;
  anchorRef: { current: HTMLElement | null };
  popoverRef: { current: HTMLElement | null };
  width: number;
  estimatedHeight: number;
}) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const anchorNode = anchorRef.current;
      if (!anchorNode || typeof window === "undefined") {
        return;
      }

      const rect = anchorNode.getBoundingClientRect();
      const viewportPadding = 12;
      const popoverWidth = Math.min(Math.max(width, rect.width), window.innerWidth - viewportPadding * 2);
      const popoverNode = popoverRef.current;
      const measuredHeight = popoverNode?.offsetHeight ?? estimatedHeight;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < measuredHeight && spaceAbove > spaceBelow;
      const left = clamp(rect.right - popoverWidth, viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
      const top = openUp ? rect.top - measuredHeight - 12 : rect.bottom + 12;

      setPosition({
        top: clamp(top, viewportPadding, window.innerHeight - measuredHeight - viewportPadding),
        left,
        width: popoverWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, estimatedHeight, open, popoverRef, width]);

  return position;
}

export function RoundedDatePicker({
  value,
  onChange,
  label = "Data",
  dataCy,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  dataCy?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
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
      const target = event.target as Node;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsidePopover = popoverRef.current?.contains(target);

      if (!isInsideTrigger && !isInsidePopover) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const popoverPosition = useFloatingPopoverPosition({
    open,
    anchorRef: rootRef,
    popoverRef,
    width: 340,
    estimatedHeight: 420,
  });

  const todayKey = formatDateKey(new Date());
  const selectedKey = value || todayKey;
  const monthGrid = buildMonthGrid(cursor);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        data-cy={dataCy}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-card px-4 py-3 text-left text-sm text-foreground transition hover:border-primary/25 hover:shadow-sm dark:border-white/8 dark:hover:bg-card/98"
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

      {open && popoverPosition ? (
            <div
              ref={popoverRef}
              className="z-[9999] overflow-hidden overscroll-contain rounded-[1.75rem] border border-border/70 bg-card shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-white/8 dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
              style={{
                position: "fixed",
                top: popoverPosition.top,
                left: popoverPosition.left,
                width: popoverPosition.width,
              }}
              onWheelCapture={(event) => event.stopPropagation()}
            >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <button
              type="button"
              onClick={() => setCursor((current) => addMonths(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80 dark:bg-[#1a2029] dark:hover:bg-[#232a37]"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/80 dark:bg-[#1a2029] dark:hover:bg-[#232a37]"
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
                      !isSelected && !isToday && isCurrentMonth && "text-foreground hover:bg-muted dark:text-foreground dark:hover:bg-card/98",
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
                className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/60 dark:border-white/8 dark:hover:bg-card/98"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/8 dark:hover:bg-card/98"
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
  dataCy,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  dataCy?: string;
}) {
  const hours = Array.from({ length: 24 }, (_, index) => pad(index));
  const minutes = Array.from({ length: 12 }, (_, index) => pad(index * 5));
  const [hour, minute] = value.split(":");
  const selectedHour = hours.includes(hour) ? hour : "09";
  const selectedMinute = minutes.includes(minute) ? minute : "00";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsidePopover = popoverRef.current?.contains(target);

      if (!isInsideTrigger && !isInsidePopover) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const popoverPosition = useFloatingPopoverPosition({
    open,
    anchorRef: rootRef,
    popoverRef,
    width: 320,
    estimatedHeight: 320,
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        data-cy={dataCy}
        className="flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-card px-4 py-3 text-left text-sm text-foreground transition hover:border-primary/25 hover:shadow-sm dark:border-white/8 dark:hover:bg-card/98"
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

      {open && popoverPosition
        ? createPortal(
            <div
              ref={popoverRef}
              className="z-[9999] overflow-hidden overscroll-contain rounded-[1.75rem] border border-border/70 bg-card shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-white/8 dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
              style={{
                position: "fixed",
                top: popoverPosition.top,
                left: popoverPosition.left,
                width: popoverPosition.width,
              }}
              onWheelCapture={(event) => event.stopPropagation()}
            >
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
                          className="flex w-full items-center justify-between rounded-full px-3 py-2 text-sm transition hover:bg-muted dark:hover:bg-card/98"
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
                          className="flex w-full items-center justify-between rounded-full px-3 py-2 text-sm transition hover:bg-muted dark:hover:bg-card/98"
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
                className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/60 dark:border-white/8 dark:hover:bg-[#232a37]"
              >
                09:00
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition hover:text-foreground dark:border-white/8 dark:hover:bg-[#1a2029]"
              >
                Fechar
              </button>
              </div>
            </div>,
            document.body,
          )
        : null}
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
  dataCy,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
  tone?: "neutral" | "danger";
  title?: string;
  dataCy?: string;
}) {
  const { isDark } = useThemeMode();
  const tones = {
    neutral:
      "border-border/70 text-muted-foreground shadow-sm hover:border-primary/25 hover:text-foreground hover:shadow-md dark:border-white/8 dark:hover:bg-[#1f2631]",
    danger:
      "border-rose-200 text-rose-500 shadow-sm hover:border-rose-300 hover:text-rose-600 hover:shadow-md dark:border-[#ff8da5]/20 dark:bg-[#1d171a] dark:text-[#ff8da5] dark:hover:bg-[#2a171b]",
  };

  const toneStyle =
    tone === "danger"
      ? isDark
        ? { backgroundColor: "rgb(29 23 26 / 1)" }
        : { backgroundColor: "#ffffff" }
      : isDark
        ? { backgroundColor: "rgb(23 28 37 / 1)" }
        : { backgroundColor: "#ffffff" };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={label}
      data-cy={dataCy}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200",
        tones[tone],
        className,
      )}
      style={toneStyle}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function DeleteIconButton({
  onClick,
  className,
  dataCy,
}: {
  onClick?: () => void;
  className?: string;
  dataCy?: string;
}) {
  return <IconActionButton icon={Trash2} label="Apagar" onClick={onClick} tone="danger" className={className} dataCy={dataCy} />;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Apagar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  confirmDataCy,
  cancelDataCy,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDataCy?: string;
  cancelDataCy?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-border/60 bg-card p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-white/8 dark:bg-card/96 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
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
          <ActionButton variant="secondary" onClick={onCancel} dataCy={cancelDataCy}>
            {cancelLabel}
          </ActionButton>
          <ActionButton
            onClick={onConfirm}
            dataCy={confirmDataCy}
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
  dataCy,
}: {
  active: boolean;
  label: string;
  onClick?: () => void;
  dataCy?: string;
}) {
  const { isDark } = useThemeMode();
  return (
    <button
      type="button"
      onClick={onClick}
      data-cy={dataCy}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition duration-200",
          active
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 dark:bg-[#ff3b4e]"
            : "border border-border/60 text-muted-foreground shadow-sm hover:text-foreground dark:border-white/8 dark:hover:text-white",
        )}
      style={
        active
          ? undefined
          : {
              backgroundColor: isDark ? "rgb(var(--sidebar) / 1)" : "#ffffff",
            }
      }
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
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full", getProgressTone(progress), "shadow-[0_0_20px_rgba(139,92,246,0.22)]")}
        />
      </div>
    </div>
  );
}

export function DetailGrid({ items }: { items: { label: string; value: string }[] }) {
  const { isDark } = useThemeMode();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/60 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/8"
          style={{
            backgroundColor: isDark ? "rgb(21 27 36 / 1)" : "#ffffff",
          }}
        >
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
    <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-card/90">
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
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] dark:border-white/8 dark:bg-card/90">
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
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left transition hover:bg-background/95 dark:border-white/8 dark:hover:bg-[#1d2430]"
    >
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full border transition",
          done ? "border-success bg-success text-white" : "border-border bg-card text-transparent",
        )}
      >
        <Check className="h-4 w-4" />
      </span>
      <span className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-foreground")}>{label}</span>
    </button>
  );
}
