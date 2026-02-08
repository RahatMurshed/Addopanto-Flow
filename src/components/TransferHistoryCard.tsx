import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, ArrowLeftRight, Trash2, Loader2, CalendarIcon, X } from "lucide-react";
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
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { KhataTransfer } from "@/hooks/useKhataTransfers";
import type { AccountBalance } from "@/hooks/useExpenses";
import type { DateRange } from "react-day-picker";

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name || "Unknown";
  const getAccountColor = (id: string) => accounts.find((a) => a.id === id)?.color || "#888";

  const filteredTransfers = useMemo(() => {
    if (!dateRange?.from) return transfers;
    
    return transfers.filter((transfer) => {
      const transferDate = new Date(transfer.created_at);
      const start = startOfDay(dateRange.from!);
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
      return isWithinInterval(transferDate, { start, end });
    });
  }, [transfers, dateRange]);

  const displayTransfers = limit ? filteredTransfers.slice(0, limit) : filteredTransfers;

  const handleDelete = async () => {
    if (!deleteId || !onDelete) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
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
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Filter by date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearDateFilter}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No transfers found in this date range</p>
              <Button variant="link" onClick={clearDateFilter} className="mt-2">
                Clear filter
              </Button>
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
                      {showDelete && onDelete && <TableHead className="w-12"></TableHead>}
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
                          ৳{Number(transfer.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden max-w-xs truncate md:table-cell">
                          {transfer.description || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {showDelete && onDelete && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(transfer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {showDateFilter && (
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? "s" : ""}
                    {dateRange?.from && " in selected range"}
                  </span>
                  <span className="font-semibold">
                    Total: ৳{totalAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transfer record and reverse the balance changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
