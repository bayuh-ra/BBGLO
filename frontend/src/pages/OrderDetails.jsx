import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

const OrderDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = useMemo(() => location.state?.order || {}, [location.state]);

  // ✅ Order status timeline
  const orderStatus = [
    { step: "Order Placed", timestamp: "Dec-22-2020 at 04:30 PM", completed: true },
    { step: "Packed", timestamp: "Dec-22-2020 at 05:02 PM", completed: true },
    { step: "In Transit", timestamp: "Dec-23-2020 at 06:50 PM", completed: true },
    { step: "Delivered", timestamp: "Dec-23-2020 at 10:26 PM", completed: true }
  ];

  useEffect(() => {
    if (!order.totalAmount) {
      alert("No order details found.");
      navigate("/order-history");
    }
  }, [order, navigate]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Order Summary */}
      <div className="bg-red-100 p-4 rounded-md mb-4">
        <h2 className="text-xl font-bold">Order Details</h2>
        <p className="text-gray-700">Order ID: <strong>{order.orderId}</strong></p>
        <p className="text-gray-700">Date Ordered: <strong>{order.dateOrdered}</strong></p>
        <p className="text-gray-700">Status: <strong className={`text-${order.status === "Pending" ? "orange" : "green"}-500`}>{order.status}</strong></p>
      </div>

      {/* Order Timeline */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Order Status</h3>
        <div className="flex items-center justify-between text-sm">
          {orderStatus.map((status, index) => (
            <div key={index} className="text-center">
              <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white ${status.completed ? "bg-green-500" : "bg-gray-300"}`}>
                {index + 1}
              </div>
              <p className="mt-2">{status.step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Activity */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Order Activity</h3>
        <ul className="bg-gray-100 p-3 rounded-md">
          {orderStatus.map((status, index) => (
            <li key={index} className="mb-2">
              <span className="font-semibold">{status.step}:</span> {status.timestamp}
            </li>
          ))}
        </ul>
      </div>

      {/* Product Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Products ({order.items?.length || 0})</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Products</th>
              <th className="p-2 border">Price</th>
              <th className="p-2 border">Quantity</th>
              <th className="p-2 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{item.item_name}</td>
                <td className="p-2">₱{item.selling_price?.toLocaleString()}</td>
                <td className="p-2">{item.quantity}</td>
                <td className="p-2">₱{(item.selling_price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Amount */}
      <div className="bg-red-100 p-4 rounded-md mb-4">
        <h3 className="text-lg font-bold">TOTAL</h3>
        <p className="text-xl font-semibold">₱{order.totalAmount?.toLocaleString()} ({order.items?.length} Products)</p>
      </div>

      {/* ✅ Updated Shipping Address Section */}
      <div className="bg-gray-100 p-4 rounded-md">
        <h3 className="text-lg font-bold mb-2">Shipping Address</h3>
        <p><strong>Company Name:</strong> {order.customer.company}</p>
        <p><strong>Contact Person:</strong> {order.customer.name}</p>
        <p><strong>Address:</strong> {order.customer.shippingAddress}</p>
        <p><strong>Phone:</strong> {order.customer.contact}</p>
        <p><strong>Email:</strong> {order.customer.email}</p>
      </div>

      {/* Back Button */}
      <button onClick={() => navigate("/order-history")} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Back to Order History
      </button>
    </div>
  );
};

export default OrderDetails;
