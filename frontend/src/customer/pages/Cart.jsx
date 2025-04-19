import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiArrowLeft, FiPlus, FiMinus } from "react-icons/fi";

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
    const initialSelections = {};
    savedCart.forEach((_, index) => (initialSelections[index] = true));
    setSelectedItems(initialSelections);
  }, []);

  const updateQuantity = (index, delta) => {
    const updatedCart = cart.map((item, i) =>
      i === index
        ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
        : item
    );
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    const updatedSelections = { ...selectedItems };
    delete updatedSelections[index];
    setCart(updatedCart);
    setSelectedItems(updatedSelections);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleSelect = (index) => {
    setSelectedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const selectedCartItems = cart.filter((_, index) => selectedItems[index]);
  const totalPrice = selectedCartItems.reduce(
    (acc, item) => acc + Number(item.selling_price || 0) * (item.quantity || 1),
    0
  );

  const proceedToCheckout = () => {
    if (selectedCartItems.length === 0) {
      alert("Please select at least one item to proceed.");
      return;
    }
    localStorage.setItem("cart", JSON.stringify(selectedCartItems));
    window.dispatchEvent(new Event("cartUpdated"));
    navigate("/checkout");
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-700 hover:text-red-500"
        >
          <FiArrowLeft className="mr-2 text-xl" /> Back
        </button>
      </div>

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>

        {cart.length > 0 ? (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-sm text-gray-600">
                  <th className="p-2">Pick</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">UoM</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Subtotal</th>
                  <th className="p-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleSelect(index)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedItems[index]
                            ? "bg-pink-500 border-pink-500"
                            : "border-gray-300"
                        }`}
                      ></button>
                    </td>
                    <td className="p-2 flex items-center">
                      <img
                        src={
                          item.image_url || "/src/assets/default-product.jpg"
                        }
                        alt={item.item_name}
                        className="w-10 h-10 object-cover mr-3 rounded-md"
                      />
                      {item.item_name}
                    </td>
                    <td className="p-2">{item.category}</td>
                    <td className="p-2">{item.uom || "N/A"}</td>
                    <td className="p-2">
                      ₱{Number(item.selling_price || 0).toFixed(2)}
                    </td>
                    <td className="p-2 flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-pink-300 transition"
                      >
                        <FiMinus />
                      </button>
                      <span>{item.quantity || 1}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-pink-300 transition"
                      >
                        <FiPlus />
                      </button>
                    </td>
                    <td className="p-2">
                      ₱
                      {(
                        Number(item.selling_price || 0) * (item.quantity || 1)
                      ).toFixed(2)}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-700">
                Total:{" "}
                <span className="text-pink-600">₱{totalPrice.toFixed(2)}</span>
              </h3>
              <button
                onClick={proceedToCheckout}
                className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Your cart is empty.</p>
        )}
      </main>
    </div>
  );
};

export default Cart;
