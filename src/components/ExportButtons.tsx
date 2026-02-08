import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonsProps {
  onExportCSV: () => void;
  onExportPDF: () => Promise<void>;
  csvLabel?: string;
  pdfLabel?: string;
  disabled?: boolean;
}

export default function ExportButtons({
  onExportCSV,
  onExportPDF,
  csvLabel = "Export CSV",
  pdfLabel = "Export PDF",
  disabled = false,
}: ExportButtonsProps) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handlePDFExport = async () => {
    setIsExportingPDF(true);
    try {
      await onExportPDF();
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isExportingPDF}>
          {isExportingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={onExportCSV} disabled={disabled}>
          <FileText className="mr-2 h-4 w-4" />
          {csvLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDFExport} disabled={disabled || isExportingPDF}>
          <FileText className="mr-2 h-4 w-4" />
          {pdfLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
