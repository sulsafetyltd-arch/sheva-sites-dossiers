import { useState } from 'react';
import { BookOpen, Plus, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { contentLibrary, contentCategories, ContentBlock } from '@/data/content-library';

interface Props {
  sectionId: string;
  onInsert: (fieldKey: string, content: string) => void;
}

const ContentLibraryDialog = ({ sectionId, onInsert }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const relevant = contentLibrary.filter(block => {
    if (block.targetSection !== sectionId) return false;
    if (categoryFilter && block.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return block.title.includes(q) || block.content.includes(q) || block.tags.some(t => t.includes(q));
    }
    return true;
  });

  const handleInsert = (block: ContentBlock) => {
    onInsert(block.targetField, block.content);
    setOpen(false);
  };

  // Only show if there's content for this section
  const hasContent = contentLibrary.some(b => b.targetSection === sectionId);
  if (!hasContent) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BookOpen className="w-4 h-4" />
          ספריית תוכן
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>ספריית תוכן מקצועית</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 h-9"
            />
          </div>
          <div className="flex gap-1">
            {contentCategories.map(c => (
              <Badge
                key={c.id}
                variant={categoryFilter === c.id ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
              >
                {c.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {relevant.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              אין תוכן זמין לסעיף זה
            </p>
          ) : (
            relevant.map(block => (
              <div
                key={block.id}
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <span className="font-medium text-sm">{block.title}</span>
                    <div className="flex gap-1 mt-1">
                      {block.tags.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1"
                    onClick={() => handleInsert(block)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    הכנס
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line line-clamp-3">
                  {block.content}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentLibraryDialog;
