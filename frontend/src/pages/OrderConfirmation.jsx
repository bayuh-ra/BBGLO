import { useEffect, useState  } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderDetails = location.state?.order;
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    // If no order details found, redirect to homepage
    if (!orderDetails) {
      navigate("/");
    }
  }, [orderDetails, navigate]);

  useEffect(() => {
    if (!orderDetails) {
      navigate("/"); // Redirect home if no order data
    }
    // ✅ Check if user is logged in
    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (storedUser) {
      setLoggedInUser(storedUser);
    }
  }, [orderDetails, navigate]);

  const handleBackToHome = () => {
    localStorage.removeItem("cart"); // ✅ Clear the cart when returning home
    window.dispatchEvent(new Event("cartUpdated")); // ✅ Update navbar instantly
    navigate("/");
  };

  const handleCreateAccount = () => {
    navigate("/signup", { state: { userData: orderDetails?.customer } });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
        <h2 className="text-2xl font-bold text-green-600">Order Confirmed!</h2>
        <p className="text-gray-700 mt-2">Thank you, {orderDetails?.customer.name}! Your order is being processed.</p>

        {orderDetails && (
          <>
            <div className="mt-4 text-left">
              <p className="font-semibold">Order Summary:</p>
              <ul className="list-disc list-inside text-gray-600">
                {orderDetails.items.map((item, index) => (
                  <li key={index}>
                    {item.quantity}x {item.item_name} - ₱{(item.selling_price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <p className="font-bold mt-4">Total: ₱{orderDetails.totalAmount.toFixed(2)}</p>
          </>
        )}

        <button onClick={handleBackToHome} className="bg-blue-500 text-white px-4 py-2 mt-4 rounded hover:bg-blue-600">
          Back to Home
        </button>
          {/* ✅ Hide "Create Account" if user is already logged in */}
          {!loggedInUser && (
            <button onClick={handleCreateAccount} className="bg-green-500 text-white px-4 py-2 rounded-md ml-3 hover:bg-green-600">
              Create an Account
            </button>
          )}
      </div>
    </div>
  );
};

export default OrderConfirmation;
