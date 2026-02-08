import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface TransactionRecord {
  date: string;
  type: "revenue" | "expense";
  amount: number;
  category: string;
  description?: string | null;
}

/**
 * Export data as CSV file
 */
export function exportToCSV(
  data: TransactionRecord[],
  filename: string,
  dateRangeLabel: string
): void {
  const headers = ["Date", "Type", "Amount", "Category", "Description"];
  
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      [
        `"${row.date}"`,
        `"${row.type}"`,
        row.amount.toString(),
        `"${row.category}"`,
        `"${row.description || ""}"`,
      ].join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export expenses as CSV
 */
export function exportExpensesToCSV(
  expenses: Array<{
    date: string;
    amount: number;
    accountName: string;
    description?: string | null;
  }>,
  dateRangeLabel: string
): void {
  const data: TransactionRecord[] = expenses.map((e) => ({
    date: e.date,
    type: "expense",
    amount: e.amount,
    category: e.accountName,
    description: e.description,
  }));
  exportToCSV(data, "expenses", dateRangeLabel);
}

/**
 * Export revenues as CSV
 */
export function exportRevenuesToCSV(
  revenues: Array<{
    date: string;
    amount: number;
    sourceName: string;
    description?: string | null;
  }>,
  dateRangeLabel: string
): void {
  const data: TransactionRecord[] = revenues.map((r) => ({
    date: r.date,
    type: "revenue",
    amount: r.amount,
    category: r.sourceName,
    description: r.description,
  }));
  exportToCSV(data, "revenues", dateRangeLabel);
}

/**
 * Export combined transactions as CSV
 */
export function exportAllTransactionsCSV(
  revenues: Array<{
    date: string;
    amount: number;
    sourceName: string;
    description?: string | null;
  }>,
  expenses: Array<{
    date: string;
    amount: number;
    accountName: string;
    description?: string | null;
  }>,
  dateRangeLabel: string
): void {
  const revenueData: TransactionRecord[] = revenues.map((r) => ({
    date: r.date,
    type: "revenue",
    amount: r.amount,
    category: r.sourceName,
    description: r.description,
  }));

  const expenseData: TransactionRecord[] = expenses.map((e) => ({
    date: e.date,
    type: "expense",
    amount: e.amount,
    category: e.accountName,
    description: e.description,
  }));

  const allData = [...revenueData, ...expenseData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  exportToCSV(allData, "transactions", dateRangeLabel);
}

/**
 * Export page as PDF using html2canvas and jsPDF
 * - Forces light theme for consistent output
 * - Properly handles multi-page content with correct slicing
 */
export async function exportToPDF(
  elementId: string,
  filename: string,
  title: string,
  dateRangeLabel: string,
  businessName?: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Store current theme and force light mode for PDF
  const htmlElement = document.documentElement;
  const wasDarkMode = htmlElement.classList.contains("dark");
  
  try {
    // Temporarily switch to light mode for clean PDF
    if (wasDarkMode) {
      htmlElement.classList.remove("dark");
      // Wait for styles to reflow
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Capture with higher scale for better quality
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // A4 dimensions in mm
    const A4_WIDTH = 210;
    const A4_HEIGHT = 297;
    const margin = 10;
    const contentWidth = A4_WIDTH - margin * 2;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let headerY = margin;

    // Add business name if provided
    if (businessName) {
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(businessName, margin, headerY + 5);
      headerY += 10;
    }

    // Add title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, margin, headerY + 5);
    headerY += 7;

    // Add date range
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Period: ${dateRangeLabel}`, margin, headerY + 5);
    headerY += 5;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, headerY + 5);
    headerY += 10;

    // Calculate scaled image dimensions to fit A4 width
    const scaledImgHeight = (canvas.height * contentWidth) / canvas.width;
    const availableHeightFirstPage = A4_HEIGHT - headerY - margin;
    const availableHeightOtherPages = A4_HEIGHT - margin * 2;

    // Convert canvas to image data
    const imgData = canvas.toDataURL("image/png");

    if (scaledImgHeight <= availableHeightFirstPage) {
      // Content fits on one page
      pdf.addImage(imgData, "PNG", margin, headerY, contentWidth, scaledImgHeight);
    } else {
      // Multi-page: slice the canvas properly
      const pixelsPerMm = canvas.width / contentWidth;
      let sourceY = 0;
      let isFirstPage = true;

      while (sourceY < canvas.height) {
        const availableHeight = isFirstPage ? availableHeightFirstPage : availableHeightOtherPages;
        const sliceHeightPx = Math.min(availableHeight * pixelsPerMm, canvas.height - sourceY);
        const sliceHeightMm = sliceHeightPx / pixelsPerMm;

        // Create a temporary canvas to slice the image
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );
          
          const sliceImgData = sliceCanvas.toDataURL("image/png");
          const yPosition = isFirstPage ? headerY : margin;
          
          pdf.addImage(sliceImgData, "PNG", margin, yPosition, contentWidth, sliceHeightMm);
        }

        sourceY += sliceHeightPx;
        
        if (sourceY < canvas.height) {
          pdf.addPage();
          isFirstPage = false;
        }
      }
    }

    pdf.save(`${filename}_${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    // Restore dark mode if it was active
    if (wasDarkMode) {
      htmlElement.classList.add("dark");
    }
  }
}

/**
 * Simple print-based PDF export (fallback)
 */
export function printPage(): void {
  window.print();
}
