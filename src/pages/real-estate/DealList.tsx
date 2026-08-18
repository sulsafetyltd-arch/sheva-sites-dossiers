import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDeal, deleteDeal, duplicateDeal, getAllDeals } from '@/lib/real-estate-store';
import {
  DEAL_STATUS_LABEL,
  DEAL_TYPE_LABEL,
  formatMoney,
  formatShortDate,
  statusBadgeClass,
} from '@/lib/real-estate-utils';
import { Field } from '@/components/real-estate/Field';
import type { Deal, DealStatus, DealType } from '@/types/real-estate';

const DealList = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [deals, setDeals] = useState<Deal[]>(() => getAllDeals());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(params.get('new') === '1');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DealType>('purchase');
  const [consideration, setConsideration] = useState('');
  const [attorney, setAttorney] = useState('');

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const q = search.trim();
      const matchesSearch =
        !q ||
        d.title.includes(q) ||
        d.fileNumber.includes(q) ||
        d.property.city.includes(q) ||
        d.property.address.includes(q) ||
        d.responsibleAttorney.includes(q);
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesType = typeFilter === 'all' || d.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deals, search, statusFilter, typeFilter]);

  const refresh = () => setDeals(getAllDeals());

  const handleCreate = () => {
    if (!title.trim()) return;
    const deal = createDeal({
      title: title.trim(),
      type,
      consideration: Number(consideration) || 0,
      attorney,
    });
    setTitle('');
    setConsideration('');
    setAttorney('');
    setDialogOpen(false);
    setParams({});
    navigate(`/real-estate/deals/${deal.id}`);
  };

  return (
    <main className="container py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">עסקאות</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} תיקים</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          עסקה חדשה
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מספר תיק, עיר..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="סוג עסקה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(DEAL_TYPE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(DEAL_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">לא נמצאו עסקאות</p>
            <p className="text-sm mt-1">שנו סינון או פתחו תיק חדש</p>
          </div>
        )}
        {filtered.map((deal) => (
          <div
            key={deal.id}
            className="bg-card rounded-lg border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <button
              className="text-right flex-1 min-w-0"
              onClick={() => navigate(`/real-estate/deals/${deal.id}`)}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs tabular-nums text-muted-foreground">{deal.fileNumber}</span>
                <h3 className="font-semibold">{deal.title}</h3>
                <Badge variant="outline" className={statusBadgeClass(deal.status as DealStatus)}>
                  {DEAL_STATUS_LABEL[deal.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {DEAL_TYPE_LABEL[deal.type]}
                {deal.property.city ? ` · ${deal.property.city}` : ''}
                {deal.property.block ? ` · גוש ${deal.property.block} חלקה ${deal.property.parcel}` : ''}
                {` · ${formatMoney(deal.consideration)}`}
                {` · עודכן ${formatShortDate(deal.updatedAt.slice(0, 10))}`}
              </p>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                title="שכפול"
                onClick={() => {
                  duplicateDeal(deal.id);
                  refresh();
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="מחיקה">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>מחיקת תיק</AlertDialogTitle>
                    <AlertDialogDescription>
                      האם למחוק את "{deal.title}"? הפעולה אינה ניתנת לביטול.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteDeal(deal.id);
                        refresh();
                      }}
                    >
                      מחק
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setParams({});
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>פתיחת עסקה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="שם התיק / תיאור העסקה">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="למשל: רכישת דירה ברחוב ביאליק 12"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="סוג עסקה">
                <Select value={type} onValueChange={(v) => setType(v as DealType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEAL_TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="תמורה (₪)">
                <Input
                  type="number"
                  min={0}
                  value={consideration}
                  onChange={(e) => setConsideration(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Field label="עו״ד אחראי/ת">
              <Input value={attorney} onChange={(e) => setAttorney(e.target.value)} placeholder="שם עורך הדין" />
            </Field>
            <Button className="w-full" disabled={!title.trim()} onClick={handleCreate}>
              פתח תיק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default DealList;
