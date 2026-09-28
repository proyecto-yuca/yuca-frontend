import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';

interface TagListInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  /** Normaliza el texto antes de validarlo (ej. minúsculas para correos). */
  normalize?: (value: string) => string;
  /** Devuelve un mensaje si el valor no es válido. */
  validate?: (value: string) => string | null;
  error?: string;
  addLabel?: string;
}

const SEPARATORS = /[\s,;]+/;

/** Lista editable de valores cortos (correos, etiquetas) mostrados como chips. */
export function TagListInput({
  values,
  onChange,
  placeholder,
  max = 10,
  normalize = v => v.trim(),
  validate,
  error,
  addLabel = 'Agregar',
}: TagListInputProps) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const full = values.length >= max;

  /** Agrega los valores válidos; devuelve false si alguno se rechazó. */
  const addValues = (raw: string[]): boolean => {
    const next = [...values];
    let problem: string | null = null;
    for (const item of raw.map(normalize).filter(Boolean)) {
      if (next.includes(item)) continue;
      if (next.length >= max) { problem = `Máximo ${max}`; break; }
      problem = validate?.(item) ?? null;
      if (problem) break;
      next.push(item);
    }
    setLocalError(problem);
    if (next.length !== values.length) onChange(next);
    return problem === null;
  };

  const commitDraft = () => {
    if (!draft.trim()) return;
    // Si hubo un error el texto se deja en el campo para corregirlo.
    if (addValues(draft.split(SEPARATORS))) setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!SEPARATORS.test(text.trim())) return;
    e.preventDefault();
    addValues(text.split(SEPARATORS));
  };

  const remove = (value: string) => {
    setLocalError(null);
    onChange(values.filter(v => v !== value));
  };

  const shownError = localError ?? error;

  return (
    <div className="space-y-1.5">
      <div
        className={[
          'flex flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 transition-colors',
          'focus-within:ring-2 focus-within:ring-forest-500 focus-within:border-forest-500',
          shownError ? 'border-red-300' : 'border-slate-200',
        ].join(' ')}
      >
        {values.map(value => (
          <span
            key={value}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-forest-50 py-1 pl-2 pr-1 text-xs font-medium text-forest-800 ring-1 ring-inset ring-forest-100"
          >
            <span className="truncate">{value}</span>
            <button
              type="button"
              onClick={() => remove(value)}
              className="rounded p-0.5 text-forest-500 hover:bg-forest-100 hover:text-forest-800 transition-colors"
              aria-label={`Quitar ${value}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {!full && (
          <input
            value={draft}
            onChange={e => { setDraft(e.target.value); setLocalError(null); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={commitDraft}
            placeholder={values.length === 0 ? placeholder : ''}
            className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
        )}
        {!full && draft.trim() && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={commitDraft}
            className="rounded-md bg-forest-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-forest-700 transition-colors"
          >
            {addLabel}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {shownError ? (
          <p className="text-xs text-red-500">{shownError}</p>
        ) : (
          <p className="text-xs text-slate-400">Enter o coma para agregar · pega varios a la vez</p>
        )}
        <span className="shrink-0 text-xs text-slate-400">{values.length}/{max}</span>
      </div>
    </div>
  );
}
