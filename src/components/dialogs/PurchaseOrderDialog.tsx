import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePurchaseOrder, useUpdatePurchaseOrder, type PurchaseOrder, type PurchaseOrderInsert } from "@/hooks/usePurchaseOrders";

import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrder | null;
}

export function PurchaseOrderDialog({ open, onOpenChange, order }: Props) {
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  

  const [form, setForm] = useState<PurchaseOrderInsert>({
    order_number: "",
    supplier_id: null,
    status: "pending",
    expected_delivery: null,
    total_amount: 0,
    notes: "",
  });

  useEffect(() => {
    if (order) {
      setForm({
        order_number: order.order_number,
        supplier_id: order.supplier_id,
        status: order.status,
        expected_delivery: order.expected_delivery,
        total_amount: order.total_amount,
        notes: order.notes || "",
      });
    } else {
      setForm({ order_number: "", supplier_id: null, status: "pending", expected_delivery: null, total_amount: 0, notes: "" });
    }
  }, [order, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.order_number.trim()) {
      toast.error("Order number is required");
      return;
    }
    try {
      if (order) {
        await updateOrder.mutateAsync({ id: order.id, ...form });
        toast.success("Purchase order updated");
      } else {
        await createOrder.mutateAsync(form);
        toast.success("Purchase order created");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save purchase order");
    }
  };

  const isPending = createOrder.isPending || updateOrder.isPending;
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Number *</Label>
              <Input value={form.order_number} onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))} />
            </div>


          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <Input type="date" value={form.expected_delivery || ""} onChange={(e) => setForm((f) => ({ ...f, expected_delivery: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Total Amount</Label>
            <Input type="number" min={0} step="0.01" value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : order ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
