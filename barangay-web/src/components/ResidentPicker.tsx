import { useEffect, useRef, useState } from 'react';
import type { Resident } from '../types';

interface Props {
  residents: Resident[];
  value: Resident | null;
  onChange: (r: Resident | null) => void;
  placeholder?: string;
  /** Show a compact inline chip when selected instead of full card */
  compact?: boolean;
}

function calcAge(birthDate: string) {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function ResidentPicker({ residents, value, onChange, placeholder = 'Search by name or ID…', compact }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? residents.filter(r => {
        const q = query.toLowerCase();
        const fullName = `${r.lastName} ${r.firstName} ${r.middleName}`.toLowerCase();
        const revName  = `${r.firstName} ${r.lastName}`.toLowerCase();
        return fullName.includes(q) || revName.includes(q) || String(r.id) === q.trim();
      }).slice(0, 10)
    : [];

  const select = (r: Resident) => {
    onChange(r);
    setQuery('');
    setOpen(false);
  };

  const clear = () => { onChange(null); setQuery(''); };

  // If a resident is selected, show their profile card (or compact chip)
  if (value) {
    const age = value.birthDate ? calcAge(value.birthDate) : null;
    if (compact) {
      return (
        <div className="rpicker-chip">
          <span className="rpicker-chip-name">{value.lastName}, {value.firstName}</span>
          <span className="rpicker-chip-meta">{value.sitio} · {age != null ? `Age ${age}` : ''}</span>
          <button className="rpicker-chip-clear" onClick={clear} title="Change resident">✕</button>
        </div>
      );
    }
    return (
      <div className="rpicker-selected">
        <div className="rpicker-selected-top">
          <div className="rpicker-selected-avatar">{value.firstName.charAt(0)}{value.lastName.charAt(0)}</div>
          <div className="rpicker-selected-info">
            <div className="rpicker-selected-name">{value.firstName} {value.middleName ? value.middleName + ' ' : ''}{value.lastName}</div>
            <div className="rpicker-selected-addr">{value.address}{value.sitio ? ` · ${value.sitio}` : ''}</div>
            <div className="rpicker-selected-tags">
              {age != null && <span className="rpicker-tag rpicker-tag-blue">Age {age}</span>}
              {value.gender && <span className="rpicker-tag rpicker-tag-gray">{value.gender}</span>}
              {value.contactNumber && <span className="rpicker-tag rpicker-tag-gray">📞 {value.contactNumber}</span>}
              {value.isVoter  && <span className="rpicker-tag rpicker-tag-green">Voter</span>}
              {value.isSenior && <span className="rpicker-tag rpicker-tag-amber">Senior</span>}
              {value.isPWD    && <span className="rpicker-tag rpicker-tag-purple">PWD</span>}
              {value.is4Ps    && <span className="rpicker-tag rpicker-tag-orange">4Ps</span>}
            </div>
          </div>
          <button className="rpicker-change-btn" onClick={clear} title="Change resident">✎ Change</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rpicker-wrap" ref={wrapRef}>
      <div className="rpicker-input-wrap">
        <span className="rpicker-icon">🔍</span>
        <input
          className="rpicker-input"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query && setOpen(true)}
          autoComplete="off"
        />
        {query && <button className="rpicker-clear-btn" onClick={() => { setQuery(''); setOpen(false); }}>✕</button>}
      </div>
      {open && filtered.length > 0 && (
        <div className="rpicker-dropdown">
          {filtered.map(r => {
            const age = r.birthDate ? calcAge(r.birthDate) : null;
            return (
              <div key={r.id} className="rpicker-item" onClick={() => select(r)}>
                <div className="rpicker-item-avatar">{r.firstName.charAt(0)}{r.lastName.charAt(0)}</div>
                <div className="rpicker-item-body">
                  <div className="rpicker-item-name">{r.lastName}, {r.firstName} {r.middleName}</div>
                  <div className="rpicker-item-meta">
                    {r.sitio && <span>{r.sitio}</span>}
                    {age != null && <span>Age {age}</span>}
                    {r.contactNumber && <span>📞 {r.contactNumber}</span>}
                  </div>
                  <div className="rpicker-item-tags">
                    {r.isSenior && <span className="rpicker-tag rpicker-tag-amber">Senior</span>}
                    {r.isPWD    && <span className="rpicker-tag rpicker-tag-purple">PWD</span>}
                    {r.is4Ps    && <span className="rpicker-tag rpicker-tag-orange">4Ps</span>}
                    {r.isVoter  && <span className="rpicker-tag rpicker-tag-green">Voter</span>}
                  </div>
                </div>
                <div className="rpicker-item-id">#{r.id}</div>
              </div>
            );
          })}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="rpicker-dropdown">
          <div className="rpicker-no-result">No residents found for "{query}"</div>
        </div>
      )}
    </div>
  );
}
