import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSourceBadgeStyle, cleanSalaryTag } from "@/utils/sourceColors";
import TablePagination from "@/components/shared/TablePagination";

interface Transaction {
  id: string;
  type: "revenue" | "expense";
  amount: number;
  date: string;
  description: string;
  category: string;
  color?: string;
  createdAt: string;
}

interface DashboardTransactionsProps {
  transactions: Transaction[];
  pagination: {
    paginatedItems: Transaction[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    itemsPerPage: number;
    goToPage: (p: number) => void;
    setItemsPerPage: (n: number) => void;
    canGoNext: boolean;
    canGoPrev: boolean;
  };
  formatCurrency: (v: number) => string;
}

export default function DashboardTransactions({ transactions, pagination, formatCurrency }: DashboardTransactionsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        <p className="text-sm text-muted-foreground">Latest income and expenses</p>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Expense Source</TableHead>
                  <TableHead>Revenue Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          tx.type === "revenue" ? "bg-green-500/10 text-success" : "bg-destructive/10 text-destructive"
                        )}>
                          {tx.type === "revenue" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        </div>
                        <span className="font-medium">{cleanSalaryTag(tx.description)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.type === "expense" && tx.category ? (
                        <Badge variant="outline" className="text-xs" style={getSourceBadgeStyle(tx.category)}>{tx.category}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {tx.type === "revenue" && tx.category ? (
                        <Badge variant="outline" className="text-xs" style={getSourceBadgeStyle(tx.category)}>{tx.category}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("font-bold", tx.type === "revenue" ? "text-success" : "text-destructive")}>
                        {tx.type === "revenue" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div data-pdf-hide>
              <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.goToPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
                canGoNext={pagination.canGoNext}
                canGoPrev={pagination.canGoPrev}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No transactions yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
