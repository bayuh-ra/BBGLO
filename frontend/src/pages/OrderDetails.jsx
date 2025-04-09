import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../api/supabaseClient";
import { DateTime } from "luxon";
import { generateInvoicePDF } from "../utils/invoiceGenerator";
import { Dialog } from "@headlessui/react";

const OrderDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [latestProfile, setLatestProfile] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const orderId = location.state?.orderId;

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
        () => {
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
      const { data: updatedOrder, error: ordersError } = await supabase
        .from("orders")
        .update({ status: "Cancelled" })
        .eq("order_id", order.order_id)
        .select();

      if (ordersError) {
        console.error("Failed to cancel order", ordersError);
        alert("Failed to cancel order.");
        setUpdating(false);
        return;
      }

      setOrder(updatedOrder?.[0]);
      alert("Order cancelled successfully.");
    } catch (err) {
      console.error("Error during cancellation:", err);
      alert("An error occurred while cancelling the order.");
    } finally {
      setUpdating(false);
    }
  };

  const downloadInvoice = async () => {
    try {
      generateInvoicePDF(order, latestProfile);
    } catch (err) {
      console.error("Invoice download error:", err);
      alert("Failed to generate invoice.");
    }
  };

  const handleReorder = () => {
    // Get items from the current order
    const orderItems = items.map((item) => ({
      ...item,
      quantity: parseInt(item.quantity) || 1,
    }));

    // Get existing cart items
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

    // Merge order items with existing cart
    const updatedCart = [...existingCart];
    orderItems.forEach((orderItem) => {
      const existingItemIndex = updatedCart.findIndex(
        (cartItem) => cartItem.item_id === orderItem.item_id
      );

      if (existingItemIndex !== -1) {
        // If item exists in cart, update quantity
        updatedCart[existingItemIndex].quantity += orderItem.quantity;
      } else {
        // If item doesn't exist, add it
        updatedCart.push(orderItem);
      }
    });

    // Save updated cart to localStorage
    localStorage.setItem("cart", JSON.stringify(updatedCart));

    // Trigger cart update event
    window.dispatchEvent(new Event("cartUpdated"));

    // Navigate to cart
    navigate("/cart");
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

  const handleDeliveryConfirm = async () => {
    if (!deliveryDate) {
      alert("Please provide a delivery date.");
      return;
    }

    try {
      console.log("Starting delivery confirmation process...");
      console.log("Order ID:", order.order_id);
      console.log("Delivery Date:", deliveryDate);

      // Generate delivery ID
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
      const rand = Math.floor(Math.random() * 9000 + 1000);
      const generatedId = `DEL-${dateStr}-${rand}`;
      console.log("Generated Delivery ID:", generatedId);

      // Create delivery record using Django API
      const response = await fetch("http://127.0.0.1:8000/api/deliveries/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          delivery_id: generatedId,
          order_id: order.order_id,
          delivery_date: deliveryDate,
          status: "Pending",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delivery creation failed:", errorData);
        alert(
          "Failed to create delivery record: " +
            (errorData.detail || errorData.message || "Unknown error")
        );
        return;
      }

      const deliveryData = await response.json();
      console.log("Delivery record created:", deliveryData);

      // Update order status to "Packed"
      console.log("Updating order status...");
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "Packed",
          packed_at: new Date().toISOString(),
        })
        .eq("order_id", order.order_id)
        .select();

      if (updateError) {
        console.error("Order status update failed:", updateError);
        alert("Failed to update order status: " + updateError.message);
        return;
      }
      console.log("Order status updated:", updatedOrder);

      alert("Delivery confirmed and order status updated!");
      setShowDeliveryModal(false);
      fetchOrderDetails(order.order_id); // Refresh order details
    } catch (err) {
      console.error("Error in delivery confirmation:", err);
      alert("An error occurred while confirming delivery: " + err.message);
    }
  };

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
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${
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
                  ₱{Number(item.selling_price).toLocaleString()}
                </td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">
                  ₱{(item.selling_price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-red-100 p-4 rounded-md mb-4">
        <h3 className="text-lg font-bold">TOTAL</h3>
        <p className="text-xl font-semibold">
          ₱{Number(order.total_amount).toLocaleString()} ({items.length}{" "}
          Products)
        </p>
      </div>

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

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={() => navigate("/order-history")}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Order History
        </button>

        {order.status === "Pending" && (
          <>
            <button
              onClick={() => setShowDeliveryModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Confirm Delivery
            </button>
            <button
              onClick={cancelOrder}
              disabled={updating}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              {updating ? "Cancelling..." : "Cancel Order"}
            </button>
          </>
        )}

        {order.status === "Complete" && (
          <>
            <button
              onClick={handleReorder}
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

      {/* Delivery Confirmation Modal */}
      <Dialog
        open={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="bg-white rounded-lg shadow-lg w-[400px] z-50 p-6 relative">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Confirm Delivery
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4">
            Please provide the delivery date for this order.
          </Dialog.Description>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Delivery Date:
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowDeliveryModal(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeliveryConfirm}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Confirm
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default OrderDetails;
