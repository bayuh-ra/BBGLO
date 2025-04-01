import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient"; // Ensure this points to your Supabase client

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  const formatDateToPhilippines = (utcDate) => {
    try {
      return new Date(utcDate).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase.from("orders").select("*"); // Adjust API endpoint
        if (error) {
          console.error("Error fetching orders", error);
          return;
        }
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-black">
        <thead className="bg-red-100 text-black">
          <tr>
            <th className="px-6 py-3">ORDER ID</th>
            <th className="px-6 py-3">STATUS</th>
            <th className="px-6 py-3">DATE ORDERED</th>
            <th className="px-6 py-3">TOTAL</th>
            <th className="px-6 py-3">ACTION</th>
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
                acc + Number(item.selling_price || 0) * (item.quantity || 1),
              0
            );

            return (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{order.order_id}</td>
                <td
                  className={`px-6 py-4 font-semibold ${
                    order.status === "IN PROGRESS"
                      ? "text-yellow-500"
                      : order.status === "COMPLETED"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {order.status}
                </td>
                <td className="px-6 py-4">
                  {formatDateToPhilippines(order.date_ordered)}
                </td>
                <td className="px-6 py-4">
                  ₱{totalAmount.toLocaleString()} ({totalQuantity}{" "}
                  {totalQuantity === 1 ? "Product" : "Products"})
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      console.log(
                        "Navigating to order details with orderId:",
                        order.order_id
                      );
                      navigate("/order-details", {
                        state: { orderId: order.order_id },
                      });
                    }}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
  );
};

export default OrderHistory;
