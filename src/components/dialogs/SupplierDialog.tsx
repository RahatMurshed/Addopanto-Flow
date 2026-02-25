import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSupplier, useUpdateSupplier, type Supplier, type SupplierInsert } from "@/hooks/useSuppliers";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierDialog({ open, onOpenChange, supplier }: Props) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const [form, setForm] = useState<SupplierInsert>({
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    payment_terms: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        supplier_name: supplier.supplier_name,
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        payment_terms: supplier.payment_terms || "",
        notes: supplier.notes || "",
        status: supplier.status,
      });
    } else {
      setForm({ supplier_name: "", contact_person: "", phone: "", email: "", address: "", payment_terms: "", notes: "", status: "active" });
    }
  }, [supplier, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      if (supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...form });
        toast.success("Supplier updated");
      } else {
        await createSupplier.mutateAsync(form);
        toast.success("Supplier created");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save supplier");
    }
  };

  const isPending = createSupplier.isPending || updateSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier Name *</Label>
              <Input value={form.supplier_name} onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={form.contact_person || ""} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={form.address || ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input value={form.payment_terms || ""} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} placeholder="e.g. Net 30" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : supplier ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
