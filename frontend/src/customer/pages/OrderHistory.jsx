import React, { useEffect, useState } from "react";
import axios from "../../api/api"; // Ensure this points to your API helper

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get("/orders"); // Adjust API endpoint
        setOrders(response.data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700 border">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-6 py-3">ORDER ID</th>
              <th className="px-6 py-3">STATUS</th>
              <th className="px-6 py-3">DATE ORDERED</th>
              <th className="px-6 py-3">TOTAL</th>
              <th className="px-6 py-3">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{order.id}</td>
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
                <td className="px-6 py-4">{order.date}</td>
                <td className="px-6 py-4">
                  {order.total} ({order.products} Products)
                </td>
                <td className="px-6 py-4 text-blue-500 cursor-pointer hover:underline">
                  View Details →
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
};

export default OrderHistory;
