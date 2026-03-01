import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface RecordField {
  label: string;
  value: string | ReactNode;
}

interface RecordDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: RecordField[];
}

export default function RecordDetailDialog({
  open,
  onOpenChange,
  title,
  fields,
}: RecordDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {fields.map((field, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">{field.label}</span>
                <span className="text-sm font-medium text-right">{field.value || "—"}</span>
              </div>
              {i < fields.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
