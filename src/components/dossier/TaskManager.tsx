import { useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { DossierTask } from '@/types/dossier';
import { getTasksForDossier, addTask, updateTask, deleteTask } from '@/lib/task-store';

interface Props {
  dossierId: string;
}

const TaskManager = ({ dossierId }: Props) => {
  const [tasks, setTasks] = useState<DossierTask[]>(() => getTasksForDossier(dossierId));
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const refresh = () => setTasks(getTasksForDossier(dossierId));

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) return;
    addTask(dossierId, {
      title: newTitle.trim(),
      status: 'open',
      assignee: newAssignee.trim() || undefined,
      deadline: newDeadline || undefined,
    });
    setNewTitle('');
    setNewDeadline('');
    setNewAssignee('');
    refresh();
  }, [dossierId, newTitle, newDeadline, newAssignee]);

  const toggleStatus = (task: DossierTask) => {
    updateTask(dossierId, task.id, {
      status: task.status === 'done' ? 'open' : 'done',
    });
    refresh();
  };

  const handleDelete = (taskId: string) => {
    deleteTask(dossierId, taskId);
    refresh();
  };

  const openTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-4">
      {/* Add task */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="משימה חדשה..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 min-w-[200px] h-9"
        />
        <Input
          type="date"
          value={newDeadline}
          onChange={e => setNewDeadline(e.target.value)}
          className="w-36 h-9"
        />
        <Input
          placeholder="אחראי"
          value={newAssignee}
          onChange={e => setNewAssignee(e.target.value)}
          className="w-28 h-9"
        />
        <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()} className="gap-1 h-9">
          <Plus className="w-4 h-4" />
          הוסף
        </Button>
      </div>

      {/* Open tasks */}
      {openTasks.length === 0 && doneTasks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          אין משימות. הוסף משימות לניהול עבודות תיק השטח.
        </p>
      )}

      <div className="space-y-1">
        {openTasks.map(task => (
          <div key={task.id} className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/30 transition-colors">
            <button onClick={() => toggleStatus(task)} className="shrink-0">
              <Circle className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.assignee && (
                  <span className="text-xs text-muted-foreground">{task.assignee}</span>
                )}
                {task.deadline && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <CalendarDays className="w-3 h-3" />
                    {task.deadline}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(task.id)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Done tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">הושלמו ({doneTasks.length})</p>
          {doneTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 p-2 rounded-md opacity-60">
              <button onClick={() => toggleStatus(task)} className="shrink-0">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </button>
              <p className="text-sm line-through flex-1 truncate">{task.title}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(task.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskManager;
