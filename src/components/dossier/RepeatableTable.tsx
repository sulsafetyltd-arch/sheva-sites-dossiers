import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Column {
  key: string;
  label: string;
  type: string;
}

interface Props {
  columns: Column[];
  rows: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
}

const RepeatableTable = ({ columns, rows, onChange }: Props) => {
  const addRow = useCallback(() => {
    const newRow: Record<string, string> = { id: crypto.randomUUID() };
    columns.forEach(c => { newRow[c.key] = ''; });
    onChange([...rows, newRow]);
  }, [columns, rows, onChange]);

  const removeRow = useCallback((index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  }, [rows, onChange]);

  const updateCell = useCallback((index: number, key: string, value: string) => {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [key]: value } : row
    );
    onChange(updated);
  }, [rows, onChange]);

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map(col => (
                <th key={col.key} className="text-right py-2 px-2 font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id || i} className="border-b last:border-b-0">
                {columns.map(col => (
                  <td key={col.key} className="py-1.5 px-1">
                    <Input
                      type={col.type === 'date' ? 'date' : 'text'}
                      value={row[col.key] ?? ''}
                      onChange={e => updateCell(i, col.key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </td>
                ))}
                <td className="py-1.5 px-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <div key={row.id || i} className="bg-muted/50 rounded-lg p-3 space-y-2 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 h-7 w-7"
              onClick={() => removeRow(i)}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
            {columns.map(col => (
              <div key={col.key}>
                <label className="text-xs text-muted-foreground">{col.label}</label>
                <Input
                  type={col.type === 'date' ? 'date' : 'text'}
                  value={row[col.key] ?? ''}
                  onChange={e => updateCell(i, col.key, e.target.value)}
                  className="h-8 text-sm mt-0.5"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="w-4 h-4" />
        הוסף שורה
      </Button>
    </div>
  );
};

export default RepeatableTable;
