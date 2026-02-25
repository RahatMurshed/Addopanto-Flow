import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useCreateProductSale } from "@/hooks/useProductSales";
import { toast } from "sonner";

interface ProductSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProduct?: Product | null;
}

export function ProductSaleDialog({ open, onOpenChange, preselectedProduct }: ProductSaleDialogProps) {
  const { data: products = [] } = useProducts({ status: "active" });
  const createSale = useCreateProductSale();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  // Reset form when dialog opens or preselectedProduct changes
  useEffect(() => {
    if (open) {
      setProductId(preselectedProduct?.id || "");
      setUnitPrice(preselectedProduct?.price || 0);
      setQuantity(1);
      setCustomerName("");
      setPaymentMethod("cash");
      setSaleDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  }, [open, preselectedProduct]);

  // When product changes, update unit price
  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((pr) => pr.id === id);
    if (p) setUnitPrice(p.price);
  };

  const totalAmount = quantity * unitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { toast.error("Select a product"); return; }
    if (quantity < 1) { toast.error("Quantity must be at least 1"); return; }

    try {
      await createSale.mutateAsync({
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        customer_name: customerName || null,
        payment_method: paymentMethod,
        sale_date: saleDate,
        notes: notes || null,
      });
      toast.success("Sale recorded successfully");
      onOpenChange(false);
      // Reset
      setProductId(""); setQuantity(1); setUnitPrice(0);
      setCustomerName(""); setNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale");
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Product Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.product_name} ({p.product_code})
                    {p.type === "physical" && ` — Stock: ${p.stock_quantity}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct?.type === "physical" && selectedProduct.stock_quantity < quantity && (
              <p className="text-xs text-destructive">Insufficient stock (available: {selectedProduct.stock_quantity})</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Qty *</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label>Unit Price</Label>
              <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <Input value={totalAmount.toFixed(2)} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sale Date</Label>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createSale.isPending}>{createSale.isPending ? "Recording..." : "Record Sale"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
