import { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { supabase } from "../../api/supabaseClient";
import { toast } from "react-toastify";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { ChevronUp, ChevronDown } from "lucide-react";

const StockInManagement = () => {
  const [stockInRecords, setStockInRecords] = useState([]);
  const [items, setItems] = useState([]);
  // Removed unused suppliers state

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterItem, setFilterItem] = useState("");
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

  // Add new state for tracking checked items per PO
  const [poCheckedItems, setPoCheckedItems] = useState({});

  const [form, setForm] = useState(initialFormState);
  const [selectedStockInId, setSelectedStockInId] = useState(null);
  useEffect(() => {
    fetchStockIns();
    fetchItems();
    // Removed fetchSuppliers call as suppliers state is unused
    fetchPOs();

    const channel = supabase
      .channel("realtime:stockin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stockinrecord" },
        (payload) => {
          console.log("Realtime Stock-In:", payload);
          fetchStockIns();
        }
      )
      .subscribe();

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

  // Removed fetchSuppliers function as suppliers state is unused

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
    if (!selectedPO) {
      toast.error("Please select a purchase order.", {
        position: "top-right",
      });
      return;
    }

    // Get all items from the selected PO
    const allItems = selectedPO.items || [];

    // Separate checked and unchecked items
    const checkedItemsList = allItems.filter((item) =>
      checkedItems.includes(item.item_id)
    );
    const uncheckedItems = allItems.filter(
      (item) => !checkedItems.includes(item.item_id)
    );

    if (checkedItemsList.length === 0) {
      toast.error("Please select at least one item to stock in.", {
        position: "top-right",
      });
      return;
    }

    // If there are unchecked items, show confirmation modal
    if (uncheckedItems.length > 0) {
      setUncheckedItemsList(uncheckedItems);
      setShowConfirmModal(true);
      return;
    }

    // If no unchecked items, proceed with stock-in
    await processStockIn(checkedItemsList, uncheckedItems);
  };

  const processStockIn = async (checkedItemsList, uncheckedItems) => {
    toast.info("Processing stock-in...", {
      icon: "🔄",
      position: "top-right",
      autoClose: 1500,
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
            "http://localhost:8000/api/stockin/next-sequence/"
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
            stockInData
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
        autoClose: 5000,
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

  const sortedAndFilteredRecords = [...stockInRecords]
    .sort((a, b) => {
      if (!sortBy) return 0;
      let aValue, bValue;
      if (sortBy === "item") {
        aValue = a.item?.item_name || a.item_name || a.item || "";
        bValue = b.item?.item_name || b.item_name || b.item || "";
      } else if (sortBy === "supplier") {
        aValue = a.supplier?.supplier_name || a.supplier_name || a.supplier || "";
        bValue = b.supplier?.supplier_name || b.supplier_name || b.supplier || "";
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
          : items.find((i) => i.item_id === (record.item?.item_id || record.item));
      const itemDisplay = [
        itemObj?.brand,
        itemObj?.item_name || record.item_name,
        itemObj?.size,
        itemObj?.uom || record.uom
      ]
        .filter(Boolean)
        .join("-");
      const formattedDate = new Date(record.date_stocked).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
      const matchesSearch = [
        ...Object.values(record),
        itemDisplay,
        itemObj?.category || "",
        formattedDate
      ].some((field) =>
        String(field).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesSupplier = filterSupplier
        ? (record.supplier?.supplier_name || record.supplier_name || record.supplier) === filterSupplier
        : true;
      const matchesItem = filterItem
        ? (itemObj?.category || "") === filterItem
        : true;
      return matchesSearch && matchesSupplier && matchesItem;
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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Stock-In Records</h2>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-wrap items-center gap-3 mb-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search..."
            className="border border-gray-300 rounded px-4 py-2 w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="">All Suppliers</option>
            {[...new Set(stockInRecords.map((record) => {
              const itemObj =
                record.item && typeof record.item === "object"
                  ? record.item
                  : items.find((i) => i.item_id === (record.item?.item_id || record.item));
              return record.supplier?.supplier_name || record.supplier_name || record.supplier || "";
            }))]
              .filter((supplier) => supplier)
              .map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
          </select>
          <select
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="">All Categories</option>
            {[...new Set(stockInRecords.map((record) => {
              const itemObj =
                record.item && typeof record.item === "object"
                  ? record.item
                  : items.find((i) => i.item_id === (record.item?.item_id || record.item));
              return itemObj?.category || "";
            }))]
              .filter((cat) => cat)
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
        </div>
        <div className="flex gap-2 mt-3 md:mt-0">
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
            onClick={exportCSV}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <table className="table-auto w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-pink-200">
          <tr>
            {/*
              Using header mapping array for dynamic rendering of table headers
              and sorting functionality
            */}
            {/*
              key: the key to sort by
              label: the display label for the column
              align: text alignment for the column
            */}
            { [
                { key: "stockin_id", label: "Stock-In ID", align: "text-left" },
                { key: "item", label: "Item", align: "text-left" },
                { key: "quantity", label: "Quantity", align: "text-left" },
                { key: "uom", label: "UoM", align: "text-left" },
                { key: "supplier", label: "Supplier", align: "text-left" },
                { key: "stocked_by", label: "Stocked By", align: "text-left" },
                { key: "purchase_order", label: "Purchase Order", align: "text-left" },
                { key: "remarks", label: "Remarks", align: "text-left" },
                { key: "date_stocked", label: "Date Stocked", align: "text-left" },
              ].map(({ key, label, align }) => (
                <th
                  key={key}
                  className={`border border-gray-300 px-4 py-2 cursor-pointer select-none ${align}`}
                  onClick={() => handleSort(key)}
                >
                  {label}
                  {getSortIcon(key)}
                </th>
              )) }
          </tr>
        </thead>
        <tbody>
          {paginatedRecords.map((record) => {
            const itemObj =
              record.item && typeof record.item === "object"
                ? record.item
                : items.find((i) => i.item_id === (record.item?.item_id || record.item));
            const isSelected = selectedStockInId === record.stockin_id;
            return (
              <tr
                key={record.stockin_id}
                className={`cursor-pointer ${isSelected ? "bg-pink-100" : "hover:bg-pink-100"}`}
                onClick={() => setSelectedStockInId(record.stockin_id)}
              >
                <td className="border border-gray-300 px-4 py-2">{record.stockin_id}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {[
                    itemObj?.brand,
                    itemObj?.item_name || record.item_name,
                    itemObj?.size,
                    itemObj?.uom || record.uom
                  ].filter(Boolean).join("-")}
                </td>
                <td className="border border-gray-300 px-4 py-2">{record.quantity}</td>
                <td className="border border-gray-300 px-4 py-2">{record.uom}</td>
                <td className="border border-gray-300 px-4 py-2">{record.supplier_name || record.supplier}</td>
                <td className="border border-gray-300 px-4 py-2">{record.stocked_by_name || record.stocked_by}</td>
                <td className="border border-gray-300 px-4 py-2">{record.purchase_order}</td>
                <td className="border border-gray-300 px-4 py-2">{record.remarks}</td>
                <td className="border border-gray-300 px-4 py-2">{new Date(record.date_stocked).toLocaleString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
                })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedAndFilteredRecords.length)} of {sortedAndFilteredRecords.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded border ${currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {Math.ceil(sortedAndFilteredRecords.length / itemsPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < Math.ceil(sortedAndFilteredRecords.length / itemsPerPage) ? p + 1 : p))}
            className={`px-3 py-1 rounded border ${currentPage === Math.ceil(sortedAndFilteredRecords.length / itemsPerPage) ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
            disabled={currentPage === Math.ceil(sortedAndFilteredRecords.length / itemsPerPage)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-xl relative">
            <button
              onClick={() => {
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
                Stocked by:{" "}
                <span className="font-medium">{staffName}</span>
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
                                  item.item?.uom || item.uom
                                ].filter(Boolean).join("-")}
                              </td>
                              <td className="p-2 border">{item.uom}</td>
                              <td className="p-2 border">{item.quantity}</td>
                              <td className="p-2 border">
                                ₱{Number(item.unit_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 border">
                                ₱{Number(item.total_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 font-semibold text-right">
                      Total Cost: ₱{Number(selectedPO.total_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(initialFormState);
                  setSelectedPO(null);
                }}
                className="mr-2 px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-xl relative">
            <button
              onClick={handleCancel}
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
                            item.item?.uom || item.uom
                          ].filter(Boolean).join("-")}
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
                onClick={handleCancel}
                className="mr-2 px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Stock-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInManagement;
