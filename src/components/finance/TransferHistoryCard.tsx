import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeftRight, Trash2, Loader2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KhataTransfer } from "@/hooks/useKhataTransfers";
import type { AccountBalance } from "@/hooks/useExpenses";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";
import AdvancedDateFilter from "@/components/shared/AdvancedDateFilter";
import type { DateRange, FilterType, FilterValue } from "@/utils/dateRangeUtils";
import RecordDetailDialog from "@/components/dialogs/RecordDetailDialog";

interface TransferHistoryCardProps {
  transfers: KhataTransfer[];
  accounts: AccountBalance[];
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
  showDelete?: boolean;
  showDateFilter?: boolean;
  limit?: number;
}

export default function TransferHistoryCard({
  transfers,
  accounts,
  onDelete,
  isDeleting,
  showDelete = true,
  showDateFilter = false,
  limit,
}: TransferHistoryCardProps) {
  const { fc } = useCompanyCurrency();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<DateRange | null>(null);
  const [viewingTransfer, setViewingTransfer] = useState<KhataTransfer | null>(null);

  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name || "Unknown";
  const getAccountColor = (id: string) => accounts.find((a) => a.id === id)?.color || "#888";

  const handleFilterChange = useCallback((range: DateRange, _filterType: FilterType, _filterValue: FilterValue) => {
    setFilterDateRange(range);
  }, []);

  const filteredTransfers = useMemo(() => {
    if (!filterDateRange) return transfers;
    
    return transfers.filter((transfer) => {
      const transferDate = new Date(transfer.created_at);
      const start = startOfDay(filterDateRange.start);
      const end = endOfDay(filterDateRange.end);
      return isWithinInterval(transferDate, { start, end });
    });
  }, [transfers, filterDateRange]);

  // Fetch recorder profiles
  const userIds = useMemo(() => [...new Set(filteredTransfers.map(t => t.user_id))], [filteredTransfers]);
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["transfer-user-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("user_profiles").select("user_id, full_name, email").in("user_id", userIds);
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });
  const getRecorderName = (userId: string) => {
    const p = userProfiles.find(p => p.user_id === userId);
    return p?.full_name || p?.email || "Unknown";
  };

  // Pagination for filtered transfers
  const pagination = usePagination(filteredTransfers);

  // Reset page when date range changes
  useEffect(() => {
    pagination.resetPage();
  }, [filterDateRange]);

  const displayTransfers = limit 
    ? filteredTransfers.slice(0, limit) 
    : pagination.paginatedItems;

  const handleDelete = async () => {
    if (!deleteId || !onDelete) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const totalAmount = filteredTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

  if (transfers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No transfers yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer History
            {limit && filteredTransfers.length > limit && (
              <span className="text-sm font-normal text-muted-foreground">
                (Showing {limit} of {filteredTransfers.length})
              </span>
            )}
          </CardTitle>
          
          {showDateFilter && (
            <AdvancedDateFilter
              onFilterChange={handleFilterChange}
              defaultFilterType="monthly"
            />
          )}
        </CardHeader>
        <CardContent>
          {filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No transfers found in this date range</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead></TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Note</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">
                          {format(new Date(transfer.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: getAccountColor(transfer.from_account_id) }}
                            />
                            <span>{getAccountName(transfer.from_account_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: getAccountColor(transfer.to_account_id) }}
                            />
                            <span>{getAccountName(transfer.to_account_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fc(Number(transfer.amount))}
                        </TableCell>
                        <TableCell className="hidden max-w-xs truncate md:table-cell">
                          {transfer.description || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewingTransfer(transfer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {showDelete && onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(transfer.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Show pagination when no limit and has more than 10 items */}
              {!limit && filteredTransfers.length > 10 && (
                <TablePagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  startIndex={pagination.startIndex}
                  endIndex={pagination.endIndex}
                  itemsPerPage={pagination.itemsPerPage}
                  onPageChange={pagination.goToPage}
                  onItemsPerPageChange={pagination.setItemsPerPage}
                  canGoNext={pagination.canGoNext}
                  canGoPrev={pagination.canGoPrev}
                />
              )}
              
              {showDateFilter && (
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold">
                    Total: {fc(totalAmount)}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (isDeleting) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transfer record and reverse the balance changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Detail Dialog */}
      <RecordDetailDialog
        open={!!viewingTransfer}
        onOpenChange={(open) => { if (!open) setViewingTransfer(null); }}
        title="Transfer Details"
        fields={viewingTransfer ? [
          { label: "Entry Date", value: format(new Date(viewingTransfer.created_at), "MMM d, yyyy h:mm a") },
          { label: "From", value: getAccountName(viewingTransfer.from_account_id) },
          { label: "To", value: getAccountName(viewingTransfer.to_account_id) },
          { label: "Amount", value: fc(Number(viewingTransfer.amount)) },
          { label: "Description", value: viewingTransfer.description || "—" },
          { label: "Recorded By", value: getRecorderName(viewingTransfer.user_id) },
        ] : []}
      />
    </>
  );
}
