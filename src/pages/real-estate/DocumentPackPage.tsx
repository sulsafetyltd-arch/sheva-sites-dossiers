import { useMemo, useRef, useState } from 'react';

import { Link, useParams } from 'react-router-dom';
import { ArrowRight, FileDown, PenLine, PencilLine, Printer, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SignaturePad } from '@/components/real-estate/SignaturePad';
import { downloadAsWord } from '@/lib/word-export';
import { getDeal } from '@/lib/real-estate-store';
import { getOfficeProfile } from '@/lib/office-profile';
import { buildDocContext, missingDocFields } from '@/lib/legal-doc-context';
import { buildDocumentPack, renderCustomDocuments } from '@/data/legal-document-pack';
import { getCustomTemplates } from '@/lib/custom-templates';
import { REPRESENTED_SIDE_LABEL, representedSide } from '@/lib/document-audience';
import { clearDocOverride, getDocOverrides, saveDocOverride } from '@/lib/doc-overrides';
import soloLogoUrl from '@/assets/solo-logo.svg';

const DocumentPackPage = () => {
  const { id } = useParams();
  const deal = id ? getDeal(id) : undefined;
  const office = useMemo(() => {
    const profile = getOfficeProfile();
    // The bundled office logo is used unless a custom one was uploaded in the Users screen.
    return { ...profile, logoDataUrl: profile.logoDataUrl?.trim() ? profile.logoDataUrl : soloLogoUrl };
  }, []);
  const [active, setActive] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [overrideVersion, setOverrideVersion] = useState(0);
  const [signOpen, setSignOpen] = useState(false);
  const editableRef = useRef<HTMLElement | null>(null);

  if (!deal) {
    return (
      <p className="text-center text-muted-foreground py-16">התיק לא נמצא</p>
    );
  }

  const ctx = buildDocContext(deal, office);
  const missing = missingDocFields(ctx);
  const side = representedSide(deal.clientSide);
  const pack = [
    ...buildDocumentPack(ctx, side, deal.type),
    ...renderCustomDocuments(ctx, getCustomTemplates(), side),
  ];
  const overrides = getDocOverrides(deal.id);
  const current = pack.find((d) => d.id === active) ?? pack[0];

  const commitEdit = () => {
    if (editableRef.current && current) {
      saveDocOverride(deal.id, current.id, editableRef.current.innerHTML);
      setOverrideVersion((v) => v + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/deals/${deal.id}`} className="text-sm text-primary inline-flex items-center gap-1 mb-1">
            <ArrowRight className="w-4 h-4" />
            חזרה לתיק
          </Link>
          <h2 className="text-xl font-bold">סט מסמכים אוטומטי</h2>
          <p className="text-sm text-muted-foreground">
            {deal.fileNumber} · {REPRESENTED_SIDE_LABEL[side]} · {pack.length} מסמכים · {ctx.buyerNames} ← {ctx.sellerNames}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={editing ? 'default' : 'outline'}
            onClick={() => {
              if (editing) {
                commitEdit();
                toast.success('העריכה נשמרה — תודפס כפי שערכתם');
              }
              setEditing((v) => !v);
            }}
          >
            <PencilLine className="w-4 h-4" />
            {editing ? 'סיום עריכה ושמירה' : 'עריכת המסמך'}
          </Button>
          {current && overrides[current.id] && !editing && (
            <Button
              variant="ghost"
              onClick={() => {
                clearDocOverride(deal.id, current.id);
                setOverrideVersion((v) => v + 1);
                toast.success('הנוסח המקורי שוחזר');
              }}
            >
              <RotateCcw className="w-4 h-4" />
              שחזור נוסח מקורי
            </Button>
          )}
          <Button variant="outline" onClick={() => setSignOpen(true)} disabled={!current}>
            <PenLine className="w-4 h-4" />
            החתמה על המסך
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!current) return;
              if (editing) commitEdit();
              const html = getDocOverrides(deal.id)[current.id] ?? current.html;
              downloadAsWord(`${current.title} - ${deal.fileNumber}`, html);
              toast.success('המסמך ירד כקובץ Word');
            }}
            disabled={!current}
          >
            <FileDown className="w-4 h-4" />
            הורדה כ-Word
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (editing) commitEdit();
              window.print();
            }}
          >
            <Printer className="w-4 h-4" />
            הדפס / PDF לכל הסט
          </Button>
        </div>
      </div>

      <SignaturePad
        open={signOpen}
        onOpenChange={setSignOpen}
        onSave={(dataUrl, signerName) => {
          if (!current) return;
          const base = overrides[current.id] ?? current.html;
          const signedAt = new Date().toLocaleDateString('he-IL');
          const block = `<div class="sig-block" style="margin-top:24px;text-align:right;"><img src="${dataUrl}" alt="חתימה" style="max-width:220px;max-height:90px;display:block;" /><p style="margin:4px 0 0;">${signerName ? `${signerName} · ` : ''}נחתם ביום ${signedAt}</p></div>`;
          saveDocOverride(deal.id, current.id, base + block);
          setOverrideVersion((v) => v + 1);
          toast.success('החתימה שולבה בתחתית המסמך');
        }}
      />

      <div className="no-print re-card p-4 text-sm">
        <p className="font-medium">
          {deal.type === 'rental' && 'עסקת שכירות — מוצג סט השכירות (הסכם, שטר חוב, ערבות ופרוטוקול).'}
          {deal.type !== 'rental' && side === 'buyer' && 'מוצגים רק מסמכי הקונה — לפי «צד הלקוח» בתיק.'}
          {deal.type !== 'rental' && side === 'seller' && 'מוצגים רק מסמכי המוכר — לפי «צד הלקוח» בתיק.'}
          {deal.type !== 'rental' && side === 'both' && 'מוצגים מסמכי הקונה והמוכר — הייצוג בתיק הוא שני הצדדים.'}
        </p>
        <p className="text-muted-foreground mt-1">
          אפשר לערוך כל מסמך לפני ההדפסה בכפתור «עריכת המסמך». מסמך שנערך מסומן ונשמר לתיק.
        </p>
      </div>

      {missing.length > 0 && (
        <div className="no-print re-card p-4 text-sm">
          <p className="font-medium mb-1">חסרים פרטים — המסמכים יופקו עם קווים למילוי:</p>
          <p className="text-muted-foreground">{missing.join(' · ')}</p>
          <p className="text-muted-foreground mt-1">השלימו שמות ות.ז. בצדדים, ופרטי עו״ד במסך משתמשים.</p>
        </div>
      )}

      <div className="no-print space-y-3">
        {Object.entries(
          pack.reduce<Record<string, typeof pack>>((acc, doc) => {
            (acc[doc.group] ??= []).push(doc);
            return acc;
          }, {}),
        ).map(([group, docs]) => (
          <div key={group}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group}</p>
            <div className="flex flex-wrap gap-2">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    if (editing) commitEdit();
                    setActive(doc.id);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    current?.id === doc.id ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                  }`}
                >
                  {doc.title}
                  {overrides[doc.id] ? ' ✎' : ''}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="legal-print-root">
        {pack.map((doc) => {
          const isCurrent = doc.id === current?.id;
          const html = overrides[doc.id] ?? doc.html;
          return (
            <article
              key={`${doc.id}-${overrideVersion}`}
              ref={isCurrent ? (el) => { editableRef.current = el; } : undefined}
              className={`legal-doc ${isCurrent ? '' : 'print-only-doc'} ${isCurrent && editing ? 'doc-editing' : ''}`}
              contentEditable={isCurrent && editing}
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DocumentPackPage;
