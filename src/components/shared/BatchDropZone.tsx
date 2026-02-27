import { useState } from "react";
import { useBatches, type Batch, useBatchStudentCount } from "@/hooks/useBatches";
import { useUpdateStudent, useAllStudents } from "@/hooks/useStudents";
import { useCreateBatchHistory } from "@/hooks/useStudentBatchHistory";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { syncBatchEnrollment } from "@/utils/enrollmentSync";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Layers, Loader2, CheckCircle2 } from "lucide-react";

interface BatchDropZoneProps {
  /** IDs currently selected via checkboxes — if a selected student is dragged, all selected get assigned */
  selectedIds: Set<string>;
  /** Map of student id → name for toast messages */
  studentNameMap: Map<string, string>;
  onSuccess?: () => void;
}

function DropTarget({ batch, selectedIds, dragStudentId, studentNameMap, onSuccess, allStudents, companyId, userId }: {
  batch: Batch;
  selectedIds: Set<string>;
  dragStudentId: string | null;
  studentNameMap: Map<string, string>;
  onSuccess?: () => void;
  allStudents: any[];
  companyId: string | null;
  userId: string | null;
}) {
  const [over, setOver] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [justAssigned, setJustAssigned] = useState(false);
  const { data: count = 0 } = useBatchStudentCount(batch.id);
  const updateStudent = useUpdateStudent();
  const createHistory = useCreateBatchHistory();
  const { toast } = useToast();

  const atCapacity = batch.max_capacity ? count >= batch.max_capacity : false;

  const handleDragOver = (e: React.DragEvent) => {
    if (atCapacity) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOver(true);
  };

  const handleDragLeave = () => setOver(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (atCapacity || assigning) return;

    const droppedId = e.dataTransfer.getData("text/student-id");
    if (!droppedId) return;

    // If the dragged student is part of the selection, assign all selected; otherwise just the one
    const idsToAssign = selectedIds.has(droppedId) && selectedIds.size > 1
      ? Array.from(selectedIds)
      : [droppedId];

    setAssigning(true);
    const studentMap = new Map(allStudents.map((s: any) => [s.id, s]));
    try {
      await Promise.all(
        idsToAssign.map(async (id) => {
          const currentStudent = studentMap.get(id);
          const fromBatchId = currentStudent?.batch_id || null;
          await updateStudent.mutateAsync({ id, batch_id: batch.id } as any);
          // Sync enrollment records
          if (companyId && userId) {
            await syncBatchEnrollment(id, fromBatchId, batch.id, companyId, userId);
          }
          await createHistory.mutateAsync({
            student_id: id,
            from_batch_id: fromBatchId,
            to_batch_id: batch.id,
            reason: fromBatchId ? "Drag-and-drop batch reassignment" : "Drag-and-drop batch assignment",
          });
        })
      );
      toast({
        title: "Assigned to batch",
        description: `${idsToAssign.length} student${idsToAssign.length > 1 ? "s" : ""} → ${batch.batch_name}`,
      });
      setJustAssigned(true);
      setTimeout(() => setJustAssigned(false), 1500);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex-shrink-0 flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 transition-all duration-200 select-none
        ${justAssigned
          ? "border-green-500 bg-green-500/10"
          : over
            ? "border-primary bg-primary/10 scale-[1.03] shadow-md"
            : atCapacity
              ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
              : "border-border hover:border-primary/40"
        }
      `}
    >
      {assigning ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : justAssigned ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Layers className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-[120px]">{batch.batch_name}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>{count}{batch.max_capacity ? `/${batch.max_capacity}` : ""}</span>
      </div>
      {atCapacity && <Badge variant="secondary" className="text-[10px] px-1.5">Full</Badge>}
    </div>
  );
}

export default function BatchDropZone({ selectedIds, studentNameMap, onSuccess }: BatchDropZoneProps) {
  const { data: batches = [] } = useBatches({ status: "active" });
  const { data: allStudents = [] } = useAllStudents();
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  
  if (batches.length === 0) return null;

  return (
    <div
      className="student-dnd-drop-zone"
      data-dragging={isDragging}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Drop students onto a batch to assign
        </span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {batches.map((batch) => (
            <DropTarget
              key={batch.id}
              batch={batch}
              selectedIds={selectedIds}
              dragStudentId={null}
              studentNameMap={studentNameMap}
              onSuccess={onSuccess}
              allStudents={allStudents}
              companyId={activeCompanyId}
              userId={user?.id || null}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
