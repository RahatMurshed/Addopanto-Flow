import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useCreateProductSale } from "@/hooks/useProductSales";
import { useStudents } from "@/hooks/useStudents";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface ProductSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProduct?: Product | null;
}

export function ProductSaleDialog({ open, onOpenChange, preselectedProduct }: ProductSaleDialogProps) {
  const { data: products = [] } = useProducts({ status: "active" });
  const { data: studentsResult } = useStudents();
  const students = Array.isArray(studentsResult) ? studentsResult : studentsResult?.data ?? [];
  const createSale = useCreateProductSale();
  const { fc } = useCompanyCurrency();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial">("paid");
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);

  // Reset form when dialog opens or preselectedProduct changes
  useEffect(() => {
    if (open) {
      setProductId(preselectedProduct?.id || "");
      setUnitPrice(preselectedProduct?.price || 0);
      setQuantity(1);
      setCustomerName("");
      setStudentId(null);
      setPaymentMethod("cash");
      setSaleDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setPaymentStatus("paid");
      setSaleSuccess(false);
      setShowInactiveWarning(false);
    }
  }, [open, preselectedProduct]);

  // When product changes, update unit price
  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((pr) => pr.id === id);
    if (p) setUnitPrice(p.price);
  };

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedStudent = useMemo(() => studentId ? students.find((s) => s.id === studentId) : null, [studentId, students]);
  const totalAmount = quantity * unitPrice;
  const today = new Date().toISOString().slice(0, 10);

  // Validation
  const isPhysical = selectedProduct?.type === "physical";
  const stockAvailable = selectedProduct?.stock_quantity ?? 0;
  const isOverStock = isPhysical && quantity > stockAvailable;
  const isFutureDate = saleDate > today;
  // Issue 3.3: Allow zero-price product sales (promotional/free samples)
  const canSubmit = productId && quantity > 0 && unitPrice >= 0 && !isOverStock && !isFutureDate && !createSale.isPending;

  const doSubmit = async () => {
    try {
      await createSale.mutateAsync({
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        customer_name: customerName || null,
        student_id: studentId,
        payment_method: paymentMethod,
        sale_date: saleDate,
        notes: notes || null,
        payment_status: paymentStatus,
      } as any);
      setSaleSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { toast.error("Select a product"); return; }
    if (quantity < 1) { toast.error("Quantity must be at least 1"); return; }
    if (isOverStock) { toast.error(`Insufficient stock. Available: ${stockAvailable}`); return; }
    if (isFutureDate) { toast.error("Sale date cannot be in the future"); return; }

    // Check if selected student is inactive
    if (selectedStudent && selectedStudent.status !== "active") {
      setShowInactiveWarning(true);
      return;
    }

    await doSubmit();
  };

  const handleRecordAnother = () => {
    setProductId("");
    setQuantity(1);
    setUnitPrice(0);
    setCustomerName("");
    setStudentId(null);
    setNotes("");
    setSaleSuccess(false);
  };

  if (saleSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-semibold">Sale Recorded!</h3>
            <p className="text-sm text-muted-foreground">
              {quantity}× {selectedProduct?.product_name} — {fc(totalAmount)}
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={handleRecordAnother}>Record Another</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
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
              {isOverStock && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Only {stockAvailable} units available
                </p>
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
                <Input value={fc(totalAmount)} readOnly className="bg-muted" />
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

            {/* Link to Student */}
            <div className="space-y-2">
              <Label>Link to Student (optional)</Label>
              <Select value={studentId || "none"} onValueChange={(v) => setStudentId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No student</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.student_id_number ? `(${s.student_id_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStudent && selectedStudent.status !== "active" && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  This student is currently {selectedStudent.status}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "paid" | "pending" | "partial")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sale Date</Label>
                <Input type="date" value={saleDate} max={today} onChange={(e) => setSaleDate(e.target.value)} />
                {isFutureDate && (
                  <p className="text-xs text-destructive">Sale date cannot be in the future</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={!canSubmit}>
                {createSale.isPending ? "Recording..." : "Record Sale"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inactive student warning */}
      <AlertDialog open={showInactiveWarning} onOpenChange={setShowInactiveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Inactive Student
            </AlertDialogTitle>
            <AlertDialogDescription>
              This student is currently <strong className="text-foreground">{selectedStudent?.status}</strong>. Recording a sale will not reactivate them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowInactiveWarning(false); doSubmit(); }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
