import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";
import { generateInvoicePDF } from "../../utils/invoiceGenerator";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(
    DateTime.now().minus({ days: 30 }).toISODate()
  );
  const [endDate, setEndDate] = useState(DateTime.now().toISODate());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [staffName, setStaffName] = useState({});

  const navigate = useNavigate();

  const formatDateToPhilippines = (utcDate) => {
    try {
      return DateTime.fromISO(utcDate, { zone: "utc" })
        .setZone("Asia/Manila")
        .toFormat("MMM dd, yyyy | hh:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return "—";
    try {
      return DateTime.fromISO(isoDate)
        .setZone("Asia/Manila")
        .toLocaleString(DateTime.DATETIME_MED);
    } catch (error) {
      console.error("Error formatting date", error);
      return "Invalid Date";
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("date_ordered", { ascending: false });

    if (error) {
      console.error("Error fetching orders", error);
    } else {
      setOrders(data || []);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription for orders
    const channel = supabase
      .channel("orders-realtime-customer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const filtered = orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;
      const matchesSearch =
        order.customer_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.order_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const orderDate = DateTime.fromISO(order.date_ordered).toISODate();
      const withinRange = orderDate >= startDate && orderDate <= endDate;

      return matchesStatus && matchesSearch && withinRange;
    });

    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    if (selectedOrder) {
      const fetchStaffNames = async () => {
        const staffIds = [
          selectedOrder.confirmed_by,
          selectedOrder.packed_by,
          selectedOrder.in_transit_by,
          selectedOrder.delivered_by,
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

      fetchStaffNames();
    }
  }, [selectedOrder]);

  const cancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setUpdating(true);

    try {
      const { data: updatedOrder, error: ordersError } = await supabase
        .from("orders")
        .update({ status: "Cancelled" })
        .eq("order_id", selectedOrder.order_id)
        .select();

      if (ordersError) {
        console.error("Failed to cancel order", ordersError);
        alert("Failed to cancel order.");
        setUpdating(false);
        return;
      }

      setSelectedOrder(updatedOrder?.[0]);
      setOrders(
        orders.map((order) =>
          order.order_id === selectedOrder.order_id ? updatedOrder[0] : order
        )
      );
      alert("Order cancelled successfully.");
    } catch (err) {
      console.error("Error during cancellation:", err);
      alert("An error occurred while cancelling the order.");
    } finally {
      setUpdating(false);
    }
  };

  const markOrderAsReceived = async () => {
    if (
      !window.confirm("Are you sure you want to mark this order as received?")
    )
      return;
    setUpdating(true);

    try {
      const now = new Date().toISOString();
      const { data: updatedOrder, error: ordersError } = await supabase
        .from("orders")
        .update({
          status: "Complete",
          completed_at: now,
        })
        .eq("order_id", selectedOrder.order_id)
        .select();

      if (ordersError) {
        console.error("Failed to mark order as received", ordersError);
        alert("Failed to mark order as received.");
        setUpdating(false);
        return;
      }

      setSelectedOrder(updatedOrder?.[0]);
      setOrders(
        orders.map((order) =>
          order.order_id === selectedOrder.order_id ? updatedOrder[0] : order
        )
      );
      alert("Order marked as received successfully.");
    } catch (err) {
      console.error("Error during order receipt:", err);
      alert("An error occurred while marking the order as received.");
    } finally {
      setUpdating(false);
    }
  };

  const downloadInvoice = async () => {
    try {
      generateInvoicePDF(selectedOrder);
    } catch (err) {
      console.error("Invoice download error:", err);
      alert("Failed to generate invoice.");
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const progressSteps = selectedOrder
    ? [
        {
          label: "Order Placed",
          icon: "📝",
          timestamp: selectedOrder?.date_ordered,
          isActive: true,
        },
        {
          label: "Order Confirmed",
          icon: "✅",
          timestamp: selectedOrder?.confirmed_at,
          isActive: [
            "Order Confirmed",
            "Packed",
            "In Transit",
            "Delivered",
            "Complete",
          ].includes(selectedOrder?.status),
          updated_by: staffName?.[selectedOrder?.confirmed_by],
          updated_label: "Confirmed by",
        },
        {
          label: "Packed",
          icon: "📦",
          timestamp: selectedOrder?.packed_at,
          isActive: ["Packed", "In Transit", "Delivered", "Complete"].includes(
            selectedOrder?.status
          ),
          updated_by: staffName?.[selectedOrder?.packed_by],
          updated_label: "Packed by",
        },
        {
          label: "In Transit",
          icon: "🚚",
          timestamp: selectedOrder?.in_transit_at,
          isActive: ["In Transit", "Delivered", "Complete"].includes(
            selectedOrder?.status
          ),
          updated_by: staffName?.[selectedOrder?.in_transit_by],
          updated_label: "Dispatched by",
        },
        {
          label: "Delivered",
          icon: "📬",
          timestamp: selectedOrder?.delivered_at,
          isActive: ["Delivered", "Complete"].includes(selectedOrder?.status),
          updated_by: staffName?.[selectedOrder?.delivered_by],
          updated_label: "Delivered by",
        },
        {
          label: "Received",
          icon: "🎉",
          timestamp: selectedOrder?.completed_at,
          isActive: selectedOrder?.status === "Complete",
        },
      ]
    : [];

  const isCancelled = selectedOrder?.status === "Cancelled";
  const orderTime = selectedOrder
    ? DateTime.fromISO(selectedOrder?.date_ordered)
    : null;
  const cancelDeadline = orderTime?.plus({ hours: 3 });
  const now = DateTime.local();
  const canStillCancel =
    orderTime && now < cancelDeadline && selectedOrder?.status === "Pending";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-extrabold text-pink-600 flex items-center gap-2">
        📜 Order History
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border-l-4 border-pink-400 p-4 flex flex-wrap gap-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border-pink-300 border px-3 py-2 rounded focus:ring-2 focus:ring-pink-200"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Packed">Packed</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <input
          type="text"
          placeholder="Search by customer or order ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-pink-300 border px-3 py-2 rounded w-64 focus:ring-2 focus:ring-pink-200"
        />

        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-pink-300 border px-2 py-1 rounded focus:ring-2 focus:ring-pink-200"
          />
          <span className="px-1">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-pink-300 border px-2 py-1 rounded focus:ring-2 focus:ring-pink-200"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-md border-l-4 border-pink-400 p-4 overflow-x-auto">
        <table className="w-full text-sm text-left text-black border-collapse">
          <thead className="bg-pink-100">
            <tr>
              <th className="px-4 py-2">Order ID</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date Ordered</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const items =
                typeof order.items === "string"
                  ? JSON.parse(order.items)
                  : order.items || [];

              const totalQty = items.reduce(
                (sum, i) => sum + (i.quantity || 0),
                0
              );
              const totalAmt = items.reduce(
                (sum, i) =>
                  sum + parseFloat(i.selling_price || 0) * (i.quantity || 1),
                0
              );

              return (
                <tr
                  key={order.order_id}
                  className="border-t hover:bg-pink-50 transition-colors duration-200 rounded-lg"
                >
                  <td className="px-4 py-2 font-semibold">{order.order_id}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      order.status === "Cancelled"
                        ? "text-red-500"
                        : order.status === "Complete" ||
                          order.status === "Delivered"
                        ? "text-green-500"
                        : order.status === "Pending"
                        ? "text-yellow-500"
                        : order.status === "Packed"
                        ? "text-blue-500"
                        : order.status === "In Transit"
                        ? "text-indigo-500"
                        : "text-gray-600"
                    }`}
                  >
                    {order.status}
                  </td>
                  <td className="px-4 py-2">
                    {formatDateToPhilippines(order.date_ordered)}
                  </td>
                  <td className="px-4 py-2">
                    ₱{totalAmt.toLocaleString()} ({totalQty}{" "}
                    {totalQty === 1 ? "Product" : "Products"})
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="bg-pink-500 text-white px-3 py-1 rounded hover:bg-pink-600 transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-gray-500 py-4">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Order Details</h2>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="bg-red-100 p-4 rounded-md mb-4">
              <p>
                <strong>Order ID:</strong> {selectedOrder.order_id}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`font-semibold ${
                    isCancelled
                      ? "text-red-600"
                      : selectedOrder.status === "Complete"
                      ? "text-green-600"
                      : "text-blue-700"
                  }`}
                >
                  {selectedOrder.status}
                </span>
              </p>
              <p>
                <strong>Date Ordered:</strong>{" "}
                {formatDate(selectedOrder.date_ordered)}
              </p>
              <p>
                <strong>Placed By:</strong> {selectedOrder.placed_by || "—"}
              </p>
              {selectedOrder?.status === "Pending" && (
                <div className="mt-2 text-sm text-gray-600">
                  You can cancel this order until{" "}
                  <span className="font-semibold text-red-500">
                    {cancelDeadline?.toFormat("ff")}
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
                  {progressSteps.map((step, index) => (
                    <div
                      key={index}
                      className="text-center flex-1 relative z-10"
                    >
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
                  ))}
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
                  {(typeof selectedOrder.items === "string"
                    ? JSON.parse(selectedOrder.items)
                    : selectedOrder.items || []
                  ).map((item, index) => (
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
                ₱{Number(selectedOrder.total_amount).toLocaleString()} (
                {
                  (typeof selectedOrder.items === "string"
                    ? JSON.parse(selectedOrder.items)
                    : selectedOrder.items || []
                  ).length
                }{" "}
                Products)
              </p>
            </div>

            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="text-lg font-bold mb-2">Shipping Information</h3>
              <p>
                <strong>Company:</strong> {selectedOrder.company || "—"}
              </p>
              <p>
                <strong>Inventory Manager:</strong>{" "}
                {selectedOrder.customer_name || "—"}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {selectedOrder.shipping_address || "—"}
              </p>
              <p>
                <strong>Phone:</strong> {selectedOrder.contact || "—"}
              </p>
              <p>
                <strong>Email:</strong> {selectedOrder.customer_email}
              </p>
              <p>
                <strong>Payment Method:</strong>{" "}
                {selectedOrder.payment_method || "Not specified"}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              {selectedOrder.status === "Delivered" && (
                <button
                  onClick={markOrderAsReceived}
                  disabled={updating}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  {updating ? "Processing..." : "Order Received"}
                </button>
              )}

              {selectedOrder.status === "Pending" &&
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
                    ⏰ You can no longer cancel this order (3-hour window
                    expired).
                  </p>
                ))}

              {selectedOrder.status === "Complete" && (
                <>
                  <button
                    onClick={() => {
                      const orderItems =
                        typeof selectedOrder.items === "string"
                          ? JSON.parse(selectedOrder.items)
                          : selectedOrder.items;

                      localStorage.setItem("cart", JSON.stringify(orderItems));
                      window.dispatchEvent(new Event("cartUpdated"));
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
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
