import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const OrderHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // ✅ Get logged-in user
    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!storedUser) {
      alert("Please log in to view your order history.");
      navigate("/login");
      return;
    }

    // ✅ Load orders from localStorage (Later, replace with backend API)
    const savedOrders = JSON.parse(localStorage.getItem("orders")) || [];
    const userOrders = savedOrders.filter((order) => order.customer.email === storedUser.email);
    setOrders(userOrders);
  }, [navigate]);

  return (
    <div className="h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">Order History</h2>

      {orders.length === 0 ? (
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
                const totalProducts = order.items.length; // ✅ Count total unique products
                return (
                  <tr key={index} className="border-b text-left">
                    <td className="p-2 border">{order.orderId}</td>
                    <td className={`p-3 font-bold ${order.status === "Pending" ? "text-orange-500" : order.status === "Delivered" ? "text-green-500" : "text-red-500"}`}>
                      {order.status}
                    </td>
                    <td className="p-3">{order.dateOrdered}</td>
                    <td className="p-3 font-semibold">
                      ₱{order.totalAmount.toLocaleString()} ({totalProducts} {totalProducts === 1 ? "Product" : "Products"})
                    </td>
                    <td className="p-3">
                      <button onClick={() => navigate(`/order-details`, { state: { order } })} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
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
