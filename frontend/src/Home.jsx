import { useState, useEffect } from "react";
import API from "./api/api";
import Sidebar from "./components/Sidebar";
import { FiShoppingCart } from "react-icons/fi"; // Shopping cart icon

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    API.get("inventory/")
      .then((response) => {
        console.log("Fetched Inventory Data:", response.data);
        setAllProducts(response.data);
        setProducts(response.data);

        const uniqueCategories = [
          ...new Set(
            response.data.map((item) => item.category.trim().toLowerCase())
          ),
        ].filter(Boolean);

        const formattedCategories = uniqueCategories.map(
          (cat) => cat.charAt(0).toUpperCase() + cat.slice(1)
        );

        setCategories(["All", ...formattedCategories]);
      })
      .catch((error) => console.error("Error fetching inventory:", error));
  }, []);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSearchTerm("");

    if (category === "All") {
      setProducts(allProducts);
    } else {
      const filteredProducts = allProducts.filter(
        (product) =>
          product.category.trim().toLowerCase() === category.toLowerCase()
      );
      setProducts(filteredProducts);
    }
  };

  // ✅ Search Filter Function
  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (value === "") {
      setProducts(allProducts);
    } else {
      const filteredProducts = allProducts.filter((product) =>
        product.item_name.toLowerCase().includes(value)
      );
      setProducts(filteredProducts);
    }
  };

  const addToCart = (product) => {
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingItemIndex = existingCart.findIndex(
      (item) => item.item_id === product.item_id
    );

    let updatedCart;
    if (existingItemIndex !== -1) {
      updatedCart = existingCart.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...existingCart, { ...product, quantity: 1 }];
    }

    localStorage.setItem("cart", JSON.stringify(updatedCart));

    // ✅ Trigger cart update in navbar instantly
    window.dispatchEvent(new Event("cartUpdated"));
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        searchTerm={searchTerm} // ✅ Pass search term
        onSearchChange={handleSearchChange} // ✅ Pass search function
      />

      {/* Product Display */}
      <main className="flex-1 p-6 bg-gray-50">
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          {selectedCategory} Products
        </h2>
        <div className="grid grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.item_id}
              className="p-4 bg-white shadow-md rounded-lg"
            >
              <img
                src={product.image_url || "/src/assets/default-product.jpg"}
                alt={product.item_name}
                className="w-full h-40 object-cover rounded-md"
              />
              <h3 className="text-lg font-semibold mt-2">
                {product.item_name}
              </h3>
              <p className="text-gray-600">{product.category}</p>
              <p className="text-red-500 font-bold mt-2">
                ₱{product.selling_price}
              </p>
              <button
                onClick={() => addToCart(product)}
                className="bg-red-400 text-white w-full py-2 rounded-lg mt-2 flex items-center justify-center hover:bg-red-500"
              >
                <FiShoppingCart className="mr-2" /> Add to Cart
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;
