import { useMemo } from 'react';

interface Props {
  risks: Record<string, string>[];
}

const likelihoodLevels = ['נמוכה', 'בינונית', 'גבוהה'];
const severityLevels = ['נמוכה', 'בינונית', 'גבוהה', 'קריטית'];

const getRiskColor = (likelihood: string, severity: string): string => {
  const li = likelihoodLevels.indexOf(likelihood);
  const si = severityLevels.indexOf(severity);
  if (li < 0 || si < 0) return 'bg-muted';
  const score = li + si;
  if (score >= 4) return 'bg-destructive/20 text-destructive';
  if (score >= 2) return 'bg-warning/20 text-warning';
  return 'bg-success/20 text-success';
};

const RiskMatrix = ({ risks }: Props) => {
  const matrix = useMemo(() => {
    const grid: Record<string, Record<string, string[]>> = {};
    severityLevels.forEach(s => {
      grid[s] = {};
      likelihoodLevels.forEach(l => {
        grid[s][l] = [];
      });
    });
    risks.forEach(r => {
      const s = r.severity || r.riskScore;
      const l = r.likelihood || r.probability;
      if (grid[s]?.[l]) {
        grid[s][l].push(r.hazard || r.area || '');
      }
    });
    return grid;
  }, [risks]);

  if (risks.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
      <h4 className="text-sm font-semibold mb-3">מטריצת סיכונים</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 border text-right bg-muted font-medium">חומרה \ סבירות</th>
              {likelihoodLevels.map(l => (
                <th key={l} className="p-2 border text-center bg-muted font-medium">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...severityLevels].reverse().map(s => (
              <tr key={s}>
                <td className="p-2 border font-medium bg-muted">{s}</td>
                {likelihoodLevels.map(l => {
                  const items = matrix[s]?.[l] || [];
                  return (
                    <td key={l} className={`p-2 border text-center ${getRiskColor(l, s)}`}>
                      {items.length > 0 ? (
                        <div className="space-y-0.5">
                          {items.map((item, i) => (
                            <div key={i} className="text-xs font-medium">{item}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskMatrix;
