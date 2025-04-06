import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DateTime } from "luxon";
import logo from "../assets/logo.png"; // adjust path if needed
import "./Roboto-normal";

export const generateInvoicePDF = async (order, profile) => {
  const doc = new jsPDF();
  doc.setFont("Roboto");

  const date = DateTime.fromISO(order.date_ordered)
    .setZone("Asia/Manila")
    .toLocaleString(DateTime.DATETIME_MED);

  // Load logo image
  const getBase64FromImage = (imgPath) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imgPath;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
    });
  };

  try {
    const base64Logo = await getBase64FromImage(logo);
    doc.addImage(base64Logo, "PNG", 14, 10, 40, 30);
  } catch (err) {
    console.warn("Logo could not be loaded", err);
  }

  // Title Section
  doc.setFontSize(18);
  doc.text("BabyGlo Supplies", 50, 18);
  doc.setFontSize(12);
  doc.text("Official Receipt / Invoice", 50, 25);
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 200 - 14, 18, { align: "right" });
  doc.text(`Order ID: ${order.order_id}`, 200 - 14, 25, { align: "right" });

  // Customer Info
  doc.setFontSize(11);
  doc.text("Customer Info:", 14, 45);
  doc.setFontSize(10);
  doc.text(`Company: ${profile?.company || order.company || "—"}`, 14, 52);
  doc.text(`Inventory Manager: ${profile?.name || order.customer_name || "—"}`, 14, 58);
  doc.text(`Address: ${profile?.shippingAddress || order.shipping_address || "—"}`, 14, 64);
  doc.text(`Phone: ${profile?.contact || order.contact || "—"}`, 14, 70);
  doc.text(`Email: ${order.customer_email}`, 14, 76);

  // Items
  const items = typeof order.items === "string"
    ? JSON.parse(order.items)
    : order.items || [];

  const formatCurrency = (value) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const tableData = items.map((item, i) => {
    const price = parseFloat(item.selling_price || 0);
    const qty = parseInt(item.quantity || 0);
    const subtotal = price * qty;
    return [
      `${i + 1}`,
      item.item_name,
      formatCurrency(price),
      `${qty}`,
      formatCurrency(subtotal),
    ];
  });

  autoTable(doc, {
    startY: 85,
    head: [["#", "Product", "Price", "Qty", "Subtotal"]],
    body: tableData,
    styles: {
      fontSize: 10,
      font: "Roboto",
    },
    headStyles: { fillColor: [26, 32, 44], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const totalY = doc.lastAutoTable.finalY + 10;
  const total = formatCurrency(order.total_amount);

  // Total Section
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`TOTAL: ${total}`, 14, totalY);

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Thank you for your business!", 105, totalY + 10, { align: "center" });

  // Save
  doc.save(`Invoice-${order.order_id}.pdf`);
};
