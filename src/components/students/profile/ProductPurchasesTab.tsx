import { format } from "date-fns";
import { Download, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/utils/exportCsv";

export interface ProductPurchaseRow {
  id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  payment_method: string;
  payment_status?: string;
  user_id: string;
  productName: string;
  category: string;
}

interface ProductPurchasesTabProps {
  purchases: ProductPurchaseRow[];
  userMap: Map<string, string>;
  fc: (amount: number) => string;
  isAdmin: boolean;
  isLoading?: boolean;
}

export function ProductPurchasesTab({ purchases, userMap, fc, isAdmin, isLoading }: ProductPurchasesTabProps) {
  const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0);

  const handleExport = () => {
    const headers = ["Product", "Category", "Qty", "Unit Price", "Total", "Purchase Date", "Method", "Recorded By"];
    const rows = purchases.map((p) => [
      p.productName,
      p.category,
      String(p.quantity),
      String(p.unit_price),
      String(p.total_amount),
      format(new Date(p.sale_date), "MMM d, yyyy"),
      p.payment_method,
      userMap.get(p.user_id) ?? "",
    ]);
    downloadCsv(`product-purchases-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No products purchased yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExport} className="text-sm">
            <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Product</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-center p-3 text-xs font-medium text-muted-foreground">Qty</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Unit Price</th>
              <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Method</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Status</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium text-foreground">{p.productName}</td>
                <td className="p-3">
                  <Badge variant="secondary" className="text-xs rounded px-2">
                    {p.category}
                  </Badge>
                </td>
                <td className="p-3 text-center text-foreground">{p.quantity}</td>
                <td className="p-3 text-right text-muted-foreground">{fc(p.unit_price)}</td>
                <td className="p-3 text-right font-medium text-foreground">{fc(p.total_amount)}</td>
                <td className="p-3 text-muted-foreground">{format(new Date(p.sale_date), "MMM d, yyyy")}</td>
                <td className="p-3 text-muted-foreground capitalize hidden md:table-cell">{p.payment_method}</td>
                <td className="p-3 hidden md:table-cell">
                  <Badge
                    variant={p.payment_status === "paid" ? "default" : p.payment_status === "partial" ? "secondary" : "outline"}
                    className={cn("text-xs", p.payment_status === "paid" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent")}
                  >
                    {p.payment_status || "paid"}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{userMap.get(p.user_id) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          {/* Total row */}
          <tfoot>
            <tr className="bg-amber-50 dark:bg-amber-900/20 border-t-2 border-amber-200 dark:border-amber-800">
              <td colSpan={4} className="p-3 text-right font-semibold text-foreground">
                Total Products Spent:
              </td>
              <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                {fc(totalSpent)}
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
