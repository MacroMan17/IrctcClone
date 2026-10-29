import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { inputCls } from './ui.jsx';

/** Accessible station autocomplete (combobox). value = station object | null */
export default function StationInput({ label, value, onChange, placeholder, error, id }) {
  const uid = useId();
  const inputId = id || `st-${uid}`;
  const [text, setText] = useState(value ? `${value.name} (${value.code})` : '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null);

  useEffect(() => { setText(value ? `${value.name} (${value.code})` : ''); }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      api.stations(text.includes('(') ? '' : text.trim()).then((d) => { setOptions(d.stations.slice(0, 8)); setActive(-1); }).catch(() => setOptions([]));
    }, 150);
    return () => clearTimeout(t);
  }, [text, open]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (s) => { onChange(s); setOpen(false); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); pick(options[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-white/90">{label}</label>
      <input
        id={inputId} role="combobox" aria-expanded={open} aria-controls={`${inputId}-list`} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${inputId}-o${active}` : undefined} aria-invalid={Boolean(error)}
        autoComplete="off" className={inputCls} placeholder={placeholder} value={text}
        onChange={(e) => { setText(e.target.value); if (value) onChange(null); setOpen(true); }}
        onFocus={() => setOpen(true)} onKeyDown={onKey}
      />
      {open && options.length > 0 && (
        <ul id={`${inputId}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-white py-1 text-ink shadow-lg">
          {options.map((s, i) => (
            <li key={s.code} id={`${inputId}-o${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-tint' : 'hover:bg-platform'}`}>
              <span className="font-semibold">{s.name}</span> <span className="text-muted">({s.code}) - {s.city}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-lamp" role="alert">{error}</p>}
    </div>
  );
}
