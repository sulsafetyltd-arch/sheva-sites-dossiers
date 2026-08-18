import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getAllDeals } from '@/lib/real-estate-store';
import { DEAL_STATUS_LABEL } from '@/lib/real-estate-utils';

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return getAllDeals()
      .filter((deal) => {
        const haystack = [
          deal.title,
          deal.fileNumber,
          deal.property.address,
          deal.property.city,
          deal.property.block,
          deal.property.parcel,
          deal.responsibleAttorney,
          ...deal.parties.flatMap((p) => [p.name, p.idNumber, p.phone]),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [query]);

  return (
    <div ref={boxRef} className="relative hidden md:block w-64 lg:w-80">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="חיפוש תיק, לקוח, גוש/חלקה…"
        className="w-full rounded-lg border bg-card pr-9 pl-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute top-full right-0 left-0 mt-1 rounded-lg border bg-card shadow-lg z-30 overflow-hidden">
          {results.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">לא נמצאו תיקים</p>
          )}
          {results.map((deal) => (
            <button
              key={deal.id}
              className="w-full text-right px-3 py-2.5 hover:bg-muted/60 border-b last:border-0"
              onClick={() => {
                setOpen(false);
                setQuery('');
                navigate(`/deals/${deal.id}`);
              }}
            >
              <p className="text-sm font-medium truncate">{deal.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {deal.fileNumber} · {DEAL_STATUS_LABEL[deal.status]}
                {deal.parties.length > 0 ? ` · ${deal.parties.map((p) => p.name).filter(Boolean).join(', ')}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
