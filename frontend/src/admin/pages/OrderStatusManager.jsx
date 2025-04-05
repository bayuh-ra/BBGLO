import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { saveAs } from "file-saver";
import Papa from "papaparse";

const OrderStatusManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

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

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
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

  const updateStatus = async (order_id, status) => {
    if (!staffId) return alert("Only staff can update status.");

    const timestampField =
      status === "Packed"
        ? "packed_at"
        : status === "In Transit"
        ? "in_transit_at"
        : status === "Delivered"
        ? "delivered_at"
        : null;

    const updateData = {
      status,
      updated_by: staffId,
    };
    if (timestampField) updateData[timestampField] = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("order_id", order_id);

    if (error) {
      console.error("Status update failed:", error);
      alert("Failed to update order.");
    }
  };

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
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.order_id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <td className="p-2 border">{order.order_id}</td>
                <td className="p-2 border">{order.customer_name}</td>
                <td className="p-2 border">{order.status}</td>
                <td className="p-2 border space-x-1">
                  {order.status === "Pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(order.order_id, "Packed");
                      }}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Mark Packed
                    </button>
                  )}
                  {order.status === "Packed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(order.order_id, "In Transit");
                      }}
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      In Transit
                    </button>
                  )}
                  {order.status === "In Transit" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(order.order_id, "Delivered");
                      }}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Delivered
                    </button>
                  )}
                </td>
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
          <div className="bg-white p-6 rounded shadow-lg w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Order Details - {selectedOrder.order_id}
            </h3>
            <p>
              <strong>Customer:</strong> {selectedOrder.customer_name}
            </p>
            <p>
              <strong>Email:</strong> {selectedOrder.customer_email}
            </p>
            <p>
              <strong>Company:</strong> {selectedOrder.company}
            </p>
            <p>
              <strong>Shipping:</strong> {selectedOrder.shipping_address}
            </p>
            <p>
              <strong>Status:</strong> {selectedOrder.status}
            </p>
            <p>
              <strong>Placed By:</strong> {selectedOrder.placed_by}
            </p>
            <p>
              <strong>Items:</strong>
            </p>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(JSON.parse(selectedOrder.items), null, 2)}
            </pre>
            <p>
              <strong>Total:</strong> ₱
              {Number(selectedOrder.total_amount).toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              <strong>Date Ordered:</strong>{" "}
              {new Date(selectedOrder.date_ordered).toLocaleString()}
            </p>
            {selectedOrder.updated_by && (
              <p className="text-xs text-gray-500">
                <strong>Last Updated By (ID):</strong>{" "}
                {selectedOrder.updated_by}
              </p>
            )}
            <div className="flex justify-end mt-4 space-x-2">
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
    </div>
  );
};

export default OrderStatusManager;
