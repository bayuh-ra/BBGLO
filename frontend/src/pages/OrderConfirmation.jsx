import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderDetails = location.state?.order;
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);

  useEffect(() => {
    if (!orderDetails) {
      navigate("/");
      return;
    }

    // Parse items (if they come from Supabase as a string)
    const items =
      typeof orderDetails.items === "string"
        ? JSON.parse(orderDetails.items)
        : orderDetails.items || [];

    setParsedItems(items);

    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (storedUser) {
      setLoggedInUser(storedUser);
    }
  }, [orderDetails, navigate]);

  const handleBackToHome = () => {
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));
    navigate("/");
  };

  const handleCreateAccount = () => {
    navigate("/signup", { state: { userData: orderDetails?.customer } });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
        <h2 className="text-2xl font-bold text-green-600">Order Confirmed!</h2>
        <p className="text-gray-700 mt-2">
          Thank you,{" "}
          {orderDetails?.customer_name ||
            orderDetails?.customer?.name ||
            "Customer"}
          ! Your order is being processed.
        </p>

        {parsedItems.length > 0 && (
          <>
            <div className="mt-4 text-left">
              <p className="font-semibold">Order Summary:</p>
              <ul className="list-disc list-inside text-gray-600">
                {parsedItems.map((item, index) => (
                  <li key={index}>
                    {item.quantity}x {item.item_name} – ₱
                    {(item.selling_price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <p className="font-bold mt-4">
              Total: ₱
              {Number(
                orderDetails.total_amount || orderDetails.totalAmount || 0
              ).toLocaleString()}
            </p>
          </>
        )}

        <button
          onClick={handleBackToHome}
          className="bg-blue-500 text-white px-4 py-2 mt-4 rounded hover:bg-blue-600"
        >
          Back to Home
        </button>

        {!loggedInUser && (
          <button
            onClick={handleCreateAccount}
            className="bg-green-500 text-white px-4 py-2 rounded-md ml-3 hover:bg-green-600"
          >
            Create an Account
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmation;
