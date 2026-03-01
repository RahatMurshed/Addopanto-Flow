import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, PiggyBank } from "lucide-react";

interface TrendDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface ExpenseBreakdownItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardChartsProps {
  revenueTrend: TrendDataPoint[];
  expenseBreakdown: ExpenseBreakdownItem[];
  totalFilteredExpense: number;
  dateRangeLabel?: string;
  formatCurrency: (v: number) => string;
  formatCompact: (v: number) => string;
}

export default function DashboardCharts({
  revenueTrend, expenseBreakdown, totalFilteredExpense,
  dateRangeLabel, formatCurrency, formatCompact,
}: DashboardChartsProps) {
  const hasRevenueTrendData = revenueTrend.length > 0 && revenueTrend.some((d) => d.revenue > 0 || d.expenses > 0);
  const hasExpenseBreakdownData = expenseBreakdown.length > 0;

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">
                {entry.dataKey === "revenue" ? "Revenue" : "Expenses"}:
              </span>
              <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = totalFilteredExpense > 0 ? ((item.value / totalFilteredExpense) * 100).toFixed(1) : "0";
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.payload.color }} />
            <span className="font-medium text-foreground">{item.name}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(item.value)} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Revenue Trend Area Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
          <p className="text-sm text-muted-foreground">{dateRangeLabel || "Select a date range"}</p>
        </CardHeader>
        <CardContent className="pt-4">
          {hasRevenueTrendData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8}
                  formatter={(value: string) => <span className="text-xs text-muted-foreground">{value === "revenue" ? "Revenue" : "Expenses"}</span>}
                />
                <Area type="monotone" dataKey="revenue" name="revenue" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#revenueGradient)" />
                <Area type="monotone" dataKey="expenses" name="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#expenseGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <TrendingUp className="h-8 w-8" />
              <p>No transaction data for selected period</p>
              <p className="text-xs">Add revenue or expenses to see trends here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Breakdown Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Expense Distribution</CardTitle>
          <p className="text-sm text-muted-foreground">Spending by category - {dateRangeLabel || "Select a date range"}</p>
        </CardHeader>
        <CardContent className="pt-4">
          {hasExpenseBreakdownData ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                {expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                    <span className="ml-auto text-xs font-medium shrink-0">{formatCompact(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <PiggyBank className="h-8 w-8" />
              <p>No expense data for selected period</p>
              <p className="text-xs">Add expenses to see spending breakdown</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
