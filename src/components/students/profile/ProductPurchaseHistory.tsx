import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  PenLine,
  Monitor,
  Shirt,
  ShoppingBag,
  Calendar,
  Package,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductPurchase {
  id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  payment_method: string;
  user_id: string;
  productName: string;
  category: string;
  recordedBy?: string;
}

interface ProductPurchaseHistoryProps {
  purchases: ProductPurchase[];
  companyId: string;
  isLoading: boolean;
  fc: (amount: number) => string;
}

const CATEGORY_MAP: Record<
  string,
  { icon: React.ElementType; bg: string; text: string }
> = {
  book: { icon: BookOpen, bg: "bg-blue-100", text: "text-blue-600" },
  course_material: { icon: BookOpen, bg: "bg-blue-100", text: "text-blue-600" },
  stationery: { icon: PenLine, bg: "bg-green-100", text: "text-green-600" },
  digital: { icon: Monitor, bg: "bg-purple-100", text: "text-purple-600" },
  uniform: { icon: Shirt, bg: "bg-yellow-100", text: "text-yellow-600" },
};

function getCategoryStyle(category: string) {
  const key = category.toLowerCase().replace(/\s+/g, "_");
  return (
    CATEGORY_MAP[key] ?? {
      icon: ShoppingBag,
      bg: "bg-muted",
      text: "text-muted-foreground",
    }
  );
}

function PurchaseCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32 mt-2" />
      <Skeleton className="h-6 w-20 mt-1" />
      <Skeleton className="h-3 w-24 mt-3" />
    </div>
  );
}

export function ProductPurchaseHistory({
  purchases,
  companyId,
  isLoading,
  fc,
}: ProductPurchaseHistoryProps) {
  const totalSpent = useMemo(
    () => purchases.reduce((sum, p) => sum + p.total_amount, 0),
    [purchases]
  );

  const totalItems = useMemo(
    () => purchases.reduce((sum, p) => sum + p.quantity, 0),
    [purchases]
  );

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PurchaseCardSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">
              Product Purchase History
            </h2>
          </div>
          {purchases.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-accent text-primary font-semibold text-sm px-3 py-1 rounded-full border border-border">
              Total Spent: {fc(totalSpent)}
            </span>
          )}
        </div>

        {/* Empty state */}
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No products purchased yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Products bought by this student will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {purchases.map((purchase) => {
                const style = getCategoryStyle(purchase.category);
                const IconComp = style.icon;
                return (
                  <div
                    key={purchase.id}
                    className="rounded-lg border border-border bg-muted/30 p-4 hover:border-muted-foreground/30 hover:shadow-sm transition-all duration-150"
                  >
                    {/* Top — icon + category */}
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          style.bg
                        )}
                      >
                        <IconComp className={cn("h-5 w-5", style.text)} />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {purchase.category}
                      </Badge>
                    </div>

                    {/* Product name */}
                    <p
                      className="text-sm font-semibold text-foreground mt-2 truncate"
                      title={purchase.productName}
                    >
                      {purchase.productName}
                    </p>

                    {/* Price */}
                    <p className="text-xl font-bold text-primary mt-1">
                      {purchase.quantity > 1
                        ? `${fc(purchase.unit_price)} × ${purchase.quantity}`
                        : fc(purchase.total_amount)}
                    </p>
                    {purchase.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Total: {fc(purchase.total_amount)}
                      </p>
                    )}

                    {/* Bottom — date + status */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(purchase.sale_date), "MMM d, yyyy")}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border-0",
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        )}
                      >
                        paid
                      </Badge>
                    </div>

                    {purchase.recordedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Added by {purchase.recordedBy}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary footer */}
            <div className="border-t border-border mt-4 pt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                <strong className="text-foreground">{purchases.length}</strong>{" "}
                Products
              </span>
              <span className="border-r border-border h-4" />
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                <strong className="text-foreground">{totalItems}</strong> Items
                Total
              </span>
              <span className="border-r border-border h-4" />
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                <strong className="text-foreground">{fc(totalSpent)}</strong>{" "}
                Spent
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
