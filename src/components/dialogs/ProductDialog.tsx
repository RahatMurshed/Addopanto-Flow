import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, useCreateProduct, useUpdateProduct, type Product, type ProductInsert } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCourses } from "@/hooks/useCourses";
import { useBatches } from "@/hooks/useBatches";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  defaultCategory?: string;
}

export function ProductDialog({ open, onOpenChange, product, defaultCategory }: ProductDialogProps) {
  const { isCompanyAdmin, isCipher } = useCompany();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useProductCategories();
  const { data: suppliers = [] } = useSuppliers();
  const { data: courses = [] } = useCourses();
  const { data: batches = [] } = useBatches();
  const { data: allProducts = [] } = useProducts();
  const isAdmin = isCompanyAdmin || isCipher;

  // Allow all categories including courses
  const selectableCategories = categories;

  const [form, setForm] = useState<ProductInsert>({
    product_name: "",
    product_code: "",
    category: defaultCategory || "other",
    type: "physical",
    description: "",
    price: 0,
    purchase_price: 0,
    stock_quantity: 0,
    reorder_level: 5,
    image_url: "",
    status: "active",
    linked_course_id: null,
    supplier_id: null,
    barcode: null,
    sku: null,
  });

  const [validationError, setValidationError] = useState("");

  // Auto-generate product code
  const autoProductCode = useMemo(() => {
    const count = allProducts.length + 1;
    return `PRD-${count.toString().padStart(3, "0")}`;
  }, [allProducts.length]);

  useEffect(() => {
    if (product) {
      setForm({
        product_name: product.product_name,
        product_code: product.product_code,
        category: product.category,
        type: product.type,
        description: product.description || "",
        price: product.price,
        purchase_price: product.purchase_price,
        stock_quantity: product.stock_quantity,
        reorder_level: product.reorder_level,
        image_url: product.image_url || "",
        status: product.status,
        linked_course_id: product.linked_course_id,
        supplier_id: product.supplier_id,
        barcode: product.barcode,
        sku: product.sku,
      });
    } else {
      setForm({
        product_name: "", product_code: "", category: defaultCategory || "other", type: "physical",
        description: "", price: 0, purchase_price: 0, stock_quantity: 0,
        reorder_level: 5, image_url: "", status: "active", linked_course_id: null,
        supplier_id: null, barcode: null, sku: null,
      });
    }
    setValidationError("");
  }, [product, open, defaultCategory]);

  const isCourseCategory = form.category === "courses";
  const isPhysical = form.type === "physical" && !isCourseCategory;

  // Auto-fill course data when course is selected
  useEffect(() => {
    if (!isCourseCategory || !form.linked_course_id) return;
    const course = courses.find((c) => c.id === form.linked_course_id);
    if (!course) return;

    // Find first batch for this course to get fee defaults
    const courseBatch = batches.find((b) => b.course_id === course.id);
    const admissionFee = courseBatch?.default_admission_fee || 0;
    const monthlyFee = courseBatch?.default_monthly_fee || 0;
    const duration = courseBatch?.course_duration_months || course.duration_months || 12;
    const calculatedPrice = admissionFee + (monthlyFee * duration);

    setForm((f) => ({
      ...f,
      product_name: course.course_name,
      price: calculatedPrice,
      type: "digital",
    }));
  }, [form.linked_course_id, isCourseCategory, courses, batches]);

  // When category changes to courses, reset type
  useEffect(() => {
    if (isCourseCategory) {
      setForm((f) => ({ ...f, type: "digital" }));
    }
  }, [isCourseCategory]);

  // Check duplicate course product
  const duplicateCourseProduct = useMemo(() => {
    if (!isCourseCategory || !form.linked_course_id) return null;
    return allProducts.find(
      (p) => p.linked_course_id === form.linked_course_id && p.id !== product?.id
    );
  }, [isCourseCategory, form.linked_course_id, allProducts, product?.id]);

  // Check product code uniqueness
  const codeExists = useMemo(() => {
    const code = (form.product_code || "").trim();
    if (!code) return false;
    return allProducts.some((p) => p.product_code === code && p.id !== product?.id);
  }, [form.product_code, allProducts, product?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const code = form.product_code.trim() || autoProductCode;

    if (!form.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (codeExists) {
      toast.error("Product code already exists");
      return;
    }

    if (isCourseCategory && duplicateCourseProduct) {
      toast.error(`A product already exists for this course: ${duplicateCourseProduct.product_name}`);
      return;
    }

    if (!isCourseCategory && isPhysical && form.purchase_price > 0 && form.price <= form.purchase_price) {
      setValidationError("Selling price must be greater than purchase price");
      return;
    }

    if (form.price < 0) { toast.error("Price cannot be negative"); return; }

    try {
      const payload: ProductInsert = {
        ...form,
        product_code: code,
        type: isCourseCategory ? "digital" : form.type,
        linked_course_id: isCourseCategory ? form.linked_course_id : null,
        // Clear physical fields for course products
        ...(isCourseCategory ? { stock_quantity: 0, purchase_price: 0, reorder_level: 0 } : {}),
      };
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
        toast.success("Product updated");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Product created");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v, linked_course_id: null }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {selectableCategories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isCourseCategory && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isCourseCategory && (
            <div className="space-y-2">
              <Label>Link to Course *</Label>
              <Select value={form.linked_course_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, linked_course_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a course...</SelectItem>
                  {courses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.course_name} ({c.course_code})</SelectItem>))}
                </SelectContent>
              </Select>
              {duplicateCourseProduct && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  A product already exists for this course
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                readOnly={isCourseCategory && !!form.linked_course_id}
                className={isCourseCategory && form.linked_course_id ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Product Code</Label>
              <Input
                value={form.product_code}
                onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value }))}
                placeholder={autoProductCode}
              />
              {codeExists && <p className="text-xs text-destructive">Code already in use</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isCourseCategory ? "Calculated Price" : "Selling Price *"}</Label>
              <Input
                type="number" min={0} step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                readOnly={isCourseCategory && !!form.linked_course_id}
                className={isCourseCategory && form.linked_course_id ? "bg-muted" : ""}
              />
            </div>
            {!isCourseCategory && isAdmin && (
              <div className="space-y-2">
                <Label>Purchase Price</Label>
                <Input type="number" min={0} step="0.01" value={form.purchase_price} onChange={(e) => setForm((f) => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
          </div>

          {validationError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {validationError}
            </p>
          )}

          {isPhysical && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input type="number" min={0} value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          )}

          {!isCourseCategory && (
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.supplier_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isCourseCategory && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input value={form.barcode || ""} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value || null }))} placeholder="Barcode" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={form.sku || ""} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value || null }))} placeholder="SKU" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isCourseCategory && (
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={form.image_url || ""} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !!duplicateCourseProduct}>
              {isPending ? "Saving..." : product ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
