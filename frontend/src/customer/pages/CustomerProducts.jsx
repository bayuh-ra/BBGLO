import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import API from "../../api/api";
import { FiShoppingCart } from "react-icons/fi";

const highlightMatch = (text, query) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, `<mark>$1</mark>`);
};

const Sidebar = ({
  categories,
  selectedCategory,
  handleCategorySelect,
  localSearch,
  handleSearchChange,
}) => {
  return (
    <aside className="w-64 bg-gray-100 p-4 shadow-lg">
      <h2 className="font-bold text-lg mb-2">Product Categories</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search products..."
        value={localSearch}
        onChange={handleSearchChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
      />

      <ul>
        {categories.map((category, index) => (
          <li key={index}>
            <button
              onClick={() => handleCategorySelect(category)}
              className={`block w-full text-left text-gray-700 hover:text-red-500 p-2 rounded-md ${
                selectedCategory === category ? "bg-red-400 text-white" : ""
              }`}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

Sidebar.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCategory: PropTypes.string.isRequired,
  handleCategorySelect: PropTypes.func.isRequired,
  localSearch: PropTypes.string.isRequired,
  handleSearchChange: PropTypes.func.isRequired,
};

const CustomerProducts = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const debounceTimeout = useRef(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await API.get("inventory/");
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
      } catch (error) {
        console.error("Error fetching inventory:", error);
        if (error.response?.status === 401) {
          console.warn("Session expired or invalid. Please log in again.");
        }
      }
    };

    fetchInventory();
  }, []);

  // Add effect to filter products when search term changes
  useEffect(() => {
    if (searchTerm === "") {
      if (selectedCategory === "All") {
        setProducts(allProducts);
      } else {
        const filteredProducts = allProducts.filter(
          (product) =>
            product.category.trim().toLowerCase() ===
            selectedCategory.toLowerCase()
        );
        setProducts(filteredProducts);
      }
    } else {
      const filteredProducts = allProducts.filter((product) => {
        const matchesSearch = product.item_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === "All" ||
          product.category.trim().toLowerCase() ===
            selectedCategory.toLowerCase();
        return matchesSearch && matchesCategory;
      });
      setProducts(filteredProducts);
    }
  }, [searchTerm, selectedCategory, allProducts]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);

    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
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
    window.dispatchEvent(new Event("cartUpdated"));
  };

  return (
    <div className="h-screen flex">
      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        handleCategorySelect={handleCategorySelect}
        localSearch={localSearch}
        handleSearchChange={handleSearchChange}
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
              <h3
                className="text-lg font-semibold mt-2"
                dangerouslySetInnerHTML={{
                  __html: highlightMatch(product.item_name, searchTerm),
                }}
              />
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
          {products.length === 0 && (
            <div className="text-center col-span-4 text-gray-500 mt-10 text-lg">
              No products found. Try a different keyword or category.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerProducts;
