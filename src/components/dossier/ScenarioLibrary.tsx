import { useState } from 'react';
import { BookOpen, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { scenariosLibrary, scenarioCategories } from '@/data/scenarios-library';

interface Props {
  existingScenarios: Record<string, string>[];
  onAdd: (scenarios: Record<string, string>[]) => void;
}

const ScenarioLibrary = ({ existingScenarios, onAdd }: Props) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);

  const existingNames = new Set(existingScenarios.map(s => s.name));

  const filtered = filter
    ? scenariosLibrary.filter(s => s.category === filter)
    : scenariosLibrary;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const newScenarios = scenariosLibrary
      .filter(s => selected.has(s.id))
      .map(s => ({
        id: crypto.randomUUID(),
        name: s.name,
        description: s.description,
        response: s.response,
        resources: s.resources,
      }));
    onAdd([...existingScenarios, ...newScenarios]);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BookOpen className="w-4 h-4" />
          ספריית תרחישים
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>ספריית תרחישי חירום</DialogTitle>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={filter === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter(null)}
          >
            הכל
          </Badge>
          {scenarioCategories.map(c => (
            <Badge
              key={c.id}
              variant={filter === c.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </Badge>
          ))}
        </div>

        {/* Scenario list */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {filtered.map(scenario => {
            const alreadyExists = existingNames.has(scenario.name);
            const isSelected = selected.has(scenario.id);
            return (
              <button
                key={scenario.id}
                onClick={() => !alreadyExists && toggle(scenario.id)}
                disabled={alreadyExists}
                className={`w-full text-right p-3 rounded-lg border transition-colors ${
                  alreadyExists
                    ? 'opacity-50 cursor-not-allowed bg-muted'
                    : isSelected
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{scenario.name}</span>
                      {alreadyExists && (
                        <Badge variant="secondary" className="text-xs">קיים</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {scenario.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action */}
        {selected.size > 0 && (
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              נבחרו {selected.size} תרחישים
            </span>
            <Button onClick={handleAdd} className="gap-1.5">
              <Plus className="w-4 h-4" />
              הוסף לתיק
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScenarioLibrary;
