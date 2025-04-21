import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";
import { generateInvoicePDF } from "../../utils/invoiceGenerator";

const OrderDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [latestProfile, setLatestProfile] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [staffName, setStaffName] = useState({});
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

  const fetchOrderDetails = useCallback(
    async (orderId) => {
      if (!orderId) return;
      try {
        // First fetch the order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("order_id", orderId)
          .single();

        if (orderError) {
          console.error("Error fetching order details:", orderError);
          alert("Failed to fetch order details. Please try again.");
          navigate("/order-history");
          return;
        }

        if (!orderData) {
          alert("Order not found.");
          navigate("/order-history");
          return;
        }

        setOrder(orderData);
      } catch (err) {
        console.error("Error in fetchOrderDetails:", err);
        alert("An error occurred while fetching order details.");
        navigate("/order-history");
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!orderId) {
      navigate("/order-history");
      return;
    }
    fetchOrderDetails(orderId);
  }, [orderId, fetchOrderDetails, navigate]);

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

  useEffect(() => {
    const fetchStaffNames = async () => {
      if (!order) return;

      const staffIds = [
        order.confirmed_by,
        order.packed_by,
        order.in_transit_by,
        order.delivered_by,
      ].filter(Boolean);

      if (staffIds.length === 0) return;

      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, name")
        .in("id", staffIds);

      if (error) {
        console.error("Error fetching staff names:", error);
        return;
      }

      const nameMap = {};
      data.forEach((s) => {
        nameMap[s.id] = s.name;
      });

      setStaffName(nameMap);
    };

    if (order) {
      fetchStaffNames();
    }
  }, [order]);

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

  const markOrderAsReceived = async () => {
    if (
      !window.confirm("Are you sure you want to mark this order as received?")
    )
      return;
    setUpdating(true);

    try {
      const { data: updatedOrder, error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "Complete",
        })
        .eq("order_id", order.order_id)
        .select();

      if (ordersError) {
        console.error("Failed to mark order as received", ordersError);
        alert("Failed to mark order as received.");
        setUpdating(false);
        return;
      }

      setOrder(updatedOrder?.[0]);
      alert("Order marked as received successfully.");
    } catch (err) {
      console.error("Error during order receipt:", err);
      alert("An error occurred while marking the order as received.");
    } finally {
      setUpdating(false);
    }
  };

  const items = order?.items
    ? typeof order.items === "string"
      ? JSON.parse(order.items)
      : order.items
    : [];

  const progressSteps = [
    {
      label: "Order Placed",
      icon: "📝",
      timestamp: order?.date_ordered,
      isActive: true,
    },
    {
      label: "Order Confirmed",
      icon: "✅",
      timestamp: order?.confirmed_at,
      isActive: [
        "Order Confirmed",
        "Packed",
        "In Transit",
        "Delivered",
        "Complete",
      ].includes(order?.status),
      updated_by: staffName?.[order?.confirmed_by],
      updated_label: "Confirmed by",
    },
    {
      label: "Packed",
      icon: "📦",
      timestamp: order?.packed_at,
      isActive: ["Packed", "In Transit", "Delivered", "Complete"].includes(
        order?.status
      ),
      updated_by: staffName?.[order?.packed_by],
      updated_label: "Packed by",
    },
    {
      label: "In Transit",
      icon: "🚚",
      timestamp: order?.in_transit_at,
      isActive: ["In Transit", "Delivered", "Complete"].includes(order?.status),
      updated_by: staffName?.[order?.in_transit_by],
      updated_label: "Dispatched by",
    },
    {
      label: "Delivered",
      icon: "📬",
      timestamp: order?.delivered_at,
      isActive: ["Delivered", "Complete"].includes(order?.status),
      updated_by: staffName?.[order?.delivered_by],
      updated_label: "Delivered by",
    },
  ];

  const isCancelled = order?.status === "Cancelled";

  if (!order) {
    return (
      <div className="p-6">
        <p>Order not found.</p>
      </div>
    );
  }

  const orderTime = DateTime.fromISO(order?.date_ordered);
  const cancelDeadline = orderTime.plus({ hours: 3 });
  const now = DateTime.local();
  const canStillCancel = now < cancelDeadline && order?.status === "Pending";

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
              isCancelled
                ? "text-red-600"
                : order.status === "Complete"
                ? "text-green-600"
                : "text-blue-700"
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
        {order?.status === "Pending" && (
          <div className="mt-2 text-sm text-gray-600">
            You can cancel this order until{" "}
            <span className="font-semibold text-red-500">
              {cancelDeadline.toFormat("ff")}
            </span>
            .
          </div>
        )}
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
              return (
                <div key={index} className="text-center flex-1 relative z-10">
                  <div
                    className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                      step.isActive
                        ? "bg-green-500 text-white shadow-lg scale-110"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <p
                    className={`text-sm mt-2 font-medium ${
                      step.isActive ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(step.timestamp)}
                  </p>
                  {step.updated_by && (
                    <p className="text-xs text-gray-700 italic">
                      {step.updated_label || "Updated by"}:{" "}
                      {step.updated_by || "—"}
                    </p>
                  )}
                  {index < progressSteps.length - 1 && (
                    <div className="absolute top-6 left-1/2 w-full h-1 z-[-1]">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progressSteps[index + 1].isActive
                            ? "bg-green-500 w-full"
                            : step.isActive
                            ? "bg-green-500 w-1/2"
                            : "bg-gray-300 w-0"
                        }`}
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

        {order.status === "Delivered" && (
          <button
            onClick={markOrderAsReceived}
            disabled={updating}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {updating ? "Processing..." : "Order Received"}
          </button>
        )}

        {order.status === "Pending" &&
          (canStillCancel ? (
            <button
              onClick={cancelOrder}
              disabled={updating}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              {updating ? "Cancelling..." : "Cancel Order"}
            </button>
          ) : (
            <p className="text-gray-500 italic mt-2">
              ⏰ You can no longer cancel this order (3-hour window expired).
            </p>
          ))}

        {order.status === "Complete" && (
          <>
            <button
              onClick={() => {
                // Parse items if they're stored as a string
                const orderItems =
                  typeof order.items === "string"
                    ? JSON.parse(order.items)
                    : order.items;

                // Add items to cart
                localStorage.setItem("cart", JSON.stringify(orderItems));
                window.dispatchEvent(new Event("cartUpdated"));

                // Navigate to cart
                navigate("/cart");
              }}
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
