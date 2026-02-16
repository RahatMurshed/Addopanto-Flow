import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Course, CourseInsert } from "@/hooks/useCourses";

const courseSchema = z.object({
  course_name: z.string().trim().min(1, "Name is required").max(200),
  course_code: z.string().trim().min(1, "Code is required").max(50),
  description: z.string().max(1000).nullable().optional(),
  duration_months: z.number().min(1).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  status: z.enum(["active", "inactive"]),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSave: (data: CourseInsert) => Promise<any>;
}

function generateCourseCode(name: string): string {
  const year = new Date().getFullYear();
  const words = name.trim().split(/\s+/).filter(Boolean);
  const abbr = words.length >= 2
    ? words.map(w => w[0]).join("").toUpperCase().slice(0, 4)
    : name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
  return `${abbr}-${year}`;
}

export default function CourseDialog({ open, onOpenChange, course, onSave }: CourseDialogProps) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!course;

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      course_name: "",
      course_code: "",
      description: null,
      duration_months: null,
      category: null,
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        course_name: course?.course_name || "",
        course_code: course?.course_code || "",
        description: course?.description || null,
        duration_months: course?.duration_months ?? null,
        category: course?.category || null,
        status: (course?.status as any) || "active",
      });
    }
  }, [open, course, form]);

  // Auto-generate code from name (create mode only)
  const watchedName = form.watch("course_name");
  useEffect(() => {
    if (!isEdit && watchedName && !form.getValues("course_code")) {
      form.setValue("course_code", generateCourseCode(watchedName));
    }
  }, [watchedName, isEdit, form]);

  const handleSubmit = async (data: CourseFormData) => {
    setSaving(true);
    try {
      await onSave({
        course_name: data.course_name,
        course_code: data.course_code,
        description: data.description || null,
        duration_months: data.duration_months ?? null,
        category: data.category || null,
        status: data.status,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "Create Course"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update course information" : "Create a new course to organize batches"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course_name">Course Name *</Label>
              <Input id="course_name" placeholder="e.g. Web Development Bootcamp" disabled={saving} {...form.register("course_name")} />
              {form.formState.errors.course_name && <p className="text-sm text-destructive">{form.formState.errors.course_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course_code">Course Code *</Label>
              <Input id="course_code" placeholder="e.g. WDB-2024" disabled={saving} {...form.register("course_code")} />
              {form.formState.errors.course_code && <p className="text-sm text-destructive">{form.formState.errors.course_code.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (months)</Label>
              <Input id="duration_months" type="number" min="1" disabled={saving} {...form.register("duration_months", { valueAsNumber: true, setValueAs: (v) => v === "" || v === undefined ? null : Number(v) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="e.g. Technology, Marketing" disabled={saving} {...form.register("category")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} disabled={saving} {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
