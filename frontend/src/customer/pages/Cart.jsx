import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrash2,
  FiArrowLeft,
  FiPlus,
  FiMinus,
  FiShoppingCart,
} from "react-icons/fi";
import { FaCcVisa, FaCcMastercard, FaCcJcb } from "react-icons/fa";

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingInfo, setShippingInfo] = useState({
    contactPerson: "Bea Alcaide",
    companyName: "Mercury Drug Ulas",
    shippingAddress: "Ulas",
    emailAddress: "bearalcaide8@gmail.com",
    contactNumber: "+63 9156875354",
    placedBy: "",
    paymentMethod: "Cash on Delivery",
  });
  const [showCardPopup, setShowCardPopup] = useState(false);
  const [showChequePopup, setShowChequePopup] = useState(false);
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
  });  // Validation functions
  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const isValidContact = (contact) => /^\+63\s?\d{10}$/.test(contact);
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

  // Add helper functions
  function checkExpiryDate(expiry) {
    const [month, year] = expiry.split("/");
    const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    return expDate > new Date();
  }

  const handleNumberInput = (e, setter, maxLength) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, maxLength);
    setter((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleExpiryChange = (e) => {
    let { value } = e.target;
    value = value.replace(/\D/g, "").slice(0, 4);
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }
    setCardDetails((prev) => ({ ...prev, expiry: value }));
  };

  const handleCardChange = (e) => {
    handleNumberInput(
      e,
      setCardDetails,
      e.target.name === "cardNumber" ? 16 : 4
    );
  };

  const handleCardTextChange = (e) => {
    setCardDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleChequeChange = (e) => {
    setChequeDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const closePopup = () => {
    setShowCardPopup(false);
    setShowChequePopup(false);
  };

  useEffect(() => {
    const unselectedItems =
      JSON.parse(localStorage.getItem("unselectedItems")) || [];
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const combinedCart = [...unselectedItems];

    savedCart.forEach((newItem) => {
      if (!combinedCart.some((item) => item.item_id === newItem.item_id)) {
        combinedCart.push(newItem);
      }
    });

    setCart(combinedCart);
    localStorage.setItem("cart", JSON.stringify(combinedCart));
    localStorage.removeItem("unselectedItems");

    const initialSelections = {};
    combinedCart.forEach((item) => (initialSelections[item.item_id] = false));
    setSelectedItems(initialSelections);
  }, []);

  const handleSelectAll = () => {
    const newSelections = {};
    cart.forEach((item) => {
      newSelections[item.item_id] = true;
    });
    setSelectedItems(newSelections);
  };

  const handleDeselectAll = () => {
    const newSelections = {};
    cart.forEach((item) => {
      newSelections[item.item_id] = false;
    });
    setSelectedItems(newSelections);
  };

  const updateQuantity = (itemId, delta) => {
    const updatedCart = cart.map((item) =>
      item.item_id === itemId
        ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
        : item
    );
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const removeFromCart = (itemId) => {
    const updatedCart = cart.filter((item) => item.item_id !== itemId);
    const updatedSelections = { ...selectedItems };
    delete updatedSelections[itemId];
    setCart(updatedCart);
    setSelectedItems(updatedSelections);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleSelect = (itemId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleShippingInfoChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "contactNumber") {
      if (!value.startsWith("+63")) {
        processedValue = "+63 " + value.replace(/[^\d]/g, "");
      }
      processedValue = processedValue.slice(0, 14);
    }

    setShippingInfo((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const validateForm = () => {
    return (
      shippingInfo.contactPerson &&
      shippingInfo.companyName &&
      shippingInfo.shippingAddress &&
      isValidEmail(shippingInfo.emailAddress) &&
      isValidContact(shippingInfo.contactNumber) &&
      shippingInfo.placedBy
    );
  };

  const selectedCartItems = cart.filter((item) => selectedItems[item.item_id]);
  const totalPrice = selectedCartItems.reduce(
    (acc, item) => acc + Number(item.selling_price || 0) * (item.quantity || 1),
    0
  );

  const proceedToCheckout = () => {
    if (selectedCartItems.length === 0) {
      alert("Please select at least one item to proceed.");
      return;
    }
    setCurrentStep(2);
  };

  const confirmOrder = () => {
    if (!validateForm()) {
      alert("Please fill in all required fields correctly.");
      return;
    }
    setCurrentStep(3);
  };

  const StepIndicator = () => (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="relative flex justify-between">
        <div className="absolute top-1/2 w-full h-1 bg-gray-200 -z-1">
          <div
            className="h-full bg-pink-500 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />
        </div>
        <div className="relative z-10 flex justify-between w-full">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? "bg-pink-500 text-white" : "bg-gray-200"
              }`}
            >
              <FiShoppingCart className="w-5 h-5" />
            </div>
            <span className="mt-2 text-sm font-medium">Cart</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? "bg-pink-500 text-white" : "bg-gray-200"
              }`}
            >
              <span className="text-sm font-medium">2</span>
            </div>
            <span className="mt-2 text-sm font-medium">Checkout</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep === 3 ? "bg-pink-500 text-white" : "bg-gray-200"
              }`}
            >
              <span className="text-sm font-medium">3</span>
            </div>
            <span className="mt-2 text-sm font-medium">Order Confirmation</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100 via-blue-50 to-green-50">
      <div className="p-4 bg-white bg-opacity-75 shadow-sm">
        <button
          onClick={() =>
            currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate(-1)
          }
          className="flex items-center text-gray-700 hover:text-pink-500 transition-colors duration-300"
        >
          <FiArrowLeft className="mr-2 text-xl" />
          {currentStep > 1 ? "Back" : "Back to Shopping"}
        </button>
      </div>

      <main className="p-6 flex-1">
        <StepIndicator />

        {currentStep === 1 && (
          <div className="bg-white bg-opacity-75 p-6 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-pink-500">Your Items</h3>
              <p className="text-gray-600">
                {cart.length} {cart.length === 1 ? "item" : "items"} in cart
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-pink-100 to-pink-50 text-left">
                  <th className="p-3 rounded-l-lg">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-2 py-1 text-xs bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors duration-300"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-300"
                      >
                        Clear
                      </button>
                    </div>
                  </th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">UoM</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3 rounded-r-lg">Remove</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr
                    key={item.item_id}
                    className={`border-b transition-colors duration-300 ${
                      selectedItems[item.item_id]
                        ? "bg-pink-50 hover:bg-pink-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleSelect(item.item_id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          selectedItems[item.item_id]
                            ? "bg-pink-500 border-pink-500 hover:bg-pink-600"
                            : "border-gray-300 hover:border-pink-400"
                        }`}
                      >
                        {selectedItems[item.item_id] && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="p-3 flex items-center">
                      <div className="relative group">
                        <img
                          src={
                            item.photo
                              ? item.photo.startsWith("http")
                                ? item.photo
                                : `https://lsxeozlhxgzhngskzizn.supabase.co/storage/v1/object/public/product-photos/${item.photo}`
                              : "/src/assets/default-product.jpg"
                          }
                          alt={item.item_name}
                          className="w-16 h-16 object-cover mr-3 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">
                          {item.item_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.brand}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">{item.category}</td>
                    <td className="p-2">{item.uom || "N/A"}</td>
                    <td className="p-3">
                      <span className="font-medium text-gray-900">
                        ₱{Number(item.selling_price || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 bg-pink-50 rounded-lg p-1 w-fit">
                        <button
                          onClick={() => updateQuantity(item.item_id, -1)}
                          className="p-1.5 rounded-md bg-white hover:bg-pink-100 transition-all duration-300 text-pink-500 shadow-sm"
                        >
                          <FiMinus />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.item_id, 1)}
                          className="p-1.5 rounded-md bg-white hover:bg-pink-100 transition-all duration-300 text-pink-500 shadow-sm"
                        >
                          <FiPlus />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-pink-600">
                        ₱
                        {(
                          Number(item.selling_price || 0) * (item.quantity || 1)
                        ).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => removeFromCart(item.item_id)}
                        className="p-2 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-all duration-300"
                        title="Remove item"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-8 flex justify-between items-center">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-700">
                  Total Amount:{" "}
                  <span className="text-2xl text-pink-600 font-bold">
                    ₱{totalPrice.toFixed(2)}
                  </span>
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedCartItems.length} items selected
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-2 border-2 border-pink-400 text-pink-500 rounded-lg hover:bg-pink-50 transition-all duration-300"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={proceedToCheckout}
                  className="px-8 py-2 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-lg hover:from-pink-500 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white bg-opacity-75 p-6 rounded-xl shadow-lg backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={shippingInfo.contactPerson}
                      onChange={handleShippingInfoChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={shippingInfo.companyName}
                      onChange={handleShippingInfoChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Address
                  </label>
                  <input
                    type="text"
                    name="shippingAddress"
                    value={shippingInfo.shippingAddress}
                    onChange={handleShippingInfoChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="emailAddress"
                    value={shippingInfo.emailAddress}
                    onChange={handleShippingInfoChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-pink-500 focus:border-pink-500 ${
                      shippingInfo.emailAddress &&
                      !isValidEmail(shippingInfo.emailAddress)
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    required
                  />
                  {shippingInfo.emailAddress &&
                    !isValidEmail(shippingInfo.emailAddress) && (
                      <p className="mt-1 text-sm text-red-500">
                        Please enter a valid email address
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={shippingInfo.contactNumber}
                    onChange={handleShippingInfoChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-pink-500 focus:border-pink-500 ${
                      shippingInfo.contactNumber &&
                      !isValidContact(shippingInfo.contactNumber)
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    required
                  />
                  {shippingInfo.contactNumber &&
                    !isValidContact(shippingInfo.contactNumber) && (
                      <p className="mt-1 text-sm text-red-500">
                        Please enter a valid Philippine phone number
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placed By
                  </label>
                  <input
                    type="text"
                    name="placedBy"
                    value={shippingInfo.placedBy}
                    onChange={handleShippingInfoChange}
                    placeholder="Who is placing the order?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Order Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Product</th>
                        <th className="text-center py-2">Quantity</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCartItems.map((item) => (
                        <tr key={item.item_id} className="border-b">
                          <td className="py-2 text-sm text-gray-600">
                            {item.item_name}
                          </td>
                          <td className="py-2 text-center">
                            {item.quantity || 1}
                          </td>
                          <td className="py-2 text-right">
                            ₱{Number(item.selling_price || 0).toFixed(2)}
                          </td>
                          <td className="py-2 text-right">
                            ₱
                            {(
                              Number(item.selling_price || 0) *
                              (item.quantity || 1)
                            ).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-pink-600">
                      ₱{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={shippingInfo.paymentMethod}                    onChange={(e) => {
                      handleShippingInfoChange(e);
                      if (e.target.value === "Credit/Debit Card") {
                        setShowCardPopup(true);
                      } else if (e.target.value === "Cheque") {
                        setChequeDetails(prev => ({
                          ...prev,
                          amount: totalPrice
                        }));
                        setShowChequePopup(true);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    required
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Credit/Debit Card">Credit/Debit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>

                  {/* Card Payment Popup */}
                  {showCardPopup && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg w-96">
                        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
                          <p className="font-semibold">
                            Your credit card details are protected.
                          </p>
                          <p className="text-sm">
                            We partner with secure payment providers to keep
                            your card information safe.
                          </p>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Card Details
                        </h3>
                        <div className="flex items-center space-x-3 mb-3">
                          <FaCcVisa className="text-blue-600 text-3xl" />
                          <FaCcMastercard className="text-red-600 text-3xl" />
                          <FaCcJcb className="text-gray-600 text-3xl" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm mb-1">
                              Card Number
                            </label>
                            <input
                              type="text"
                              name="cardNumber"
                              value={cardDetails.cardNumber}
                              onChange={handleCardChange}
                              className="w-full px-3 py-2 border rounded"
                              placeholder="1234 5678 9012 3456"
                            />
                            {!isCardNumberValid && cardDetails.cardNumber && (
                              <p className="text-red-500 text-sm">
                                Card number must be 15 or 16 digits.
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-1">
                                Expiry Date
                              </label>
                              <input
                                type="text"
                                name="expiry"
                                value={cardDetails.expiry}
                                onChange={handleExpiryChange}
                                className="w-full px-3 py-2 border rounded"
                                placeholder="MM/YY"
                              />
                              {!isExpiryValid && cardDetails.expiry && (
                                <p className="text-red-500 text-sm">
                                  Invalid expiry date.
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm mb-1">CVV</label>
                              <input
                                type="text"
                                name="cvv"
                                value={cardDetails.cvv}
                                onChange={handleCardChange}
                                className="w-full px-3 py-2 border rounded"
                                placeholder="123"
                              />
                              {!isCVVValid && cardDetails.cvv && (
                                <p className="text-red-500 text-sm">
                                  CVV must be 3-4 digits.
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm mb-1">
                              Name on Card
                            </label>
                            <input
                              type="text"
                              name="nameOnCard"
                              value={cardDetails.nameOnCard}
                              onChange={handleCardTextChange}
                              className="w-full px-3 py-2 border rounded"
                              placeholder="Full name as shown on card"
                            />
                            {!cardDetails.nameOnCard && (
                              <p className="text-red-500 text-sm">
                                Name on card is required.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end mt-6 gap-4">
                          <button
                            onClick={closePopup}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (isCardFormValid) {
                                closePopup();
                              }
                            }}
                            className={`px-4 py-2 rounded ${
                              isCardFormValid
                                ? "bg-pink-500 text-white hover:bg-pink-600"
                                : "bg-gray-300 cursor-not-allowed"
                            }`}
                            disabled={!isCardFormValid}
                          >
                            Confirm
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
                            We partner with secure payment providers to keep
                            your cheque information safe.
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
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10);
                            setChequeDetails((prev) => ({
                              ...prev,
                              chequeNumber: value,
                            }));
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
                          value={totalPrice.toFixed(2)}
                          readOnly
                          className="border px-2 py-2 w-full mb-2 rounded-md bg-gray-100 cursor-not-allowed"
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
                </div>

                <button
                  onClick={confirmOrder}
                  className={`
                    w-full mt-6 px-8 py-3 rounded-lg transform transition-all duration-300 shadow-md 
                    hover:shadow-lg flex items-center justify-center gap-2 
                    ${
                      Object.values(shippingInfo).every((value) => value)
                        ? "bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white hover:scale-105"
                        : "bg-gray-300 cursor-not-allowed text-gray-500"
                    }
                  `}
                  disabled={
                    !Object.values(shippingInfo).every((value) => value)
                  }
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white bg-opacity-75 p-6 rounded-xl shadow-lg backdrop-blur-sm text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Order Confirmed!
            </h2>
            <p className="text-gray-600 mb-8">
              Thank you for your order. We&apos;ll send you a confirmation email
              shortly.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-lg hover:from-pink-500 hover:to-pink-600 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
