import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts, useDeleteProduct, type Product } from "@/hooks/useProducts";
import { useProductCategories, useDeleteProductCategory, type ProductCategory } from "@/hooks/useProductCategories";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useProductSales } from "@/hooks/useProductSales";
import { ProductDialog } from "@/components/dialogs/ProductDialog";
import { ProductSaleDialog } from "@/components/dialogs/ProductSaleDialog";
import { ProductCategoryDialog } from "@/components/dialogs/ProductCategoryDialog";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/shared/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen, GraduationCap, Package, Pencil, Plus, Search, ShoppingCart, Shirt, Trash2, MoreHorizontal, Settings2,
  Eye, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Map icon strings from DB to lucide components
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  "pencil": Pencil,
  "shirt": Shirt,
  "package": Package,
  "shopping-cart": ShoppingCart,
};

function getCategoryIcon(iconName: string) {
  return ICON_MAP[iconName] || Package;
}

export default function Products() {
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: allProducts = [], isLoading } = useProducts({ search, status: statusFilter, category: categoryFilter });
  const { data: allSales = [] } = useProductSales();
  const { data: categories = [] } = useProductCategories();
  const deleteProduct = useDeleteProduct();
  const deleteCategory = useDeleteProductCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Products are now filtered server-side via the hook
  const products = allProducts;

  // Stats
  const stats = useMemo(() => ({
    total: allProducts.length,
    active: allProducts.filter((p) => p.status === "active").length,
    outOfStock: allProducts.filter((p) => p.status === "out_of_stock" || (p.type === "physical" && (p.stock_quantity ?? 0) <= 0)).length,
  }), [allProducts]);

  const categoryStats = categories
    .filter((cat) => cat.slug !== "courses")
    .map((cat) => {
      const catProducts = allProducts.filter((p) => p.category === cat.slug);
      const catSales = allSales.filter((s) => catProducts.some((p) => p.id === s.product_id));
      return {
        ...cat,
        count: catProducts.length,
        revenue: catSales.reduce((sum, s) => sum + s.total_amount, 0),
      };
    });

  const handleProductClick = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

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

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await deleteCategory.mutateAsync(deleteCategoryId);
      toast.success("Category deleted");
      setDeleteCategoryId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category. It may still have products assigned.");
    }
  };

  const stockBadge = (p: Product) => {
    if (p.type !== "physical") return null;
    if ((p.stock_quantity ?? 0) <= 0) return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    if ((p.stock_quantity ?? 0) <= (p.reorder_level ?? 0)) return <Badge className="bg-orange-500/15 text-orange-600 text-[10px]">Low Stock</Badge>;
    return <Badge className="bg-green-500/15 text-green-600 text-[10px]">In Stock</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Manage products, record sales, and track inventory</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }} variant="ghost" size="icon" title="Manage Categories">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button onClick={() => { setSaleProduct(null); setSaleDialogOpen(true); }} variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Record Sale
            </Button>
            <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-4">
            <span className="text-2xl font-bold">{stats.total}</span>
            <span className="text-xs text-muted-foreground">Total Products</span>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="flex flex-col items-center p-4">
            <span className="text-2xl font-bold text-green-600">{stats.active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center p-4">
            <span className="text-2xl font-bold text-destructive">{stats.outOfStock}</span>
            <span className="text-xs text-muted-foreground">Out of Stock</span>
          </CardContent>
        </Card>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categoryStats.map((cat) => {
          const IconComp = getCategoryIcon(cat.icon);
          return (
            <Card
              key={cat.slug}
              className={`relative cursor-pointer transition-all hover:shadow-md ${categoryFilter === cat.slug ? "ring-2 ring-primary" : ""}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === cat.slug ? "all" : cat.slug);
              }}
            >
              {isAdmin && !cat.is_system && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 sm:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setCategoryDialogOpen(true); }}
                    title="Edit category"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteCategoryId(cat.id); }}
                    title="Delete category"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <IconComp className="h-8 w-8" style={{ color: cat.color }} />
                <span className="text-sm font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count} products</span>
                <span className="text-xs font-semibold">{fc(cat.revenue)}</span>
              </CardContent>
            </Card>
          );
        })}
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
        {categoryFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setCategoryFilter("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Products Card Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>No products found.</p>
          {isAdmin && <p className="text-sm">Click 'Add Product' to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <Card key={p.id} className="group overflow-hidden transition-all hover:shadow-md">
              {/* Product Image / Placeholder */}
              <div
                className="relative h-36 bg-muted flex items-center justify-center cursor-pointer"
                onClick={() => handleProductClick(p)}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.product_name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                )}
                {/* Status badge overlay */}
                {p.status !== "active" && (
                  <Badge variant="destructive" className="absolute top-2 right-2 text-[10px] capitalize">
                    {p.status.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-semibold text-sm truncate cursor-pointer hover:text-primary"
                      onClick={() => handleProductClick(p)}
                    >
                      {p.product_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{p.product_code}</p>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
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
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-[10px]">{p.category}</Badge>
                  {stockBadge(p)}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-base font-bold">{fc(p.price)}</span>
                  {p.type === "physical" && (
                    <span className="text-xs text-muted-foreground">Stock: {p.stock_quantity ?? 0}</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleProductClick(p)}
                  >
                    <Eye className="mr-1 h-3 w-3" /> View
                  </Button>
                  {isAdmin && p.status === "active" && !(p.type === "physical" && (p.stock_quantity ?? 0) <= 0) && (
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => { setSaleProduct(p); setSaleDialogOpen(true); }}
                    >
                      <ShoppingCart className="mr-1 h-3 w-3" /> Sell
                    </Button>
                  )}
                  {p.type === "physical" && (p.stock_quantity ?? 0) <= 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-destructive border-destructive/30"
                      disabled
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" /> Out of Stock
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} />
      <ProductSaleDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} preselectedProduct={saleProduct} />
      <ProductCategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} category={editingCategory} />

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

      <AlertDialog open={!!deleteCategoryId} onOpenChange={(o) => !o && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this category. If products are still assigned to it, the deletion may fail.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
