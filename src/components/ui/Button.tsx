import type { ButtonHTMLAttributes } from 'react';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'lemon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-brand-800 disabled:bg-ink/40',
  secondary: 'bg-paper text-ink ring-2 ring-inset ring-ink hover:bg-lemon disabled:text-ink/50 disabled:ring-ink/30 disabled:hover:bg-paper',
  ghost: 'text-ink underline decoration-ink/30 hover:decoration-ink disabled:text-ink/40',
  danger: 'bg-stamp text-white hover:bg-[#8f1a10] disabled:bg-stamp/40',
  lemon: 'bg-lemon text-ink hover:bg-white shadow-[0_8px_14px_-10px_rgb(0_0_0/0.6)]',
};

export function buttonClass(variant: Variant = 'primary', extra = '') {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] px-4 py-2 text-[15px] font-bold [font-stretch:88%] transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${extra}`;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
