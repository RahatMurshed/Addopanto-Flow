import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFundedExpenses } from "@/hooks/useFundTracking";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { CheckCircle, AlertTriangle, TrendingUp, Landmark, Wallet } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)", "hsl(346, 77%, 49%)", "hsl(24, 94%, 50%)"];

interface FundUsageTabProps {
  fundType: "investment" | "loan";
  fundId: string;
  totalFunds: number;
  allocatedToExpenses: number;
  remainingUnallocated: number;
  statedPurpose?: string | null;
  purposeCompliant?: boolean;
}

export default function FundUsageTab({
  fundType, fundId, totalFunds, allocatedToExpenses, remainingUnallocated,
  statedPurpose, purposeCompliant,
}: FundUsageTabProps) {
  const { fc } = useCompanyCurrency();
  const { data: expenses = [], isLoading } = useFundedExpenses(fundType, fundId);
  const pagination = usePagination(expenses, { defaultItemsPerPage: 10 });

  const utilizationPct = totalFunds > 0 ? (allocatedToExpenses / totalFunds) * 100 : 0;
  const progressColor = utilizationPct < 75 ? "bg-emerald-500" : utilizationPct < 90 ? "bg-amber-500" : "bg-destructive";

  // Category breakdown
  const categoryMap: Record<string, { name: string; value: number; color: string }> = {};
  expenses.forEach((e) => {
    const name = e.expense_accounts?.name || "Other";
    const color = e.expense_accounts?.color || "#6B7280";
    if (!categoryMap[name]) categoryMap[name] = { name, value: 0, color };
    categoryMap[name].value += Number(e.amount);
  });
  const categoryData = Object.values(categoryMap).filter((c) => c.value > 0);

  // Purpose compliance for loans
  const compliantAmount = fundType === "loan"
    ? expenses.filter(e => e.matches_loan_purpose !== false).reduce((s, e) => s + Number(e.amount), 0)
    : 0;
  const nonCompliantAmount = fundType === "loan"
    ? expenses.filter(e => e.matches_loan_purpose === false).reduce((s, e) => s + Number(e.amount), 0)
    : 0;
  const compliancePct = allocatedToExpenses > 0 ? (compliantAmount / allocatedToExpenses) * 100 : 100;

  const isInvestor = fundType === "investment";

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{isInvestor ? "Total Investment" : "Net Disbursed"}</p>
            <p className="text-xl font-bold">{fc(totalFunds)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Amount Spent</p>
            <p className="text-xl font-bold">{fc(allocatedToExpenses)} <span className="text-sm font-normal text-muted-foreground">({utilizationPct.toFixed(1)}%)</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-bold">{fc(remainingUnallocated)} <span className="text-sm font-normal text-muted-foreground">({(100 - utilizationPct).toFixed(1)}%)</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Fund Utilization</span>
            <span className="font-medium">{utilizationPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${Math.min(100, utilizationPct)}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Loan Purpose Compliance */}
      {fundType === "loan" && statedPurpose && (
        <Card className={purposeCompliant ? "border-emerald-200 dark:border-emerald-800" : "border-amber-200 dark:border-amber-800"}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {purposeCompliant ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className="font-medium text-sm">Purpose Compliance</span>
              <Badge variant={purposeCompliant ? "default" : "secondary"} className="ml-auto text-xs">
                {compliancePct.toFixed(0)}% Compliant
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Stated Purpose: <strong>{statedPurpose}</strong></p>
            {nonCompliantAmount > 0 && (
              <div className="text-sm space-y-1">
                <p className="text-emerald-600">Compliant: {fc(compliantAmount)} ({compliancePct.toFixed(0)}%)</p>
                <p className="text-amber-600">Non-Compliant: {fc(nonCompliantAmount)} ({(100 - compliancePct).toFixed(0)}%)</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {categoryData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => fc(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || COLORS[idx % COLORS.length] }} />
                    <span className="flex-1">{cat.name}</span>
                    <span className="font-medium">{fc(cat.value)}</span>
                    <span className="text-muted-foreground text-xs">({allocatedToExpenses > 0 ? ((cat.value / allocatedToExpenses) * 100).toFixed(0) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Funded Expenses ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No expenses funded from this source yet</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {fundType === "loan" && <TableHead>Purpose Match</TableHead>}
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(e.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {e.expense_accounts?.color && <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.expense_accounts.color }} />}
                            <span className="text-xs">{e.expense_accounts?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{e.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{fc(Number(e.amount))}</TableCell>
                        {fundType === "loan" && (
                          <TableCell>
                            {e.matches_loan_purpose === false ? (
                              <Badge variant="secondary" className="text-xs text-amber-600">⚠️ No</Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">✓ Yes</Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-xs">{e.vendor_name || "—"}</TableCell>
                        <TableCell className="text-xs">{e.invoice_number || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                onItemsPerPageChange={pagination.setItemsPerPage}
                canGoNext={pagination.canGoNext}
                canGoPrev={pagination.canGoPrev}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
