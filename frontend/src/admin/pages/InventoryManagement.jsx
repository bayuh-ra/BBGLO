import { useEffect, useState } from "react";
import {
  addInventoryItem,
  deleteInventoryItem,
  fetchInventoryItems,
  updateInventoryItem,
} from "../../api/inventory";
import { fetchSuppliers } from "../../api/supplier";
import { ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "../../api/supabaseClient";
import { toast, Toaster } from "react-hot-toast";

const formatDate = (dateString) => {
  const options = {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Date(dateString).toLocaleString("en-US", options);
};

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({
    item_name: "",
    brand: "",
    size: "",
    category: "",
    quantity: "",
    uom: "",
    cost_price: "",
    selling_price: "",
    supplier: "",
  });

  const [suppliers, setSuppliers] = useState([]); // State to store suppliers
  const [categories, setCategories] = useState([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const formatCategory = (cat) => {
    return cat
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const sortedInventory = [...inventory].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy]?.toString().toLowerCase() || "";
    const bVal = b[sortBy]?.toString().toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const filteredInventory = sortedInventory.filter((item) => {
    const matchesSearch = Object.values(item).some((field) =>
      String(field).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesCategory = filterCategory
      ? item.category === filterCategory
      : true;
    const matchesBrand = filterBrand ? item.brand === filterBrand : true;
    const matchesSupplier = filterSupplier
      ? item.supplier_name === filterSupplier
      : true;
    return matchesSearch && matchesCategory && matchesBrand && matchesSupplier;
  });

  const paginatedItems = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage); ////////////

  const loadInventory = async () => {
    try {
      const data = await fetchInventoryItems();
      setInventory(data);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from("category").select("*");
      if (error) {
        console.error("Failed to fetch categories:", error);
      } else {
        const categoryNames = data.map((cat) => cat.categoryName);
        setCategories(categoryNames);
      }
    };

    loadInventory();
    loadSuppliers();
    loadCategories(); // 👈 load from Supabase
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleClearForm = () => {
    setNewItem({
      item_name: "",
      brand: "",
      size: "",
      category: "",
      quantity: "",
      uom: "",
      cost_price: "",
      selling_price: "",
      supplier: "",
    });
    setSelectedItem(null);
  };

  const handleAddItem = async () => {
    if (
      !newItem.item_name ||
      !newItem.category ||
      !newItem.quantity ||
      !newItem.uom ||
      !newItem.cost_price ||
      !newItem.selling_price ||
      !newItem.supplier
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      if (isEditing && selectedItem) {
        await updateInventoryItem(selectedItem.item_id, newItem);
        toast.success("Item updated successfully.");
      } else {
        await addInventoryItem(newItem);
        toast.success("Item added successfully!");

        // Save last input
        localStorage.setItem("lastInventoryInput", JSON.stringify(newItem));
      }

      loadInventory();
      handleClearForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to add/update item:", error);
      toast.error("Failed to add/update item.");
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) {
      toast.error("Please select a row to delete.");
      return;
    }

    toast.custom(
      (t) => (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-30`}
        >
          <div
            className={`bg-white rounded-lg shadow-lg p-6 w-80 transition-all duration-300
          ${t.visible ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
          >
            <p className="text-sm text-center text-gray-800 mb-4">
              Are you sure you want to delete{" "}
              <strong>{selectedItem.item_name}</strong>?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 py-1 bg-gray-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteInventoryItem(selectedItem.item_id);
                    toast.success("Item deleted successfully.");
                    loadInventory();
                    setSelectedItem(null);
                  } catch (error) {
                    console.error("Failed to delete item:", error);
                    toast.error("Failed to delete item.");
                  }
                  toast.dismiss(t.id);
                }}
                className="px-4 py-1 bg-red-500 text-white rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setNewItem({
      item_name: item.item_name,
      brand: item.brand || "", // ← Add this
      size: item.size || "", // ← Add this
      category: item.category,
      quantity: item.quantity,
      uom: item.uom,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      supplier: item.supplier,
    });
    setIsEditing(true);
  };

  return (
    <div className="p-4">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
      <div className="flex flex-wrap items-center gap-3 mb-4">
  <input
    type="text"
    placeholder="Search..."
    className="border border-gray-300 rounded px-4 py-2 w-1/3"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />

  <button
    onClick={() => {
      setShowForm(true);
      setIsEditing(false);
      const lastInput = localStorage.getItem("lastInventoryInput");
      if (lastInput) {
        setNewItem(JSON.parse(lastInput));
      }
    }}
    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
  >
    Add
  </button>

  <button
    onClick={handleDeleteItem}
    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
  >
    Delete
  </button>

  <button
    onClick={() => {
      if (selectedItem) setShowForm(true);
      else toast.error("Please select a row to edit.");
    }}
    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
  >
    Update
  </button>

  <select
    value={filterCategory}
    onChange={(e) => setFilterCategory(e.target.value)}
    className="border px-2 py-1 rounded"
  >
    <option value="">All Categories</option>
    {[...new Set(
      inventory
        .map((item) => item.category?.trim())
        .filter((cat) => cat && cat.length > 1)
    )].map((cat) => (
      <option key={cat} value={cat}>
        {cat}
      </option>
    ))}
  </select>

  <select
    value={filterBrand}
    onChange={(e) => setFilterBrand(e.target.value)}
    className="border px-2 py-1 rounded"
  >
    <option value="">All Brands</option>
    {[...new Set(inventory.map((item) => item.brand || ""))].map((brand) => (
      <option key={brand} value={brand}>
        {brand}
      </option>
    ))}
  </select>

  <select
    value={filterSupplier}
    onChange={(e) => setFilterSupplier(e.target.value)}
    className="border px-2 py-1 rounded"
  >
    <option value="">All Suppliers</option>
    {suppliers.map((sup) => (
      <option key={sup.supplier_id} value={sup.supplier_name}>
        {sup.supplier_name}
      </option>
    ))}
  </select>
</div>


      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl"
              title="Close"
            >
              &times;
            </button>

            {/* Modal Header */}
            <h2 className="text-2xl font-bold mb-6 text-center">
              {isEditing ? "Update Product" : "Add New Product"}
            </h2>

            {/* Form Body */}
            <div className="grid grid-cols-2 gap-4">
              {/* Item Name - full width */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="item_name"
                  placeholder="Item Name"
                  value={newItem.item_name}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  placeholder="e.g. Baby Glo"
                  value={newItem.brand}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <input
                  type="text"
                  name="size"
                  placeholder="e.g. 8 oz."
                  value={newItem.size}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                {!isCustomCategory ? (
                  <select
                    name="category"
                    value={newItem.category}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (selected === "other") {
                        setIsCustomCategory(true);
                        setNewItem({ ...newItem, category: "" });
                      } else {
                        setNewItem({ ...newItem, category: selected });
                      }
                    }}
                    className="border border-gray-300 rounded px-4 py-2 w-full"
                    required
                  >
                    <option value="">Select a Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="other">Other (Add New)</option>
                  </select>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="category"
                      placeholder="Enter new category"
                      value={newItem.category}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          category: e.target.value,
                        })
                      }
                      className="border border-gray-300 rounded px-4 py-2 w-full"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const newCat = formatCategory(newItem.category.trim());
                        const exists = categories.some(
                          (c) => c.toLowerCase() === newCat.toLowerCase()
                        );

                        if (newCat && !exists) {
                          // Insert new category into Supabase
                          const { error } = await supabase
                            .from("category")
                            .insert([{ categoryName: newCat }]);

                          if (error) {
                            console.error("Error inserting category:", error);
                            toast.error("Failed to add category.");
                          } else {
                            setCategories([...categories, newCat]); // update dropdown
                            setIsCustomCategory(false); // go back to dropdown mode
                          }
                        } else {
                          setIsCustomCategory(false);
                        }
                      }}
                      className="bg-blue-500 text-white px-2 rounded"
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  placeholder="Enter quantity"
                  value={newItem.quantity}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit of Measure *
                </label>
                <select
                  name="uom"
                  value={newItem.uom}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                  required
                >
                  <option value="">Select Unit of Measurement</option>
                  <option value="piece">Piece</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="dozen">Dozen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input
                    type="number"
                    name="cost_price"
                    placeholder="0.00"
                    value={newItem.cost_price}
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded px-4 py-2 w-full pl-7"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₱</span>
                  <input
                    type="number"
                    name="selling_price"
                    placeholder="0.00"
                    value={newItem.selling_price}
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded px-4 py-2 w-full pl-7"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <select
                  name="supplier"
                  value={newItem.supplier}
                  onChange={handleInputChange}
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.supplier_id}
                      value={supplier.supplier_id}
                    >
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-500">* Required fields</div>

            {/* Buttons */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleClearForm}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded mr-2"
              >
                Clear
              </button>
              <button
                onClick={handleAddItem}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {isEditing ? "Update Item" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

       <table className="table-auto border-collapse border border-red-200 w-full text-sm">
        <thead className="bg-pink-200">
          <tr>
            {[
              { key: "item_id", label: "Item ID" },
              { key: "item_name", label: "Item Name" },
              { key: "brand", label: "Brand" },
              { key: "size", label: "Size" },
              { key: "category", label: "Category" },
              { key: "quantity", label: "Quantity" },
              { key: "stock_in_date", label: "Stock-In Date" },
              { key: "uom", label: "Uom" },
              { key: "cost_price", label: "Cost Price" },
              { key: "selling_price", label: "Selling Price" },
              { key: "supplier_name", label: "Supplier" },
            ].map(({ key, label }) => (
              <th
                key={key}
                className={`px-4 py-2 cursor-pointer select-none ${
                  key === "cost_price" || key === "selling_price" ? "text-right" : "text-left"
                }`}
                onClick={() => {
                  setSortBy(key);
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
              >
                {label}
                {sortBy === key && (
                  <span className="inline-block ml-1 align-middle">
                    {sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((item) => (
            <tr
              key={item.item_id}
              onClick={() => handleRowClick(item)}
              onDoubleClick={() => setShowDetailModal(true)}
              className={`cursor-pointer ${selectedItem?.item_id === item.item_id ? "bg-pink-100" : "hover:bg-pink-100"}`}
            >
              <td className="border border-gray-300 px-4 py-2">{item.item_id}</td>
              <td className="border border-gray-300 px-4 py-2">{item.item_name}</td>
              <td className="border border-gray-300 px-4 py-2">{item.brand || "—"}</td>
              <td className="border border-gray-300 px-4 py-2">{item.size || "—"}</td>
              <td className="border border-gray-300 px-4 py-2">{item.category}</td>
              <td className="border border-gray-300 px-4 py-2">{item.quantity}</td>
              <td className="border border-gray-300 px-4 py-2">{formatDate(item.stock_in_date)}</td>
              <td className="border border-gray-300 px-4 py-2">{item.uom}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">₱{item.cost_price}</td>
              <td className="border border-gray-300 px-4 py-2 text-right">₱{item.selling_price}</td>
              <td className="border border-gray-300 px-4 py-2">{item.supplier_name}</td>
            </tr>
          ))}
        </tbody>
      </table>


      <div className="flex items-center justify-between mt-4">
  <div className="text-sm text-gray-600">
    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of {filteredInventory.length} entries
  </div>
  <div className="space-x-2">
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      className={`px-3 py-1 rounded border ${currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}`}
      disabled={currentPage === 1}
    >
      Previous
    </button>
    <span className="text-sm font-medium">
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
      className={`px-3 py-1 rounded border ${currentPage === totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}`}
      disabled={currentPage === totalPages}
    >
      Next
    </button>
  </div>
</div>

      {/* Item Details Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Product Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Item ID:</strong> {selectedItem.item_id}
              </div>
              <div>
                <strong>Item Name:</strong> {selectedItem.item_name}
              </div>
              <div>
                <strong>Brand:</strong> {selectedItem.brand}
              </div>
              <div>
                <strong>Size:</strong> {selectedItem.size}
              </div>
              <div>
                <strong>Category:</strong> {selectedItem.category}
              </div>
              <div>
                <strong>Quantity:</strong> {selectedItem.quantity}
              </div>
              <div>
                <strong>UoM:</strong> {selectedItem.uom}
              </div>
              <div>
                <strong>Cost Price:</strong> ₱{selectedItem.cost_price}
              </div>
              <div>
                <strong>Selling Price:</strong> ₱{selectedItem.selling_price}
              </div>
              <div>
                <strong>Supplier:</strong> {selectedItem.supplier_name}
              </div>
              <div className="col-span-2">
                <strong>Stock-In Date:</strong>{" "}
                {formatDate(selectedItem.stock_in_date)}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-400 hover:bg-grey-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
