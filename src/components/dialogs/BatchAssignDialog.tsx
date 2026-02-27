import { useState, useMemo } from "react";
import { useBatches, type Batch } from "@/hooks/useBatches";
import { useBatchStudentCount } from "@/hooks/useBatches";
import { useUpdateStudent, useAllStudents } from "@/hooks/useStudents";
import { useCreateBatchHistory } from "@/hooks/useStudentBatchHistory";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { syncBatchEnrollment } from "@/utils/enrollmentSync";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  studentNames: string[];
  onSuccess?: () => void;
}

function BatchOption({ batch, selected, onSelect, studentCount }: {
  batch: Batch;
  selected: boolean;
  onSelect: () => void;
  studentCount: number;
}) {
  const atCapacity = batch.max_capacity ? studentCount >= batch.max_capacity : false;

  return (
    <button
      onClick={onSelect}
      disabled={atCapacity}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : atCapacity
          ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{batch.batch_name}</p>
          <p className="text-xs text-muted-foreground">{batch.batch_code}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{studentCount}{batch.max_capacity ? `/${batch.max_capacity}` : ""}</span>
          </div>
          {atCapacity && (
            <Badge variant="secondary" className="text-xs">Full</Badge>
          )}
          {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
      </div>
    </button>
  );
}

export default function BatchAssignDialog({ open, onOpenChange, studentIds, studentNames, onSuccess }: Props) {
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const { data: batches = [] } = useBatches({ status: "active" });
  const { data: allStudents = [] } = useAllStudents();
  const updateStudent = useUpdateStudent();
  const createHistory = useCreateBatchHistory();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches;
    const q = search.toLowerCase();
    return batches.filter(
      (b) => b.batch_name.toLowerCase().includes(q) || b.batch_code.toLowerCase().includes(q)
    );
  }, [batches, search]);

  // We need student counts for each batch - use a simple approach
  // Since useBatchStudentCount is per-batch, we'll show counts inline
  const handleAssign = async () => {
    if (!selectedBatchId || studentIds.length === 0) return;
    setAssigning(true);
    try {
      // Check capacity before assigning
      const selectedBatch = batches.find((b) => b.id === selectedBatchId);
      if (selectedBatch?.max_capacity != null) {
        const { count } = await supabase
          .from("batch_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", selectedBatchId)
          .eq("status", "active");

        const currentCount = count ?? 0;
        if (currentCount + studentIds.length > selectedBatch.max_capacity) {
          toast({ title: "Batch is full", description: `Maximum capacity of ${selectedBatch.max_capacity} students reached. Currently ${currentCount} enrolled.`, variant: "destructive" });
          setAssigning(false);
          return;
        }
      }
      // Get current batch_ids for history tracking
      const studentMap = new Map(allStudents.map(s => [s.id, s]));

      // Update all students and record history in parallel
      await Promise.all(
        studentIds.map(async (id) => {
          const currentStudent = studentMap.get(id);
          const fromBatchId = currentStudent?.batch_id || null;
          await updateStudent.mutateAsync({ id, batch_id: selectedBatchId } as any);
          // Sync batch enrollment (drops old, creates new)
          if (activeCompanyId && user) {
            await syncBatchEnrollment(id, fromBatchId, selectedBatchId, activeCompanyId, user.id);
          }
          // Record transfer history
          await createHistory.mutateAsync({
            student_id: id,
            from_batch_id: fromBatchId,
            to_batch_id: selectedBatchId,
            reason: fromBatchId ? "Batch reassignment" : "Initial batch assignment",
          });
        })
      );
      const batch = batches.find((b) => b.id === selectedBatchId);
      toast({
        title: "Students assigned",
        description: `${studentIds.length} student${studentIds.length > 1 ? "s" : ""} assigned to ${batch?.batch_name || "batch"}.`,
      });
      onSuccess?.();
      onOpenChange(false);
      setSelectedBatchId(null);
      setSearch("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = (o: boolean) => {
    if (!assigning) {
      onOpenChange(o);
      if (!o) {
        setSelectedBatchId(null);
        setSearch("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Batch</DialogTitle>
          <DialogDescription>
            {studentIds.length === 1
              ? `Assign "${studentNames[0]}" to a batch`
              : `Assign ${studentIds.length} students to a batch`}
          </DialogDescription>
        </DialogHeader>

        {/* Preview of selected students */}
        {studentIds.length > 1 && studentIds.length <= 5 && (
          <div className="flex flex-wrap gap-1">
            {studentNames.map((name, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Batch list */}
        <ScrollArea className="max-h-64">
          <div className="space-y-2 pr-2">
            {filteredBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No batches found</p>
            ) : (
              filteredBatches.map((batch) => (
                <BatchOptionWithCount
                  key={batch.id}
                  batch={batch}
                  selected={selectedBatchId === batch.id}
                  onSelect={() => setSelectedBatchId(batch.id)}
                  additionalStudents={studentIds.length}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Capacity info */}
        {selectedBatchId && (() => {
          const batch = batches.find((b) => b.id === selectedBatchId);
          if (batch?.max_capacity) {
            return (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Capacity limit: {batch.max_capacity}. Assignment will be blocked if capacity is exceeded.</span>
              </div>
            );
          }
          return null;
        })()}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={assigning}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedBatchId || assigning}>
            {assigning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</>
            ) : (
              `Assign${studentIds.length > 1 ? ` (${studentIds.length})` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchOptionWithCount({ batch, selected, onSelect, additionalStudents }: {
  batch: Batch;
  selected: boolean;
  onSelect: () => void;
  additionalStudents: number;
}) {
  const { data: currentCount = 0 } = useBatchStudentCount(batch.id);
  const wouldExceed = batch.max_capacity ? (currentCount + additionalStudents) > batch.max_capacity : false;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{batch.batch_name}</p>
          <p className="text-xs text-muted-foreground">{batch.batch_code}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{currentCount}{batch.max_capacity ? `/${batch.max_capacity}` : ""}</span>
          </div>
          {wouldExceed && (
            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600">
              Over cap
            </Badge>
          )}
          {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
      </div>
    </button>
  );
}
