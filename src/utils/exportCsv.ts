/**
 * Generate and download a CSV file from headers and rows.
 * Reusable across Course Payments, Product Purchases, and future PDF export.
 */
export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const sanitize = (val: string): string => {
    const s = String(val ?? "");
    // Prevent CSV formula injection: prefix dangerous leading chars with a single quote
    if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
    return s;
  };
  const escape = (cell: string) => `"${sanitize(cell).replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
