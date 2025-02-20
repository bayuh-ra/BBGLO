import { useState, useEffect } from "react";
import { FaBox, FaClipboardList, FaCheckCircle } from "react-icons/fa";

const Dashboard = () => {
  const [accountInfo, setAccountInfo] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [orderStats, setOrderStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    // Fetch account info, shipping address, order stats, and recent orders when backend is ready
    // Example:
    // fetch("/api/dashboard").then(res => res.json()).then(data => {
    //   setAccountInfo(data.accountInfo);
    //   setShippingAddress(data.shippingAddress);
    //   setOrderStats(data.orderStats);
    //   setRecentOrders(data.recentOrders);
    // });
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
              <p>Phone: {accountInfo.phone}</p>
            </div>
          ) : (
            <p className="text-gray-500">No account information available</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="font-semibold">Shipping Address</h2>
          {shippingAddress ? (
            <div>
              <p className="font-bold">{shippingAddress.name}</p>
              <p>{shippingAddress.address}</p>
              <p>Phone: {shippingAddress.phone}</p>
              <p>Email: {shippingAddress.email}</p>
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
          <table className="table w-full">
            <thead>
              <tr className="bg-red-200 font-bold text-lg h-5">
                <th className="py-3">Order ID</th>
                <th className="py-3">Status</th>
                <th className="py-3">Date & Time</th>
                <th className="py-3">Total</th>
                <th className="py-3">Action</th>
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
                recentOrders.map((order, index) => (
                  <tr key={index}>
                    <td>{order.orderId}</td>
                    <td className={order.status === "IN PROGRESS" ? "text-orange-500" : "text-green-500"}>{order.status}</td>
                    <td>{order.dateTime}</td>
                    <td>₱{order.total}</td>
                    <td>
                      <button className="text-blue-500 hover:underline">View Details</button>
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
