import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import AdvancedDateFilter from "@/components/shared/AdvancedDateFilter";
import PercentageChange from "@/components/finance/PercentageChange";
import { type DateRange, type FilterType, type FilterValue } from "@/utils/dateRangeUtils";

interface ExpenseBreakdownItem {
  name: string;
  value: number;
  color: string;
}

interface DashboardPeriodOverviewProps {
  filteredData: { revenue: number; expenses: number; expenseBreakdown: ExpenseBreakdownItem[] };
  previousData: { revenue: number; expenses: number };
  previousRange: DateRange | null;
  dateRange: DateRange | null;
  onFilterChange: (range: DateRange, type: FilterType, value: FilterValue) => void;
  formatCurrency: (v: number) => string;
}

export default function DashboardPeriodOverview({
  filteredData, previousData, previousRange, dateRange, onFilterChange, formatCurrency,
}: DashboardPeriodOverviewProps) {
  const totalFilteredExpense = filteredData.expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
  const hasFilteredBreakdown = filteredData.expenseBreakdown.length > 0;
  const netProfit = filteredData.revenue - filteredData.expenses;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
        <CardTitle className="text-base font-semibold">Period Overview</CardTitle>
        <AdvancedDateFilter onFilterChange={onFilterChange} defaultFilterType="monthly" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(filteredData.revenue)}</p>
            {previousRange && (
              <PercentageChange current={filteredData.revenue} previous={previousData.revenue} label={previousRange.label} className="mt-1" />
            )}
          </div>
          <div className="rounded-lg bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">Expenses</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(filteredData.expenses)}</p>
            {previousRange && (
              <PercentageChange current={filteredData.expenses} previous={previousData.expenses} label={previousRange.label} invertColors className="mt-1" />
            )}
          </div>
          <div className={cn(
            "rounded-lg border p-4",
            netProfit >= 0 ? "bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20" : "bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20"
          )}>
            <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
            <p className={cn("text-2xl font-bold", netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive")}>
              {formatCurrency(netProfit)}
            </p>
            {previousRange && (
              <PercentageChange current={netProfit} previous={previousData.revenue - previousData.expenses} label={previousRange.label} className="mt-1" />
            )}
          </div>
        </div>
        
        {hasFilteredBreakdown && dateRange && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">Expense Breakdown for {dateRange.label}</p>
            <div className="space-y-2">
              {filteredData.expenseBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    <span className="text-xs text-muted-foreground">
                      ({((item.value / totalFilteredExpense) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
