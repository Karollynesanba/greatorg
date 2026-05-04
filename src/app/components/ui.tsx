import clsx from "clsx";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, File, FileImage, FileText, Film, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
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
