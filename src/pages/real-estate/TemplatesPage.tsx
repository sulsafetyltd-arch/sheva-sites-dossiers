import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Download, Eye, FilePlus2, Pencil, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/real-estate/Field';
import {
  STARTER_TEMPLATES,
  deleteCustomTemplate,
  getCustomTemplates,
  saveCustomTemplate,
  type CustomTemplate,
} from '@/lib/custom-templates';
import { DOCUMENT_PACK_TITLES, renderCustomDocument } from '@/data/legal-document-pack';
import { buildDocContext } from '@/lib/legal-doc-context';
import { getOfficeProfile } from '@/lib/office-profile';
import { getAllDeals } from '@/lib/real-estate-store';
import { downloadVariablesList, templateVariableGroups } from '@/lib/template-variables';
import type { DocAudience } from '@/lib/document-audience';
import { newId } from '@/data/real-estate-checklists';

const AUDIENCE_LABEL: Record<DocAudience, string> = {
  buyer: 'מסמכי קונה',
  seller: 'מסמכי מוכר',
  both: 'שני הצדדים',
};

function emptyTemplate(): CustomTemplate {
  return { id: newId(), title: '', audience: 'both', body: '', updatedAt: '' };
}

async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.trim();
  }
  if (name.endsWith('.txt') || file.type.startsWith('text/')) {
    return (await file.text()).trim();
  }
  if (name.endsWith('.doc')) {
    throw new Error('קובץ .doc ישן אינו נתמך — שמרו אותו ב-Word בתור .docx והעלו שוב');
  }
  throw new Error('נתמכים קבצי Word (.docx) וטקסט (.txt) בלבד');
}

