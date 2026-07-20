import { DailyCashFlowPoint } from '@/lib/reportCalculations';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/currency';

interface CashFlowTimelineChartProps {
  points: DailyCashFlowPoint[];
}

export function CashFlowTimelineChart({ points }: CashFlowTimelineChartProps) {
  const maxVal = Math.max(...points.map((p) => Math.max(p.income, p.expense)), 0);
  const hasData = maxVal > 0 && points.length > 0;

  // X-axis sparse labels index derivation
  // sparse indices: first, day 8, day 15, day 22, last
  const labelIndices = [0, 7, 14, 21, points.length - 1].filter(
    (idx, i, arr) => idx < points.length && arr.indexOf(idx) === i
  );

  // SVG dimensions
  const width = 500;
  const height = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Scale functions
  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    if (maxVal === 0) return paddingTop + chartHeight;
    return paddingTop + chartHeight - (value / maxVal) * chartHeight;
  };

  // Generate grid lines
  const gridLinesCount = 4;
  const gridLines = Array.from({ length: gridLinesCount + 1 }, (_, i) => {
    const val = (maxVal / gridLinesCount) * i;
    return {
      value: val,
      y: getY(val),
    };
  });

  // SVG paths for Income and Expense
  let incomePath = '';
  let expensePath = '';
  let incomeAreaPath = '';
  let expenseAreaPath = '';

  if (hasData) {
    // Generate lines
    points.forEach((p, idx) => {
      const x = getX(idx);
      const yInc = getY(p.income);
      const yExp = getY(p.expense);

      if (idx === 0) {
        incomePath = `M ${x} ${yInc}`;
        expensePath = `M ${x} ${yExp}`;
      } else {
        incomePath += ` L ${x} ${yInc}`;
        expensePath += ` L ${x} ${yExp}`;
      }
    });

    // Generate areas
    if (points.length > 0) {
      const xStart = getX(0);
      const xEnd = getX(points.length - 1);
      const yZero = getY(0);

      incomeAreaPath = `${incomePath} L ${xEnd} ${yZero} L ${xStart} ${yZero} Z`;
      expenseAreaPath = `${expensePath} L ${xEnd} ${yZero} L ${xStart} ${yZero} Z`;
    }
  }

  return (
    <Card variant="flat" className="p-4 bg-surface border border-border/30 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-label-caps text-text-secondary font-bold uppercase tracking-wider">
          Arus Kas Periode
        </h3>
      </div>

      {!hasData ? (
        <div className="py-10 px-4 text-center flex flex-col items-center gap-2">
          <span className="material-symbols-rounded text-3xl text-text-muted" aria-hidden="true">
            show_chart
          </span>
          <h4 className="text-body-sm font-bold text-text-primary">
            Belum ada arus kas untuk divisualisasikan.
          </h4>
          <p className="text-xs text-text-muted max-w-[280px]">
            Pemasukan dan pengeluaran pada periode ini akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 min-w-0 w-full">
          {/* Timeline Legend */}
          <div className="flex gap-4 text-xs font-semibold self-end">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-aman/20 border border-aman rounded" />
              <span className="text-text-secondary">Pemasukan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-bahaya/20 border border-bahaya rounded" />
              <span className="text-text-secondary">Pengeluaran</span>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible"
              aria-label="Grafik Arus Kas Periode"
            >
              {/* Y Grid Lines and Y Labels */}
              {gridLines.map((line, idx) => (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={line.y}
                    x2={width - paddingRight}
                    y2={line.y}
                    className="stroke-border/30"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={line.y + 4}
                    textAnchor="end"
                    className="fill-text-muted font-display text-[10px] font-semibold tabular-nums"
                  >
                    {formatRupiah(line.value)}
                  </text>
                </g>
              ))}

              {/* Area fills */}
              <path
                d={incomeAreaPath}
                className="fill-aman/5"
                aria-hidden="true"
              />
              <path
                d={expenseAreaPath}
                className="fill-bahaya/5"
                aria-hidden="true"
              />

              {/* Data Lines */}
              <path
                d={incomePath}
                className="stroke-aman fill-none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              />
              <path
                d={expensePath}
                className="stroke-bahaya fill-none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              />

              {/* Sparse X Labels */}
              {labelIndices.map((ptIdx) => {
                const pt = points[ptIdx];
                if (!pt) return null;
                const x = getX(ptIdx);
                const y = height - paddingBottom + 16;
                return (
                  <text
                    key={ptIdx}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="fill-text-muted text-[10px] font-semibold"
                  >
                    {pt.dayLabel}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </Card>
  );
}
