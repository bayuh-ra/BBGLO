import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";

const OrderStatusManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("date_ordered", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const updateStatus = async (order_id, status) => {
    setUpdating(order_id);
    const timestampField = `${status.toLowerCase().replace(/ /g, "_")}_at`;
    const updateData = {
      status,
      [timestampField]: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("order_id", order_id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.order_id === order_id ? { ...o, ...updateData } : o))
      );
    } else {
      alert("Failed to update status.");
    }
    setUpdating(null);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Order Status</h2>
      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Order ID</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order_id} className="border-b">
                <td className="p-2 border">{order.order_id}</td>
                <td className="p-2 border">{order.customer_name}</td>
                <td className="p-2 border font-semibold">{order.status}</td>
                <td className="p-2 border space-x-2">
                  {order.status === "Pending" && (
                    <button
                      onClick={() => updateStatus(order.order_id, "Packed")}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      disabled={updating === order.order_id}
                    >
                      Mark as Packed
                    </button>
                  )}
                  {order.status === "Packed" && (
                    <button
                      onClick={() => updateStatus(order.order_id, "In Transit")}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      disabled={updating === order.order_id}
                    >
                      Mark as In Transit
                    </button>
                  )}
                  {order.status === "In Transit" && (
                    <button
                      onClick={() => updateStatus(order.order_id, "Delivered")}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      disabled={updating === order.order_id}
                    >
                      Mark as Delivered
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrderStatusManager;
