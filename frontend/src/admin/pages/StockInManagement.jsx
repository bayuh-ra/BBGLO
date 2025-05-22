import { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { supabase } from "../../api/supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FiChevronUp, FiChevronDown, FiX, FiFilter } from "react-icons/fi";
import { ChevronUp, ChevronDown } from "lucide-react";

const StockInManagement = () => {
  const [stockInRecords, setStockInRecords] = useState([]);
  const [items, setItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const initialFormState = {
    item: "",
    quantity: "",
    uom: "",
    supplier: "",
    stocked_by: "",
    purchase_order: "",
    remarks: "",
  };
  const [selectedPO, setSelectedPO] = useState(null);
  const [staffName, setStaffName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uncheckedItemsList, setUncheckedItemsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [checkedItems, setCheckedItems] = useState([]);
  const itemsPerPage = 10;
  const [poCheckedItems, setPoCheckedItems] = useState({});
  const [form, setForm] = useState(initialFormState);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);

  useEffect(() => {
    fetchStockIns();
    fetchItems();
    fetchPOs();

    // Add realtime subscription for stock-in records
    const channel = supabase
      .channel("stockin-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stockinrecord",
        },
        (payload) => {
          console.log("Realtime Stock-In Update:", payload);
          // Refresh the stock-in records when any change occurs
          fetchStockIns();

          // If the change is a delete operation, also refresh purchase orders
          if (payload.eventType === "DELETE") {
            fetchPOs();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(items)) return;
    const selected = items.find((item) => item.item_id === form.item);
    if (selected && selected.quantity < 10) {
      toast("⚠️ Stock for this item is running low!", {
        position: "bottom-center",
        icon: "📦",
        style: {
          backgroundColor: "#fef3c7", // Tailwind yellow-100
          color: "#92400e", // Tailwind yellow-800
          border: "1px solid #fde68a",
          fontWeight: "500",
        },
      });
    }
  }, [form.item, items]);

  useEffect(() => {
    const fetchStaffName = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("❌ Failed to get logged in user:", userError);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("name, id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("❌ Failed to get staff profile:", profileError);
        return;
      }

      setStaffName(profile.name);
      setStaffId(profile.id);
      setForm((prev) => ({ ...prev, stocked_by: profile.id }));
    };

    fetchStaffName();
  }, []);

  const fetchStockIns = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/stockin/", {
        params: {
          expand: "supplier,supplier_name,stocked_by,stocked_by_name",
        },
      });
      console.log("📦 Stock-in records:", res.data); // Debug log
      setStockInRecords(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("❌ Failed to fetch stock-ins:", error);
      setStockInRecords([]);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/inventory/");
      console.log("📦 Inventory API response:", res.data); // 🔍 Log the response
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Failed to fetch inventory items:", err);
      setItems([]); // fallback to prevent breakage
    }
  };

  const fetchPOs = async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          "*, supplier:supplier_id(supplier_name), items:purchaseorder_item(*, item:item_id(item_name)), staff:ordered_by(name)"
        )
        .eq("status", "Completed")
        .order("date_ordered", { ascending: false });

      if (error) {
        console.error("❌ Failed to fetch purchase orders:", error);
        toast.error("Failed to fetch purchase orders");
        setPurchaseOrders([]);
        return;
      }

      console.log("📦 Purchase Orders from Supabase:", data);
      setPurchaseOrders(data || []);

      // Initialize checked items tracking for each PO
      const initialCheckedItems = {};
      data.forEach((po) => {
        initialCheckedItems[po.po_id] = [];
      });
      setPoCheckedItems(initialCheckedItems);
    } catch (err) {
      console.error("❌ Error in fetchPOs:", err);
      toast.error("Failed to fetch purchase orders");
      setPurchaseOrders([]);
    }
  };

  // Add function to check if all items in a PO are checked
  const areAllItemsChecked = (poId) => {
    const po = purchaseOrders.find((p) => p.po_id === poId);
    if (!po || !po.items) return false;
    return po.items.length === (poCheckedItems[poId]?.length || 0);
  };

  const handleSubmit = async () => {
    if (!selectedPO) return;
    const allItems = selectedPO.items || [];
    const checkedItemsList = allItems.filter((item) =>
      checkedItems.includes(item.item_id)
    );
    const uncheckedItemsList = allItems.filter(
      (item) => !checkedItems.includes(item.item_id)
    );

    if (checkedItemsList.length === 0) {
      toast.error("Please select at least one item to stock in.", {
        position: "top-right",
      });
      return;
    }

    if (uncheckedItemsList.length > 0) {
      setUncheckedItemsList(uncheckedItemsList);
      setShowConfirmModal(true);
      return;
    }

    // If all items are checked, proceed with stock-in
    await processStockIn(checkedItemsList, []);
  };

  const processStockIn = async (checkedItemsList, uncheckedItems) => {
    toast("Processing stock-in...", {
      icon: "🔄",
      position: "top-right",
      duration: 1500,
    });

    try {
      // Process checked items - add to stock-in records
      for (const item of checkedItemsList) {
        // Get current date in DDMMYYYY format
        const date = new Date();
        const dateStr = `${date.getDate().toString().padStart(2, "0")}${(
          date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}${date.getFullYear()}`;

        // Get staff initials
        const nameInitial = staffName.split(" ")[0][0].toUpperCase();
        const roleInitial = "A"; // Assuming admin role for now

        // Get the next sequence number from the backend
        try {
          const sequenceResponse = await axios.get(
            "http://localhost:8000/api/stockin/next-sequence/",
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            }
          );
          console.log("Sequence response:", sequenceResponse.data);
          const sequence = sequenceResponse.data.sequence
            .toString()
            .padStart(3, "0");

          const stockInData = {
            stockin_id: `SI-${sequence}${dateStr}${nameInitial}${roleInitial}`,
            item: item.item_id,
            quantity: parseInt(item.quantity),
            uom: item.uom,
            supplier: selectedPO.supplier_id,
            stocked_by: staffId,
            purchase_order: selectedPO.po_id,
            remarks: `Stocked from PO #${selectedPO.po_id}`,
          };

          console.log("Sending stock-in data:", stockInData);

          const response = await axios.post(
            "http://localhost:8000/api/stockin/",
            stockInData,
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            }
          );
          console.log("Stock-in response:", response.data);
        } catch (error) {
          console.error(
            "Error getting next sequence or creating stock-in:",
            error.response?.data
          );
          throw error;
        }
      }

      // Update the original PO items to mark unstocked items
      if (uncheckedItems && uncheckedItems.length > 0) {
        try {
          // Update the PO with all items at once
          const updatedItems = selectedPO.items.map((item) => {
            if (uncheckedItems.some((unchecked) => unchecked.id === item.id)) {
              return {
                ...item,
                status: "Unstocked",
              };
            }
            return {
              ...item,
              status: "Stocked",
            };
          });

          // Update the PO with the modified items
          await axios.patch(
            `http://localhost:8000/api/purchase-orders/${selectedPO.po_id}/`,
            {
              items: updatedItems,
              remarks: `${
                selectedPO.remarks || ""
              }\nNote: Some items were not stocked and will remain in the PO.`,
            },
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error("Error updating PO items:", error.response?.data);
          toast.error("Failed to update PO items status", {
            position: "top-right",
          });
          throw error;
        }
      } else {
        // If all items are checked, mark all as Stocked
        const updatedItems = selectedPO.items.map((item) => ({
          ...item,
          status: "Stocked",
        }));

        await axios.patch(
          `http://localhost:8000/api/purchase-orders/${selectedPO.po_id}/`,
          {
            items: updatedItems,
            status: "Stocked",
          },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );
      }

      setShowModal(false);
      setShowConfirmModal(false);
      setForm(initialFormState);
      setSelectedPO(null);
      setCheckedItems([]);
      setUncheckedItemsList([]);
      setPoCheckedItems((prev) => ({
        ...prev,
        [selectedPO.po_id]: [],
      }));

      toast.success("✅ Stock-in successfully processed!", {
        position: "top-right",
      });

      fetchStockIns();
      fetchPOs();
    } catch (error) {
      console.error("❌ Stock-in error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error headers:", error.response?.headers);

      let errorMessage = "Failed to process stock-in";
      if (error.response?.data) {
        if (typeof error.response.data === "object") {
          errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
        } else {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`❌ ${errorMessage}`, {
        position: "top-right",
        duration: 5000,
      });
    }
  };

  const handleConfirm = () => {
    // Get all items from the selected PO
    const allItems = selectedPO.items || [];

    // Filter only the checked items
    const checkedItemsList = allItems.filter((item) =>
      checkedItems.includes(item.item_id)
    );

    // Process the stock-in with the checked items and unchecked items
    processStockIn(checkedItemsList, uncheckedItemsList);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setUncheckedItemsList([]);
  };

  // Sorting and filtering logic
  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortBy !== key) return null;
    return sortOrder === "asc" ? (
      <span className="inline-block ml-1 align-middle">
        <ChevronUp size={14} />
      </span>
    ) : (
      <span className="inline-block ml-1 align-middle">
        <ChevronDown size={14} />
      </span>
    );
  };

  const FilterCard = () => (
    <div className="mb-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setShowFilterCard(!showFilterCard)}
      >
        <div className="flex items-center gap-2">
          <FiFilter className="text-pink-500" />
          <h3 className="font-semibold text-gray-700">Filters</h3>
        </div>
        {showFilterCard ? <FiChevronUp /> : <FiChevronDown />}
      </div>

      {showFilterCard && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Supplier
              </label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Suppliers</option>
                {[
                  ...new Set(
                    stockInRecords.map(
                      (record) =>
                        record.supplier?.supplier_name ||
                        record.supplier_name ||
                        record.supplier
                    )
                  ),
                ]
                  .filter(Boolean)
                  .map((supplier) => (
                    <option key={supplier} value={supplier}>
                      {supplier}
                    </option>
                  ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {[
                  ...new Set(
                    stockInRecords.map((record) => {
                      const itemObj =
                        record.item && typeof record.item === "object"
                          ? record.item
                          : items.find(
                              (i) =>
                                i.item_id ===
                                (record.item?.item_id || record.item)
                            );
                      return itemObj?.category || "";
                    })
                  ),
                ]
                  .filter(Boolean)
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filterSupplier ||
            filterCategory ||
            dateRange.start ||
            dateRange.end) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilterSupplier("");
                  setFilterCategory("");
                  setDateRange({ start: "", end: "" });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <FiX size={16} />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const sortedAndFilteredRecords = [...stockInRecords]
    .sort((a, b) => {
      if (!sortBy) return 0;
      let aValue, bValue;
      if (sortBy === "item") {
        aValue = a.item?.item_name || a.item_name || a.item || "";
        bValue = b.item?.item_name || b.item_name || b.item || "";
      } else if (sortBy === "supplier") {
        aValue =
          a.supplier?.supplier_name || a.supplier_name || a.supplier || "";
        bValue =
          b.supplier?.supplier_name || b.supplier_name || b.supplier || "";
      } else if (sortBy === "stocked_by") {
        aValue = a.stocked_by_name || a.stocked_by || "";
        bValue = b.stocked_by_name || b.stocked_by || "";
      } else if (sortBy === "date_stocked") {
        aValue = a.date_stocked || "";
        bValue = b.date_stocked || "";
      } else {
        aValue = (a[sortBy] || "").toString().toLowerCase();
        bValue = (b[sortBy] || "").toString().toLowerCase();
      }
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    })
    .filter((record) => {
      const itemObj =
        record.item && typeof record.item === "object"
          ? record.item
          : items.find(
              (i) => i.item_id === (record.item?.item_id || record.item)
            );
      const itemDisplay = [
        itemObj?.brand,
        itemObj?.item_name || record.item_name,
        itemObj?.size,
        itemObj?.uom || record.uom,
      ]
        .filter(Boolean)
        .join("-");
      const formattedDate = new Date(record.date_stocked).toLocaleString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }
      );

      // Date range filter
      const recordDate = new Date(record.date_stocked);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;

      const matchesDateRange =
        (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);

      // Supplier filter
      const matchesSupplier = filterSupplier
        ? (record.supplier?.supplier_name ||
            record.supplier_name ||
            record.supplier) === filterSupplier
        : true;

      // Category filter
      const matchesCategory = filterCategory
        ? (itemObj?.category || "") === filterCategory
        : true;

      const matchesSearch = [
        ...Object.values(record),
        itemDisplay,
        itemObj?.category || "",
        formattedDate,
      ].some((field) =>
        String(field).toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        matchesSearch && matchesDateRange && matchesSupplier && matchesCategory
      );
    });

  const paginatedRecords = sortedAndFilteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportCSV = () => {
    const csvRows = [
      ["Stock-In ID", "Item", "Qty", "UOM", "Supplier", "Date"],
      ...stockInRecords.map((r) => [
        r.stockin_id,
        r.item_name || r.item?.item_name || r.item,
        r.quantity,
        r.uom,
        r.supplier_name || r.supplier?.supplier_name || r.supplier,
        new Date(r.date_stocked).toLocaleString(),
      ]),
    ];
    const csv = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "stockins.csv");
  };

  // Selection logic for checkboxes
  const isAllSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((rec) => selectedRecordIds.includes(rec.stockin_id));
  const isIndeterminate = selectedRecordIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecordIds(
        selectedRecordIds.filter(
          (id) => !paginatedRecords.some((rec) => rec.stockin_id === id)
        )
      );
    } else {
      setSelectedRecordIds([
        ...selectedRecordIds,
        ...paginatedRecords
          .filter((rec) => !selectedRecordIds.includes(rec.stockin_id))
          .map((rec) => rec.stockin_id),
      ]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => setSelectedRecordIds([]);

  // Custom delete confirm toast (styled exactly like SupplierManagement)
  const showDeleteConfirmToast = (count, onConfirm) => {
    toast.custom(
      (t) => (
        <div className="flex flex-col items-center p-2 text-center">
          <div
            className="bg-red-50 border border-red-100 rounded-lg p-4"
            style={{ width: "300px", margin: "0 auto" }}
          >
            <div className="font-semibold text-gray-800 mb-2">
              Are you sure you want to delete {count} selected stock-in record
              {count > 1 ? "s" : ""}?
            </div>
            <div className="flex justify-center gap-2 mt-2">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onConfirm();
                  toast.dismiss(t.id);
                }}
                className="px-4 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ),
      {
        position: "top-center",
        duration: Infinity,
      }
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRecordIds.length === 0) return;
    showDeleteConfirmToast(selectedRecordIds.length, async () => {
      try {
        for (const id of selectedRecordIds) {
          await axios.delete(`http://localhost:8000/api/stockin/${id}/`);
        }
        toast.success("Selected records deleted.", { position: "top-right" });
        setSelectedRecordIds([]);
        fetchStockIns();
      } catch (err) {
        console.error("Failed to delete records:", err);
        toast.error("Failed to delete selected records.", {
          position: "top-right",
        });
      }
    });
  };

  // Add click outside handler
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
      setShowConfirmModal(false);
      setShowDetailsModal(false);
      setForm(initialFormState);
      setSelectedPO(null);
      setSelectedRecord(null);
    }
  };

  // Update the realtime subscription for selected record
  useEffect(() => {
    if (selectedRecord?.stockin_id) {
      console.log(
        "Setting up realtime subscription for:",
        selectedRecord.stockin_id
      );

      // Subscribe to changes for this specific record
      const channel = supabase
        .channel(`stockin-details-${selectedRecord.stockin_id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "stockinrecord",
            filter: `stockin_id=eq.${selectedRecord.stockin_id}`,
          },
          async (payload) => {
            console.log("Realtime update received:", payload);

            if (payload.eventType === "UPDATE") {
              // Fetch the full updated record to ensure we have all related data
              try {
                const response = await axios.get(
                  `http://localhost:8000/api/stockin/${payload.new.stockin_id}/`,
                  {
                    params: {
                      expand:
                        "supplier,supplier_name,stocked_by,stocked_by_name",
                    },
                  }
                );
                console.log("Updated record fetched:", response.data);
                setSelectedRecord(response.data);
              } catch (error) {
                console.error("Error fetching updated record:", error);
                // Fallback to using the payload data if fetch fails
                setSelectedRecord(payload.new);
              }
            } else if (payload.eventType === "DELETE") {
              setShowDetailsModal(false);
              setSelectedRecord(null);
              toast.error("This stock-in record has been deleted.", {
                position: "top-right",
                duration: 3000,
              });
            }
          }
        )
        .subscribe((status) => {
          console.log("Subscription status:", status);
        });

      // Cleanup subscription when modal closes or record changes
      return () => {
        console.log("Cleaning up subscription for:", selectedRecord.stockin_id);
        supabase.removeChannel(channel);
      };
    }
  }, [selectedRecord?.stockin_id]); // Only re-run when the stockin_id changes

  // Update the handleViewDetails function
  const handleViewDetails = async (record) => {
    try {
      // Fetch the full record data when opening the modal
      const response = await axios.get(
        `http://localhost:8000/api/stockin/${record.stockin_id}/`,
        {
          params: {
            expand: "supplier,supplier_name,stocked_by,stocked_by_name",
          },
        }
      );
      console.log("Opening details for record:", response.data);
      setSelectedRecord(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Error fetching record details:", error);
      toast.error("Failed to load record details", {
        position: "top-right",
      });
    }
  };

  // Update the DetailsModal component
  const DetailsModal = () => {
    if (!selectedRecord) return null;

    const itemObj =
      selectedRecord.item && typeof selectedRecord.item === "object"
        ? selectedRecord.item
        : items.find(
            (i) =>
              i.item_id ===
              (selectedRecord.item?.item_id || selectedRecord.item)
          );

    const supplierName =
      selectedRecord.supplier_name ||
      selectedRecord.supplier?.supplier_name ||
      "—";

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-2 sm:px-0 overflow-x-hidden"
        onClick={handleClickOutside}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[600px] max-h-[95vh] overflow-y-auto overflow-x-hidden border-2 border-pink-200 relative">
          {/* Realtime indicator */}
          <div className="absolute top-4 right-12 flex items-center gap-2 text-sm text-green-600 bg-white bg-opacity-90 px-2 py-1 rounded-full">
            <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
            Live Updates Live
          </div>

          {/* X Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailsModal(false);
              setSelectedRecord(null);
            }}
            className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-pink-100 text-pink-500 hover:text-pink-700 rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-pink-400 z-10"
            aria-label="Close"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>

          {/* Rest of the modal content */}
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 rounded-t-2xl px-6 py-5 flex items-center gap-4">
            <span className="text-3xl">📦</span>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Stock-In Details
            </h3>
          </div>

          <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-pink-50 to-rose-50 overflow-x-hidden">
            <div className="text-fuchsia-700 text-xl font-bold mb-4 leading-tight break-words text-center">
              {selectedRecord.stockin_id || selectedRecord.id}
            </div>
            <div className="flex flex-col gap-2 justify-center">
              {[
                [
                  "Item ID",
                  itemObj?.item_id ||
                    selectedRecord.item_id ||
                    selectedRecord.item,
                ],
                [
                  "Item Name",
                  itemObj?.item_name || selectedRecord.item_name || "—",
                ],
                ["Brand", itemObj?.brand || "—"],
                ["Size", itemObj?.size || "—"],
                ["Category", itemObj?.category || "—"],
                ["Quantity", selectedRecord.quantity],
                ["UoM", selectedRecord.uom || itemObj?.uom || "—"],
                ["Supplier", supplierName],
                [
                  "Stocked By",
                  selectedRecord.stocked_by_name ||
                    selectedRecord.stocked_by ||
                    "—",
                ],
                ["Purchase Order", selectedRecord.purchase_order || "—"],
                [
                  "Date Stocked",
                  selectedRecord.date_stocked
                    ? new Date(selectedRecord.date_stocked).toLocaleString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        }
                      )
                    : "—",
                ],
                ["Remarks", selectedRecord.remarks || "—"],
              ].map(([label, value], idx) => (
                <div key={idx} className="flex items-center gap-1 min-w-0">
                  <span className="font-semibold text-pink-600 whitespace-nowrap">
                    {label}:
                  </span>
                  <span className="truncate text-gray-800 ml-1">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Stock-In Records</h2>
      </div>

      {/* Search and Action Buttons Section */}
      {/* Combined search input and buttons into one flex container */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search Input - Keep fixed width as requested */}
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Action Buttons - Grouped beside search */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setForm({ ...initialFormState, stocked_by: staffName });
              setShowModal(true);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Add Stock-In
          </button>
          <button
            onClick={handleBulkDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors font-medium"
            disabled={selectedRecordIds.length === 0}
          >
            {selectedRecordIds.length > 0
              ? `Delete (${selectedRecordIds.length})`
              : "Delete"}
          </button>
          <button
            onClick={exportCSV}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard />

      <table className="table-auto w-full border-collapse border border-gray-300 text-sm">
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
                className="accent-pink-500 w-4 h-4 align-middle"
              />
            </th>
            {[
              { key: "stockin_id", label: "Stock-In ID", align: "text-left" },
              { key: "item", label: "Item", align: "text-left" },
              { key: "quantity", label: "Quantity", align: "text-left" },
              { key: "uom", label: "UoM", align: "text-left" },
              { key: "supplier", label: "Supplier", align: "text-left" },
              { key: "stocked_by", label: "Stocked By", align: "text-left" },
              {
                key: "purchase_order",
                label: "Purchase Order",
                align: "text-left",
              },
              { key: "remarks", label: "Remarks", align: "text-left" },
              {
                key: "date_stocked",
                label: "Date Stocked",
                align: "text-left",
              },
            ].map(({ key, label, align }) => (
              <th
                key={key}
                className={`border border-gray-300 px-4 py-2 cursor-pointer select-none ${align}`}
                onClick={() => handleSort(key)}
              >
                {label}
                {getSortIcon(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedRecords.map((record) => {
            const itemObj =
              record.item && typeof record.item === "object"
                ? record.item
                : items.find(
                    (i) => i.item_id === (record.item?.item_id || record.item)
                  );
            const supplierName =
              record.supplier_name || record.supplier?.supplier_name || "—";
            const isChecked = selectedRecordIds.includes(record.stockin_id);
            return (
              <tr
                key={record.stockin_id || record.id}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(record);
                }}
                className={`cursor-pointer ${
                  isChecked ? "bg-pink-100" : "hover:bg-pink-100"
                }`}
              >
                {/* Checkbox cell */}
                <td className="border border-gray-300 px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleSelectOne(record.stockin_id)}
                    aria-label={`Select record ${record.stockin_id}`}
                    className="accent-pink-500 w-4 h-4 align-middle"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {record.stockin_id}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {[
                    itemObj?.brand,
                    itemObj?.item_name || record.item_name,
                    itemObj?.size,
                    itemObj?.uom || record.uom,
                  ]
                    .filter(Boolean)
                    .join("-")}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {record.quantity}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {record.uom}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {supplierName}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {record.stocked_by_name || record.stocked_by}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {record.purchase_order}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {record.remarks}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {new Date(record.date_stocked).toLocaleString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(
            currentPage * itemsPerPage,
            sortedAndFilteredRecords.length
          )}{" "}
          of {sortedAndFilteredRecords.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded border ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of{" "}
            {Math.ceil(sortedAndFilteredRecords.length / itemsPerPage)}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) =>
                p < Math.ceil(sortedAndFilteredRecords.length / itemsPerPage)
                  ? p + 1
                  : p
              )
            }
            className={`px-3 py-1 rounded border ${
              currentPage ===
              Math.ceil(sortedAndFilteredRecords.length / itemsPerPage)
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            disabled={
              currentPage ===
              Math.ceil(sortedAndFilteredRecords.length / itemsPerPage)
            }
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center"
          onClick={handleClickOutside}
        >
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-xl relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(false);
                setForm(initialFormState);
                setSelectedPO(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold mb-2">Add Stock-In</h2>
              <p className="text-sm text-gray-500">
                Stocked by: <span className="font-medium">{staffName}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select
                name="purchase_order"
                value={form.purchase_order}
                onChange={(e) => {
                  const poId = e.target.value;
                  setForm({ ...form, purchase_order: poId });

                  const po = purchaseOrders.find((p) => p.po_id === poId);
                  if (po) {
                    setSelectedPO(po);
                    setCheckedItems(poCheckedItems[poId] || []);
                  } else {
                    setSelectedPO(null);
                    setCheckedItems([]);
                  }
                }}
                className="border p-2 col-span-2"
              >
                <option value="">Select Purchase Order</option>
                {purchaseOrders
                  .filter((po) => !areAllItemsChecked(po.po_id))
                  .map((po) => (
                    <option key={po.po_id} value={po.po_id}>
                      PO #{po.po_id} - {po.supplier?.supplier_name}
                    </option>
                  ))}
              </select>

              {selectedPO && (
                <>
                  <div className="mt-4 border p-3 rounded bg-gray-50 space-y-1 text-sm col-span-2">
                    <p>
                      <strong>Purchase Order ID:</strong> {selectedPO.po_id}
                    </p>
                    <p>
                      <strong>Supplier:</strong>{" "}
                      {selectedPO.supplier?.supplier_name}
                    </p>
                    <p>
                      <strong>Ordered by:</strong> {selectedPO.staff?.name}
                    </p>
                    <p>
                      <strong>Date Ordered:</strong>{" "}
                      {selectedPO.date_ordered
                        ? new Date(selectedPO.date_ordered).toLocaleDateString()
                        : "Not specified"}
                    </p>
                    <p>
                      <strong>Expected Delivery:</strong>{" "}
                      {selectedPO.expected_delivery
                        ? new Date(
                            selectedPO.expected_delivery
                          ).toLocaleDateString()
                        : "Not specified"}
                    </p>
                    <p>
                      <strong>Date Delivered:</strong>{" "}
                      {selectedPO.date_delivered
                        ? new Date(
                            selectedPO.date_delivered
                          ).toLocaleDateString()
                        : "Not specified"}
                    </p>
                    <p>
                      <strong>Remarks:</strong> {selectedPO.remarks || "None"}
                    </p>
                  </div>

                  <div className="col-span-2 mt-4">
                    <p className="font-medium mb-2">
                      Select items to stock in:
                    </p>
                    <div className="overflow-x-auto border rounded bg-white max-h-60 overflow-y-auto">
                      <table className="min-w-full table-auto text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr className="text-left">
                            <th className="p-2 border">✔</th>
                            <th className="p-2 border">Item ID</th>
                            <th className="p-2 border">Item Name</th>
                            <th className="p-2 border">UOM</th>
                            <th className="p-2 border">Quantity</th>
                            <th className="p-2 border">Unit Price</th>
                            <th className="p-2 border">Total Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPO.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-pink-100">
                              <td className="p-2 border text-center">
                                <input
                                  type="checkbox"
                                  id={`item-${idx}`}
                                  checked={checkedItems.includes(item.item_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCheckedItems((prev) => [
                                        ...prev,
                                        item.item_id,
                                      ]);
                                      setPoCheckedItems((prev) => ({
                                        ...prev,
                                        [selectedPO.po_id]: [
                                          ...(prev[selectedPO.po_id] || []),
                                          item.item_id,
                                        ],
                                      }));
                                    } else {
                                      setCheckedItems((prev) =>
                                        prev.filter((id) => id !== item.item_id)
                                      );
                                      setPoCheckedItems((prev) => ({
                                        ...prev,
                                        [selectedPO.po_id]: (
                                          prev[selectedPO.po_id] || []
                                        ).filter((id) => id !== item.item_id),
                                      }));
                                    }
                                  }}
                                />
                              </td>
                              <td className="p-2 border">{item.item_id}</td>
                              <td className="p-2 border">
                                {[
                                  item.item?.brand,
                                  item.item?.item_name || item.item_name,
                                  item.item?.size,
                                  item.item?.uom || item.uom,
                                ]
                                  .filter(Boolean)
                                  .join("-")}
                              </td>
                              <td className="p-2 border">{item.uom}</td>
                              <td className="p-2 border">{item.quantity}</td>
                              <td className="p-2 border">
                                ₱
                                {Number(item.unit_price || 0).toLocaleString(
                                  "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </td>
                              <td className="p-2 border">
                                ₱
                                {Number(item.total_price || 0).toLocaleString(
                                  "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 font-semibold text-right">
                      Total Cost: ₱
                      {Number(selectedPO.total_cost || 0).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(false);
                  setForm(initialFormState);
                  setSelectedPO(null);
                }}
                className="mr-2 px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmit();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={!selectedPO || checkedItems.length === 0}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center"
          onClick={handleClickOutside}
        >
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-xl relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold mb-2">Confirm Stock-In</h2>
              <p className="text-sm text-gray-500">
                You have {uncheckedItemsList.length} unchecked items that will
                not be stocked in.
              </p>
            </div>
            <div className="mb-4">
              <p className="font-medium mb-2">Unchecked Items:</p>
              <div className="overflow-x-auto border rounded bg-white max-h-60 overflow-y-auto">
                <table className="min-w-full table-auto text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2 border">Item ID</th>
                      <th className="p-2 border">Item Name</th>
                      <th className="p-2 border">UOM</th>
                      <th className="p-2 border">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uncheckedItemsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-pink-100">
                        <td className="p-2 border">{item.item_id}</td>
                        <td className="p-2 border">
                          {[
                            item.item?.brand,
                            item.item?.item_name || item.item_name,
                            item.item?.size,
                            item.item?.uom || item.uom,
                          ]
                            .filter(Boolean)
                            .join("-")}
                        </td>
                        <td className="p-2 border">{item.uom}</td>
                        <td className="p-2 border">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="mr-2 px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirm();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Stock-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && <DetailsModal />}
    </div>
  );
};

export default StockInManagement;
