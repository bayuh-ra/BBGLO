import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import {
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} from "../../api/purchaseOrder";
import { FiPlus, FiX } from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";

export default function PurchaseOrder() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [newOrder, setNewOrder] = useState({
    supplier_id: "",
    expected_delivery: "",
    status: "Pending",
    remarks: "",
    items: [
      {
        item_id: "",
        quantity: 1,
        uom: "",
        unit_cost: 0,
        total_cost: 0,
        item_name: "",
      },
    ],
    ordered_by: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const uomOptions = ["pcs", "unit", "kg", "liter", "meter", "box", "pack"]; // Add your common UOMs
  const [stockInRecords, setStockInRecords] = useState([]);

  const handleApprovePO = async (po) => {
    try {
      // 1. Approve PO status
      const { error: poError } = await supabase
        .from("purchase_orders")
        .update({ status: "Approved" })
        .eq("po_id", po.po_id);

      if (poError) {
        console.error("❌ Failed to approve PO:", poError.message);
        return toast.error("Failed to approve PO.");
      }

      // 2. Check if expense already exists
      const { data: existingExpense, error: checkError } = await supabase
        .from("expenses")
        .select("*")
        .eq("linked_id", po.po_id)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        console.error(
          "❌ Error checking existing expense:",
          checkError.message
        );
        return toast.error("Error checking expense.");
      }

      if (existingExpense) {
        console.warn("🚫 Expense already exists for this PO:", existingExpense);
        toast.success("PO approved. Expense already exists.");
        return;
      }

      // 3. Generate a unique expense_id
      let counter = 1;
      let uniqueExpenseId;

      while (true) {
        const newId = `EXP-${String(counter).padStart(4, "0")}`;
        const { error } = await supabase
          .from("expenses")
          .select("expense_id")
          .eq("expense_id", newId)
          .single();

        if (error?.code === "PGRST116") {
          // No row found, safe to use
          uniqueExpenseId = newId;
          break;
        }

        if (error && error.code !== "PGRST116") {
          console.error("❌ Error checking ID:", error.message);
          toast.error("Error checking existing expense ID.");
          return;
        }

        counter++;
      }

      // 4. Final re-check before insert
      const { data: existsBeforeInsert } = await supabase
        .from("expenses")
        .select("expense_id")
        .eq("linked_id", po.po_id)
        .maybeSingle();

      if (existsBeforeInsert) {
        console.warn("⚠️ Expense already inserted between checks");
        return toast.success("PO approved. Expense already exists.");
      }

      // 5. Insert new expense
      const { error: insertError } = await supabase.from("expenses").insert([
        {
          expense_id: uniqueExpenseId,
          category: "Purchase Order",
          amount: po.total_cost,
          date: new Date().toISOString().split("T")[0],
          paid_to: po.supplier_id,
          description: `Auto expense for ${po.po_id}`,
          linked_id: po.po_id,
          created_by: po.ordered_by,
        },
      ]);

      if (insertError) {
        console.error("❌ Expense insert error:", insertError.message);
        return toast.error("Failed to create expense.");
      }

      toast.success("✅ PO approved and expense created.");
    } catch (err) {
      console.error("Unhandled Error in handleApprovePO:", err);
      toast.error("Unexpected error occurred.");
    }
  };

  const handleOrderDoubleClick = async (order) => {
    try {
      const { data: detailedOrder, error } = await supabase
        .from("purchase_orders")
        .select(
          `*,supplier:supplier_id(supplier_id, supplier_name, contact_no, email,address), items:purchaseorder_item(*,item:item_id(item_name)), staff_profiles:ordered_by(name)`
        )
        .eq("po_id", order.po_id)
        .single();

      if (error) throw error;
      setSelectedOrder(detailedOrder);
    } catch (error) {
      toast.error(`Error fetching order details: ${error.message}`);
    }
  };

  const [staffName, setStaffName] = useState("");
  const confirmAction = (message) =>
    new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex flex-col">
            <span>{message}</span>
            <div className="mt-2 flex justify-end space-x-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
              >
                No
              </button>
            </div>
          </div>
        ),
        { duration: 9999, position: "top-center" }
      );
    });

  const fetchStockInRecords = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/stockin/", {
        params: {
          expand: "item,item_name,purchase_order",
        },
      });
      console.log("Fetched Stock-in Records:", res.data);
      // Ensure we're working with an array
      const records = Array.isArray(res.data) ? res.data : [];
      console.log("Processed Stock-in Records:", records);
      setStockInRecords(records);
    } catch (error) {
      console.error("Failed to fetch stock-in records:", error);
      setStockInRecords([]);
    }
  };

  useEffect(() => {
    // Fetch all needed data on mount
    fetchOrders();
    fetchSuppliers();
    fetchItems();
    fetchStockInRecords(); // Initial fetch

    // Get logged-in user's session and role
    const getUserInfo = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.error("❌ Failed to get session:", sessionError);
          return;
        }

        console.log("✅ Current session UID:", session.user.id); // ← ADD THIS

        const user = session.user;

        setNewOrder((prevOrder) => ({
          ...prevOrder,
          ordered_by: user.id,
        }));

        const { data: profile, error: profileError } = await supabase
          .from("staff_profiles")
          .select("name, role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.error("❌ Failed to fetch staff profile:", profileError);
          return;
        }

        setStaffName(profile.name);
        setUserRole(profile.role);
      } catch (err) {
        console.error("❌ Error in getUserInfo:", err);
      }
    };

    getUserInfo();

    // Enable Supabase Realtime subscription for purchase orders
    const poChannel = supabase
      .channel("purchase_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        fetchOrders
      )
      .subscribe();

    // Enable Supabase Realtime subscription for stock-in records
    const stockinChannel = supabase
      .channel("stockin_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stockin_records" },
        (payload) => {
          console.log("📦 Stock-In Updated:", payload);
          fetchStockInRecords(); // Refresh the list on insert/update/delete
        }
      )
      .subscribe();

    // Clean up subscriptions on component unmount
    return () => {
      supabase.removeChannel(poChannel);
      supabase.removeChannel(stockinChannel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(
        `*,supplier:supplier_id(supplier_name),items:purchaseorder_item(*, item:item_id(item_name)),staff_profiles:ordered_by(name)`
      )
      .order("date_ordered", { ascending: false });
    if (error) {
      toast.error(`Error fetching orders: ${error.message}`);
    } else {
      console.log("Fetched Orders:", data); // Debug log
      setOrders(data);
    }
  };

  const handleStatusChange = async (poId, status) => {
    try {
      // If cancelling the PO, first delete any associated expense entries
      if (status === "Cancelled") {
        const { error: deleteError } = await supabase
          .from("expenses")
          .delete()
          .eq("linked_id", poId)
          .eq("category", "Purchase Order");

        if (deleteError) {
          console.error("Error deleting associated expenses:", deleteError);
          toast.error("Failed to clean up associated expenses.");
          return;
        }
      }

      await updatePurchaseOrderStatus(poId, status);
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("management_supplier")
      .select("supplier_id, supplier_name");
    if (error) {
      toast.error(`Error fetching suppliers: ${error.message}`);
    } else {
      setSuppliers(data || []);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("management_inventoryitem")
      .select("item_id, item_name, supplier_id, selling_price");
    if (error) {
      toast.error(`Error fetching items: ${error.message}`);
    } else {
      console.log("Fetched Items from Supabase:", data);
      setItemsList(data || []);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!newOrder.supplier_id) {
      errors.supplier_id = "Supplier is required.";
    }
    if (!newOrder.expected_delivery) {
      errors.expected_delivery = "Expected delivery date is required.";
    }
    if (!newOrder.ordered_by) {
      errors.ordered_by = "Ordered by is required.";
    }
    newOrder.items.forEach((item, idx) => {
      if (!item.item_id || !item.uom || !item.quantity) {
        errors.items = errors.items || [];
        errors.items[idx] = {};
        if (!item.item_id) errors.items[idx].item_id = "Item is required.";
        if (!item.uom) errors.items[idx].uom = "UOM is required.";
        if (!item.quantity)
          errors.items[idx].quantity = "Quantity is required.";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = () => {
    return (
      newOrder.supplier_id &&
      newOrder.expected_delivery &&
      newOrder.ordered_by &&
      newOrder.items.every(
        (item) => item.item_id && item.uom && item.quantity > 0
      )
    );
  };

  const handleAddOrder = async () => {
    if (!validateForm()) return;
    const {
      supplier_id,
      items,
      expected_delivery,
      ordered_by,
      ...restOfOrderData
    } = newOrder;

    const poDataToSend = {
      supplier: supplier_id,
      ...restOfOrderData,
      expected_delivery: expected_delivery || null,
      ordered_by: ordered_by || null,
      items: items.map((item) => ({
        item: item.item_id,
        quantity: item.quantity,
        uom: item.uom,
        unit_cost: parseFloat(item.unit_cost),
        total_cost: parseFloat(item.total_cost),
      })),
    };

    try {
      const newPo = await createPurchaseOrder(poDataToSend);
      toast.success(
        `Purchase order created successfully! PO ID: ${newPo.po_id}`
      );
      setShowModal(false);
      setNewOrder({
        supplier_id: "",
        expected_delivery: "",
        status: "Pending",
        remarks: "",
        items: [
          {
            item_id: "",
            quantity: 1,
            uom: "",
            unit_cost: 0,
            total_cost: 0,
            item_name: "",
          },
        ],
        ordered_by: "",
      });
      fetchOrders();
    } catch (error) {
      toast.error(`Error creating purchase order: ${error.message}`);
      console.error("Error creating purchase order:", error);
    }
  };

  const updateItemField = (idx, field, value) => {
    const updated = [...newOrder.items];
    updated[idx][field] =
      field === "quantity" || field === "unit_cost"
        ? parseFloat(value) || 0
        : value;

    if (field === "item_id" && value) {
      const selectedItem = itemsList.find((item) => item.item_id === value);
      if (selectedItem) {
        updated[idx].unit_cost = parseFloat(selectedItem.selling_cost) || 0;
        updated[idx].item_name = selectedItem.item_name;
      } else {
        updated[idx].unit_price = 0;
        updated[idx].item_name = "";
      }
    }

    updated[idx].total_price = updated[idx].quantity * updated[idx].unit_price;
    setNewOrder({ ...newOrder, items: updated });
  };

  const formatPrice = (price) => {
    return `₱${parseFloat(price || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTotalCost = () => {
    return newOrder.items.reduce(
      (acc, item) => acc + (parseFloat(item.total_price) || 0),
      0
    );
  };

  const paginatedOrders = orders
    .filter((o) => filterStatus === "All" || o.status === filterStatus)
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const generatePOReceipt = (po) => {
    const doc = new jsPDF();
    doc.text("Purchase Order Receipt", 14, 20);
    doc.text(`Purchase Order ID: ${po.po_id}`, 14, 30);
    doc.text(
      `Supplier: ${po.supplier?.supplier_name || po.supplier_id}`,
      14,
      40
    );
    doc.text(`Ordered by: ${po.ordered_by}`, 14, 50);

    autoTable(doc, {
      startY: 60,
      head: [["Item", "Qty", "UOM", "Unit Price", "Total"]],
      body: po.items.map((item) => [
        item.item?.item_name || item.item_id,
        item.quantity,
        item.uom,
        formatPrice(item.unit_price),
        formatPrice(item.total_price),
      ]),
    });

    doc.text(
      `Total Cost: ${formatPrice(po.total_cost)}`,
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.save(`PO-${po.po_id}.pdf`);
  };

  const isItemStocked = (poId, itemId) => {
    return stockInRecords.some((record) => {
      const recordItemId =
        typeof record.item === "object" ? record.item.item_id : record.item;
      const recordPOId =
        typeof record.purchase_order === "object"
          ? record.purchase_order.po_id
          : record.purchase_order;

      return recordPOId === poId && recordItemId === itemId;
    });
  };

  const getStockStatus = (poId, itemId, orderedQty) => {
    const filtered = stockInRecords.filter(
      (record) => record.purchase_order === poId && record.item === itemId
    );

    const totalStocked = filtered.reduce(
      (sum, rec) => sum + (parseFloat(rec.quantity) || 0),
      0
    );

    if (totalStocked === 0) return { status: "Unstocked", stocked: 0 };
    if (totalStocked < orderedQty)
      return { status: "Partially Stocked", stocked: totalStocked };

    return { status: "Stocked", stocked: totalStocked };
  };

  const handleRepurchaseUnstocked = async (order) => {
    try {
      // Get unstocked items
      const unstockedItems = order.items.filter(
        (item) =>
          getStockStatus(order.po_id, item.item_id, item.quantity).status !==
          "Stocked"
      );

      if (unstockedItems.length === 0) {
        toast.error("No unstocked items found");
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading("Creating repurchase order...");

      // Create new purchase order with unstocked items
      const newPoData = {
        supplier: order.supplier_id,
        expected_delivery: new Date().toISOString().split("T")[0], // Today's date
        status: "Pending",
        remarks: `Reorder due to unstocked items from PO ${order.po_id}`,
        items: unstockedItems.map((item) => ({
          item: item.item_id,
          quantity: item.quantity,
          uom: item.uom,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        ordered_by: order.ordered_by,
      };

      // Create new PO and update original PO status in parallel
      const [newPo] = await Promise.all([
        createPurchaseOrder(newPoData),
        updatePurchaseOrderStatus(order.po_id, "Stocked"),
      ]);

      // Update loading toast to success
      toast.dismiss(loadingToast);
      toast.success(
        `New purchase order created for unstocked items! PO ID: ${newPo.po_id}`,
        {
          duration: 4000,
          icon: "✅",
        }
      );

      setSelectedOrder(null); // Close the modal
      fetchOrders(); // Refresh the orders list
    } catch (error) {
      toast.error(`Error creating repurchase order: ${error.message}`, {
        duration: 4000,
        icon: "❌",
      });
    }
  };

  const hasStockInRecords = (poId) => {
    return stockInRecords.some((rec) => {
      const po =
        typeof rec.purchase_order === "object"
          ? rec.purchase_order.po_id
          : rec.purchase_order;
      return po === poId;
    });
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" reverseOrder={false} />{" "}
      {/* Toast container */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <FiPlus className="h-5 w-5 inline mr-2" /> New Purchase Order
        </button>
      </div>
      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border px-3 py-1 rounded"
        >
          {["All", "Pending", "Approved", "Completed", "Cancelled"].map(
            (status) => (
              <option key={status} value={status}>
                {status}
              </option>
            )
          )}
        </select>
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Purchase Order ID</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Date Ordered</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date Delivered</th>
              <th className="px-4 py-2 text-left">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.po_id}
                className="border-t cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => handleOrderDoubleClick(order)}
              >
                <td className="px-4 py-2">{order.po_id}</td>
                <td className="px-4 py-2">
                  {order.supplier?.supplier_name || order.supplier_id}
                </td>
                <td className="px-4 py-2">
                  {new Date(order.date_ordered).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2">{order.status}</td>
                <td className="px-4 py-2">
                  {(order.status === "Completed" ||
                    order.status === "Stocked") &&
                  order.date_delivered
                    ? new Date(order.date_delivered).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" }
                      )
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  ₱
                  {order.total_cost?.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          className="px-3 py-1 border rounded"
        >
          Previous
        </button>
        <span className="px-4">Page {currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
      {/* Modal for Adding Order */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-5xl relative">
            <button
              className="absolute top-2 right-2"
              onClick={() => setShowModal(false)}
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
            <h2 className="text-xl font-bold mb-4">New Purchase Order</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Supplier</label>
                <select
                  value={newOrder.supplier_id}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, supplier_id: e.target.value })
                  }
                  className={`border p-2 rounded w-full ${
                    validationErrors.supplier_id ? "border-red-500" : ""
                  }`}
                  required
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
                {validationErrors.supplier_id && (
                  <p className="text-red-500 text-sm">
                    {validationErrors.supplier_id}
                  </p>
                )}
              </div>
              <div>
                <label className="block mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={newOrder.expected_delivery}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      expected_delivery: e.target.value,
                    })
                  }
                  className={`border p-2 rounded w-full ${
                    validationErrors.expected_delivery ? "border-red-500" : ""
                  }`}
                  required
                />
                {validationErrors.expected_delivery && (
                  <p className="text-red-500 text-sm">
                    {validationErrors.expected_delivery}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block mb-1">Remarks</label>
                <textarea
                  value={newOrder.remarks}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, remarks: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="grid grid-cols-8 gap-2 mb-2 font-semibold">
                <label className="block text-sm col-span-3">Item</label>
                <label className="block text-sm">UOM</label>
                <label className="block text-sm">Qty</label>
                <label className="block text-sm">Unit Price</label>
                <label className="block text-sm">Total</label>
                <label className="block text-sm"></label>
              </div>
              {newOrder.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-8 gap-2 mb-2">
                  <div className="col-span-3">
                    <select
                      value={item.item_id}
                      onChange={(e) =>
                        updateItemField(idx, "item_id", e.target.value)
                      }
                      className={`border p-2 rounded w-full text-sm ${
                        validationErrors.items?.[idx]?.item_id
                          ? "border-red-500"
                          : ""
                      }`}
                      required
                    >
                      <option value="">Select Item</option>
                      {itemsList
                        .filter((i) => i.supplier_id === newOrder.supplier_id)
                        .filter(
                          (i) =>
                            !newOrder.items.some(
                              (selectedItem) =>
                                selectedItem.item_id === i.item_id &&
                                selectedItem.item_id !== item.item_id
                            )
                        )
                        .map((i) => (
                          <option key={i.item_id} value={i.item_id}>
                            {i.item_name}
                          </option>
                        ))}
                    </select>
                    {validationErrors.items?.[idx]?.item_id && (
                      <p className="text-red-500 text-sm">
                        {validationErrors.items[idx].item_id}
                      </p>
                    )}
                  </div>
                  <div>
                    <select
                      value={item.uom}
                      onChange={(e) =>
                        updateItemField(idx, "uom", e.target.value)
                      }
                      className={`border p-2 rounded w-full text-sm ${
                        validationErrors.items?.[idx]?.uom
                          ? "border-red-500"
                          : ""
                      }`}
                      required
                    >
                      <option value="">Select UOM</option>
                      {uomOptions.map((uom) => (
                        <option key={uom} value={uom}>
                          {uom}
                        </option>
                      ))}
                    </select>
                    {validationErrors.items?.[idx]?.uom && (
                      <p className="text-red-500 text-sm">
                        {validationErrors.items[idx].uom}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 || isNaN(value)) {
                          updateItemField(idx, "quantity", e.target.value);
                        }
                      }}
                      className={`border p-2 rounded w-full text-sm ${
                        validationErrors.items?.[idx]?.quantity
                          ? "border-red-500"
                          : ""
                      }`}
                      required
                    />
                    {validationErrors.items?.[idx]?.quantity && (
                      <p className="text-red-500 text-sm">
                        {validationErrors.items[idx].quantity}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">
                      ₱
                    </span>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItemField(idx, "unit_price", e.target.value)
                      }
                      className="border p-2 rounded w-full text-sm pl-7"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formatPrice(item.total_price)}
                      readOnly
                      className="border p-2 rounded w-full bg-gray-100 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    {newOrder.items.length > 1 && (
                      <button
                        onClick={() => {
                          const updatedItems = [...newOrder.items];
                          updatedItems.splice(idx, 1);
                          setNewOrder({ ...newOrder, items: updatedItems });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {validationErrors.items &&
                typeof validationErrors.items === "string" && (
                  <p className="text-red-500 text-sm">
                    {validationErrors.items}
                  </p>
                )}
              <button
                onClick={() =>
                  setNewOrder({
                    ...newOrder,
                    items: [
                      ...newOrder.items,
                      {
                        item_id: "",
                        quantity: 1,
                        uom: "",
                        unit_price: 0,
                        total_price: 0,
                      },
                    ],
                  })
                }
                className="text-blue-500 text-sm mt-2"
              >
                + Add Item
              </button>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Ordered by: <span className="font-medium">{staffName}</span>
              </p>
              <p className="font-bold">
                Total Cost: {formatPrice(getTotalCost())}
              </p>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                className="border border-gray-300 px-4 py-2 rounded"
                onClick={() =>
                  setNewOrder({
                    supplier_id: "",
                    expected_delivery: "",
                    status: "Pending",
                    remarks: "",
                    items: [
                      {
                        item_id: "",
                        quantity: 1,
                        uom: "",
                        unit_price: 0,
                        total_price: 0,
                      },
                    ],
                  })
                }
              >
                Clear
              </button>
              <button
                className={`px-4 py-2 rounded ${
                  isFormValid()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
                disabled={!isFormValid()}
                onClick={handleAddOrder}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-4xl relative">
            <button
              className="absolute top-2 right-2"
              onClick={() => setSelectedOrder(null)}
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
            <h2 className="text-xl font-bold mb-4">Order Details</h2>

            {/* Supplier Details Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">
                Supplier Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Supplier ID</p>
                  <p className="font-medium">
                    {selectedOrder.supplier?.supplier_id ||
                      selectedOrder.supplier_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supplier Name</p>
                  <p className="font-medium">
                    {selectedOrder.supplier?.supplier_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact Number</p>
                  <p className="font-medium">
                    {selectedOrder.supplier?.contact_no || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">
                    {selectedOrder.supplier?.email || "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">
                    {selectedOrder.supplier?.address || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <strong>Purchase Order ID:</strong> {selectedOrder.po_id}
              </div>
              <div>
                <strong>Date Ordered:</strong>{" "}
                {new Date(selectedOrder.date_ordered).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" }
                )}
              </div>
              <div>
                <strong>Expected Delivery:</strong>{" "}
                {selectedOrder.expected_delivery
                  ? new Date(
                      selectedOrder.expected_delivery
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not Specified"}
              </div>
              <div>
                <strong>Status:</strong> {selectedOrder.status}
              </div>
              {selectedOrder.status === "Completed" && (
                <div>
                  <strong>Date Delivered:</strong>{" "}
                  {selectedOrder.date_delivered
                    ? new Date(selectedOrder.date_delivered).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" }
                      )
                    : "Not Specified"}
                </div>
              )}
              <div className="col-span-2">
                <strong>Remarks:</strong>{" "}
                {selectedOrder.remarks ? (
                  <span>{selectedOrder.remarks}</span>
                ) : (
                  <span className="italic text-gray-500">None</span>
                )}
              </div>
            </div>

            {hasStockInRecords(selectedOrder.po_id) &&
              (() => {
                const items = selectedOrder.items;
                const stockedCount = items.filter((item) => {
                  const { status } = getStockStatus(
                    selectedOrder.po_id,
                    item.item_id,
                    item.quantity
                  );
                  return status === "Stocked";
                }).length;

                const partiallyCount = items.filter((item) => {
                  const { status } = getStockStatus(
                    selectedOrder.po_id,
                    item.item_id,
                    item.quantity
                  );
                  return status === "Partially Stocked";
                }).length;

                const totalCount = items.length;

                let summaryText = "";
                let bgColor = "";

                if (stockedCount === totalCount) {
                  summaryText = `Fully Stocked (${stockedCount} of ${totalCount})`;
                  bgColor = "bg-green-100 text-green-800";
                } else if (stockedCount > 0 || partiallyCount > 0) {
                  summaryText = `Partially Stocked (${
                    stockedCount + partiallyCount
                  } of ${totalCount})`;
                  bgColor = "bg-yellow-100 text-yellow-800";
                } else {
                  summaryText = `Unstocked (0 of ${totalCount})`;
                  bgColor = "bg-red-100 text-red-800";
                }

                return (
                  <div
                    className={`mb-3 px-3 py-2 rounded font-semibold text-sm inline-block ${bgColor}`}
                  >
                    {summaryText}
                  </div>
                );
              })()}

            <h3 className="font-semibold mb-2">Ordered Items</h3>
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              <div className="overflow-x-auto mb-4">
                <table className="w-full table-auto border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left w-1/3">Item</th>
                      <th className="px-4 py-2 text-left">Unit</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total Price</th>
                      {hasStockInRecords(selectedOrder.po_id) && (
                        <th className="px-4 py-2 text-center">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          selectedOrder.status === "Stocked" &&
                          !isItemStocked(selectedOrder.po_id, item.item_id)
                            ? "bg-red-50"
                            : ""
                        }
                      >
                        <td className="px-4 py-2">
                          {item.item?.item_name || item.item_id}
                        </td>
                        <td className="px-4 py-2">{item.uom}</td>
                        <td className="px-4 py-2 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatPrice(item.unit_price)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatPrice(item.total_price)}
                        </td>
                        {hasStockInRecords(selectedOrder.po_id) && (
                          <td className="px-4 py-2 text-center">
                            {(() => {
                              const orderedQty = item.quantity;
                              const { status, stocked } = getStockStatus(
                                selectedOrder.po_id,
                                item.item_id,
                                orderedQty
                              );

                              const colorClass = {
                                Stocked: "bg-green-100 text-green-800",
                                "Partially Stocked":
                                  "bg-yellow-100 text-yellow-800",
                                Unstocked: "bg-red-100 text-red-800",
                              }[status];

                              return (
                                <span
                                  className={`inline-block px-2 py-1 rounded text-sm ${colorClass}`}
                                >
                                  {status} ({stocked}/{orderedQty})
                                </span>
                              );
                            })()}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No items in this order.</p>
            )}

            {hasStockInRecords(selectedOrder.po_id) && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-semibold mb-1">Status Legend:</p>
                <ul className="space-y-1">
                  <li>
                    <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                    <strong>Stocked</strong> – Fully stocked (ordered = stocked)
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 bg-yellow-300 rounded-full mr-2"></span>
                    <strong>Partially Stocked</strong> – Still missing some
                    quantity
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-2"></span>
                    <strong>Unstocked</strong> – No stock-in record found
                  </li>
                </ul>
              </div>
            )}

            {hasStockInRecords(selectedOrder.po_id) &&
              selectedOrder.items.some(
                (item) =>
                  getStockStatus(
                    selectedOrder.po_id,
                    item.item_id,
                    item.quantity
                  ).status !== "Stocked"
              ) && (
                <button
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  onClick={() => handleRepurchaseUnstocked(selectedOrder)}
                >
                  Repurchase Unstocked Items
                </button>
              )}

            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Ordered by: <span className="font-medium">{staffName}</span>
                </p>
                <p className="font-bold">
                  Total Cost: {formatPrice(selectedOrder.total_cost)}
                </p>
              </div>
              {/* ✅ Status Buttons (restricted by role) */}
              <div className="flex flex-wrap gap-2 mt-4 justify-end">
                {[
                  "admin",
                  "manager",
                  "inventory manager",
                  "inventory clerk",
                ].includes((userRole || "").toLowerCase()) && (
                  <>
                    {selectedOrder.status === "Pending" && (
                      <button
                        onClick={async () => {
                          const confirmed = await confirmAction(
                            "Approve this Purchase Order?"
                          );
                          if (!confirmed) return;
                          try {
                            await handleApprovePO(selectedOrder);
                            setSelectedOrder(null); // Close modal
                            fetchOrders(); // Refresh orders
                          } catch {
                            toast.error("Error approving Purchase Order.");
                          }
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Approve
                      </button>
                    )}

                    {selectedOrder.status === "Approved" && (
                      <button
                        onClick={async () => {
                          const confirmed = await confirmAction(
                            "Mark this Purchase Order as completed?"
                          );
                          if (!confirmed) return;

                          try {
                            await handleStatusChange(
                              selectedOrder.po_id,
                              "Completed"
                            );
                            toast.success("Purchse Order marked as Completed.");
                            setSelectedOrder(null); // Close modal
                          } catch {
                            toast.error("Failed to mark as Completed.");
                          }
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Mark as Completed
                      </button>
                    )}

                    {selectedOrder.status !== "Completed" &&
                      selectedOrder.status !== "Cancelled" &&
                      selectedOrder.status !== "Stocked" && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirmAction(
                              "Cancel this Purchse Order?"
                            );
                            if (!confirmed) return;

                            try {
                              await handleStatusChange(
                                selectedOrder.po_id,
                                "Cancelled"
                              );
                              toast.success("Purchse Order cancelled.");
                              setSelectedOrder(null); // Close modal
                            } catch {
                              toast.error("Failed to cancel Purchse Order.");
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Cancel
                        </button>
                      )}
                  </>
                )}

                <button
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                  onClick={() => generatePOReceipt(selectedOrder)}
                >
                  Download Receipt
                </button>
              </div>{" "}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
