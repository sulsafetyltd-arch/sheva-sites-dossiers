import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDeal } from '@/lib/real-estate-store';
import { DEAL_TYPE_LABEL } from '@/lib/real-estate-utils';
import { Field } from '@/components/real-estate/Field';
import type { DealType } from '@/types/real-estate';

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewDealDialog({ open, onOpenChange }: NewDealDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DealType>('purchase');
  const [consideration, setConsideration] = useState('');
  const [attorney, setAttorney] = useState('');

  const reset = () => {
    setTitle('');
    setConsideration('');
    setAttorney('');
    setType('purchase');
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const deal = createDeal({
      title: title.trim(),
      type,
      consideration: Number(consideration) || 0,
      attorney,
    });
    reset();
    onOpenChange(false);
    navigate(`/deals/${deal.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
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
            <Field label="מהות העסקה">
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
          <Field label="בטיפול של">
            <Input value={attorney} onChange={(e) => setAttorney(e.target.value)} placeholder="שם עורך הדין" />
          </Field>
          <Button className="w-full" disabled={!title.trim()} onClick={handleCreate}>
            פתח תיק
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
