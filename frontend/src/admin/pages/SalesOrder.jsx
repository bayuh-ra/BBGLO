import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import { Dialog } from "@headlessui/react";
import { toast } from "react-hot-toast";
import { DateTime } from "luxon";

const SalesOrder = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const totalAmount = orderProducts.reduce(
    (acc, item) => acc + item.total_price,
    0
  );

  useEffect(() => {
    const fetchStaffId = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: staffProfile } = await supabase
          .from("staff_profiles")
          .select("id")
          .eq("id", userId)
          .single();
        if (staffProfile) setStaffId(staffProfile.id);
      }
    };
    fetchStaffId();
  }, []);

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);

    try {
      console.log("🔍 Raw order.items:", order.items);
      const items = JSON.parse(order.items);

      const itemIds = items
        .map((item) => {
          const rawId = item.item_id || item.id || item.product_id;
          if (rawId && rawId.startsWith("IT") && !rawId.includes("-")) {
            return rawId.slice(0, 2) + "-" + rawId.slice(2);
          }
          return rawId;
        })
        .filter(Boolean);

      console.log("🆔 Extracted item IDs:", itemIds);

      const { data, error } = await supabase
        .from("management_inventoryitem")
        .select("item_id, item_name, category, uom, selling_price")
        .in("item_id", itemIds);

      if (error) {
        console.error("❌ Failed to fetch inventory:", error);
        setOrderProducts([]);
      } else {
        const merged = data.map((inv) => {
          const match = items.find((itm) => {
            const rawId = itm.item_id || itm.id || itm.product_id;
            const normalizedRawId =
              rawId?.startsWith("IT") && !rawId.includes("-")
                ? rawId.slice(0, 2) + "-" + rawId.slice(2)
                : rawId;

            // normalize both to ensure they match
            const normalizedInvId =
              inv.item_id?.startsWith("IT") && !inv.item_id.includes("-")
                ? inv.item_id.slice(0, 2) + "-" + inv.item_id.slice(2)
                : inv.item_id;

            return normalizedRawId === normalizedInvId;
          });

          return {
            ...inv,
            quantity: match?.quantity || 0,
            total_price: (match?.quantity || 0) * Number(inv.selling_price),
          };
        });

        console.log("✅ Merged products:", merged);
        setOrderProducts(merged);
      }
    } catch (e) {
      console.error("❌ Error parsing items or fetching inventory:", e);
    }
  };

  const handleDeliveryConfirm = async () => {
    if (!selectedOrder) {
      alert("Please select an order.");
      return;
    }

    const { error } = await supabase.from("deliveries").insert([
      {
        delivery_id: selectedOrder.delivery_id,
        order_id: selectedOrder.order_id,
        driver_id: staffId, // assuming staff is the one assigning
        delivery_date: selectedOrder.delivery_date,
        status: "Scheduled",
        customer_id: selectedOrder.customer_id || null,
        vehicle: "", // you can add vehicle input if needed
      },
    ]);

    if (error) {
      console.error("Delivery insert failed:", error);
      alert("Failed to create delivery.");
    } else {
      alert("Delivery scheduled!");
      setSelectedOrder(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log("Fetching orders...");
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .neq("status", "Complete")
        .neq("status", "Cancelled")
        .order("date_ordered", { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        toast.error(
          "Failed to fetch orders. Please check your connection and try again."
        );
        return;
      }

      // Get all unique staff IDs from the orders
      const staffIds = new Set();
      ordersData.forEach((order) => {
        if (order.confirmed_by) staffIds.add(order.confirmed_by);
        if (order.packed_by) staffIds.add(order.packed_by);
        if (order.in_transit_by) staffIds.add(order.in_transit_by);
        if (order.delivered_by) staffIds.add(order.delivered_by);
      });

      // Fetch staff profiles
      const { data: staffData, error: staffError } = await supabase
        .from("staff_profiles")
        .select("id, name")
        .in("id", Array.from(staffIds));

      if (staffError) {
        console.error("Error fetching staff profiles:", staffError);
        toast.error("Failed to fetch staff profiles.");
        return;
      }

      // Create a map of staff IDs to names
      const staffMap = new Map(
        staffData.map((staff) => [staff.id, staff.name])
      );

      // Merge staff names into orders
      const ordersWithStaffNames = ordersData.map((order) => ({
        ...order,
        confirmed_profile: {
          name: order.confirmed_by ? staffMap.get(order.confirmed_by) : null,
        },
        packed_profile: {
          name: order.packed_by ? staffMap.get(order.packed_by) : null,
        },
        in_transit_profile: {
          name: order.in_transit_by ? staffMap.get(order.in_transit_by) : null,
        },
        delivered_profile: {
          name: order.delivered_by ? staffMap.get(order.delivered_by) : null,
        },
      }));

      console.log("Orders fetched successfully:", ordersWithStaffNames);
      setOrders(ordersWithStaffNames);
    } catch (err) {
      console.error("Unexpected error while fetching orders:", err);
      toast.error("An unexpected error occurred while fetching orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Initial fetch of orders...");
    fetchOrders();

    // Set up realtime subscription
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: "status=neq.Complete,status=neq.Cancelled",
        },
        (payload) => {
          console.log("Realtime update received:", payload);
          if (payload.eventType === "INSERT") {
            console.log("New order detected:", payload.new);
            fetchOrders();
          } else if (payload.eventType === "UPDATE") {
            console.log("Order updated:", payload.new);
            fetchOrders();
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders =
    statusFilter === "All"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  const exportCSV = () => {
    const csv = Papa.unparse(orders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "orders.csv");
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!staffId) {
      alert("Only staff can update status.");
      return;
    }

    // Map status to their corresponding timestamp fields
    const timestampMap = {
      "Order Confirmed": "confirmed_at",
      Packed: "packed_at",
      "In Transit": "in_transit_at",
      Delivered: "delivered_at",
      Complete: "completed_at",
    };

    // Map status to their corresponding staff fields
    const staffFieldMap = {
      "Order Confirmed": "confirmed_by",
      Packed: "packed_by",
      "In Transit": "in_transit_by",
      Delivered: "delivered_by",
    };

    const updateData = {
      status: newStatus,
      updated_by: staffId,
    };

    // Add timestamp if applicable
    const timestampField = timestampMap[newStatus];
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString();
    }

    // Add staff ID based on status
    const staffField = staffFieldMap[newStatus];
    if (staffField) {
      updateData[staffField] = staffId;
    }

    // Update order status
    const { error: orderError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("order_id", selectedOrder.order_id);

    if (orderError) {
      console.error("Order status update failed:", orderError);
      alert("Failed to update order status.");
      return;
    }

    // If status is "In Transit", handle delivery record
    if (newStatus === "In Transit") {
      // First check if delivery record exists
      const { data: existingDelivery, error: fetchError } = await supabase
        .from("deliveries")
        .select("delivery_id")
        .eq("order_id", selectedOrder.order_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error checking delivery record:", fetchError);
        alert("Failed to check delivery record.");
        return;
      }

      if (!existingDelivery) {
        // Create new delivery record if it doesn't exist
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
        const rand = Math.floor(Math.random() * 9000 + 1000);
        const deliveryId = `DEL-${dateStr}-${rand}`;

        const { error: createError } = await supabase
          .from("deliveries")
          .insert([
            {
              delivery_id: deliveryId,
              order_id: selectedOrder.order_id,
              driver_id: staffId,
              delivery_date: today.toISOString(),
              status: "In Transit",
              customer_id: selectedOrder.customer_id || null,
              vehicle: "",
            },
          ]);

        if (createError) {
          console.error("Failed to create delivery record:", createError);
          alert("Failed to create delivery record.");
          return;
        }
      } else {
        // Update existing delivery record
        const { error: updateError } = await supabase
          .from("deliveries")
          .update({ status: "In Transit" })
          .eq("delivery_id", existingDelivery.delivery_id);

        if (updateError) {
          console.error("Failed to update delivery status:", updateError);
          alert("Failed to update delivery status.");
          return;
        }
      }
    }

    // Update the selected order's status locally
    setSelectedOrder((prev) => ({
      ...prev,
      status: newStatus,
      ...(timestampField && { [timestampField]: new Date().toISOString() }),
    }));

    // Refresh the orders list
    fetchOrders();
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    const confirm = window.confirm(
      `Are you sure you want to delete order ${selectedOrder.order_id}?`
    );
    if (!confirm) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("order_id", selectedOrder.order_id);

    if (error) {
      console.error("Failed to delete order:", error);
      alert("Failed to delete order.");
      return;
    }

    toast.success("Order deleted successfully.");
    setSelectedOrder(null);
    fetchOrders();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Sales Orders</h2>

      <div className="flex justify-between mb-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border p-2 rounded"
        >
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Order Confirmed">Order Confirmed</option>
          <option value="Packed">Packed</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </button>
          <button
            onClick={handleDeleteOrder}
            disabled={!selectedOrder}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-300"
          >
            Delete
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : filteredOrders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Order ID</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.order_id}
                className={`border-b hover:bg-gray-50 cursor-pointer ${
                  selectedOrder?.order_id === order.order_id ? "bg-blue-50" : ""
                }`}
                onClick={() => handleSelectOrder(order)}
                onDoubleClick={() => {
                  setSelectedOrder(order);
                  // Show details modal or expand row here
                  // You can add your existing modal logic here
                }}
              >
                <td className="p-2 border">{order.order_id}</td>
                <td className="p-2 border">{order.customer_name}</td>
                <td className="p-2 border">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from(
          { length: Math.ceil(filteredOrders.length / ordersPerPage) },
          (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          )
        )}
      </div>

      {/* Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-[850px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Order Details</h3>

            {/* Order Info Section */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <p>
                <strong>Customer:</strong>{" "}
                {selectedOrder.customer_name || "N/A"}
              </p>
              <p>
                <strong>Email:</strong> {selectedOrder.customer_email || "N/A"}
              </p>
              <p>
                <strong>Company:</strong> {selectedOrder.company || "N/A"}
              </p>
              <p>
                <strong>Shipping:</strong>{" "}
                {selectedOrder.shipping_address || "N/A"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className="capitalize">{selectedOrder.status}</span>
              </p>
              <p>
                <strong>Cancel Until:</strong>{" "}
                {(() => {
                  const orderTime = DateTime.fromISO(
                    selectedOrder.date_ordered
                  );
                  const cancelDeadline = orderTime.plus({ hours: 3 });
                  const now = DateTime.local();
                  const cancelWindowExpired = now > cancelDeadline;

                  return (
                    <span
                      className={
                        cancelWindowExpired ? "text-red-500" : "text-green-600"
                      }
                    >
                      {cancelDeadline.toFormat("ff")}
                      {cancelWindowExpired ? " (Expired)" : " (Still valid)"}
                    </span>
                  );
                })()}
              </p>
            </div>

            {/* Order Progress Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-3 text-gray-700">
                Order Progress
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <strong>Date Ordered:</strong>{" "}
                  {new Date(selectedOrder.date_ordered).toLocaleString()}
                </p>
                {selectedOrder.confirmed_at && (
                  <p className="text-gray-600">
                    <strong>Confirmed:</strong>{" "}
                    {new Date(selectedOrder.confirmed_at).toLocaleString()} by{" "}
                    {selectedOrder.confirmed_profile?.name || "—"}
                  </p>
                )}
                {selectedOrder.packed_at && (
                  <p className="text-gray-600">
                    <strong>Packed:</strong>{" "}
                    {new Date(selectedOrder.packed_at).toLocaleString()} by{" "}
                    {selectedOrder.packed_profile?.name || "—"}
                  </p>
                )}
                {selectedOrder.in_transit_at && (
                  <p className="text-gray-600">
                    <strong>In Transit:</strong>{" "}
                    {new Date(selectedOrder.in_transit_at).toLocaleString()} by{" "}
                    {selectedOrder.in_transit_profile?.name || "—"}
                  </p>
                )}
                {selectedOrder.delivered_at && (
                  <p className="text-gray-600">
                    <strong>Delivered:</strong>{" "}
                    {new Date(selectedOrder.delivered_at).toLocaleString()} by{" "}
                    {selectedOrder.delivered_profile?.name || "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Top Inputs */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sales Order ID:
                </label>
                <input
                  type="text"
                  value={selectedOrder.order_id}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>
            </div>

            {/* Product Table */}
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="p-2 border">Product ID</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">UoM</th>
                    <th className="p-2 border">Unit Price</th>
                    <th className="p-2 border">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {orderProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-4 text-gray-500"
                      >
                        No product details available
                      </td>
                    </tr>
                  ) : (
                    orderProducts.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2 border text-center">
                          {item.item_id}
                        </td>
                        <td className="p-2 border">{item.item_name}</td>
                        <td className="p-2 border">{item.category}</td>
                        <td className="p-2 border text-center">
                          {item.quantity}
                        </td>
                        <td className="p-2 border text-center">{item.uom}</td>
                        <td className="p-2 border text-right">
                          ₱{Number(item.selling_price).toFixed(2)}
                        </td>
                        <td className="p-2 border text-right">
                          ₱{Number(item.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total & Confirm */}
            <div className="flex justify-between items-center mt-6">
              <div>
                <p className="text-xs text-gray-500">
                  <strong>Placed By:</strong> {selectedOrder.placed_by}
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Last Updated:</strong>{" "}
                  {selectedOrder.staff_profiles?.name
                    ? `${selectedOrder.staff_profiles.name} (${selectedOrder.staff_profiles.role})`
                    : "Unknown"}
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Date Ordered:</strong>{" "}
                  {new Date(selectedOrder.date_ordered).toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-semibold">
                  Total Amount: ₱{Number(totalAmount).toLocaleString()}
                </p>

                {/* Status Action Buttons */}
                <div className="flex gap-2 mt-2">
                  {selectedOrder.status === "Pending" && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate("Order Confirmed")}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Mark as Order Confirmed
                      </button>
                      {(() => {
                        const orderTime = DateTime.fromISO(
                          selectedOrder.date_ordered
                        );
                        const cancelDeadline = orderTime.plus({ hours: 3 });
                        const now = DateTime.local();
                        const cancelWindowExpired = now > cancelDeadline;

                        return (
                          <>
                            {cancelWindowExpired && (
                              <p className="text-sm text-yellow-500 mt-1 italic">
                                ⚠️ Cancellation deadline passed. Admin override
                                allowed.
                              </p>
                            )}
                            <button
                              onClick={() => handleStatusUpdate("Cancelled")}
                              className={`${
                                cancelWindowExpired
                                  ? "bg-yellow-500 hover:bg-yellow-600"
                                  : "bg-red-500 hover:bg-red-600"
                              } text-white px-4 py-2 rounded`}
                            >
                              {cancelWindowExpired
                                ? "Cancel (Admin Override)"
                                : "Cancel Order"}
                            </button>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-gray-300 text-black px-4 py-2 rounded"
              >
                Close
              </button>
              <button
                onClick={() => alert("Archiving not implemented yet")}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="bg-white rounded-lg shadow-lg w-[400px] z-50 p-6 relative">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Confirm Completion
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4">
            Are you sure you want to mark this order as{" "}
            <strong>Complete</strong>?
          </Dialog.Description>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeliveryConfirm}
              className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded"
            >
              Confirm
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SalesOrder;
