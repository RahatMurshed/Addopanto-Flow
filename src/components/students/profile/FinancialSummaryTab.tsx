import { useMemo } from "react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryData {
  totalCourseFee: number;
  totalCoursePaid: number;
  totalCourseOutstanding: number;
  totalProductsSpent: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  revenueProjection: number;
}

interface FinancialSummaryTabProps {
  data: SummaryData;
  fc: (amount: number) => string;
}

const CHART_COLORS = {
  paid: "hsl(142, 71%, 45%)",        // green
  outstanding: "hsl(0, 72%, 51%)",   // red
  products: "hsl(32, 100%, 50%)",    // orange
};

function StatBox({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-muted rounded-lg p-4 border border-border">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-xl font-bold", valueClass ?? "text-foreground")}>{value}</p>
    </div>
  );
}

export function FinancialSummaryTab({ data, fc }: FinancialSummaryTabProps) {
  const chartData = useMemo(() => {
    const segments = [];
    if (data.totalCoursePaid > 0) segments.push({ name: "Course Paid", value: data.totalCoursePaid, color: CHART_COLORS.paid });
    if (data.totalCourseOutstanding > 0) segments.push({ name: "Outstanding", value: data.totalCourseOutstanding, color: CHART_COLORS.outstanding });
    if (data.totalProductsSpent > 0) segments.push({ name: "Products", value: data.totalProductsSpent, color: CHART_COLORS.products });
    return segments;
  }, [data]);

  const hasData = chartData.length > 0;

  return (
    <div className="space-y-6">
      {/* Stat boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Invoiced" value={fc(data.totalInvoiced)} />
        <StatBox
          label="Total Paid"
          value={fc(data.totalPaid)}
          valueClass="text-green-600 dark:text-green-400"
        />
        <StatBox
          label="Outstanding"
          value={fc(data.totalOutstanding)}
          valueClass={data.totalOutstanding > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}
        />
        <StatBox
          label="Last Payment"
          value={data.lastPaymentDate
            ? `${fc(data.lastPaymentAmount)}`
            : "—"}
          valueClass="text-foreground"
        />
      </div>

      {/* Donut chart */}
      {hasData ? (
        <div className="flex flex-col items-center">
          <div className="relative w-[280px] h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{fc(data.totalPaid)}</span>
              <span className="text-xs text-muted-foreground">of {fc(data.totalInvoiced)}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium text-foreground">{fc(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No financial data yet</p>
        </div>
      )}

      {/* Revenue projection note */}
      {data.revenueProjection > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Projected future revenue from active enrollments: <span className="font-semibold">{fc(data.revenueProjection)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
