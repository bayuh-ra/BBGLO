import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Payment = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder"));
    if (!pendingOrder) {
      alert("No pending order found.");
      navigate("/");
    }
  }, [navigate]);

  const completePayment = () => {
    const orderDetails = JSON.parse(localStorage.getItem("pendingOrder"));
  
    if (!orderDetails) {
      alert("No pending order found.");
      navigate("/");
      return;
    }
  
    alert("Payment Successful!");
    localStorage.removeItem("pendingOrder"); // ✅ Clear pending order
    localStorage.removeItem("cart"); // ✅ Clear cart after successful payment
  
    // ✅ Redirect to Order Confirmation
    navigate("/order-confirmation", { state: { order: orderDetails } });
  };
  

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="p-6 bg-white shadow-md rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Complete Your Payment</h2>
        <p className="mb-4">Processing payment for your order...</p>
        <button onClick={completePayment} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Pay Now
        </button>
      </div>
    </div>
  );
};

export default Payment;
