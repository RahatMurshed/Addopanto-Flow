import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useProductSales, useDeleteProductSale } from "@/hooks/useProductSales";
import { useProductStockMovements } from "@/hooks/useProductStockMovements";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { ProductDialog } from "@/components/dialogs/ProductDialog";
import { ProductSaleDialog } from "@/components/dialogs/ProductSaleDialog";
import { StockAdjustmentDialog } from "@/components/dialogs/StockAdjustmentDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, DollarSign, Package, Pencil, Plus, ShoppingCart, Trash2, TrendingUp, Warehouse, BarChart3, ExternalLink,
} from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const { data: product, isLoading } = useProduct(id);
  const { data: sales = [] } = useProductSales(id);
  const { data: movements = [] } = useProductStockMovements(id);
  const { data: categories = [] } = useProductCategories();
  const productCategory = product ? categories.find((c) => c.slug === product.category) : null;
  const deleteProduct = useDeleteProduct();
  const deleteSale = useDeleteProductSale();

  const [editOpen, setEditOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!product) return <div className="py-12 text-center text-muted-foreground">Product not found</div>;

  const totalRevenue = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const totalSold = sales.reduce((s, sale) => s + sale.quantity, 0);
  const profitMargin = product.purchase_price > 0 ? ((product.price - product.purchase_price) / product.price) * 100 : 0;

  const stockColor = product.type !== "physical" ? "text-muted-foreground"
    : product.stock_quantity <= 0 ? "text-destructive"
    : product.stock_quantity <= product.reorder_level ? "text-orange-500"
    : "text-green-500";

  const handleDeleteProduct = async () => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product deleted");
      navigate("/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleDeleteSale = async () => {
    if (!deleteSaleId) return;
    try {
      await deleteSale.mutateAsync(deleteSaleId);
      toast.success("Sale deleted, stock restored");
      setDeleteSaleId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sale");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => productCategory ? navigate(`/products/category/${productCategory.slug}`) : navigate("/products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{product.product_name}</h1>
          <p className="text-sm text-muted-foreground">
            <button onClick={() => navigate("/products")} className="hover:underline">Products</button>
            {productCategory && <>{" > "}<button onClick={() => navigate(`/products/category/${productCategory.slug}`)} className="hover:underline">{productCategory.name}</button></>}
            {" > "}{product.product_name}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold">{fc(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Items Sold</p>
              <p className="text-lg font-bold">{totalSold}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className={`h-8 w-8 ${stockColor}`} />
            <div>
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className="text-lg font-bold">{product.type === "physical" ? product.stock_quantity : "N/A"}</p>
            </div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className="text-lg font-bold">{profitMargin > 0 ? `${profitMargin.toFixed(1)}%` : "—"}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales History</TabsTrigger>
            {product.type === "physical" && <TabsTrigger value="stock">Stock Movements</TabsTrigger>}
            <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
          </TabsList>
          {isAdmin && (
            <Button onClick={() => setSaleOpen(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Record Sale
            </Button>
          )}
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Product Image + Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.product_name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Code:</span> <span className="font-medium">{product.product_code}</span></div>
                    <div><span className="text-muted-foreground">Category:</span> <Badge variant="outline" className="capitalize ml-1">{product.category}</Badge></div>
                    <div><span className="text-muted-foreground">Type:</span> <span className="capitalize font-medium">{product.type}</span></div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant={product.status === "active" ? "default" : "secondary"} className="capitalize ml-1">{product.status.replace("_", " ")}</Badge></div>
                  </div>
                </div>
                {product.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>
                )}
                {product.linked_course_id && (
                  <Button
                    variant="link"
                    className="mt-2 p-0 h-auto text-sm gap-1"
                    onClick={() => navigate(`/courses/${product.linked_course_id}`)}
                  >
                    <ExternalLink className="h-3 w-3" /> View Linked Course
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pricing & Stock */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Pricing & Stock</CardTitle>
                {isAdmin && product.type === "physical" && (
                  <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                    <Warehouse className="mr-1 h-4 w-4" /> Adjust Stock
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Selling Price:</span> <span className="font-medium">{fc(product.price)}</span></div>
                  {isAdmin && <div><span className="text-muted-foreground">Purchase Price:</span> <span className="font-medium">{fc(product.purchase_price)}</span></div>}
                  {product.type === "physical" && (
                    <>
                      <div><span className="text-muted-foreground">Stock:</span> <span className={`font-bold ${stockColor}`}>{product.stock_quantity}</span></div>
                      <div><span className="text-muted-foreground">Reorder Level:</span> <span className="font-medium">{product.reorder_level}</span></div>
                    </>
                  )}
                  {product.barcode && <div><span className="text-muted-foreground">Barcode:</span> <span className="font-medium">{product.barcode}</span></div>}
                  {product.sku && <div><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{product.sku}</span></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="sales">
          {sales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales recorded yet</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{format(new Date(s.sale_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">{s.quantity}</TableCell>
                      <TableCell className="text-right">{fc(s.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{fc(s.total_amount)}</TableCell>
                      <TableCell>{s.customer_name || "—"}</TableCell>
                      <TableCell className="capitalize">{s.payment_method.replace("_", " ")}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteSaleId(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Stock Movements Tab */}
        {product.type === "physical" && (
          <TabsContent value="stock">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No stock movements recorded</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead className="text-right">New</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{format(new Date(m.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{m.movement_type.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{m.quantity}</TableCell>
                        <TableCell className="text-right">{m.previous_stock}</TableCell>
                        <TableCell className="text-right">{m.new_stock}</TableCell>
                        <TableCell className="text-muted-foreground">{m.reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Revenue Analytics Tab */}
        <TabsContent value="analytics">
          <RevenueAnalyticsTab sales={sales} fc={fc} isAdmin={isAdmin} purchasePrice={product.purchase_price} />
        </TabsContent>
      </Tabs>

      <ProductDialog open={editOpen} onOpenChange={setEditOpen} product={product} />
      <ProductSaleDialog open={saleOpen} onOpenChange={setSaleOpen} preselectedProduct={product} />
      <StockAdjustmentDialog open={adjustOpen} onOpenChange={setAdjustOpen} product={product} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this product and all its sales data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSaleId} onOpenChange={(o) => !o && setDeleteSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the sale record, restore stock, and remove the associated revenue entry.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSale} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Revenue Analytics sub-component ---
function RevenueAnalyticsTab({
  sales,
  fc,
  isAdmin,
  purchasePrice,
}: {
  sales: any[];
  fc: (amount: number) => string;
  isAdmin: boolean;
  purchasePrice: number;
}) {
  const chartData = useMemo(() => {
    const monthMap: Record<string, { month: string; revenue: number; quantity: number }> = {};
    sales.forEach((s) => {
      const monthKey = format(startOfMonth(parseISO(s.sale_date)), "yyyy-MM");
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: format(parseISO(s.sale_date), "MMM yyyy"), revenue: 0, quantity: 0 };
      }
      monthMap[monthKey].revenue += s.total_amount;
      monthMap[monthKey].quantity += s.quantity;
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [sales]);

  const totalRevenue = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const totalQty = sales.reduce((s, sale) => s + sale.quantity, 0);
  const totalProfit = purchasePrice > 0 ? sales.reduce((s, sale) => s + (sale.unit_price - purchasePrice) * sale.quantity, 0) : 0;

  if (sales.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <BarChart3 className="mx-auto h-12 w-12 mb-3 opacity-30" />
        <p>No sales data to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold">{fc(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Quantity Sold</p>
            <p className="text-xl font-bold">{totalQty}</p>
          </CardContent>
        </Card>
        {isAdmin && purchasePrice > 0 && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Estimated Profit</p>
              <p className="text-xl font-bold text-green-600">{fc(totalProfit)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  formatter={(value: number) => [fc(value), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
