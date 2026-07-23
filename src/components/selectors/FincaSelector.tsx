import { useEffect, useRef, useState } from 'react';
import type { Finca } from '../../types/fincas.types';

interface FincaSelectorProps {
  fincas: Finca[];
  selected: Finca | null;
  loading: boolean;
  onSelect: (finca: Finca) => void;
}

export function FincaSelector({ fincas, selected, loading, onSelect }: FincaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = fincas.filter(f =>
    f.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        disabled={loading}
        className={[
          'flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-forest-400',
          open ? 'border-forest-400' : 'border-slate-200 hover:border-slate-300',
          loading ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
        style={{ minWidth: '240px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className={['flex-1 text-left truncate', selected ? 'text-slate-900 font-medium' : 'text-slate-400'].join(' ')}>
          {loading ? 'Cargando fincas…' : selected ? selected.nombre : 'Seleccionar finca…'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={['h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150', open ? 'rotate-180' : ''].join(' ')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar finca…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400">
                {fincas.length === 0 ? 'No tienes fincas registradas' : 'Sin resultados'}
              </p>
            ) : (
              filtered.map(finca => (
                <button
                  key={finca.id}
                  type="button"
                  onClick={() => { onSelect(finca); setOpen(false); setSearch(''); }}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selected?.id === finca.id ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {selected?.id === finca.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-forest-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={['truncate', selected?.id !== finca.id ? 'ml-5' : ''].join(' ')}>
                    {finca.nombre}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
