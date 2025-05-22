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
import { CSVLink } from "react-csv";

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [globalLowStockThreshold, setGlobalLowStockThreshold] = useState(10); // Default 10 units
  const [globalHalfStockThreshold, setGlobalHalfStockThreshold] = useState(50); // Default 50 units
  const [globalFullStockThreshold, setGlobalFullStockThreshold] = useState(100); // Default 100 units
  const [itemStockThresholds, setItemStockThresholds] = useState({});

  // Add state for stock status filter
  const [filterStockStatus, setFilterStockStatus] = useState("");

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
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const supabaseUrl =
    supabase?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;

  // Re-add newItem state
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
    photo: null, // Add photo field
  });

  // Place getStockStatus function definition here (after state definitions)
  const getStockStatus = (item) => {
    try {
      const thresholds = itemStockThresholds[item.item_id] || {
        low: globalLowStockThreshold,
        half: globalHalfStockThreshold,
        full: globalFullStockThreshold,
      };

      const currentQuantity = Number(item.quantity);

      const sortedThresholds = {
        low: Math.max(
          0,
          Math.min(thresholds.low, thresholds.half, thresholds.full)
        ),
        half: Math.max(
          0,
          Math.min(Math.max(thresholds.low, thresholds.half), thresholds.full)
        ),
        full: Math.max(
          0,
          Math.max(thresholds.low, thresholds.half, thresholds.full)
        ),
      };

      if (currentQuantity <= sortedThresholds.low) {
        return {
          status: "low",
          color: "bg-red-500",
          tooltip: `Low Stock (${currentQuantity} units <= ${sortedThresholds.low} units)`,
          description: "Critical stock level",
        };
      } else if (currentQuantity <= sortedThresholds.half) {
        return {
          status: "half",
          color: "bg-yellow-500",
          tooltip: `Half Stock (${currentQuantity} units <= ${sortedThresholds.half} units)`,
          description: "Moderate stock level",
        };
      } else if (currentQuantity <= sortedThresholds.full) {
        return {
          status: "normal",
          color: "bg-blue-500",
          tooltip: `Normal Stock (${currentQuantity} units <= ${sortedThresholds.full} units)`,
          description: "Adequate stock level",
        };
      } else {
        return {
          status: "full",
          color: "bg-green-500",
          tooltip: `Full Stock (${currentQuantity} units > ${sortedThresholds.full} units)`,
          description: "Optimal stock level",
        };
      }
    } catch (error) {
      console.error(
        `Error calculating stock status for item ${item.item_id}: `,
        error
      );
      return {
        status: "unknown",
        color: "bg-gray-400",
        tooltip: "Status calculation failed",
        description: "Stock level cannot be determined due to an error",
      };
    }
  };

  // Update useEffect to load saved quantity thresholds
  useEffect(() => {
    const savedGlobalLowThreshold = localStorage.getItem(
      "globalLowStockThreshold"
    );
    const savedGlobalHalfThreshold = localStorage.getItem(
      "globalHalfStockThreshold"
    );
    const savedGlobalFullThreshold = localStorage.getItem(
      "globalFullStockThreshold"
    );
    const savedItemThresholds = localStorage.getItem("itemStockThresholds");

    if (savedGlobalLowThreshold)
      setGlobalLowStockThreshold(Number(savedGlobalLowThreshold));
    if (savedGlobalHalfThreshold)
      setGlobalHalfStockThreshold(Number(savedGlobalHalfThreshold));
    if (savedGlobalFullThreshold)
      setGlobalFullStockThreshold(Number(savedGlobalFullThreshold));
    if (savedItemThresholds)
      setItemStockThresholds(JSON.parse(savedItemThresholds));
  }, []);

  // Add handleClickOutside function
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowForm(false);
      setShowDetailModal(false);
      handleClearForm();
    }
  };

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
    // Add stock status filter logic
    const matchesStockStatus = filterStockStatus
      ? getStockStatus(item).status === filterStockStatus
      : true;
    return (
      matchesSearch &&
      matchesCategory &&
      matchesBrand &&
      matchesSupplier &&
      matchesStockStatus
    );
  });

  const paginatedItems = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  // Selection logic
  const isAllSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedItemIds.includes(item.item_id));
  const isIndeterminate = selectedItemIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(
        selectedItemIds.filter(
          (id) => !paginatedItems.some((item) => item.item_id === id)
        )
      );
    } else {
      setSelectedItemIds([
        ...selectedItemIds,
        ...paginatedItems
          .filter((item) => !selectedItemIds.includes(item.item_id))
          .map((item) => item.item_id),
      ]);
    }
  };

  const handleSelectOne = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };
  const handleClearSelection = () => setSelectedItemIds([]);

  const handleSelectAllGlobal = () =>
    setSelectedItemIds(filteredInventory.map((item) => item.item_id));
  const showDeleteConfirmToast = (count, onConfirm) => {
    return toast.custom(
      (t) => (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="font-semibold text-gray-800 mb-2">
            Are you sure you want to delete {count} selected item
            {count > 1 ? "s" : ""}?
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            <button
              className="px-4 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
              onClick={() => {
                toast.dismiss(t.id);
                toast.remove(t.id);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                try {
                  await onConfirm();
                  toast.dismiss(t.id);
                  toast.remove(t.id);
                } catch (error) {
                  console.error("Delete operation failed:", error);
                  toast.dismiss(t.id);
                  toast.remove(t.id);
                  toast.error("Failed to delete item(s)");
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
        style: { maxWidth: "300px", margin: "0 auto" },
      }
    );
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;

    showDeleteConfirmToast(selectedItemIds.length, async () => {
      try {
        for (const id of selectedItemIds) {
          await deleteInventoryItem(id);
        }
        toast.success("Selected items deleted successfully.");
        setSelectedItemIds([]);
        loadInventory();
      } catch (error) {
        toast.error("Failed to delete selected items.");
      }
    });
  };

  // CSV export data
  const csvHeaders = [
    { label: "Item ID", key: "item_id" },
    { label: "Item Name", key: "item_name" },
    { label: "Brand", key: "brand" },
    { label: "Size", key: "size" },
    { label: "Category", key: "category" },
    { label: "Quantity", key: "quantity" },
    { label: "Stock-In Date", key: "stock_in_date" },
    { label: "UoM", key: "uom" },
    { label: "Cost Price", key: "cost_price" },
    { label: "Selling Price", key: "selling_price" },
    { label: "Supplier", key: "supplier_name" },
  ];
  const csvData = filteredInventory.map((item) => ({
    ...item,
    supplier_name:
      suppliers.find((s) => s.supplier_id === item.supplier)?.supplier_name ||
      item.supplier_name,
  }));

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
    const { name, value, files } = e.target;
    if (name === "photo") {
      setNewItem({ ...newItem, photo: files[0] });
    } else {
      setNewItem({ ...newItem, [name]: value });
    }
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
      photo: null, // Reset photo field
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
      let photoUrl = "";
      if (newItem.photo instanceof File) {
        const timestamp = Date.now();
        const originalName = newItem.photo.name;
        const extension = originalName.split(".").pop();
        const baseName = originalName
          .replace(/\.[^/.]+$/, "") // remove extension
          .replace(/\s+/g, "_") // replace spaces
          .replace(/[^a-zA-Z0-9_-]/g, ""); // remove special chars

        const uniqueName = `${baseName}_${timestamp}.${extension}`;
        const filePath = `photos/${uniqueName}`;

        const { error } = await supabase.storage
          .from("product-photos")
          .upload(filePath, newItem.photo, {
            upsert: false, // avoid overwriting
          });

        if (error) {
          console.error("Photo upload failed:", error);
          toast.error(
            `Failed to upload photo: ${error.message || "Unknown error"}`
          );
          return;
        }

        photoUrl = filePath; // use the same value you'll store in DB
      }

      const itemData = { ...newItem, photo: photoUrl };

      if (isEditing && selectedItem) {
        await updateInventoryItem(selectedItem.item_id, itemData);
        toast.success("Item updated successfully.");
      } else {
        await addInventoryItem(itemData);
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

    showDeleteConfirmToast(1, async () => {
      try {
        await deleteInventoryItem(selectedItem.item_id);
        toast.success("Item deleted successfully.");
        loadInventory();
        setSelectedItem(null);
      } catch (error) {
        console.error("Failed to delete item:", error);
        toast.error("Failed to delete item.");
      }
    });
  };

  const handleRowClick = (item) => {
    // Ensure supplier is set to supplier_id
    let supplierId = item.supplier;
    if (!supplierId || !suppliers.some((s) => s.supplier_id === supplierId)) {
      supplierId = suppliers.length > 0 ? suppliers[0].supplier_id : "";
    }
    setSelectedItem(item);
    setNewItem({
      item_name: item.item_name,
      brand: item.brand || "",
      size: item.size || "",
      category: item.category,
      quantity: item.quantity,
      uom: item.uom,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      supplier: supplierId,
      photo: item.photo || "", // Ensure photo is set
    });
    setIsEditing(true);
  };

  // Update low stock items filter to use the quantity-based logic
  const lowStockItems = inventory.filter((item) => {
    const status = getStockStatus(item);
    return status.status === "low";
  });

  // Category counts for cards
  const categoryCounts = Array.from(new Set(inventory.map((i) => i.category)))
    .filter(Boolean)
    .map((cat) => ({
      category: cat,
      count: inventory.filter((i) => i.category === cat).length,
    }));

  // Color palette for cards
  const cardColors = [
    "bg-yellow-100 text-yellow-700",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-pink-100 text-pink-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
  ];

  // Update the settings modal threshold inputs with max=100
  const validateThresholds = (low, half, full) => {
    const sorted = [
      { key: "low", value: low },
      { key: "half", value: half },
      { key: "full", value: full },
    ].sort((a, b) => a.value - b.value);

    return {
      low: sorted[0].value,
      half: sorted[1].value,
      full: sorted[2].value,
    };
  };

  // Add settings button to the header
  return (
    <div className="p-4">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Inventory Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-gray-700 mb-3">
                  Global Stock Thresholds (Units)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Low Stock Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={globalLowStockThreshold}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const nonNegativeValue = Math.max(0, value);
                          const validated = validateThresholds(
                            nonNegativeValue,
                            globalHalfStockThreshold,
                            globalFullStockThreshold
                          );
                          setGlobalLowStockThreshold(validated.low);
                          setGlobalHalfStockThreshold(validated.half);
                          setGlobalFullStockThreshold(validated.full);
                        }}
                        className="border border-gray-300 rounded px-3 py-2 w-24"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Half Stock Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={globalHalfStockThreshold}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const nonNegativeValue = Math.max(0, value);
                          const validated = validateThresholds(
                            globalLowStockThreshold,
                            nonNegativeValue,
                            globalFullStockThreshold
                          );
                          setGlobalLowStockThreshold(validated.low);
                          setGlobalHalfStockThreshold(validated.half);
                          setGlobalFullStockThreshold(validated.full);
                        }}
                        className="border border-gray-300 rounded px-3 py-2 w-24"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Full Stock Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={globalFullStockThreshold}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const nonNegativeValue = Math.max(0, value);
                          const validated = validateThresholds(
                            globalLowStockThreshold,
                            globalHalfStockThreshold,
                            nonNegativeValue
                          );
                          setGlobalLowStockThreshold(validated.low);
                          setGlobalHalfStockThreshold(validated.half);
                          setGlobalFullStockThreshold(validated.full);
                        }}
                        className="border border-gray-300 rounded px-3 py-2 w-24"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setItemStockThresholds({});
                      toast.success("All items now use global thresholds");
                    }}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Apply to All Items
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">
                  Individual Item Thresholds
                </h3>
                <div className="max-h-[300px] overflow-y-auto">
                  {inventory.map((item) => {
                    const thresholds = itemStockThresholds[item.item_id] || {
                      low: globalLowStockThreshold,
                      half: globalHalfStockThreshold,
                      full: globalFullStockThreshold,
                    };
                    return (
                      <div
                        key={item.item_id}
                        className="py-2 border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-800 font-medium">
                            {item.item_name}
                          </span>
                          <button
                            onClick={() => {
                              setItemStockThresholds((prev) => {
                                const newThresholds = { ...prev };
                                delete newThresholds[item.item_id];
                                return newThresholds;
                              });
                              toast.success("Using global thresholds");
                            }}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            Use Global
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Low
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={thresholds.low}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                const nonNegativeValue = Math.max(0, value);
                                setItemStockThresholds((prev) => ({
                                  ...prev,
                                  [item.item_id]: validateThresholds(
                                    nonNegativeValue,
                                    thresholds.half,
                                    thresholds.full
                                  ),
                                }));
                              }}
                              className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Half
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={thresholds.half}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                const nonNegativeValue = Math.max(0, value);
                                setItemStockThresholds((prev) => ({
                                  ...prev,
                                  [item.item_id]: validateThresholds(
                                    thresholds.low,
                                    nonNegativeValue,
                                    thresholds.full
                                  ),
                                }));
                              }}
                              className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Full
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={thresholds.full}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                const nonNegativeValue = Math.max(0, value);
                                setItemStockThresholds((prev) => ({
                                  ...prev,
                                  [item.item_id]: validateThresholds(
                                    thresholds.low,
                                    thresholds.half,
                                    nonNegativeValue
                                  ),
                                }));
                              }}
                              className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Close
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(
                    "globalLowStockThreshold",
                    globalLowStockThreshold
                  );
                  localStorage.setItem(
                    "globalHalfStockThreshold",
                    globalHalfStockThreshold
                  );
                  localStorage.setItem(
                    "globalFullStockThreshold",
                    globalFullStockThreshold
                  );
                  localStorage.setItem(
                    "itemStockThresholds",
                    JSON.stringify(itemStockThresholds)
                  );
                  setShowSettingsModal(false);
                  toast.success("Settings saved successfully");
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-start">
            <div>
              <strong>Low Stock Alert:</strong>
              <ul className="list-disc ml-6 mt-1">
                {lowStockItems.map((item) => {
                  const thresholds = itemStockThresholds[item.item_id] || {
                    low: globalLowStockThreshold,
                    half: globalHalfStockThreshold,
                    full: globalFullStockThreshold,
                  };
                  const lowThreshold = Math.max(
                    0,
                    Math.min(thresholds.low, thresholds.half, thresholds.full)
                  );
                  return (
                    <li key={item.item_id}>
                      {item.item_name} ({item.quantity} {item.uom}) - Below Low
                      Threshold ({lowThreshold} units)
                    </li>
                  );
                })}
              </ul>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Adjust Thresholds
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2 mb-3 items-center"></div>

      {/* Category Filter Cards */}
      <div className="flex w-full gap-4 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">
        {categoryCounts.map(({ category, count }, idx) => (
          <button
            key={category}
            onClick={() =>
              setFilterCategory(filterCategory === category ? "" : category)
            }
            className={`flex-1 min-w-[140px] sm:min-w-0 rounded-xl shadow flex flex-col items-center py-6 transition-all duration-150 cursor-pointer border-2 focus:outline-none
              ${cardColors[idx % cardColors.length]}
              ${
                filterCategory === category
                  ? "border-fuchsia-500 ring-2 ring-fuchsia-200 bg-fuchsia-100"
                  : "border-transparent"
              }
            `}
            aria-pressed={filterCategory === category}
          >
            <span className="text-2xl sm:text-3xl mb-1">📦</span>
            <span className="text-lg sm:text-2xl font-bold">{count}</span>
            <span className="text-xs sm:text-sm font-medium mt-1 text-center">
              {category}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 mb-4 w-full">
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-full sm:w-1/3"
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
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
        >
          Add
        </button>

        <button
          onClick={() => {
            if (selectedItemIds.length > 0) {
              showDeleteConfirmToast(selectedItemIds.length, async () => {
                try {
                  for (const id of selectedItemIds) {
                    await deleteInventoryItem(id);
                  }
                  toast.success("Selected items deleted successfully.");
                  setSelectedItemIds([]);
                  loadInventory();
                } catch (error) {
                  toast.error("Failed to delete selected items.");
                }
              });
            } else {
              handleDeleteItem();
            }
          }}
          className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full sm:w-auto font-medium`}
        >
          {selectedItemIds.length > 0
            ? `Delete (${selectedItemIds.length})`
            : "Delete"}
        </button>

        <button
          onClick={() => {
            if (selectedItem) setShowForm(true);
            else toast.error("Please select a row to edit.");
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full sm:w-auto"
        >
          Update
        </button>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto text-gray-700"
        >
          <option value="">All Categories</option>
          {[
            ...new Set(
              inventory
                .map((item) => item.category?.trim())
                .filter((cat) => cat && cat.length > 1)
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
          className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto text-gray-700"
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
          className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto text-gray-700"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((sup) => (
            <option key={sup.supplier_id} value={sup.supplier_name}>
              {sup.supplier_name}
            </option>
          ))}
        </select>

        {/* Add Stock Status Filter */}
        <select
          value={filterStockStatus}
          onChange={(e) => setFilterStockStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="full">Full</option>
          <option value="normal">Normal</option>
          <option value="half">Half</option>
          <option value="low">Low</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          onClick={handleClickOutside}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[600px] max-h-[95vh] overflow-y-auto overflow-x-hidden border-2 border-pink-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X Close Button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-pink-100 text-pink-500 hover:text-pink-700 rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-pink-400 z-10"
              aria-label="Close"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 rounded-t-2xl px-6 py-5 flex items-center gap-4">
              <span className="text-3xl">🛒</span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {isEditing ? "Update Product" : "Add New Product"}
              </h2>
            </div>
            {/* Modal Body with soft gradient */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-pink-50 to-rose-50 overflow-x-hidden">
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
                          const newCat = formatCategory(
                            newItem.category.trim()
                          );
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
                    <span className="absolute left-3 top-2 text-gray-500">
                      ₱
                    </span>
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
                    <span className="absolute left-3 top-2 text-gray-500">
                      ₱
                    </span>
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

                <div>
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

                {/* Show product image if it exists or preview if a new file is selected */}
                {newItem.photo && (
                  <div className="col-span-2 mb-2 flex justify-center">
                    {typeof newItem.photo === "string" ? (
                      <img
                        src={
                          newItem.photo.startsWith("http")
                            ? newItem.photo
                            : `${supabaseUrl}/storage/v1/object/public/product-photos/${newItem.photo}`
                        }
                        alt="Product"
                        className="rounded-xl border-2 border-fuchsia-200 shadow-md max-h-40 max-w-[160px] object-contain bg-white"
                      />
                    ) : newItem.photo instanceof File ? (
                      <img
                        src={URL.createObjectURL(newItem.photo)}
                        alt="Preview"
                        className="rounded-xl border-2 border-fuchsia-200 shadow-md max-h-40 max-w-[160px] object-contain bg-white"
                      />
                    ) : null}
                  </div>
                )}

                <div className="col-span-2">
                  <label
                    htmlFor="photo"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Product Photo
                  </label>
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="border border-gray-300 rounded px-4 py-2 w-full"
                  />
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-500">
                * Required fields
              </div>

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
        </div>
      )}

      {/* Responsive Table */}
      <div className="overflow-x-auto w-full">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span>⚙️</span> Settings
            </button>

            {/* Stock Status Legend */}
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-gray-700">Stock Status:</span>
              <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-gray-600">Full</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-gray-600">Half</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-gray-600">Low</span>
                </div>
              </div>
            </div>
          </div>

          {/* Export CSV Button */}
          <CSVLink
            data={csvData}
            headers={csvHeaders}
            filename="inventory.csv"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium flex items-center gap-2"
          >
            <span>📊</span> Export CSV
          </CSVLink>
        </div>

        <table className="table-auto border-collapse border border-red-200 w-full text-sm min-w-[900px]">
          <thead className="bg-pink-200">
            <tr>
              {/* Checkbox column */}
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Select all on page"
                />
              </th>
              {/* Add Status column */}
              <th className="px-4 py-2 text-center">Status</th>
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
                    key === "cost_price" || key === "selling_price"
                      ? "text-right"
                      : "text-left"
                  }`}
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
            {paginatedItems.map((item) => {
              const isChecked = selectedItemIds.includes(item.item_id);
              const isSelected = selectedItem?.item_id === item.item_id;
              const stockStatus = getStockStatus(item);

              return (
                <tr
                  key={item.item_id}
                  onClick={() => handleRowClick(item)}
                  onDoubleClick={() => {
                    setSelectedItem(item);
                    setShowDetailModal(true);
                  }}
                  className={`cursor-pointer ${
                    isChecked
                      ? "bg-pink-100"
                      : isSelected
                      ? "bg-pink-100"
                      : "hover:bg-pink-100"
                  }`}
                >
                  {/* Checkbox cell */}
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleSelectOne(item.item_id)}
                      aria-label={`Select item ${item.item_id}`}
                    />
                  </td>

                  {/* Status indicator cell */}
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <div className="relative group">
                      <div
                        className={`w-3 h-3 rounded-full ${stockStatus.color} mx-auto`}
                      />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity duration-200">
                        {stockStatus.tooltip}
                      </div>
                    </div>
                  </td>

                  {/* Row click for edit/select */}
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
                  <td className="border border-gray-300 px-4 py-2">
                    {item.uom}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    ₱{item.cost_price}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    ₱{item.selling_price}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {suppliers.find((s) => s.supplier_id === item.supplier)
                      ?.supplier_name || item.supplier_name}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2 w-full">
        <div className="text-sm text-gray-600 text-center sm:text-left w-full sm:w-auto">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of{" "}
          {filteredInventory.length} entries
        </div>
        <div className="flex gap-2 w-full justify-center sm:w-auto sm:justify-end">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-4 py-2 rounded border text-sm font-medium ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
            }`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium flex items-center">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
            className={`px-4 py-2 rounded border text-sm font-medium ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
            }`}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {showDetailModal && selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-2 sm:px-0 overflow-x-hidden"
          onClick={handleClickOutside}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[600px] max-h-[95vh] overflow-y-auto overflow-x-hidden border-2 border-pink-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X Close Button */}
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-pink-100 text-pink-500 hover:text-pink-700 rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-pink-400 z-10"
              aria-label="Close"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 rounded-t-2xl px-6 py-5 flex items-center gap-4">
              <span className="text-3xl">🛒</span>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Product Details
              </h3>
            </div>

            {/* Modal Content: Name on top, then image and details */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-pink-50 to-rose-50 overflow-x-hidden">
              {/* Highlighted Product Name */}
              <div className="text-fuchsia-700 text-xl font-bold mb-4 leading-tight break-words text-center">
                {selectedItem.item_name}
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Product Photo */}
                {selectedItem.photo && (
                  <div className="flex-shrink-0 w-full sm:w-auto flex justify-center items-start mb-4 sm:mb-0">
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/product-photos/${
                        selectedItem.photo.startsWith("photos/")
                          ? selectedItem.photo
                          : "photos/" + selectedItem.photo
                      }`}
                      alt="Product"
                      className="rounded-xl border-2 border-fuchsia-200 shadow-md max-h-72 max-w-[220px] object-contain bg-white"
                    />
                  </div>
                )}
                {/* Info Section */}
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  {[
                    ["Item ID", selectedItem.item_id],
                    ["Brand", selectedItem.brand || "—"],
                    ["Size", selectedItem.size || "—"],
                    ["Category", selectedItem.category],
                    ["Quantity", selectedItem.quantity],
                    ["UoM", selectedItem.uom],
                    ["Cost Price", `₱${selectedItem.cost_price}`],
                    ["Selling Price", `₱${selectedItem.selling_price}`],
                    [
                      "Supplier",
                      suppliers.find(
                        (s) => s.supplier_id === selectedItem.supplier
                      )?.supplier_name || selectedItem.supplier_name,
                    ],
                    ["Stock-In Date", formatDate(selectedItem.stock_in_date)],
                  ].map(([label, value], index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 min-w-0"
                    >
                      <span className="font-semibold text-pink-600 whitespace-nowrap">
                        {label}:
                      </span>
                      <span className="truncate text-gray-800 ml-1">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Low Stock Threshold Control */}
              <div className="mt-4 pt-4 border-t border-pink-200">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-pink-600">
                    Stock Thresholds (Units):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={
                        itemStockThresholds[selectedItem.item_id]?.low ||
                        globalLowStockThreshold
                      }
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const nonNegativeValue = Math.max(0, value);
                        const currentThresholds = itemStockThresholds[
                          selectedItem.item_id
                        ] || {
                          low: globalLowStockThreshold,
                          half: globalHalfStockThreshold,
                          full: globalFullStockThreshold,
                        };
                        setItemStockThresholds((prev) => ({
                          ...prev,
                          [selectedItem.item_id]: validateThresholds(
                            nonNegativeValue,
                            currentThresholds.half,
                            currentThresholds.full
                          ),
                        }));
                      }}
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      value={
                        itemStockThresholds[selectedItem.item_id]?.half ||
                        globalHalfStockThreshold
                      }
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const nonNegativeValue = Math.max(0, value);
                        const currentThresholds = itemStockThresholds[
                          selectedItem.item_id
                        ] || {
                          low: globalLowStockThreshold,
                          half: globalHalfStockThreshold,
                          full: globalFullStockThreshold,
                        };
                        setItemStockThresholds((prev) => ({
                          ...prev,
                          [selectedItem.item_id]: validateThresholds(
                            currentThresholds.low,
                            nonNegativeValue,
                            currentThresholds.full
                          ),
                        }));
                      }}
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      value={
                        itemStockThresholds[selectedItem.item_id]?.full ||
                        globalFullStockThreshold
                      }
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const nonNegativeValue = Math.max(0, value);
                        const currentThresholds = itemStockThresholds[
                          selectedItem.item_id
                        ] || {
                          low: globalLowStockThreshold,
                          half: globalHalfStockThreshold,
                          full: globalFullStockThreshold,
                        };
                        setItemStockThresholds((prev) => ({
                          ...prev,
                          [selectedItem.item_id]: validateThresholds(
                            currentThresholds.low,
                            currentThresholds.half,
                            nonNegativeValue
                          ),
                        }));
                      }}
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                    />
                    <button
                      onClick={() => {
                        setItemStockThresholds((prev) => {
                          const newThresholds = { ...prev };
                          delete newThresholds[selectedItem.item_id];
                          return newThresholds;
                        });
                        toast.success("Using global thresholds");
                      }}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Use Global
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Item will be marked based on its quantity compared to these
                  thresholds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
