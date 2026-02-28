import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProducts, useDeleteProduct, type Product } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductSales } from "@/hooks/useProductSales";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { ProductDialog } from "@/components/dialogs/ProductDialog";
import { ProductSaleDialog } from "@/components/dialogs/ProductSaleDialog";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/shared/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, MoreHorizontal, Package, Pencil, Plus, Search, ShoppingCart, Trash2, TrendingUp,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function CategoryProducts() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: categories = [] } = useProductCategories();
  const category = categories.find((c) => c.slug === slug);

  const { data: products = [], isLoading } = useProducts({ search, category: slug, status: statusFilter });
  const { data: allSales = [] } = useProductSales();
  const deleteProduct = useDeleteProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const categoryRevenue = allSales
    .filter((s) => products.some((p) => p.id === s.product_id))
    .reduce((sum, s) => sum + s.total_amount, 0);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct.mutateAsync(deleteId);
      toast.success("Product deleted");
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const stockBadge = (p: Product) => {
    if (p.type !== "physical") return null;
    if (p.stock_quantity <= 0) return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    if (p.stock_quantity <= p.reorder_level) return <Badge className="bg-orange-500/15 text-orange-600 text-[10px]">Low Stock</Badge>;
    return <Badge className="bg-green-500/15 text-green-600 text-[10px]">In Stock</Badge>;
  };

  if (!category && categories.length > 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Category not found. <Button variant="link" onClick={() => navigate("/products")}>Back to Products</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground" style={{ color: category?.color }}>
                {category?.name || slug}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              <button onClick={() => navigate("/products")} className="hover:underline">Products</button>
              {" > "}{category?.name || slug}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setSaleDialogOpen(true)} variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Record Sale
            </Button>
            <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8" style={{ color: category?.color }} />
            <div>
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-lg font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold">{fc(categoryRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar
          placeholder="Search products..."
          onSearch={setSearch}
          defaultValue={search}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No products in this category. {isAdmin && "Click 'Add Product' to get started."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.product_code}</TableCell>
                  <TableCell className="text-right">{fc(p.price)}</TableCell>
                  <TableCell>{stockBadge(p) || <span className="text-xs text-muted-foreground">N/A</span>}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-xs">
                      {p.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingProduct(p); setDialogOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} defaultCategory={slug} />
      <ProductSaleDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All associated sales data will also be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
