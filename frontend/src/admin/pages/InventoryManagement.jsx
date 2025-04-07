import { useEffect, useState } from "react";
import {
  addInventoryItem,
  deleteInventoryItem,
  fetchInventoryItems,
  updateInventoryItem,
} from "../../api/inventory";
import { fetchSuppliers } from "../../api/supplier";
import { ChevronUp, ChevronDown } from "lucide-react";

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
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");

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

  const startIndex = (currentPage - 1) * itemsPerPage; ///////////////
  const endIndex = startIndex + itemsPerPage; ///////////////////
  const paginatedItems = filteredInventory.slice(startIndex, endIndex); ///////////////
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
    loadInventory();
    loadSuppliers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleClearForm = () => {
    const lastInput = localStorage.getItem("lastInventoryInput");
    if (lastInput) {
      setNewItem(JSON.parse(lastInput));
    } else {
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
    }
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
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (isEditing && selectedItem) {
        await updateInventoryItem(selectedItem.item_id, newItem);
        alert("Item updated successfully.");
      } else {
        await addInventoryItem(newItem);
        alert("Item added successfully.");
        // Save last input
        localStorage.setItem("lastInventoryInput", JSON.stringify(newItem));
      }

      loadInventory();
      handleClearForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to add/update item:", error);
      alert("Failed to add/update item.");
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) {
      alert("Please select a row to delete.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedItem.item_name}?`
      )
    ) {
      try {
        await deleteInventoryItem(selectedItem.item_id);
        alert("Item deleted successfully.");
        loadInventory();
        setSelectedItem(null);
      } catch (error) {
        console.error("Failed to delete item:", error);
        alert("Failed to delete item.");
      }
    }
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
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-1/3 mr-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            handleClearForm();
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Add
        </button>
        <button
          onClick={handleDeleteItem}
          className="bg-red-500 text-white px-4 py-2 rounded mr-2"
        >
          Delete
        </button>
        <button
          onClick={() => {
            if (selectedItem) setShowForm(true);
            else alert("Please select a row to edit.");
          }}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Update
        </button>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border px-2 py-1"
        >
          <option value="">All Categories</option>
          {[
            ...new Set(
              inventory
                .map((item) => item.category?.trim())
                .filter((cat) => cat && cat.length > 1) // filter out single letters and blank
            ),
          ].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="border px-2 py-1"
        >
          <option value="">All Brands</option>
          {[...new Set(inventory.map((item) => item.brand || ""))].map(
            (brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            )
          )}
        </select>

        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="border px-2 py-1"
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
              <input
                type="text"
                name="item_name"
                placeholder="Item Name"
                value={newItem.item_name}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2 col-span-2"
              />

              {/* Brand - full width */}
              <input
                type="text"
                name="brand"
                placeholder="Brand (e.g. Baby Glo)"
                value={newItem.brand}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
              />

              <input
                type="text"
                name="size"
                placeholder="Size (e.g. 8 oz.)"
                value={newItem.size}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
              />

              <input
                list="category-options"
                name="category"
                value={newItem.category}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewItem({ ...newItem, category: value });
                  const cleanValue = value.trim();
                  if (
                    cleanValue &&
                    cleanValue.length > 1 &&
                    !categories.includes(cleanValue)
                  ) {
                    setCategories((prev) => [...prev, cleanValue]);
                  }
                }}
                placeholder="Enter or select category"
                className="border border-gray-300 rounded px-4 py-2"
              />
              <datalist id="category-options">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>

              <input
                type="number"
                name="quantity"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
              />

              <input
                type="text"
                name="uom"
                placeholder="Unit of Measure (e.g. pcs)"
                value={newItem.uom}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
              />

              <input
                type="number"
                name="cost_price"
                placeholder="Cost Price"
                value={newItem.cost_price}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
              />

              <input
                type="number"
                name="selling_price"
                placeholder="Selling Price"
                value={newItem.selling_price}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
              />

              <select
                name="supplier"
                value={newItem.supplier}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-4 py-2"
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

            {/* Buttons */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleClearForm}
                className="bg-gray-300 text-black px-4 py-2 rounded mr-2"
              >
                Clear
              </button>
              <button
                onClick={handleAddItem}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                {isEditing ? "Update Item" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="table-auto border-collapse border border-red-200 w-full text-sm">
        <thead className="bg-red-200 text-left">
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
                className="px-4 py-2 cursor-pointer select-none"
                onClick={() => {
                  setSortBy(key);
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
              >
                {label}
                {sortBy === key && (
                  <span className="inline-block ml-1 align-middle">
                    {sortOrder === "asc" ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
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
              className={`cursor-pointer ${
                selectedItem?.item_id === item.item_id ? "bg-gray-200" : ""
              }`}
            >
              <td className="border border-gray-300 px-4 py-2">
                {item.item_id}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.item_name}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.brand || "—"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.size || "—"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.category}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.quantity}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {formatDate(item.stock_in_date)}
              </td>
              <td className="border border-gray-300 px-4 py-2">{item.uom}</td>
              <td className="border border-gray-300 px-4 py-2">
                ₱{item.cost_price}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                ₱{item.selling_price}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.supplier_name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-300 rounded mx-1"
        >
          Prev
        </button>
        <span className="px-4 py-2">
          {currentPage} of {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-300 rounded mx-1"
        >
          Next
        </button>
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
                className="bg-red-500 text-white px-4 py-2 rounded"
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
