import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useCompanyTags, useStudentTagAssignments,
  useCreateTag, useAssignTag, useUnassignTag,
} from "@/hooks/useStudentTags";

const TAG_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
];

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  companyId: string;
}

export function ManageTagsDialog({ open, onOpenChange, studentId, companyId }: ManageTagsDialogProps) {
  const { toast } = useToast();
  const [newTagLabel, setNewTagLabel] = useState("");

  const { data: tags = [], isLoading: tagsLoading } = useCompanyTags(companyId);
  const { data: assignments = [], isLoading: assignmentsLoading } = useStudentTagAssignments(studentId, companyId);
  const createTag = useCreateTag(companyId);
  const assignTag = useAssignTag(companyId);
  const unassignTag = useUnassignTag(companyId);

  const assignedTagIds = new Set(assignments.map(a => a.tag_id));
  const isLoading = tagsLoading || assignmentsLoading;
  const isMutating = createTag.isPending || assignTag.isPending || unassignTag.isPending;

  const handleToggle = async (tagId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        await unassignTag.mutateAsync({ studentId, tagId });
      } else {
        await assignTag.mutateAsync({ studentId, tagId });
      }
    } catch (err: any) {
      toast({ title: "Failed to update tag", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateTag = async () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const colorClass = TAG_COLORS[tags.length % TAG_COLORS.length];
    try {
      const newTag = await createTag.mutateAsync({ label, colorClass });
      setNewTagLabel("");
      // Auto-assign the new tag
      await assignTag.mutateAsync({ studentId, tagId: newTag.id });
      toast({ title: `Tag "${label}" created and assigned` });
    } catch (err: any) {
      toast({ title: "Failed to create tag", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Assign or remove tags for this student. Tags help categorize and filter students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tags created yet. Create your first tag below.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags.map(tag => {
                const isAssigned = assignedTagIds.has(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={isAssigned}
                      disabled={isMutating}
                      onCheckedChange={() => handleToggle(tag.id, isAssigned)}
                    />
                    <Badge variant="secondary" className={tag.color_class}>
                      {tag.label}
                    </Badge>
                  </label>
                );
              })}
            </div>
          )}

          {/* Create new tag */}
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Create new tag</p>
            <div className="flex gap-2">
              <Input
                placeholder="Tag name..."
                value={newTagLabel}
                onChange={e => setNewTagLabel(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateTag()}
                className="flex-1"
                disabled={isMutating}
              />
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagLabel.trim() || isMutating}
              >
                {createTag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
