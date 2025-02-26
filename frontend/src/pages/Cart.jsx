import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiArrowLeft } from "react-icons/fi"; // Trash icon for remove button

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);

  // Load cart items from local storage when the page loads
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
  }, []);

  // Update quantity in the cart
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return; // Prevent zero or negative values
  
    const updatedCart = cart.map((item, i) =>
      i === index ? { ...item, quantity: newQuantity } : item
    );
  
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart)); // Update local storage
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  
    // ✅ Notify App.jsx that cart has been updated
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // Ensure `selling_price` is a number and sum up total price
  const totalPrice = cart.reduce((acc, item) => acc + (Number(item.selling_price || 0) * (item.quantity || 1)), 0);

  return (
    <div className="h-screen flex flex-col">

        {/* Back Arrow */}
        <div className="p-4">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-700 hover:text-red-500">
            <FiArrowLeft className="mr-2 text-xl" /> Back
          </button>
        </div>
  

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>


        {cart.length > 0 ? (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">UoM</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Quantity</th>
                  <th className="text-left p-2">Subtotal</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 flex items-center">
                      <img src={item.image_url || "/src/assets/default-product.jpg"} alt={item.item_name} className="w-12 h-12 object-cover mr-4 rounded-md" />
                      {item.item_name}
                    </td>
                    <td className="p-2">{item.category}</td>
                    <td className="p-2">{item.uom || "N/A"}</td>
                    <td className="p-2">₱{Number(item.selling_price || 0).toFixed(2)}</td>
                    <td className="p-2">
                      <input 
                        type="number"
                        value={item.quantity || 1}
                        min="1"
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value, 10))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="p-2">₱{(Number(item.selling_price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    <td className="p-2">
                      <button onClick={() => removeFromCart(index)} className="text-red-500 hover:text-red-700">
                        <FiTrash2 className="text-xl" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">Total: ₱{totalPrice.toFixed(2)}</h3>
              <button 
                onClick={() => navigate("/checkout")}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
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
