import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateStockAdjustment } from "@/hooks/useProductStockMovements";
import { type Product } from "@/hooks/useProducts";
import { toast } from "sonner";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function StockAdjustmentDialog({ open, onOpenChange, product }: StockAdjustmentDialogProps) {
  const adjust = useCreateStockAdjustment();
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (quantity === 0) { toast.error("Quantity cannot be zero"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }

    try {
      await adjust.mutateAsync({ productId: product.id, quantity, reason });
      toast.success("Stock adjusted");
      onOpenChange(false);
      setQuantity(0);
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock");
    }
  };

  const newStock = (product?.stock_quantity ?? 0) + quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {product?.product_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current stock: <span className="font-semibold text-foreground">{product?.stock_quantity ?? 0}</span>
          </div>
          <div className="space-y-2">
            <Label>Adjustment (positive to add, negative to deduct)</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
          </div>
          {newStock < 0 && <p className="text-xs text-destructive">New stock cannot be negative</p>}
          <div className="text-sm">New stock: <span className="font-semibold">{newStock}</span></div>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Damaged items, New purchase" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={adjust.isPending || newStock < 0}>{adjust.isPending ? "Saving..." : "Adjust"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
