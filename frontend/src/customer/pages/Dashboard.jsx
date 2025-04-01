// Dashboard.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../api/supabaseClient";
import { FaBox, FaClipboardList, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";

const Dashboard = () => {
  const [accountInfo, setAccountInfo] = useState(null);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) setAccountInfo(profile);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", user.email)
        .order("date_ordered", { ascending: false });

      if (error) {
        console.log("Error fetching orders:", error);
        return;
      }

      console.log("Fetched orders:", orders);

      if (orders && orders.length > 0) {
        const pendingOrders = orders.filter((o) => o.status === "Pending");
        const completedOrders = orders.filter((o) => o.status === "Complete");

        console.log("Pending orders:", pendingOrders);

        const stats = {
          total: orders.length,
          pending: pendingOrders.length,
          completed: completedOrders.length,
        };
        setOrderStats(stats);

        const recent = orders.slice(0, 5).map((o) => ({
          orderId: o.order_id,
          status: o.status,
          dateTime: DateTime.fromISO(o.date_ordered)
            .setZone("Asia/Manila")
            .toLocaleString(DateTime.DATETIME_MED),
          total: o.total_amount || 0,
        }));

        setRecentOrders(recent);
      } else {
        console.log("No orders found for this user.");
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="font-semibold">Account Info</h2>
          {accountInfo ? (
            <div>
              <p className="font-bold">{accountInfo.name}</p>
              <p>{accountInfo.address}</p>
              <p>Email: {accountInfo.email}</p>
              <p>Phone: {accountInfo.contact}</p>
            </div>
          ) : (
            <p className="text-gray-500">No account information available</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="font-semibold">Shipping Address</h2>
          {accountInfo?.shippingAddress ? (
            <div>
              <p className="font-bold">{accountInfo.name}</p>
              <p>{accountInfo.shippingAddress}</p>
              <p>Phone: {accountInfo.contact}</p>
              <p>Email: {accountInfo.email}</p>
            </div>
          ) : (
            <p className="text-gray-500">No shipping address available</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <div className="bg-blue-100 p-4 rounded-lg flex items-center">
          <FaBox className="text-blue-500 text-2xl mr-4" />
          <div>
            <p className="text-2xl font-bold">{orderStats.total}</p>
            <p>Total Orders</p>
          </div>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg flex items-center">
          <FaClipboardList className="text-orange-500 text-2xl mr-4" />
          <div>
            <p className="text-2xl font-bold">{orderStats.pending}</p>
            <p>Pending Orders</p>
          </div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg flex items-center">
          <FaCheckCircle className="text-green-500 text-2xl mr-4" />
          <div>
            <p className="text-2xl font-bold">{orderStats.completed}</p>
            <p>Completed Orders</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mt-6">
        <h2 className="font-bold text-lg">Recent Orders</h2>
        <div className="overflow-x-auto mt-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-red-200 text-left">
                <th className="p-3 border-b">Order ID</th>
                <th className="p-3 border-b">Status</th>
                <th className="p-3 border-b">Date & Time</th>
                <th className="p-3 border-b">Total Amount</th>
                <th className="p-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 p-4">
                    No recent orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.orderId} className="border-b text-left">
                    <td className="p-2 border">{order.orderId}</td>
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
                    <td className="p-3">{order.dateTime}</td>
                    <td className="p-3 font-semibold">
                      ₱{order.total.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          navigate("/order-details", {
                            state: { orderId: order.orderId }, // Pass only the orderId
                          })
                        }
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