const TemplatesPage = () => {
  const [templates, setTemplates] = useState(() => getCustomTemplates());
  const [editing, setEditing] = useState<CustomTemplate | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showVars, setShowVars] = useState(false);
  const [importing, setImporting] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await extractFileText(file);
      if (!text) {
        toast.error('לא נמצא טקסט בקובץ');
        return;
      }
      setEditing({
        ...emptyTemplate(),
        title: file.name.replace(/\.(docx|txt)$/i, ''),
        body: text,
      });
      setShowVars(true);
      toast.success('הקובץ נטען לעורך — החליפו שמות ופרטים במשתנים ולחצו «שמירת תבנית»');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'קריאת הקובץ נכשלה');
    } finally {
      setImporting(false);
    }
  };

  const previewCtx = useMemo(() => {
    const deal = getAllDeals()[0];
    return deal ? buildDocContext(deal, getOfficeProfile()) : null;
  }, []);

  const preview = previewId
    ? templates.find((t) => t.id === previewId) ?? null
    : null;

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      toast.error('נדרשים שם תבנית ותוכן');
      return;
    }
    setTemplates(saveCustomTemplate(editing));
    setEditing(null);
    toast.success('התבנית נשמרה — תופיע בסט המסמכים של כל תיק מתאים');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          תבניות אישיות עם משתנים בעברית — {'{מספר_תיק}'}, {'{שם_קונה_1}'} וכו׳ — שמתמלאים אוטומטית מנתוני התיק
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowVars((v) => !v)}>
            <Eye className="w-4 h-4" />
            {showVars ? 'הסתר משתנים' : 'רשימת משתנים'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => downloadVariablesList()}>
            <Download className="w-4 h-4" />
            הורדת רשימת משתנים
          </Button>
          <input
            ref={uploadRef}
            type="file"
            accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              handleFileUpload(file);
            }}
          />
          <Button variant="outline" className="gap-2" disabled={importing} onClick={() => uploadRef.current?.click()}>
            <Upload className="w-4 h-4" />
            {importing ? 'טוען קובץ…' : 'העלאת קובץ Word / טקסט'}
          </Button>
          <Button className="gap-2" onClick={() => setEditing(emptyTemplate())}>
            <FilePlus2 className="w-4 h-4" />
            תבנית חדשה
          </Button>
        </div>
      </div>

      {showVars && (
        <section className="re-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">משתנים זמינים ({templateVariableGroups().reduce((s, [, v]) => s + v.length, 0)})</h2>
            <p className="text-sm text-muted-foreground">לחיצה על משתנה מעתיקה אותו — הדביקו בתוך התבנית</p>
          </div>
          {templateVariableGroups().map(([group, vars]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {vars.map((v) => (
                  <button
                    key={v.name}
                    title={v.desc}
                    className="rounded-md border bg-muted/40 hover:bg-accent px-2 py-1 text-xs font-mono inline-flex items-center gap-1"
                    onClick={() => {
                      navigator.clipboard?.writeText(`{${v.name}}`);
                      toast.success(`הועתק: {${v.name}}`);
                    }}
                  >
                    <Copy className="w-3 h-3 opacity-60" />
                    {`{${v.name}}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {editing && (
        <section className="re-card p-5 space-y-3">
          <h2 className="font-semibold">{templates.some((t) => t.id === editing.id) ? 'עריכת תבנית' : 'תבנית חדשה'}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="שם התבנית">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="למשל: מכתב דרישה להשלמת מסמכים"
              />
            </Field>
            <Field label="למי מיועד המסמך">
              <Select
                value={editing.audience}
                onValueChange={(v) => setEditing({ ...editing, audience: v as DocAudience })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="תוכן התבנית (עם משתנים בסוגריים מסולסלים)">
            <Textarea
              rows={14}
              dir="rtl"
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              placeholder={'לכבוד {שם_לקוח}\n\nהנדון: תיק {מספר_תיק} — {כתובת_נכס_מלאה}\n\n...'}
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save}>שמירת תבנית</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>ביטול</Button>
          </div>
        </section>
      )}

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">התבניות שלי ({templates.length})</h2>
            <p className="text-sm text-muted-foreground">מופיעות בקבוצה «תבניות שלי» בסט המסמכים של כל תיק</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const existing = new Set(getCustomTemplates().map((t) => t.title));
              let added = 0;
              for (const starter of STARTER_TEMPLATES) {
                if (!existing.has(starter.title)) {
                  saveCustomTemplate({ ...starter, id: newId(), updatedAt: '' });
                  added += 1;
                }
              }
              setTemplates(getCustomTemplates());
              toast.success(added > 0 ? `נוספו ${added} תבניות מוכנות` : 'כל התבניות המוכנות כבר קיימות');
            }}
          >
            <Sparkles className="w-4 h-4" />
            הוספת תבניות מוכנות
          </Button>
        </div>
        {templates.length === 0 && (
          <p className="px-5 py-12 text-center text-muted-foreground text-sm">
            אין תבניות אישיות עדיין — לחצו «תבנית חדשה» או «הוספת תבניות מוכנות»
          </p>
        )}
        <div className="divide-y">
          {templates.map((t) => (
            <div key={t.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="secondary" className="ml-1">{AUDIENCE_LABEL[t.audience]}</Badge>
                  {t.body.slice(0, 80).replace(/\n/g, ' ')}…
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" title="תצוגה מקדימה" onClick={() => setPreviewId(previewId === t.id ? null : t.id)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" title="עריכה" onClick={() => setEditing({ ...t })}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="מחיקה"
                  onClick={() => {
                    setTemplates(deleteCustomTemplate(t.id));
                    if (previewId === t.id) setPreviewId(null);
                    toast.success('התבנית נמחקה');
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {preview && previewCtx && (
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">
            תצוגה מקדימה עם נתוני התיק האחרון — כך ייראה המסמך בהפקה:
          </p>
          <article
            className="legal-doc"
            dangerouslySetInnerHTML={{ __html: renderCustomDocument(previewCtx, preview).html }}
          />
        </section>
      )}

      <section className="re-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">תבניות מערכת ({DOCUMENT_PACK_TITLES.length})</h2>
          <p className="text-sm text-muted-foreground">
            הסט המובנה — מופק אוטומטית לפי צד הייצוג וסוג העסקה; ניתן לערוך כל מסמך לפני הדפסה בעמוד ההפקה
          </p>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-1.5">
          {DOCUMENT_PACK_TITLES.map((title) => (
            <Badge key={title} variant="outline" className="font-normal">{title}</Badge>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TemplatesPage;
