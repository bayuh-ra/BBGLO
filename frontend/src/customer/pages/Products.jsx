import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/api";
import { FiLoader } from "react-icons/fi";

const CustomerProducts = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const productsPerPage = 12;
  const debounceTimeout = useRef(null);
  const observer = useRef();

  // Create intersection observer for infinite scroll
  const lastProductRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore]
  );

  // Optimize product fetching
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true);
        const response = await API.get("inventory/");

        if (!response.data || response.data.length === 0) {
          setAllProducts([]);
          setProducts([]);
          setHasMore(false);
          return;
        }

        setAllProducts(response.data);

        // Get unique categories
        const uniqueCategories = [
          ...new Set(
            response.data.map(
              (item) => item.category?.trim().toLowerCase() || "uncategorized"
            )
          ),
        ].filter(Boolean);

        const formattedCategories = uniqueCategories.map(
          (cat) => cat.charAt(0).toUpperCase() + cat.slice(1)
        );

        setCategories(["All", ...formattedCategories]);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    if (!allProducts.length) return [];

    return allProducts.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        product.category?.trim().toLowerCase() ===
          selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, selectedCategory]);

  // Update displayed products based on pagination
  useEffect(() => {
    const start = 0;
    const end = page * productsPerPage;
    setProducts(filteredProducts.slice(start, end));
    setHasMore(end < filteredProducts.length);
  }, [filteredProducts, page]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory]);

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
    const existingItem = existingCart.find(
      (item) => item.item_id === product.item_id
    );

    let updatedCart;
    if (existingItem) {
      updatedCart = existingCart.map((item) =>
        item.item_id === product.item_id
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
    <div className="h-screen flex bg-gradient-to-br from-pink-100 via-blue-50 to-green-50">
      <main className="flex-1 p-6 bg-white bg-opacity-50 overflow-y-auto">
        <div className="flex flex-col space-y-6">
          {/* Search and Categories Section */}
          <div className="bg-white bg-opacity-75 rounded-lg p-4 shadow-md">
            <div className="max-w-2xl mx-auto mb-4">
              <input
                type="text"
                placeholder="Search products..."
                value={localSearch}
                onChange={handleSearchChange}
                className="w-full px-4 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent placeholder-pink-300"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-4 py-2 rounded-full transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md"
                      : "bg-white hover:bg-pink-50 text-gray-700 border border-pink-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {products.map((product, index) => {
              const imageUrl = product.photo
                ? product.photo.startsWith("http")
                  ? product.photo
                  : `https://lsxeozlhxgzhngskzizn.supabase.co/storage/v1/object/public/product-photos/${product.photo}`
                : null;

              return (
                <div
                  key={product.item_id}
                  ref={index === products.length - 1 ? lastProductRef : null}
                  className="bg-white bg-opacity-75 shadow-md hover:shadow-xl rounded-lg p-4 flex flex-col items-center transform transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-pink-200 hover:via-blue-100 hover:to-green-100 backdrop-blur-sm"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.item_name}
                      loading="lazy"
                      className="w-full h-40 object-cover mb-4 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 flex items-center justify-center mb-4 rounded-lg">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold mb-2 text-center">
                    {[
                      product.brand,
                      product.item_name,
                      product.size,
                      product.uom,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </h3>
                  <p className="text-gray-600">{product.category}</p>
                  <p className="text-gray-800 font-bold mt-2">
                    ₱{Number(product.selling_price || 0).toFixed(2)}
                  </p>
                  <button
                    onClick={() => addToCart(product)}
                    className="mt-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:from-pink-500 hover:to-pink-600 hover:scale-105 hover:shadow-lg hover:shadow-pink-200 font-medium"
                  >
                    Add to Cart
                  </button>
                </div>
              );
            })}
          </div>

          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <FiLoader className="animate-spin text-pink-500 text-2xl" />
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="text-center text-gray-500 mt-10 text-lg">
              No products found. Try a different keyword or category.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerProducts;
