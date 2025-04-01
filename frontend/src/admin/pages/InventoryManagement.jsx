import { useEffect, useState } from "react";
import {
  addInventoryItem,
  deleteInventoryItem,
  fetchInventoryItems,
  updateInventoryItem,
} from "../../api/inventory";
import { fetchSuppliers } from "../../api/supplier"; // Import your supplier fetching function

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
    category: "",
    quantity: "",
    uom: "",
    cost_price: "",
    selling_price: "",
    supplier: "",
  });
  const [suppliers, setSuppliers] = useState([]); // State to store suppliers

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
      const data = await fetchSuppliers(); // Fetch suppliers from Supabase
      setSuppliers(data);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    }
  };

  useEffect(() => {
    loadInventory();
    loadSuppliers(); // Load suppliers when the component mounts
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleClearForm = () => {
    setNewItem({
      item_name: "",
      category: "",
      quantity: "",
      uom: "",
      cost_price: "",
      selling_price: "",
      supplier: "",
    });
    setIsEditing(false);
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
      alert("Please fill in all fields.");
      return;
    }

    try {
      if (isEditing && selectedItem) {
        await updateInventoryItem(selectedItem.item_id, newItem);
        alert("Item updated successfully.");
      } else {
        await addInventoryItem(newItem);
        alert("Item added successfully.");
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
      category: item.category,
      quantity: item.quantity,
      uom: item.uom,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      supplier: item.supplier, // New supplier field
    });
    setIsEditing(true);
  };

  const filteredInventory = inventory.filter((item) =>
    Object.values(item).some((field) =>
      String(field).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
      </div>

      {showForm && (
        <div className="mb-4 p-4 border border-gray-300 rounded">
          <h2 className="text-xl font-bold mb-4">
            {isEditing ? "Update Product" : "Add New Product"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="item_name"
              placeholder="Item Name"
              value={newItem.item_name}
              onChange={handleInputChange}
              className="border border-gray-300 rounded px-4 py-2"
            />
            <input
              type="text"
              name="category"
              placeholder="Category"
              value={newItem.category}
              onChange={handleInputChange}
              className="border border-gray-300 rounded px-4 py-2"
            />
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
              placeholder="Unit of Measure (UoM)"
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
                  value={supplier.supplier_name}
                >
                  {supplier.supplier_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end mt-4">
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
      )}

      <table className="table-auto border-collapse border border-red-200 w-full">
        <thead className="bg-red-200">
          <tr>
            <th className="px-4 py-2">Item ID</th>
            <th className="px-4 py-2">Item Name</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Quantity</th>
            <th className="px-4 py-2">Stock-In Date</th>
            <th className="px-4 py-2">UoM</th>
            <th className="px-4 py-2">Cost Price</th>
            <th className="px-4 py-2">Selling Price</th>
            <th className="px-4 py-2">Supplier</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.map((item) => (
            <tr
              key={item.item_id}
              onClick={() => handleRowClick(item)}
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
                {item.cost_price}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.selling_price}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {item.supplier}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryManagement;
