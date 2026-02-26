import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePurchaseOrder, usePurchaseOrderItems, useCreatePurchaseOrderItem, useReceivePurchaseOrderItem, useUpdatePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useProducts, type Product } from "@/hooks/useProducts";

import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, Check, Package, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const { data: order, isLoading } = usePurchaseOrder(id);
  const { data: items = [] } = usePurchaseOrderItems(id);
  const { data: products = [] } = useProducts();
  
  const createItem = useCreatePurchaseOrderItem();
  const receiveItem = useReceivePurchaseOrderItem();
  const updateOrder = useUpdatePurchaseOrder();

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ product_id: "", quantity_ordered: 1, unit_cost: 0 });

  const productMap = new Map(products.map((p) => [p.id, p]));

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!order) return <div className="py-12 text-center text-muted-foreground">Purchase order not found</div>;

  const supplierName = null;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.product_id) { toast.error("Select a product"); return; }
    try {
      await createItem.mutateAsync({
        purchase_order_id: order.id,
        product_id: itemForm.product_id,
        quantity_ordered: itemForm.quantity_ordered,
        unit_cost: itemForm.unit_cost,
        total_cost: itemForm.quantity_ordered * itemForm.unit_cost,
      });
      toast.success("Item added");
      setAddItemOpen(false);
      setItemForm({ product_id: "", quantity_ordered: 1, unit_cost: 0 });
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    }
  };

  const handleReceive = async (itemId: string, currentReceived: number, ordered: number) => {
    try {
      await receiveItem.mutateAsync({ id: itemId, quantity_received: ordered });
      toast.success("Item received — stock updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to receive item");
    }
  };

  const handleMarkReceived = async () => {
    try {
      await updateOrder.mutateAsync({ id: order.id, status: "received" });
      toast.success("Order marked as received");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const allReceived = items.length > 0 && items.every((i) => i.quantity_received >= i.quantity_ordered);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/purchase-orders">Purchase Orders</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{order.order_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">PO #{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {supplierName && `Supplier: ${supplierName} · `}
            Status: <span className="capitalize">{order.status}</span>
            {order.expected_delivery && ` · Expected: ${format(new Date(order.expected_delivery), "dd MMM yyyy")}`}
          </p>
        </div>
        {isAdmin && order.status !== "received" && allReceived && (
          <Button onClick={handleMarkReceived} className="gap-2">
            <Check className="h-4 w-4" /> Mark Received
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Order Items</CardTitle>
          {isAdmin && order.status !== "received" && order.status !== "cancelled" && (
            <Button size="sm" onClick={() => setAddItemOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No items added yet.</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {isAdmin && <TableHead className="w-24">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const product = productMap.get(item.product_id);
                    const fullyReceived = item.quantity_received >= item.quantity_ordered;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{product?.product_name || "Unknown"}</TableCell>
                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity_received}
                          {fullyReceived && <Badge className="ml-2 bg-green-500/15 text-green-600 text-[10px]">Done</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{fc(item.unit_cost)}</TableCell>
                        <TableCell className="text-right">{fc(item.total_cost)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            {!fullyReceived && order.status !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReceive(item.id, item.quantity_received, item.quantity_ordered)}
                              >
                                Receive All
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Item to PO</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={itemForm.product_id || "none"} onValueChange={(v) => {
                const p = products.find((pr) => pr.id === v);
                setItemForm((f) => ({ ...f, product_id: v === "none" ? "" : v, unit_cost: p?.purchase_price || 0 }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.product_name} ({p.product_code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" min={1} value={itemForm.quantity_ordered} onChange={(e) => setItemForm((f) => ({ ...f, quantity_ordered: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input type="number" min={0} step="0.01" value={itemForm.unit_cost} onChange={(e) => setItemForm((f) => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createItem.isPending}>{createItem.isPending ? "Adding..." : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
