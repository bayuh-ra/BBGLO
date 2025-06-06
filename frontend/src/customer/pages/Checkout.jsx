import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient"; // Import Supabase
import { FaCcVisa, FaCcMastercard, FaCcJcb } from "react-icons/fa";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";

const Checkout = () => {
  const navigate = useNavigate();
  // ✅ Correct
  const [cart, setCart] = useState([]); // ✅ Now used in Order Summary
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    company: "", // ✅ Ensure this field is initialized
    email: "",
    contact: "+63",
    shippingAddress: "", // ✅ Ensure this field is initialized
    paymentMethod: "Cash on Delivery",
    placedBy: "",
  });

  const [showCardPopup, setShowCardPopup] = useState(false);
  const [showChequePopup, setShowChequePopup] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    nameOnCard: "",
  });
  const [chequeDetails, setChequeDetails] = useState({
    bankName: "",
    chequeNumber: "",
    amount: "",
  }); // ✅ Cheque Details

  // ✅ **Calculate Total Price**
  const calculateTotal = () =>
    cart.reduce(
      (acc, item) =>
        acc + Number(item.selling_price || 0) * (item.quantity || 1),
      0
    );

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);

    // ✅ Fetch user profile from Supabase (Main Feature You Requested)
    const fetchProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && profile) {
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
        const isNotOriginalManager = loggedInUser?.email !== profile.email;

        const placedByName = isNotOriginalManager
          ? prompt(
              "You're not the assigned inventory manager. Enter your name:"
            )
          : profile.name;

        if (!placedByName) {
          alert("Order cancelled. Person placing order must be identified.");
          navigate("/");
          return;
        }
        setCustomerInfo((prev) => ({
          ...prev,
          name: profile.name || "",
          company: profile.company || "",
          email: profile.email || "",
          contact: profile.contact || "+63",
          shippingAddress: profile.shippingAddress || "",
        }));
      }
    };

    fetchProfile();

    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    const savedCustomer = JSON.parse(localStorage.getItem("savedCustomerInfo"));

    if (loggedInUser) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: loggedInUser?.name || savedCustomer?.name || "",
        company: loggedInUser?.company || savedCustomer?.company || "", // ✅ Ensure Company is set
        email: loggedInUser?.email || savedCustomer?.email || "",
        contact: loggedInUser?.contact || savedCustomer?.contact || "+63",
        shippingAddress:
          loggedInUser?.shippingAddress || savedCustomer?.shippingAddress || "", // ✅ Ensure Shipping Address is set
        paymentMethod: savedCustomer?.paymentMethod || "Cash on Delivery",
      }));
    } else if (savedCustomer) {
      setCustomerInfo((prev) => ({
        ...prev,
        name: savedCustomer.name || "",
        company: savedCustomer.company || "", // ✅ Ensure company is saved
        email: savedCustomer.email || "",
        contact: savedCustomer.contact || "+63",
        shippingAddress: savedCustomer.shippingAddress || "", // ✅ Ensure shipping address is saved
        paymentMethod: savedCustomer.paymentMethod || "Cash on Delivery",
      }));
    }

    // ✅ Ensure shipping fee & total amount is calculated
    const total = savedCart.reduce(
      (acc, item) =>
        acc + Number(item.selling_price || 0) * (item.quantity || 1),
      0
    );
    setChequeDetails((prev) => ({ ...prev, amount: total }));
  }, [navigate]);

  // ✅ **Validation for Card & Cheque**
  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const isValidContact = (contact) => /^\+63\d{10}$/.test(contact);
  const isCardNumberValid =
    cardDetails.cardNumber && /^\d{15,16}$/.test(cardDetails.cardNumber);
  const isExpiryValid =
    cardDetails.expiry &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry) &&
    checkExpiryDate(cardDetails.expiry);
  const isCVVValid = cardDetails.cvv && /^\d{3,4}$/.test(cardDetails.cvv);
  const isChequeNumberValid =
    chequeDetails.chequeNumber && /^\d{6,10}$/.test(chequeDetails.chequeNumber);
  const isCardFormValid =
    isCardNumberValid && isExpiryValid && isCVVValid && cardDetails.nameOnCard;
  const isChequeFormValid =
    chequeDetails.bankName && isChequeNumberValid && chequeDetails.amount;

  // ✅ **Check Expiry Date Function**
  function checkExpiryDate(expiry) {
    const [month, year] = expiry.split("/").map(Number);
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    return (
      year > currentYear || (year === currentYear && month >= currentMonth)
    );
  }

  // ✅ **Prevent Letters in Number Fields**
  const handleNumberInput = (e, setter, maxLength) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, maxLength); // Remove letters & limit length
    setter(value);
  };

  // ✅ **Handle Expiry Date Auto-Formatting**
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4); // Insert '/'
    }
    setCardDetails({ ...cardDetails, expiry: value });
  };

  // Handle input changes
  const handleChange = (e) =>
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  const handleCardChange = (e) => {
    handleNumberInput(
      e,
      (value) => setCardDetails({ ...cardDetails, cardNumber: value }),
      16
    );
  };
  const handleCardTextChange = (e) => {
    setCardDetails({ ...cardDetails, [e.target.name]: e.target.value });
  };
  const handleChequeChange = (e) =>
    setChequeDetails({ ...chequeDetails, [e.target.name]: e.target.value });

  // ✅ Close Popup Function (Fixed)
  const closePopup = () => {
    setShowCardPopup(false);
    setShowChequePopup(false); // ✅ Now also closes Cheque Popup
  };

  // ✅ Get the latest order ID from the database
  const getLatestOrderId = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("order_id")
        .order("order_id", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching latest order ID:", error);
        return "OID-0000";
      }

      if (data && data.length > 0) {
        const lastOrderId = data[0].order_id;
        const lastNumber = parseInt(lastOrderId.split("-")[1]);
        return `OID-${String(lastNumber + 1).padStart(4, "0")}`;
      }

      return "OID-0000";
    } catch (error) {
      console.error("Error in getLatestOrderId:", error);
      return "OID-0000";
    }
  };

  // ✅ Generates a sequential order ID
  const generateOrderId = async () => {
    return await getLatestOrderId();
  };

  // Place Order Function
  const placeOrder = async () => {
    const cleanedContact = customerInfo.contact.trim();

    if (
      !customerInfo.name ||
      !customerInfo.company ||
      !customerInfo.shippingAddress ||
      !customerInfo.email ||
      !cleanedContact
    ) {
      alert("Please fill in all customer details.");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!storedUser) {
      alert("You must be logged in to place an order.");
      return;
    }

    if (
      customerInfo.paymentMethod === "Credit/Debit Card" &&
      !isCardFormValid
    ) {
      alert("Please provide valid card details.");
      setShowCardPopup(true);
      return;
    }

    if (customerInfo.paymentMethod === "Cheque" && !isChequeFormValid) {
      alert("Please provide valid cheque details.");
      setShowChequePopup(true);
      return;
    }

    const orderData = {
      order_id: await generateOrderId(),
      customer_email: customerInfo.email,
      customer_name: customerInfo.name,
      contact: customerInfo.contact,
      company: customerInfo.company,
      shipping_address: customerInfo.shippingAddress,
      placed_by: customerInfo.placedBy,
      items: JSON.stringify(cart),
      total_amount: calculateTotal(),
      status: "Pending",
      date_ordered: new Date().toISOString(),
      payment_method: customerInfo.paymentMethod,
    };

    try {
      const { error } = await supabase.from("orders").insert([orderData]);

      if (error) {
        console.error("Error saving order:", error);
        alert("Error placing order. Try again.");
        return;
      }

      // Save order to localStorage
      localStorage.setItem("order", JSON.stringify(orderData));
      localStorage.setItem("savedCustomerInfo", JSON.stringify(customerInfo));

      // Get any unselected items that were saved
      const unselectedItems =
        JSON.parse(localStorage.getItem("unselectedItems")) || [];
      // Update cart to only contain unselected items
      localStorage.setItem("cart", JSON.stringify(unselectedItems));
      // Clean up temporary storage
      localStorage.removeItem("unselectedItems");
      localStorage.removeItem("checkoutItems");

      // Show success message based on payment method
      if (customerInfo.paymentMethod === "Cash on Delivery") {
        alert("Order placed successfully! You will pay on delivery.");
      } else if (customerInfo.paymentMethod === "Credit/Debit Card") {
        alert("Order placed successfully! Your card has been charged.");
      } else if (customerInfo.paymentMethod === "Cheque") {
        alert("Order placed successfully! Please ensure your cheque is valid.");
      }

      // Show confirmation overlay
      setOrderDetails(orderData);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      alert("Unexpected error. Please try again.");
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Back Arrow */}
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-700 hover:text-red-500"
        >
          <FiArrowLeft className="mr-2 text-xl" /> Back
        </button>
      </div>

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-4">Checkout</h2>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Full Name */}
            <div className="relative">
              <label className="text-gray-600 text-sm mb-1 block">
                Contact Person
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={customerInfo.name}
                onChange={handleChange}
                className="border px-2 py-2 w-full mb-2 rounded-md"
              />
            </div>

            {/* Company Name */}
            <div className="relative">
              <label className="text-gray-600 text-sm mb-1 block">
                Company Name
              </label>
              <input
                type="text"
                name="company"
                placeholder="Enter company name"
                value={customerInfo.company}
                onChange={handleChange}
                className="border px-2 py-2 w-full mb-2 rounded-md"
              />
            </div>

            {/* Shipping Address */}
            <div className="relative">
              <label className="text-gray-600 text-sm mb-1 block">
                Shipping Address
              </label>
              <input
                type="text"
                name="shippingAddress"
                placeholder="Enter shipping address"
                value={customerInfo.shippingAddress}
                onChange={handleChange}
                className="border px-2 py-2 w-full mb-2 rounded-md"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <label className="text-gray-600 text-sm mb-1 block">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={customerInfo.email}
                onChange={handleChange}
                className="border px-2 py-2 w-full mb-2 rounded-md"
              />
              {!isValidEmail(customerInfo.email) && customerInfo.email && (
                <p className="text-red-500 text-sm">Invalid email format.</p>
              )}
            </div>

            {/* Contact Number */}
            <div className="relative">
              <label className="text-gray-600 text-sm mb-1 block">
                Contact Number
              </label>
              <div className="flex items-center border px-2 py-2 w-full mb-2 rounded-md">
                <span className="text-gray-700 mr-2">+63</span>{" "}
                {/* Constant "+63" */}
                <input
                  type="text"
                  name="contact"
                  placeholder="Enter 10-digit number"
                  value={customerInfo.contact.replace(/^\+63/, "")} // Ensures only 10 digits are entered
                  onChange={(e) => {
                    const numericValue = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10); // Only allow numbers, max 10 digits
                    setCustomerInfo({
                      ...customerInfo,
                      contact: `+63${numericValue}`,
                    }); // Keep "+63" constant
                  }}
                  className="w-full outline-none"
                />
              </div>
              {!isValidContact(customerInfo.contact) &&
                customerInfo.contact.length > 3 && (
                  <p className="text-red-500 text-sm">
                    Invalid contact format. Enter 10 more digits.
                  </p>
                )}
            </div>

            {/* Placed By */}
            <div className="relative">
              <label className="text-gray-600 text-sm mb-1 block">
                Placed By
              </label>
              <input
                type="text"
                name="placedBy"
                placeholder="Who is placing the order?"
                value={customerInfo.placedBy}
                onChange={handleChange}
                className="border px-2 py-2 w-full mb-2 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Order Summary</h3>
          <table className="w-full mb-4">
            <thead>
              <tr className="bg-gray-200">
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{item.item_name}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">
                    ₱{Number(item.selling_price || 0).toFixed(2)}
                  </td>
                  <td className="p-2">
                    ₱
                    {(
                      Number(item.selling_price || 0) * (item.quantity || 1)
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Amount */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">
              Total: ₱{calculateTotal().toFixed(2)}
            </h3>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Payment Method</h3>
            <select
              name="paymentMethod"
              value={customerInfo.paymentMethod}
              onChange={(e) => {
                const selectedMethod = e.target.value;
                setCustomerInfo((prev) => ({
                  ...prev,
                  paymentMethod: selectedMethod,
                }));
                if (selectedMethod === "Credit/Debit Card") {
                  setShowCardPopup(true);
                } else if (selectedMethod === "Cheque") {
                  setShowChequePopup(true);
                }
              }}
              className="border border-gray-300 rounded px-4 py-2 w-full mb-4"
            >
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="Credit/Debit Card">Credit/Debit Card</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <button
            onClick={placeOrder}
            className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
          >
            Place Order
          </button>
        </div>
      </main>

      {/* Credit/Debit Card Popup with Validation */}
      {showCardPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
              <p className="font-semibold">
                Your credit card details are protected.
              </p>
              <p className="text-sm">
                We partner with secure payment providers to keep your card
                information safe.
              </p>
            </div>
            <h3 className="text-lg font-semibold mb-2">Card Details</h3>
            <div className="flex items-center space-x-3 mb-3">
              <FaCcVisa className="text-blue-600 text-3xl" />
              <FaCcMastercard className="text-red-600 text-3xl" />
              <FaCcJcb className="text-gray-600 text-3xl" />
            </div>
            <input
              type="text"
              name="cardNumber"
              placeholder="Card Number (15-16 digits)"
              value={cardDetails.cardNumber}
              onChange={handleCardChange}
              className="border px-2 py-2 w-full mb-2 rounded-md"
            />
            {!isCardNumberValid && cardDetails.cardNumber && (
              <p className="text-red-500 text-sm">
                Card number must be 15 or 16 digits.
              </p>
            )}

            <div className="flex space-x-2">
              <input
                type="text"
                name="expiry"
                placeholder="MM/YY"
                value={cardDetails.expiry}
                onChange={handleExpiryChange}
                className="border px-2 py-2 w-1/2 rounded-md"
              />
              {!isExpiryValid && cardDetails.expiry && (
                <p className="text-red-500 text-sm">Invalid expiry date.</p>
              )}

              <input
                type="text"
                name="cvv"
                placeholder="CVV (3-4 digits)"
                value={cardDetails.cvv}
                onChange={(e) =>
                  handleNumberInput(
                    e,
                    (value) => setCardDetails({ ...cardDetails, cvv: value }),
                    4
                  )
                }
                className="border px-2 py-2 w-1/2 rounded-md"
              />
              {!isCVVValid && cardDetails.cvv && (
                <p className="text-red-500 text-sm">CVV must be 3-4 digits.</p>
              )}
            </div>

            <input
              type="text"
              name="nameOnCard"
              placeholder="Name on Card"
              value={cardDetails.nameOnCard}
              onChange={handleCardTextChange}
              className="border px-2 py-2 w-full mt-2 rounded-md"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={() => {
                  setShowCardPopup(false);
                  setCustomerInfo((prev) => ({
                    ...prev,
                    paymentMethod: "Cash on Delivery",
                  }));
                }}
                className="bg-gray-300 text-black px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (isCardFormValid) {
                    setShowCardPopup(false);
                  }
                }}
                className={`px-4 py-2 rounded-md ${
                  isCardFormValid
                    ? "bg-red-500 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!isCardFormValid}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Cheque Payment Popup with Validation */}
      {showChequePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
              <p className="font-semibold">
                Your cheque details are protected.
              </p>
              <p className="text-sm">
                We partner with secure payment providers to keep your cheque
                information safe.
              </p>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Cheque Payment Details
            </h3>
            <input
              type="text"
              name="bankName"
              placeholder="Bank Name"
              value={chequeDetails.bankName}
              onChange={handleChequeChange}
              className="border px-2 py-2 w-full mb-2 rounded-md"
            />
            <input
              type="text"
              name="chequeNumber"
              placeholder="Cheque Number (6-10 digits)"
              value={chequeDetails.chequeNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10); // Remove non-digits and limit to 10
                setChequeDetails((prev) => ({ ...prev, chequeNumber: value }));
              }}
              className="border px-2 py-2 w-full mb-2 rounded-md"
            />
            {!isChequeNumberValid && chequeDetails.chequeNumber && (
              <p className="text-red-500 text-sm">
                Cheque number must be 6-10 digits.
              </p>
            )}
            <input
              type="text"
              name="amount"
              value={calculateTotal().toFixed(2)}
              readOnly
              className="border px-2 py-2 w-full mb-2 rounded-md bg-gray-200 cursor-not-allowed"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={closePopup}
                className="bg-gray-300 text-black px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={isChequeFormValid ? closePopup : null}
                className={`px-4 py-2 rounded-md ${
                  isChequeFormValid
                    ? "bg-red-500 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!isChequeFormValid}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Overlay */}
      {showConfirmation && orderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Order Confirmed!
              </h2>
              <p className="text-gray-600">
                Thank you for your order. We'll process it right away.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Order Details</h3>
              <div className="space-y-2">
                <p>
                  <strong>Order ID:</strong> {orderDetails.order_id}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className="text-yellow-600">Pending</span>
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(orderDetails.date_ordered).toLocaleString()}
                </p>
                <p>
                  <strong>Total Amount:</strong> ₱
                  {Number(orderDetails.total_amount).toLocaleString()}
                </p>
                <p>
                  <strong>Payment Method:</strong> {orderDetails.payment_method}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 border text-left">Product</th>
                      <th className="p-2 border text-left">Price</th>
                      <th className="p-2 border text-left">Quantity</th>
                      <th className="p-2 border text-left">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(typeof orderDetails.items === "string"
                      ? JSON.parse(orderDetails.items)
                      : orderDetails.items || []
                    ).map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{item.item_name}</td>
                        <td className="p-2">
                          ₱{Number(item.selling_price).toLocaleString()}
                        </td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">
                          ₱
                          {(
                            item.selling_price * item.quantity
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100">
                      <td colSpan="3" className="p-2 text-right font-semibold">
                        Total:
                      </td>
                      <td className="p-2 font-semibold">
                        ₱{Number(orderDetails.total_amount).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Shipping Information
              </h3>
              <div className="space-y-2">
                <p>
                  <strong>Name:</strong> {orderDetails.customer_name}
                </p>
                <p>
                  <strong>Company:</strong> {orderDetails.company}
                </p>
                <p>
                  <strong>Address:</strong> {orderDetails.shipping_address}
                </p>
                <p>
                  <strong>Contact:</strong> {orderDetails.contact}
                </p>
                <p>
                  <strong>Email:</strong> {orderDetails.customer_email}
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  navigate("/order-history");
                }}
                className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600 transition-colors"
              >
                View Order History
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  navigate("/customer");
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
