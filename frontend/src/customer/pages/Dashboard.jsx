// Dashboard.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../api/supabaseClient";
import { FaBox, FaClipboardList, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
// import Lottie from "lottie-react";
// import deliveryAnimation from "../../assets/delivery.json";

const Dashboard = () => {
  const [accountInfo, setAccountInfo] = useState(null);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const navigate = useNavigate();

  // Map order status to progress step
  const getProgress = (status) => {
    switch (status) {
      case "Packed":
        return 1;
      case "In Transit":
        return 2;
      case "Delivered":
        return 3;
      default: // Pending or unknown
        return 0;
    }
  };
  const steps = ["Packed", "In Transit", "Delivered"];

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
      {/* Welcoming Header */}
      <h1 className="text-2xl font-extrabold text-pink-600">
        👋 Welcome back, {accountInfo?.name?.split(" ")[0] || "Customer"}!
      </h1>
      <p className="text-gray-600 mt-1">Let's check your latest activity at BabyGlo 🍼</p>

      {/* Lottie Animation (optional, uncomment if you add delivery.json) */}
      {/* <div className="flex justify-center my-4">
        <Lottie animationData={deliveryAnimation} loop={true} className="w-20 h-20" />
      </div> */}

      {/* Combined Account Overview Card */}
      <div className="bg-white rounded-xl shadow-md border-l-4 border-indigo-400 p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
            🧾 Account Overview
          </h2>
          <button
            onClick={() => navigate("/customer/profile")}
            className="text-indigo-600 text-sm hover:underline flex items-center gap-1"
            title="Edit Profile"
          >
            <span>✏️</span> Edit
          </button>
        </div>
        {accountInfo ? (
          <div className="space-y-2 text-sm md:text-base">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">🧑 Name:</span> {accountInfo.name}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">📧 Email:</span> {accountInfo.email}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">📱 Phone:</span> {accountInfo.contact}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">💼 Company Name:</span> {accountInfo.company || <span className="italic text-gray-400">Not provided</span>}
              </p>
              <p className="flex items-center gap-2 sm:col-span-2">
                <span className="font-semibold text-gray-700">📦 Shipping Address:</span>{" "}
                {accountInfo.shippingAddress || <span className="italic text-gray-400">Not provided</span>}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">No account information available</p>
        )}
      </div>

      {/* Gradient Stat Cards with Fun Icons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <div className="bg-gradient-to-r from-pink-200 to-pink-100 p-4 rounded-xl shadow-md flex items-center gap-4">
          <FaBox className="text-pink-600 text-3xl animate-bounce" />
          <div>
            <p className="text-xl font-extrabold">{orderStats.total}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-200 to-yellow-100 p-4 rounded-xl shadow-md flex items-center gap-4">
          <FaClipboardList className="text-yellow-600 text-3xl animate-pulse" />
          <div>
            <p className="text-xl font-extrabold">{orderStats.pending}</p>
            <p className="text-sm text-gray-600">Pending Orders</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-200 to-teal-100 p-4 rounded-xl shadow-md flex items-center gap-4">
          <FaCheckCircle className="text-green-600 text-3xl animate-bounce" />
          <div>
            <p className="text-xl font-extrabold">{orderStats.completed}</p>
            <p className="text-sm text-gray-600">Completed Orders</p>
          </div>
        </div>
      </div>

      {/* Order Timeline Progress Bar (for latest order) */}
      {recentOrders.length > 0 && (() => {
        const latestOrder = recentOrders[0];
        const progress = getProgress(latestOrder?.status);
        return (
          <div className="mt-4">
            <p className="text-sm font-semibold">Latest Order Progress:</p>
            <div className="flex gap-2 mt-2">
              <span className={`w-1/3 h-2 rounded-full ${progress >= 1 ? "bg-green-400" : "bg-gray-300"}`}></span>
              <span className={`w-1/3 h-2 rounded-full ${progress >= 2 ? "bg-green-400" : "bg-gray-300"}`}></span>
              <span className={`w-1/3 h-2 rounded-full ${progress >= 3 ? "bg-green-400" : "bg-gray-300"}`}></span>
            </div>
            {/* Synced and styled step label */}
            <div className="flex justify-between items-center mt-2 text-xs font-semibold">
              {steps.map((step, idx) => (
                <div key={step} className="flex-1 flex flex-col items-center">
                  <span
                    className={
                      progress > idx
                        ? "text-green-500"
                        : progress === idx + 1
                        ? "text-blue-500 font-bold"
                        : "text-gray-400"
                    }
                  >
                    {step}
                  </span>
                  {idx < steps.length - 1 && (
                    <span className="w-full h-0.5 bg-gray-200 mt-1"></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stylized Recent Orders Table */}
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
                  <tr
                    key={order.orderId}
                    className={`$ {
                      order.status === "Pending"
                        ? "bg-yellow-50"
                        : order.status === "Complete"
                        ? "bg-green-50"
                        : "bg-gray-100"
                    } hover:scale-[1.01] transition-all rounded-lg`}
                  >
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
                            state: { orderId: order.orderId },
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

      {/* Motivational Footer */}
      <div className="mt-6 text-center text-sm text-gray-500 italic">
        🚚 Keep ordering to enjoy faster deliveries and loyalty perks!
      </div>
    </div>
  );
};

export default Dashboard;
