import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useProductSales, useDeleteProductSale } from "@/hooks/useProductSales";
import { useProductStockMovements } from "@/hooks/useProductStockMovements";
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
  ArrowLeft, DollarSign, Package, Pencil, Plus, ShoppingCart, Trash2, TrendingUp, Warehouse,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const { data: product, isLoading } = useProduct(id);
  const { data: sales = [] } = useProductSales(id);
  const { data: movements = [] } = useProductStockMovements(id);
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{product.product_name}</h1>
          <p className="text-sm text-muted-foreground">{product.product_code} · <span className="capitalize">{product.category}</span></p>
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

      {/* Product Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Product Details</CardTitle>
          {isAdmin && product.type === "physical" && (
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
              <Warehouse className="mr-1 h-4 w-4" /> Adjust Stock
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">{fc(product.price)}</span></div>
            {isAdmin && <div><span className="text-muted-foreground">Purchase Price:</span> <span className="font-medium">{fc(product.purchase_price)}</span></div>}
            <div><span className="text-muted-foreground">Type:</span> <span className="capitalize font-medium">{product.type}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="capitalize ml-1">{product.status.replace("_", " ")}</Badge></div>
            {product.type === "physical" && (
              <>
                <div><span className="text-muted-foreground">Reorder Level:</span> <span className="font-medium">{product.reorder_level}</span></div>
              </>
            )}
            {product.description && <div className="col-span-full"><span className="text-muted-foreground">Description:</span> <span>{product.description}</span></div>}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Sales + Stock */}
      <Tabs defaultValue="sales">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="sales">Sales History</TabsTrigger>
            {product.type === "physical" && <TabsTrigger value="stock">Stock Movements</TabsTrigger>}
          </TabsList>
          {isAdmin && (
            <Button onClick={() => setSaleOpen(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Record Sale
            </Button>
          )}
        </div>

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
