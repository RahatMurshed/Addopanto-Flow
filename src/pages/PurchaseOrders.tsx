import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePurchaseOrders, useDeletePurchaseOrder, type PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { PurchaseOrderDialog } from "@/components/dialogs/PurchaseOrderDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClipboardList, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { isCompanyAdmin, isCipher } = useCompany();
  const { fc } = useCompanyCurrency();
  const isAdmin = isCompanyAdmin || isCipher;

  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const deleteOrder = useDeletePurchaseOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.supplier_name]));

  const filtered = orders.filter((o) =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteOrder.mutateAsync(deleteId);
      toast.success("Purchase order deleted");
      setDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="capitalize text-xs">Pending</Badge>;
      case "partial": return <Badge className="bg-orange-500/15 text-orange-600 text-xs">Partial</Badge>;
      case "received": return <Badge className="bg-green-500/15 text-green-600 text-xs">Received</Badge>;
      case "cancelled": return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default: return <Badge variant="secondary" className="capitalize text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Manage purchase orders for restocking</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditingOrder(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Create Order
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No purchase orders found.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/purchase-orders/${o.id}`)}>
                  <TableCell className="font-medium">{o.order_number}</TableCell>
                  <TableCell className="text-muted-foreground">{o.supplier_id ? supplierMap.get(o.supplier_id) || "—" : "—"}</TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell>{o.expected_delivery ? format(new Date(o.expected_delivery), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell className="text-right">{fc(o.total_amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${o.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingOrder(o); setDialogOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(o.id)}>
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

      <PurchaseOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} order={editingOrder} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the order and all its items.</AlertDialogDescription>
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
