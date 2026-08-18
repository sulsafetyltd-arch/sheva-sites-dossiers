import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileStack, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addTimeline, getDeal, saveDeal } from '@/lib/real-estate-store';
import { newId } from '@/data/real-estate-checklists';
import { Field, ProgressBar } from '@/components/real-estate/Field';
import {
  CLIENT_SIDE_LABEL,
  DEAL_STATUS_LABEL,
  DEAL_TYPE_LABEL,
  DOCUMENT_CATEGORY_LABEL,
  PARTY_ROLE_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  PRIORITY_LABEL,
  PROPERTY_TYPE_LABEL,
  dealProgress,
  effectivePaymentStatus,
  formatDateHe,
  formatMoney,
  isOverdueDate,
  statusBadgeClass,
  todayIso,
} from '@/lib/real-estate-utils';
import type {
  ChecklistItem,
  Deal,
  DealStatus,
  DealTask,
  DealType,
  Party,
  ClientSide,
  PartyRole,
  PaymentStatus,
  PaymentType,
  PropertyType,
  TaskPriority,
  DocumentCategory,
} from '@/types/real-estate';

function groupChecklist(items: ChecklistItem[]) {
  const map = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()];
}

const DealEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    const found = getDeal(id);
    setDeal(found ?? null);
    setDirty(false);
  }, [id]);

  const progress = useMemo(() => (deal ? dealProgress(deal) : 0), [deal]);

  if (!deal) {
    return (
      <main className="py-16 text-center space-y-4">
        <p className="text-muted-foreground">התיק לא נמצא</p>
        <Button variant="outline" onClick={() => navigate('/deals')}>
          חזרה לרשימה
        </Button>
      </main>
    );
  }

  const update = (patch: Partial<Deal>) => {
    setDeal({ ...deal, ...patch });
    setDirty(true);
  };

  const persist = (next = deal, note?: { title: string; body?: string }) => {
    const saved = note ? addTimeline({ ...next }, note.title, note.body ?? '') : saveDeal(next);
    setDeal(saved);
    setDirty(false);
    toast.success('התיק נשמר');
    return saved;
  };

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Button variant="ghost" size="sm" className="px-0 h-auto" onClick={() => navigate('/deals')}>
            <ArrowRight className="w-4 h-4" />
            כל העסקאות
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">{deal.fileNumber}</span>
            <h2 className="text-2xl font-bold">{deal.title || 'תיק ללא שם'}</h2>
            <Badge variant="outline" className={statusBadgeClass(deal.status)}>
              {DEAL_STATUS_LABEL[deal.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {DEAL_TYPE_LABEL[deal.type]} · {deal.responsibleAttorney || 'ללא עו״ד אחראי'} · התקדמות {progress}%
          </p>
          <div className="max-w-md pt-1">
            <ProgressBar value={progress} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/deals/${deal.id}/documents`)}>
            <FileStack className="w-4 h-4" />
            הפק סט מסמכים
          </Button>
          <Button className="gap-2" onClick={() => persist()} disabled={!dirty}>
            <Save className="w-4 h-4" />
            {dirty ? 'שמירה' : 'נשמר'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="details">פרטי עסקה</TabsTrigger>
          <TabsTrigger value="property">נכס</TabsTrigger>
          <TabsTrigger value="parties">צדדים</TabsTrigger>
          <TabsTrigger value="payments">תשלומים</TabsTrigger>
          <TabsTrigger value="checklist">בדיקות</TabsTrigger>
          <TabsTrigger value="docs">מסמכים</TabsTrigger>
          <TabsTrigger value="tasks">משימות</TabsTrigger>
          <TabsTrigger value="log">יומן תיק</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="re-card p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="שם התיק" className="md:col-span-2">
              <Input value={deal.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>
            <Field label="מספר תיק">
              <Input value={deal.fileNumber} onChange={(e) => update({ fileNumber: e.target.value })} />
            </Field>
            <Field label="עו״ד אחראי/ת">
              <Input value={deal.responsibleAttorney} onChange={(e) => update({ responsibleAttorney: e.target.value })} />
            </Field>
            <Field label="סוג עסקה">
              <Select value={deal.type} onValueChange={(v) => update({ type: v as DealType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEAL_TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="צד הלקוח">
              <Select value={deal.clientSide} onValueChange={(v) => update({ clientSide: v as ClientSide })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_SIDE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="סטטוס">
              <Select
                value={deal.status}
                onValueChange={(v) => {
                  const status = v as DealStatus;
                  update({ status });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEAL_STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="תמורה / דמי שכירות (₪)">
              <Input
                type="number"
                min={0}
                value={deal.consideration || ''}
                onChange={(e) => update({ consideration: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="תאריך פתיחה">
              <Input type="date" value={deal.openedAt} onChange={(e) => update({ openedAt: e.target.value })} />
            </Field>
            <Field label="תאריך חתימת הסכם">
              <Input type="date" value={deal.contractDate ?? ''} onChange={(e) => update({ contractDate: e.target.value })} />
            </Field>
            <Field label="מועד מסירה / סגירה">
              <Input type="date" value={deal.closingDate ?? ''} onChange={(e) => update({ closingDate: e.target.value })} />
            </Field>
            <Field label="מועד רישום">
              <Input type="date" value={deal.registrationDate ?? ''} onChange={(e) => update({ registrationDate: e.target.value })} />
            </Field>
            <Field label="הערות כלליות" className="md:col-span-2">
              <Textarea
                rows={4}
                value={deal.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="הערות פנימיות לתיק..."
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="property" className="re-card p-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="כתובת" className="md:col-span-2">
              <Input
                value={deal.property.address}
                onChange={(e) => update({ property: { ...deal.property, address: e.target.value } })}
              />
            </Field>
            <Field label="עיר">
              <Input
                value={deal.property.city}
                onChange={(e) => update({ property: { ...deal.property, city: e.target.value } })}
              />
            </Field>
            <Field label="סוג נכס">
              <Select
                value={deal.property.type}
                onValueChange={(v) => update({ property: { ...deal.property, type: v as PropertyType } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="גוש">
              <Input
                value={deal.property.block}
                onChange={(e) => update({ property: { ...deal.property, block: e.target.value } })}
              />
            </Field>
            <Field label="חלקה">
              <Input
                value={deal.property.parcel}
                onChange={(e) => update({ property: { ...deal.property, parcel: e.target.value } })}
              />
            </Field>
            <Field label="תת-חלקה">
              <Input
                value={deal.property.subParcel}
                onChange={(e) => update({ property: { ...deal.property, subParcel: e.target.value } })}
              />
            </Field>
            <Field label="לשכת רישום">
              <Input
                value={deal.property.registryOffice}
                onChange={(e) => update({ property: { ...deal.property, registryOffice: e.target.value } })}
              />
            </Field>
            <Field label="קומה">
              <Input
                value={deal.property.floor}
                onChange={(e) => update({ property: { ...deal.property, floor: e.target.value } })}
              />
            </Field>
            <Field label="חדרים">
              <Input
                value={deal.property.rooms}
                onChange={(e) => update({ property: { ...deal.property, rooms: e.target.value } })}
              />
            </Field>
            <Field label={'שטח (מ"ר)'}>
              <Input
                value={deal.property.area}
                onChange={(e) => update({ property: { ...deal.property, area: e.target.value } })}
              />
            </Field>
            <Field label="מהות הזכות">
              <Input
                value={deal.property.rights}
                onChange={(e) => update({ property: { ...deal.property, rights: e.target.value } })}
                placeholder="בעלות / חכירה / דיירות מוגנת"
              />
            </Field>
            <Field label="תיאור הנכס" className="md:col-span-2">
              <Textarea
                rows={4}
                value={deal.property.description}
                onChange={(e) => update({ property: { ...deal.property, description: e.target.value } })}
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="parties" className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                update({
                  parties: [
                    ...deal.parties,
                    { id: newId(), role: 'buyer', name: '', idNumber: '', phone: '', email: '', address: '', notes: '' },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4" />
              צד חדש
            </Button>
          </div>
          {deal.parties.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">אין צדדים בתיק</p>
          )}
          {deal.parties.map((party, idx) => (
            <div key={party.id} className="re-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-medium">{party.name || `צד ${idx + 1}`}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ parties: deal.parties.filter((p) => p.id !== party.id) })}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="תפקיד">
                  <Select
                    value={party.role}
                    onValueChange={(v) => {
                      const parties = deal.parties.map((p) =>
                        p.id === party.id ? { ...p, role: v as PartyRole } : p,
                      );
                      update({ parties });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PARTY_ROLE_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="שם">
                  <PartyInput deal={deal} party={party} field="name" update={update} />
                </Field>
                <Field label="ת.ז / ח.פ">
                  <PartyInput deal={deal} party={party} field="idNumber" update={update} />
                </Field>
                <Field label="טלפון">
                  <PartyInput deal={deal} party={party} field="phone" update={update} />
                </Field>
                <Field label="דוא״ל">
                  <PartyInput deal={deal} party={party} field="email" update={update} />
                </Field>
                <Field label="כתובת">
                  <PartyInput deal={deal} party={party} field="address" update={update} />
                </Field>
                <Field label="הערות" className="md:col-span-2">
                  <PartyInput deal={deal} party={party} field="notes" update={update} area />
                </Field>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              שולם {formatMoney(deal.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))} מתוך {formatMoney(deal.payments.reduce((s, p) => s + p.amount, 0))}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                update({
                  payments: [
                    ...deal.payments,
                    { id: newId(), title: '', type: 'consideration', amount: 0, dueDate: todayIso(), status: 'pending', notes: '' },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4" />
              תשלום
            </Button>
          </div>
          {deal.payments.map((payment) => {
            const status = effectivePaymentStatus(payment);
            return (
              <div key={payment.id} className="re-card p-4 grid md:grid-cols-6 gap-3">
                <Field label="תיאור" className="md:col-span-2">
                  <Input
                    value={payment.title}
                    onChange={(e) =>
                      update({
                        payments: deal.payments.map((p) => (p.id === payment.id ? { ...p, title: e.target.value } : p)),
                      })
                    }
                  />
                </Field>
                <Field label="סוג">
                  <Select
                    value={payment.type}
                    onValueChange={(v) =>
                      update({
                        payments: deal.payments.map((p) => (p.id === payment.id ? { ...p, type: v as PaymentType } : p)),
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_TYPE_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="סכום">
                  <Input
                    type="number"
                    min={0}
                    value={payment.amount || ''}
                    onChange={(e) =>
                      update({
                        payments: deal.payments.map((p) =>
                          p.id === payment.id ? { ...p, amount: Number(e.target.value) || 0 } : p,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="לתשלום עד">
                  <Input
                    type="date"
                    value={payment.dueDate}
                    onChange={(e) =>
                      update({
                        payments: deal.payments.map((p) => (p.id === payment.id ? { ...p, dueDate: e.target.value } : p)),
                      })
                    }
                  />
                </Field>
                <Field label="סטטוס">
                  <Select
                    value={payment.status}
                    onValueChange={(v) => {
                      const nextStatus = v as PaymentStatus;
                      update({
                        payments: deal.payments.map((p) =>
                          p.id === payment.id
                            ? { ...p, status: nextStatus, paidDate: nextStatus === 'paid' ? todayIso() : p.paidDate }
                            : p,
                        ),
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="md:col-span-6 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {status === 'overdue' ? 'באיחור · ' : ''}
                    {payment.notes || 'אין הערה'}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      className="w-64"
                      placeholder="הערה"
                      value={payment.notes}
                      onChange={(e) =>
                        update({
                          payments: deal.payments.map((p) => (p.id === payment.id ? { ...p, notes: e.target.value } : p)),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => update({ payments: deal.payments.filter((p) => p.id !== payment.id) })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          {groupChecklist(deal.checklist).map(([group, items]) => (
            <section key={group} className="re-card p-4 space-y-2">
              <h3 className="font-semibold">{group}</h3>
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) =>
                      update({
                        checklist: deal.checklist.map((c) =>
                          c.id === item.id ? { ...c, done: Boolean(checked) } : c,
                        ),
                      })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={item.done ? 'text-muted-foreground line-through' : ''}>{item.label}</p>
                    <Input
                      className="mt-1 h-8 text-xs"
                      placeholder="הערה / ממצא"
                      value={item.notes}
                      onChange={(e) =>
                        update({
                          checklist: deal.checklist.map((c) =>
                            c.id === item.id ? { ...c, notes: e.target.value } : c,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </section>
          ))}
        </TabsContent>

        <TabsContent value="docs" className="space-y-3">
          <div className="re-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">סט מסמכים מובנה</p>
              <p className="text-sm text-muted-foreground">הסכם מכר, שטר מכר, ייפויי כוח, הערות אזהרה וטופס 7000 — לפי שמות הצדדים</p>
            </div>
            <Button onClick={() => navigate(`/deals/${deal.id}/documents`)}>
              <FileStack className="w-4 h-4" />
              הפקה אוטומטית
            </Button>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                update({
                  documents: [
                    ...deal.documents,
                    { id: newId(), title: '', category: 'other', received: false, notes: '' },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4" />
              מסמך
            </Button>
          </div>
          {deal.documents.map((doc) => (
            <div key={doc.id} className="re-card p-4 grid md:grid-cols-5 gap-3 items-end">
              <Field label="שם המסמך" className="md:col-span-2">
                <Input
                  value={doc.title}
                  onChange={(e) =>
                    update({
                      documents: deal.documents.map((d) => (d.id === doc.id ? { ...d, title: e.target.value } : d)),
                    })
                  }
                />
              </Field>
              <Field label="קטגוריה">
                <Select
                  value={doc.category}
                  onValueChange={(v) =>
                    update({
                      documents: deal.documents.map((d) =>
                        d.id === doc.id ? { ...d, category: v as DocumentCategory } : d,
                      ),
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_CATEGORY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="תאריך">
                <Input
                  type="date"
                  value={doc.date ?? ''}
                  onChange={(e) =>
                    update({
                      documents: deal.documents.map((d) => (d.id === doc.id ? { ...d, date: e.target.value } : d)),
                    })
                  }
                />
              </Field>
              <div className="flex items-center justify-between gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={doc.received}
                    onCheckedChange={(checked) =>
                      update({
                        documents: deal.documents.map((d) =>
                          d.id === doc.id ? { ...d, received: Boolean(checked), date: d.date || todayIso() } : d,
                        ),
                      })
                    }
                  />
                  התקבל
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => update({ documents: deal.documents.filter((d) => d.id !== doc.id) })}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                update({
                  tasks: [
                    ...deal.tasks,
                    { id: newId(), title: '', dueDate: todayIso(), done: false, priority: 'medium', notes: '' },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4" />
              משימה
            </Button>
          </div>
          {deal.tasks.map((task) => (
            <TaskRow key={task.id} task={task} deal={deal} update={update} />
          ))}
        </TabsContent>

        <TabsContent value="log" className="space-y-3">
          <LogComposer
            onAdd={(title, body) => {
              const saved = persist(deal, { title, body });
              setDeal(saved);
            }}
          />
          {deal.timeline.map((ev) => (
            <div key={ev.id} className="re-card p-4">
              <p className="text-xs text-muted-foreground">{formatDateHe(ev.date.slice(0, 10))}</p>
              <h4 className="font-semibold">{ev.title}</h4>
              {ev.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ev.body}</p>}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </main>
  );
};

function PartyInput({
  deal,
  party,
  field,
  update,
  area,
}: {
  deal: Deal;
  party: Party;
  field: keyof Party;
  update: (patch: Partial<Deal>) => void;
  area?: boolean;
}) {
  const value = String(party[field] ?? '');
  const onChange = (next: string) => {
    update({
      parties: deal.parties.map((p) => (p.id === party.id ? { ...p, [field]: next } : p)),
    });
  };
  if (area) return <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />;
  return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
}

function TaskRow({
  task,
  deal,
  update,
}: {
  task: DealTask;
  deal: Deal;
  update: (patch: Partial<Deal>) => void;
}) {
  const overdue = !task.done && isOverdueDate(task.dueDate);
  const patch = (next: Partial<DealTask>) =>
    update({ tasks: deal.tasks.map((t) => (t.id === task.id ? { ...t, ...next } : t)) });

  return (
    <div className={`re-card p-4 grid md:grid-cols-6 gap-3 ${overdue ? 'border-destructive/40' : ''}`}>
      <div className="md:col-span-3 flex items-start gap-3">
        <Checkbox
          className="mt-2"
          checked={task.done}
          onCheckedChange={(checked) =>
            patch({ done: Boolean(checked), doneAt: checked ? todayIso() : undefined })
          }
        />
        <Field label="משימה" className="flex-1">
          <Input value={task.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
      </div>
      <Field label="יעד">
        <Input type="date" value={task.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
      </Field>
      <Field label="עדיפות">
        <Select value={task.priority} onValueChange={(v) => patch({ priority: v as TaskPriority })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-end justify-end">
        <Button variant="ghost" size="icon" onClick={() => update({ tasks: deal.tasks.filter((t) => t.id !== task.id) })}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
      <Field label="הערות" className="md:col-span-6">
        <Input value={task.notes} onChange={(e) => patch({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

function LogComposer({ onAdd }: { onAdd: (title: string, body: string) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <div className="re-card p-4 space-y-3">
      <Field label="כותרת רשומה">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: שיחה עם עו״ד הצד שכנגד" />
      </Field>
      <Field label="פירוט">
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Button
        disabled={!title.trim()}
        onClick={() => {
          onAdd(title.trim(), body.trim());
          setTitle('');
          setBody('');
        }}
      >
        הוסף ליומן
      </Button>
    </div>
  );
}

export default DealEditor;
