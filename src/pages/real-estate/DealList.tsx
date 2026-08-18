import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { deleteDeal, duplicateDeal, getAllDeals } from '@/lib/real-estate-store';
import {
  DEAL_STATUS_LABEL,
  DEAL_TYPE_LABEL,
  formatMoney,
  primaryClientName,
  propertySummary,
  statusBadgeClass,
} from '@/lib/real-estate-utils';
import type { Deal } from '@/types/real-estate';

const DealList = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>(() => getAllDeals());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const q = search.trim();
      const matchesSearch =
        !q ||
        d.title.includes(q) ||
        d.fileNumber.includes(q) ||
        d.property.city.includes(q) ||
        d.property.address.includes(q) ||
        d.responsibleAttorney.includes(q) ||
        primaryClientName(d).includes(q);
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesType = typeFilter === 'all' || d.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deals, search, statusFilter, typeFilter]);

  const refresh = () => setDeals(getAllDeals());

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי נכס, לקוח, מספר תיק..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-card"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="מהות העסקה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(DEAL_TYPE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="שלב העסקה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל השלבים</SelectItem>
            {Object.entries(DEAL_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section className="re-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="re-table text-right">
                <th className="px-4 py-3">פרטי נכס</th>
                <th className="px-4 py-3">שם לקוח</th>
                <th className="px-4 py-3">מהות העסקה</th>
                <th className="px-4 py-3">בטיפול של</th>
                <th className="px-4 py-3">שלב העסקה</th>
                <th className="px-4 py-3">תמורה</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    לא נמצאו עסקאות
                  </td>
                </tr>
              )}
              {filtered.map((deal) => (
                <tr key={deal.id} className="border-t hover:bg-muted/40">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/real-estate/deals/${deal.id}`)}>
                    <p className="font-medium">{propertySummary(deal)}</p>
                    <p className="text-xs text-muted-foreground">{deal.fileNumber}</p>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/real-estate/deals/${deal.id}`)}>
                    {primaryClientName(deal)}
                  </td>
                  <td className="px-4 py-3">{DEAL_TYPE_LABEL[deal.type]}</td>
                  <td className="px-4 py-3">{deal.responsibleAttorney || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusBadgeClass(deal.status)}>
                      {DEAL_STATUS_LABEL[deal.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(deal.consideration)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DealList;
