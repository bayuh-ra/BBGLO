import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../api/supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { DateTime } from "luxon";

const OrderDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [latestProfile, setLatestProfile] = useState(null);
  const [updating, setUpdating] = useState(false);
  const orderId = location.state?.orderId;

  console.log("OrderDetails component, orderId received:", orderId);

  // Format date using luxon
  const formatDate = useCallback((isoDate) => {
    if (!isoDate) return "—";
    try {
      return DateTime.fromISO(isoDate)
        .setZone("Asia/Manila")
        .toLocaleString(DateTime.DATETIME_MED);
    } catch (error) {
      console.error("Error formatting date", error);
      return "Invalid Date";
    }
  }, []);

  // Fetch order details by ID
  const fetchOrderDetails = useCallback(async (orderId) => {
    if (!orderId) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error) {
      console.error("Error fetching order details:", error);
      return;
    }
    setOrder(data);
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId, fetchOrderDetails]);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!order?.customer_email) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", order.customer_email)
        .single();
      if (error) {
        console.error("Error fetching profile", error);
        return;
      }
      setLatestProfile(data);
    };
    if (order) {
      fetchProfile();
    }
  }, [order?.customer_email, order]);

  // Realtime subscription to orders table
  useEffect(() => {
    if (!orderId) return;

    const ordersSubscription = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("Order change received:", payload);
          fetchOrderDetails(orderId);
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, [orderId, fetchOrderDetails]);

  const cancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setUpdating(true);

    try {
      // 1. Update the 'orders' table
      const { data: updatedOrder, error: ordersError } = await supabase
        .from("orders")
        .update({ status: "Cancelled" })
        .eq("order_id", order.order_id)
        .select();

      if (ordersError) {
        console.error("Failed to cancel order in 'orders' table", ordersError);
        alert("Failed to cancel order.");
        setUpdating(false);
        return;
      }

      // 2. Update the 'OrderHistory' table (if it exists and is needed)
      // Assuming 'OrderHistory' has an order_id and status.  Adjust as needed.
      const { error: orderHistoryError } = await supabase
        .from("OrderHistory") //  <-  Use the correct table name
        .update({ status: "Cancelled" })
        .eq("order_id", order.order_id);

      if (orderHistoryError) {
        console.error("Failed to update OrderHistory", orderHistoryError);
        //  Don't block the main operation, but log the error.
        //  Consider a separate alert if this is critical.
      }

      // 3. Update the 'Dashboard' table (if it exists and is needed)
      //  Assuming 'Dashboard'  has order_id and status.  Adjust as needed.
      const { error: dashboardError } = await supabase
        .from("Dashboard") //  <-  Use the correct table name
        .update({ order_status: "Cancelled" }) //  <- Use the correct column name
        .eq("order_id", order.order_id);

      if (dashboardError) {
        console.error("Failed to update Dashboard", dashboardError);
        // Don't block, but log.  Consider separate alert if critical.
      }

      // If all Supabase operations were successful (or non-blocking errors), update the UI
      setOrder(updatedOrder?.[0]); // Use the updated order data
      alert("Order cancelled successfully.");
    } catch (err) {
      console.error("Error during cancellation:", err);
      alert("An error occurred while cancelling the order.");
    } finally {
      setUpdating(false);
    }
  };

  const downloadInvoice = async () => {
    const invoice = document.getElementById("invoice");
    if (!invoice) return;

    try {
      const canvas = await html2canvas(invoice);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const width = 190;
      const height = (imgProps.height * width) / imgProps.width;
      pdf.addImage(imgData, "PNG", 10, 10, width, height);
      pdf.save(`Invoice-${order.order_id}.pdf`);
    } catch (error) {
      console.error("Error downloading invoice", error);
      alert("Failed to download invoice");
    }
  };

  const items = order?.items
    ? typeof order.items === "string"
      ? JSON.parse(order.items)
      : order.items
    : [];

  const progressSteps = [
    { label: "Order Placed", timestamp: order?.date_ordered },
    { label: "Packed", timestamp: order?.packed_at },
    { label: "In Transit", timestamp: order?.in_transit_at },
    { label: "Delivered", timestamp: order?.delivered_at },
  ];

  const isCancelled = order?.status === "Cancelled";

  if (!order) {
    return (
      <div className="p-6">
        <p>Order not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div id="invoice" className="bg-red-100 p-4 rounded-md mb-4">
        <h2 className="text-xl font-bold">Order Details</h2>
        <p>
          <strong>Order ID:</strong> {order.order_id}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`font-semibold ${
              isCancelled ? "text-red-600" : "text-blue-700"
            }`}
          >
            {order.status}
          </span>
        </p>
        <p>
          <strong>Date Ordered:</strong> {formatDate(order.date_ordered)}
        </p>
        <p>
          <strong>Placed By:</strong> {order.placed_by || "—"}
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">Order Progress</h3>
        {isCancelled ? (
          <div className="text-center text-red-600 font-semibold">
            This order has been cancelled.
          </div>
        ) : (
          <div className="flex justify-between relative">
            {progressSteps.map((step, index) => {
              const isCompleted = !!step.timestamp;
              return (
                <div key={index} className="text-center flex-1 relative z-10">
                  <div
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm
                        ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                  >
                    {index + 1}
                  </div>
                  <p className="text-sm mt-2">{step.label}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(step.timestamp)}
                  </p>
                  {index < progressSteps.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-1 z-[-1]">
                      <div
                        className={`h-full ${
                          progressSteps[index + 1].timestamp
                            ? "bg-green-500 w-full"
                            : "bg-gray-300 w-0"
                        } transition-all duration-500`}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Products</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Product</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{item.item_name}</td>
                <td className="p-2">
                  ₱
                  {item.selling_price
                    ? Number(item.selling_price).toLocaleString()
                    : "0"}
                </td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">
                  ₱
                  {item.selling_price
                    ? (item.selling_price * item.quantity).toLocaleString()
                    : "0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="bg-red-100 p-4 rounded-md mb-4">
        <h3 className="text-lg font-bold">TOTAL</h3>
        <p className="text-xl font-semibold">
          ₱{order.total_amount ? order.total_amount.toLocaleString() : "0"} (
          {items.length} Products)
        </p>
      </div>

      {/* Shipping Info */}
      <div className="bg-gray-100 p-4 rounded-md">
        <h3 className="text-lg font-bold mb-2">Shipping Information</h3>
        <p>
          <strong>Company:</strong>{" "}
          {latestProfile?.company || order.company || "—"}
        </p>
        <p>
          <strong>Inventory Manager:</strong>{" "}
          {latestProfile?.name || order.customer_name || "—"}
        </p>
        <p>
          <strong>Address:</strong>{" "}
          {latestProfile?.shippingAddress || order.shipping_address || "—"}
        </p>
        <p>
          <strong>Phone:</strong>{" "}
          {latestProfile?.contact || order.contact || "—"}
        </p>
        <p>
          <strong>Email:</strong> {order.customer_email}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={() => navigate("/order-history")}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Order History
        </button>

        {order.status === "Pending" && (
          <button
            onClick={cancelOrder}
            disabled={updating}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            {updating ? "Cancelling..." : "Cancel Order"}
          </button>
        )}

        {order.status === "Complete" && (
          <>
            <button
              onClick={() => navigate("/cart")}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Reorder
            </button>
            <button
              onClick={downloadInvoice}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Download Invoice
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
