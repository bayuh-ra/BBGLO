import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const OrderHistory = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ detects navigation
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!storedUser) {
      alert("Please log in to view your order history.");
      navigate("/login");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", storedUser.email)
        .order("date_ordered", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error("Unexpected error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [navigate, location]); // ✅ re-run when coming back from OrderDetails

  const formatDateToPhilippines = (utcDate) => {
    try {
      return new Date(utcDate).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (err) {
      console.error("Date formatting error:", err);
      return "Invalid Date";
    }
  };

  return (
    <div className="h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">Order History</h2>

      {loading ? (
        <p className="text-gray-600">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-600">No orders found.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-3 border-b">Order ID</th>
                <th className="p-3 border-b">Status</th>
                <th className="p-3 border-b">Date Ordered</th>
                <th className="p-3 border-b">Total Amount</th>
                <th className="p-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const items =
                  typeof order.items === "string"
                    ? JSON.parse(order.items)
                    : order.items || [];

                const totalQuantity = items.reduce(
                  (acc, item) => acc + (item.quantity || 0),
                  0
                );

                const totalAmount = items.reduce(
                  (acc, item) =>
                    acc +
                    Number(item.selling_price || 0) * (item.quantity || 1),
                  0
                );

                return (
                  <tr key={index} className="border-b text-left">
                    <td className="p-2 border">{order.order_id}</td>
                    <td
                      className={`p-3 font-bold ${
                        order.status === "Pending"
                          ? "text-orange-500"
                          : order.status === "Delivered"
                          ? "text-green-500"
                          : order.status === "Cancelled"
                          ? "text-red-500"
                          : "text-gray-600"
                      }`}
                    >
                      {order.status}
                    </td>
                    <td className="p-3">
                      {formatDateToPhilippines(order.date_ordered)}
                    </td>
                    <td className="p-3 font-semibold">
                      ₱{totalAmount.toLocaleString()} ({totalQuantity}{" "}
                      {totalQuantity === 1 ? "Item" : "Items"})
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          navigate("/order-details", { state: { order } })
                        }
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
