import { useMemo, useState } from 'react';
import { Check, ListChecks, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CatalogDefect,
  getDomain,
  SAFETY_DOMAINS,
  SEVERITY_LABELS,
} from '@/data/safety-domains';
import { catalogDefectToDetection } from '@/lib/catalog-detection';
import { AiDetection, SafetyDomain, Severity } from '@/types/safety-report';
import { cn } from '@/lib/utils';

const severityClass: Record<Severity, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-600 text-white',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

interface Props {
  /** Domain of the current inspection – selected by default */
  domain: SafetyDomain;
  /** Already added catalog ids (to show as selected / skip duplicates) */
  existingCatalogIds?: string[];
  onAdd: (detections: AiDetection[]) => void;
}

export function DefectCatalogPicker({ domain, existingCatalogIds = [], onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState<SafetyDomain>(domain);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const domainInfo = getDomain(activeDomain);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const defects = domainInfo.defects.filter((d) => {
      if (!q) return true;
      return (
        d.title.includes(search.trim()) ||
        d.category.includes(search.trim()) ||
        d.description.includes(search.trim()) ||
        d.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });

    const map = new Map<string, CatalogDefect[]>();
    for (const d of defects) {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    }
    return Array.from(map.entries());
  }, [domainInfo.defects, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setActiveDomain(domain);
      setSelected(new Set());
      setSearch('');
    }
  };

  const handleAdd = () => {
    const chosen = domainInfo.defects.filter((d) => selected.has(d.id));
    if (chosen.length === 0) {
      toast.error('בחרו לפחות ליקוי אחד');
      return;
    }

    const fresh = chosen.filter((d) => !existingCatalogIds.includes(d.id));
    if (fresh.length === 0) {
      toast.message('הליקויים שנבחרו כבר קיימים בדוח');
      setOpen(false);
      return;
    }

    onAdd(fresh.map(catalogDefectToDetection));
    toast.success(`נוספו ${fresh.length} ליקויים מ${domainInfo.shortLabel}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full gap-2">
          <ListChecks className="h-4 w-4" />
          בחר ליקויים מרשימה לפי תחום
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-4 py-3 text-right">
          <DialogTitle>רשימת ליקויים לפי תחום</DialogTitle>
          <p className="text-xs text-muted-foreground">
            כל תחום מציג רק ליקויים רלוונטיים אליו. ניתן לסמן כמה פריטים יחד.
          </p>
        </DialogHeader>

        <div className="space-y-3 border-b px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SAFETY_DOMAINS.map((d) => {
              const active = activeDomain === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setActiveDomain(d.id);
                    setSelected(new Set());
                    setSearch('');
                  }}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-muted',
                  )}
                >
                  {d.shortLabel}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder={`חיפוש ב${domainInfo.label}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {domainInfo.label}: {domainInfo.description}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2">
          <div className="space-y-4 px-2 py-3">
            {grouped.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">לא נמצאו ליקויים</p>
            ) : (
              grouped.map(([category, defects]) => (
                <section key={category}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h3>
                  <ul className="space-y-2">
                    {defects.map((d) => {
                      const already = existingCatalogIds.includes(d.id);
                      const checked = selected.has(d.id) || already;
                      return (
                        <li key={d.id}>
                          <label
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                              checked ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/40',
                              already && 'opacity-70',
                            )}
                          >
                            <Checkbox
                              className="mt-1"
                              checked={checked}
                              disabled={already}
                              onCheckedChange={() => {
                                if (!already) toggle(d.id);
                              }}
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge className={severityClass[d.severity]}>
                                  {SEVERITY_LABELS[d.severity]}
                                </Badge>
                                {already && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Check className="h-3 w-3" />
                                    בדוח
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-semibold leading-snug">{d.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {d.description}
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t p-3 sm:justify-between">
          <p className="text-xs text-muted-foreground self-center">
            נבחרו {selected.size}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="button" disabled={selected.size === 0} onClick={handleAdd}>
              הוסף לדוח
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
