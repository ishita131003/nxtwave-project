import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control =
  'mt-1 block w-full rounded-[3px] border-[1.5px] border-ink bg-white px-3 py-2 text-base text-ink placeholder:text-ink/50 focus:outline-none focus:ring-[3px] focus:ring-felt/40 disabled:border-ink/30 disabled:bg-wall disabled:text-ink/70 aria-[invalid=true]:border-stamp aria-[invalid=true]:ring-stamp/20';

interface Common {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
}

function Wrapper({ id, label, error, hint, optional, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink/70"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-stamp font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ label, error, hint, optional, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} optional={optional}>
      <input id={id} className={control} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
    </Wrapper>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  options,
  placeholder,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} optional={optional}>
      <select id={id} className={control} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function TextAreaField({ label, error, hint, optional, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} optional={optional}>
      <textarea id={id} className={control} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
    </Wrapper>
  );
}

export function CheckboxField({ label, error, ...props }: { label: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 rounded border-ink text-felt"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-stamp font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
