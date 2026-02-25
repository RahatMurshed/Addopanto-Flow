import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts, useDeleteProduct, type Product } from "@/hooks/useProducts";
import { useProductCategories, useDeleteProductCategory, type ProductCategory } from "@/hooks/useProductCategories";
import { useCourses } from "@/hooks/useCourses";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useProductSales } from "@/hooks/useProductSales";
import { ProductDialog } from "@/components/dialogs/ProductDialog";
import { ProductSaleDialog } from "@/components/dialogs/ProductSaleDialog";
import { ProductCategoryDialog } from "@/components/dialogs/ProductCategoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen, GraduationCap, Package, Pencil, Plus, Search, ShoppingCart, Shirt, Trash2, MoreHorizontal, Settings2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function Products() {
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: allProducts = [], isLoading } = useProducts();
  const { data: allSales = [] } = useProductSales();
  const { data: categories = [] } = useProductCategories();
  const { data: courses = [] } = useCourses();
  const deleteProduct = useDeleteProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Filter products in-memory for table display
  const products = useMemo(() => {
    return allProducts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!p.product_name.toLowerCase().includes(s) && !p.product_code.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [allProducts, search, statusFilter]);

  const categoryStats = categories.map((cat) => {
    if (cat.slug === "courses") {
      // Courses live in the courses table, not products
      return { ...cat, count: courses.length, revenue: 0 };
    }
    const catProducts = allProducts.filter((p) => p.category === cat.slug);
    const catSales = allSales.filter((s) => catProducts.some((p) => p.id === s.product_id));
    return {
      ...cat,
      count: catProducts.length,
      revenue: catSales.reduce((sum, s) => sum + s.total_amount, 0),
    };
  });

  const handleProductClick = (product: Product) => {
    if (product.category === "courses" && product.linked_course_id) {
      navigate(`/courses/${product.linked_course_id}`);
    } else {
      navigate(`/products/${product.id}`);
    }
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

  const stockBadge = (p: Product) => {
    if (p.type !== "physical") return null;
    if (p.stock_quantity <= 0) return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    if (p.stock_quantity <= p.reorder_level) return <Badge className="bg-orange-500/15 text-orange-600 text-[10px]">Low Stock</Badge>;
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
            <Button onClick={() => setSaleDialogOpen(true)} variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Record Sale
            </Button>
            <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categoryStats.map((cat) => (
          <Card
            key={cat.slug}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => {
              if (cat.slug === "courses") { navigate("/courses"); return; }
              navigate(`/products/category/${cat.slug}`);
            }}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <Package className="h-8 w-8" style={{ color: cat.color }} />
              <span className="text-sm font-medium">{cat.name}</span>
              <span className="text-xs text-muted-foreground">{cat.count} {cat.slug === "courses" ? "courses" : "products"}</span>
              {cat.slug !== "courses" && <span className="text-xs font-semibold">{fc(cat.revenue)}</span>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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

      {/* Products Table */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No products found. {isAdmin && "Click 'Add Product' to get started."}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => handleProductClick(p)}>
                  <TableCell className="font-medium">{p.product_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.product_code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{p.category}</Badge>
                  </TableCell>
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

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} />
      <ProductSaleDialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen} />
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
    </div>
  );
}
