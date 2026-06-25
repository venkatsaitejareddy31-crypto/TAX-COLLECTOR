import jsPDF from "jspdf";

export function downloadInvoicePdf(invoice) {
  const doc = new jsPDF();
  const total = Number(invoice.total || 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", 18, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 18, 36);
  doc.text(`Issue date: ${invoice.issueDate}`, 18, 44);
  doc.text(`Status: ${invoice.status}`, 18, 52);

  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 18, 68);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.clientName, 18, 76);
  if (invoice.clientEmail) doc.text(invoice.clientEmail, 18, 84);

  let y = 104;
  doc.setFont("helvetica", "bold");
  doc.text("Description", 18, y);
  doc.text("Qty", 124, y);
  doc.text("Rate", 144, y);
  doc.text("Amount", 170, y);
  doc.line(18, y + 4, 194, y + 4);

  doc.setFont("helvetica", "normal");
  invoice.items.forEach((item) => {
    y += 13;
    const amount = Number(item.quantity || 0) * Number(item.rate || 0);
    doc.text(item.description.slice(0, 48), 18, y);
    doc.text(String(item.quantity), 126, y);
    doc.text(`$${Number(item.rate).toFixed(2)}`, 144, y);
    doc.text(`$${amount.toFixed(2)}`, 170, y);
  });

  doc.line(126, y + 12, 194, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text("Total", 144, y + 24);
  doc.text(`$${total.toFixed(2)}`, 170, y + 24);

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
