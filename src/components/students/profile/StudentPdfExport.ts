import { format } from "date-fns";

interface PdfExportOptions {
  studentName: string;
  companyName: string;
  contentElement: HTMLElement;
}

export async function exportStudentPdf({
  studentName,
  companyName,
  contentElement,
}: PdfExportOptions): Promise<void> {
  // Temporarily force light theme for capture
  const root = document.documentElement;
  const wasDark = root.classList.contains("dark");
  if (wasDark) root.classList.remove("dark");

  // Hide interactive elements during capture
  const interactiveEls = contentElement.querySelectorAll<HTMLElement>(
    "button, [role='button'], a, .no-print"
  );
  interactiveEls.forEach((el) => (el.style.visibility = "hidden"));

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(contentElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 190; // A4 width minus margins (210 - 20)
    const pageHeight = 277; // A4 height minus margins (297 - 20)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF("p", "mm", "a4");
    const dateStr = format(new Date(), "dd MMM yyyy");

    // Helper to add header on each page
    const addHeader = (pageNum: number, totalPages: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(companyName, 10, 8);
      pdf.text(`Student Report — ${studentName}`, 10, 12);
      pdf.text(`Generated: ${dateStr}`, 200, 8, { align: "right" });
      pdf.text(`Page ${pageNum}/${totalPages}`, 200, 12, { align: "right" });
      pdf.setDrawColor(220);
      pdf.line(10, 14, 200, 14);
    };

    const totalPages = Math.ceil(imgHeight / pageHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      addHeader(page + 1, totalPages);

      const sourceY = page * pageHeight * (canvas.width / imgWidth);
      const sourceHeight = Math.min(
        canvas.height - sourceY,
        pageHeight * (canvas.width / imgWidth)
      );
      const sliceHeight = (sourceHeight * imgWidth) / canvas.width;

      // Create a slice canvas for this page
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sourceHeight;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0, sourceY, canvas.width, sourceHeight,
        0, 0, canvas.width, sourceHeight
      );

      const sliceData = sliceCanvas.toDataURL("image/png");
      pdf.addImage(sliceData, "PNG", 10, 16, imgWidth, sliceHeight);
    }

    const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileDate = format(new Date(), "yyyy-MM-dd");
    pdf.save(`Student_Report_${safeName}_${fileDate}.pdf`);
  } finally {
    // Restore theme and visibility
    if (wasDark) root.classList.add("dark");
    interactiveEls.forEach((el) => (el.style.visibility = ""));
  }
}
