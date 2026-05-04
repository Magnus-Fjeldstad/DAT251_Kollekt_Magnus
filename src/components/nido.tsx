import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from './ui/utils';

type Tone = 'card' | 'paper' | 'coral' | 'sky' | 'butter' | 'soft' | 'olive' | 'plum';

const toneClass: Record<Tone, string> = {
  card: 'bg-card',
  paper: 'bg-nido-paper-2',
  coral: 'bg-secondary text-secondary-foreground',
  sky: 'bg-nido-sky',
  butter: 'bg-nido-butter',
  soft: 'bg-coral-soft',
  olive: 'bg-[var(--olive)] text-primary-foreground',
  plum: 'bg-[var(--plum)] text-primary-foreground',
};

export function NidoPage({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('nido-page', className)} {...props}>
      {children}
    </div>
  );
}

export function NidoCard({
  className,
  children,
  tone = 'card',
  flat = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; flat?: boolean }) {
  return (
    <div className={cn(flat ? 'nido-card-flat' : 'nido-card', toneClass[tone], className)} {...props}>
      {children}
    </div>
  );
}

export function NidoButton({
  className,
  variant = 'primary',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'coral' | 'ghost' | 'paper' }) {
  const variantClass = {
    primary: 'nido-button',
    coral: 'nido-button-coral',
    ghost: 'nido-button-ghost',
    paper: 'nido-button-ghost bg-card',
  }[variant];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55',
        variantClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function NidoChip({
  className,
  children,
  tone = 'paper',
}: {
  className?: string;
  children: ReactNode;
  tone?: Tone | 'ink';
}) {
  return (
    <span
      className={cn(
        'nido-chip',
        tone === 'ink' ? 'bg-primary text-primary-foreground' : toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function NidoSection({
  label,
  right,
  className,
}: {
  label: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-2 flex items-baseline justify-between gap-3 px-1', className)}>
      <div className="nido-section-label">{label}</div>
      {right && <div className="font-mono text-[0.68rem] text-ink-3">{right}</div>}
    </div>
  );
}

export function NidoAvatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dimensions = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-9 w-9 text-sm',
    lg: 'h-16 w-16 text-2xl',
  }[size];
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary bg-secondary font-bold text-secondary-foreground shadow-[inset_0_-2px_0_rgba(0,0,0,0.14)]',
        dimensions,
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function NidoProgress({
  value,
  max,
  className,
  barClassName,
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full border border-primary bg-black/5', className)}>
      <div
        className={cn(
          'h-full bg-secondary transition-[width] duration-500 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.18)_0_4px,transparent_4px_8px)]',
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function NidoDots({ className }: { className?: string }) {
  return <div className={cn('nido-dots', className)} />;
}

export function NidoEmpty({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('nido-card-flat bg-nido-paper-2 px-4 py-6 text-center text-sm text-ink-3', className)}>
      {children}
    </div>
  );
}
