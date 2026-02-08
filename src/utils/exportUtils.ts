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

  try {
    // Create a clone for better rendering
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let currentY = margin;

    // Add business name if provided
    if (businessName) {
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(businessName, margin, currentY + 5);
      currentY += 10;
    }

    // Add title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin, currentY + 5);
    currentY += 7;
    
    // Add date range
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Period: ${dateRangeLabel}`, margin, currentY + 5);
    currentY += 5;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, currentY + 5);
    currentY += 7;

    // Calculate image dimensions
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const startY = currentY;

    // Check if image fits on one page
    if (imgHeight + startY > pageHeight - margin) {
      // Need to split across pages
      let remainingHeight = imgHeight;
      let currentY = startY;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - currentY - margin;
        const sliceHeight = Math.min(remainingHeight, availableHeight);
        
        // Calculate source coordinates
        const sourceHeight = (sliceHeight / imgHeight) * canvas.height;
        
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          currentY,
          imgWidth,
          sliceHeight,
          undefined,
          "FAST"
        );

        remainingHeight -= sliceHeight;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          currentY = margin;
        }
      }
    } else {
      pdf.addImage(imgData, "PNG", margin, startY, imgWidth, imgHeight);
    }

    pdf.save(`${filename}_${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

/**
 * Simple print-based PDF export (fallback)
 */
export function printPage(): void {
  window.print();
}
