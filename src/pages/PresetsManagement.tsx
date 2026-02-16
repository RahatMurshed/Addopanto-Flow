import { useState } from "react";
import { Bookmark, Trash2, Search, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/hooks/use-toast";
import {
  useSavedSearchPresets,
  useDeletePreset,
  type SavedSearchPreset,
} from "@/hooks/useSavedSearchPresets";
import type { StudentFilterValues } from "@/components/students/StudentFilters";

const FILTER_LABELS: Record<string, string> = {
  status: "Status",
  admissionStatus: "Admission",
  monthlyStatus: "Monthly",
  sortBy: "Sort By",
  sortOrder: "Sort Order",
  batchId: "Batch",
  gender: "Gender",
  classGrade: "Class/Grade",
  addressCity: "City",
  addressState: "State",
  addressArea: "Area",
  addressPinZip: "PIN/ZIP",
  academicYear: "Academic Year",
  search: "Search",
  includeAltContact: "Alt Contact",
};

const DEFAULT_VALUES: Record<string, unknown> = {
  search: "",
  status: "all",
  admissionStatus: "all",
  monthlyStatus: "all",
  sortBy: "name",
  sortOrder: "asc",
  batchId: "all",
  gender: "all",
  classGrade: "",
  addressCity: "",
  addressState: "",
  addressArea: "",
  addressPinZip: "",
  academicYear: "",
  includeAltContact: true,
};

function getActiveFilters(filters: StudentFilterValues) {
  const active: { label: string; value: string }[] = [];
  for (const [key, defaultVal] of Object.entries(DEFAULT_VALUES)) {
    const val = (filters as any)[key];
    if (val !== undefined && val !== defaultVal) {
      active.push({
        label: FILTER_LABELS[key] || key,
        value: typeof val === "boolean" ? (val ? "Yes" : "No") : String(val),
      });
    }
  }
  return active;
}

export default function PresetsManagement() {
  const { data: presets = [], isLoading } = useSavedSearchPresets();
  const deletePreset = useDeletePreset();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavedSearchPreset | null>(null);

  const filtered = presets.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePreset.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Preset deleted", description: `"${deleteTarget.name}" has been removed.` });
        setDeleteTarget(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete preset.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bookmark className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Saved Presets
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your saved student filter presets
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto text-sm px-3 py-1">
          {presets.length} preset{presets.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <Filter className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {searchQuery ? "No matching presets" : "No presets saved yet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {searchQuery
                ? "Try adjusting your search query."
                : "Go to the Students page, apply filters, and click 'Save Current' to create a preset."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((preset) => {
            const activeFilters = getActiveFilters(preset.filters);
            return (
              <Card
                key={preset.id}
                className="group relative overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground leading-snug">
                      {preset.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteTarget(preset)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(preset.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  {activeFilters.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Default filters (no customizations)
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {activeFilters.map((f, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs font-normal bg-accent/50 border-border"
                        >
                          <span className="font-medium text-foreground">{f.label}:</span>
                          <span className="ml-1 text-muted-foreground">{f.value}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePreset.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
