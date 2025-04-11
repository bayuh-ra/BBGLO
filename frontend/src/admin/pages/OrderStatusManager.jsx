import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import { Dialog } from "@headlessui/react";

const OrderStatusManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deliveryId, setDeliveryId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
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
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const generatedId = `DEL-${dateStr}-${rand}`;
    setDeliveryId(generatedId);
    setSelectedOrder(order);
    setDeliveryDate("");

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
    if (!deliveryId || !deliveryDate || !selectedOrder) {
      alert("Please provide Delivery Date.");
      return;
    }

    const { error } = await supabase.from("deliveries").insert([
      {
        delivery_id: deliveryId,
        order_id: selectedOrder.order_id,
        driver_id: staffId, // assuming staff is the one assigning
        delivery_date: deliveryDate,
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
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        staff_profiles:updated_by (name, role)
      `
      )
      .order("date_ordered", { ascending: false });
    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
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
      Packed: "packed_at",
      "In Transit": "in_transit_at",
      Delivered: "delivered_at",
      Complete: "completed_at",
    };

    const updateData = {
      status: newStatus,
      updated_by: staffId,
    };

    // Only add timestamp if the status has a corresponding timestamp field
    const timestampField = timestampMap[newStatus];
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString();
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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Order Status</h2>

      <div className="flex justify-between mb-4">
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
          <option value="Packed">Packed</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
        </select>

        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV
        </button>
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
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectOrder(order)}
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
            </div>

            {/* Top Inputs */}
            <div className="grid grid-cols-3 gap-4 mb-6">
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
              <div>
                <label className="block text-sm font-medium mb-1">
                  Delivery ID:
                </label>
                <input
                  type="text"
                  value={selectedOrder.delivery_id || "N/A"}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Delivery Date:
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
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
                    <button
                      onClick={() => handleStatusUpdate("Packed")}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                    >
                      Mark as Packed
                    </button>
                  )}
                  {selectedOrder.status === "Packed" && (
                    <button
                      onClick={() => handleStatusUpdate("In Transit")}
                      className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    >
                      Mark as In Transit
                    </button>
                  )}
                  {selectedOrder.status === "In Transit" && (
                    <button
                      onClick={() => handleStatusUpdate("Delivered")}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Mark as Delivered
                    </button>
                  )}
                  {selectedOrder.status === "Delivered" && (
                    <button
                      onClick={() => handleStatusUpdate("Complete")}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Mark as Complete
                    </button>
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

export default OrderStatusManager;
