import { useState } from 'react';
import { PenLine, Calendar, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import SignaturePad from './SignaturePad';

export interface SignatureData {
  name: string;
  date: string;
  signatureDataUrl: string | null;
}

interface SignatureRole {
  key: string;
  label: string;
  description: string;
}

const SIGNATURE_ROLES: SignatureRole[] = [
  { key: 'preparer', label: 'מכין התיק', description: 'האחראי על הכנת תיק השטח' },
  { key: 'checker', label: 'בודק', description: 'בודק מקצועי של התיק' },
  { key: 'approver', label: 'מאשר', description: 'הגורם המאשר את התיק' },
  { key: 'client', label: 'לקוח', description: 'נציג הלקוח / בעל הנכס' },
];

interface Props {
  signatures: Record<string, SignatureData>;
  onChange: (signatures: Record<string, SignatureData>) => void;
}

export default function SignatureBlock({ signatures, onChange }: Props) {
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [tempSig, setTempSig] = useState<string | null>(null);

  const openSign = (role: SignatureRole) => {
    const existing = signatures[role.key];
    setTempName(existing?.name ?? '');
    setTempDate(existing?.date ?? new Date().toISOString().split('T')[0]);
    setTempSig(existing?.signatureDataUrl ?? null);
    setActiveRole(role.key);
  };

  const save = () => {
    if (!activeRole) return;
    onChange({
      ...signatures,
      [activeRole]: { name: tempName, date: tempDate, signatureDataUrl: tempSig },
    });
    setActiveRole(null);
  };

  const remove = (key: string) => {
    const updated = { ...signatures };
    delete updated[key];
    onChange(updated);
  };

  const activeRoleDef = SIGNATURE_ROLES.find(r => r.key === activeRole);

  return (
    <div className="space-y-4 mt-8">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <PenLine className="w-4 h-4" />
        חתימות
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SIGNATURE_ROLES.map(role => {
          const sig = signatures[role.key];
          return (
            <div
              key={role.key}
              className="border rounded-lg p-4 bg-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
                {sig?.signatureDataUrl && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(role.key)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {sig?.signatureDataUrl ? (
                <div className="space-y-2">
                  <div className="border rounded bg-white p-2">
                    <img src={sig.signatureDataUrl} alt={`חתימת ${role.label}`} className="max-h-16 mx-auto" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {sig.name || '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {sig.date || '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-dashed"
                  onClick={() => openSign(role)}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  הוסף חתימה
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Signature dialog */}
      <Dialog open={!!activeRole} onOpenChange={o => !o && setActiveRole(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>חתימת {activeRoleDef?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1 block">שם מלא</Label>
                <Input value={tempName} onChange={e => setTempName(e.target.value)} placeholder="שם החותם" />
              </div>
              <div>
                <Label className="text-sm mb-1 block">תאריך</Label>
                <Input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1 block">חתימה</Label>
              <SignaturePad value={tempSig ?? undefined} onChange={setTempSig} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={!tempSig || !tempName}>
              שמור חתימה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
