import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ValidationReport, readinessLabels } from '@/lib/validation-engine';

interface Props {
  report: ValidationReport;
  onNavigateToSection?: (sectionId: string) => void;
}

const ValidationPanel = ({ report, onNavigateToSection }: Props) => {
  const readiness = readinessLabels[report.readinessLevel];

  return (
    <div className="space-y-4">
      {/* Readiness score */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">ציון מוכנות</span>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${readiness.color}`}>
            {report.totalScore}%
          </span>
        </div>
        <Progress value={report.totalScore} className="h-2 mb-2" />
        <div className="flex gap-3 text-xs">
          {report.criticalCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              {report.criticalCount} קריטי
            </span>
          )}
          {report.warningCount > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertCircle className="w-3.5 h-3.5" />
              {report.warningCount} אזהרה
            </span>
          )}
          <span className={`font-medium ${readiness.color}`}>
            מוכנות: {readiness.label}
          </span>
        </div>
      </div>

      {/* Section breakdown */}
      <div className="space-y-1.5">
        {report.sections.map(section => (
          <button
            key={section.sectionId}
            onClick={() => onNavigateToSection?.(section.sectionId)}
            className="w-full text-right p-2.5 rounded-md border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{section.title}</span>
              <div className="flex items-center gap-2">
                {section.issues.length > 0 && (
                  <Badge
                    variant={section.issues.some(i => i.severity === 'critical') ? 'destructive' : 'secondary'}
                    className="text-xs py-0"
                  >
                    {section.issues.length}
                  </Badge>
                )}
                <span className={`text-xs tabular-nums font-medium ${
                  section.percent === 100 ? 'text-success' :
                  section.percent >= 50 ? 'text-muted-foreground' : 'text-destructive'
                }`}>
                  {section.percent}%
                </span>
              </div>
            </div>
            <Progress value={section.percent} className="h-1" />
          </button>
        ))}
      </div>

      {/* Issues list */}
      {(report.criticalCount > 0 || report.warningCount > 0) && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 text-sm font-medium border-b">
            שדות חסרים והתראות
          </div>
          <div className="max-h-64 overflow-y-auto">
            {report.sections
              .flatMap(s => s.issues)
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return order[a.severity] - order[b.severity];
              })
              .map((issue, i) => (
                <button
                  key={i}
                  onClick={() => onNavigateToSection?.(issue.sectionId)}
                  className="w-full text-right flex items-start gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {issue.severity === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm">{issue.message}</p>
                    <p className="text-xs text-muted-foreground">{issue.sectionTitle}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
