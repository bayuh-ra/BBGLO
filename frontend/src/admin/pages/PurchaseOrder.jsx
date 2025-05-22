import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import {
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} from "../../api/purchaseOrder";
import { FiX } from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function PurchaseOrder() {
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
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
        unit_price: 0,
        total_price: 0,
        item_name: "",
      },
    ],
    ordered_by: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const uomOptions = ["pcs", "unit", "kg", "liter", "meter", "box", "pack"]; // Add your common UOMs
  const [stockInRecords, setStockInRecords] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const navigate = useNavigate();

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
          amount: Number(po.total_cost) || 0,
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
          `*,supplier:supplier_id(supplier_id, supplier_name, contact_no, email,address), items:purchaseorder_item(*,item:item_id(item_name,brand,size,uom)), staff_profiles:ordered_by(name)`
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
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
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
      .select("item_id, item_name, supplier_id, selling_price, brand, size");
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
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
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
            unit_price: 0,
            total_price: 0,
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
      field === "quantity" || field === "unit_price"
        ? parseFloat(value) || 0
        : value;

    if (field === "item_id" && value) {
      const selectedItem = itemsList.find((item) => item.item_id === value);
      if (selectedItem) {
        updated[idx].unit_price = parseFloat(selectedItem.selling_price) || 0;
        updated[idx].item_name = selectedItem.item_name;
      } else {
        updated[idx].unit_price = 0;
        updated[idx].item_name = "";
      }
    }

    // Calculate total price for the item
    updated[idx].total_price = updated[idx].quantity * updated[idx].unit_price;
    setNewOrder({ ...newOrder, items: updated });
  };

  const formatPrice = (price) => {
    return `₱${parseFloat(price || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTotalPrice = () => {
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
      `Total Cost: ${formatPrice(po.total_price)}`,
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.save(`PO-${po.po_id}.pdf`);
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
      // Get stock-in records for this PO to calculate actual quantities received
      const { data: stockInRecords, error: stockInError } = await supabase
        .from("stockin_records")
        .select("item_id, quantity")
        .eq("purchase_order_id", order.po_id);

      if (stockInError) {
        console.error("Error fetching stock-in records:", stockInError);
        throw new Error("Failed to fetch stock-in records");
      }

      // Calculate remaining quantities for each item
      const remainingQuantities = {};
      stockInRecords.forEach((record) => {
        if (!remainingQuantities[record.item_id]) {
          remainingQuantities[record.item_id] = 0;
        }
        remainingQuantities[record.item_id] += record.quantity;
      });

      // Get items that need repurchase (where received quantity < ordered quantity)
      const itemsToRepurchase = order.items
        .filter((item) => {
          const receivedQuantity = remainingQuantities[item.item_id] || 0;
          const remainingQuantity = item.quantity - receivedQuantity;
          return remainingQuantity > 0;
        })
        .map((item) => ({
          ...item,
          quantity: item.quantity - (remainingQuantities[item.item_id] || 0), // Only repurchase the remaining quantity
          original_quantity: item.quantity, // Keep track of original quantity for reference
          received_quantity: remainingQuantities[item.item_id] || 0, // Keep track of what was received
        }));

      if (itemsToRepurchase.length === 0) {
        toast.error(
          "No items need repurchase - all quantities have been received"
        );
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading("Creating repurchase order...");

      // Create new purchase order with remaining quantities
      const newPoData = {
        supplier: order.supplier_id,
        expected_delivery: new Date().toISOString().split("T")[0], // Today's date
        status: "Pending",
        remarks: `Reorder for remaining quantities from PO ${
          order.po_id
        }. Original quantities: ${itemsToRepurchase
          .map(
            (item) =>
              `${item.item?.item_name || item.item_id}: ${
                item.original_quantity
              } (Received: ${item.received_quantity}, Reordering: ${
                item.quantity
              })`
          )
          .join(", ")}`,
        items: itemsToRepurchase.map((item) => ({
          item: item.item_id,
          quantity: item.quantity,
          uom: item.uom,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
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
        `New purchase order created for remaining quantities! PO ID: ${newPo.po_id}`,
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
  const sortedOrders = [...paginatedOrders].sort((a, b) => {
    if (!sortBy) return 0;
    const valA = a[sortBy]?.toString().toLowerCase();
    const valB = b[sortBy]?.toString().toLowerCase();
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const statusCardConfig = [
    { label: "Pending", icon: "⏳", color: "bg-yellow-100 text-yellow-700" },
    { label: "Approved", icon: "✅", color: "bg-blue-100 text-blue-700" },
    { label: "Delivered", icon: "📦", color: "bg-green-100 text-green-700" },
    { label: "Completed", icon: "✨", color: "bg-purple-100 text-purple-700" },
    { label: "Stocked", icon: "📥", color: "bg-emerald-100 text-emerald-700" },
    { label: "Cancelled", icon: "❌", color: "bg-rose-100 text-rose-700" },
  ];
  const statusCounts = statusCardConfig.reduce((acc, card) => {
    acc[card.label] = orders.filter((o) => o.status === card.label).length;
    return acc;
  }, {});

  // Checkbox selection logic
  const isAllSelected =
    sortedOrders.length > 0 &&
    sortedOrders.every((order) => selectedOrderIds.includes(order.po_id));
  const isIndeterminate = selectedOrderIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(sortedOrders.map((order) => order.po_id));
    }
  };

  const handleSelectOne = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const showDeleteConfirmToast = (count, onConfirm) => {
    return toast(
      (t) => (
        <div className="flex flex-col items-center p-4 text-center max-w-md">
          <div className="font-semibold text-gray-800 mb-2 text-lg">
            Delete Purchase Order{count > 1 ? "s" : ""}?
          </div>
          <div className="text-sm text-gray-600 mb-4">
            This will permanently delete {count} purchase order
            {count > 1 ? "s" : ""} and all associated records including:
            <ul className="list-disc list-inside mt-2 text-left">
              <li>Stock-in records</li>
              <li>Associated expenses</li>
              <li>Purchase order items</li>
            </ul>
            <p className="mt-2 text-red-600 font-medium">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 mt-2 justify-center">
            <button
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-medium"
              onClick={async () => {
                toast.dismiss(t.id);
                await onConfirm();
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
        style: {
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          maxWidth: "500px",
          width: "100%",
        },
      }
    );
  };

  const handleDeleteSelectedOrders = async () => {
    if (selectedOrderIds.length === 0) return;

    showDeleteConfirmToast(selectedOrderIds.length, async () => {
      const loadingToast = toast.loading(
        `Deleting ${selectedOrderIds.length} purchase order(s)...`
      );

      try {
        // First delete associated stock-in records and update inventory
        for (const po_id of selectedOrderIds) {
          // First get all stock-in records for this PO to update inventory
          const { data: stockInRecords, error: fetchError } = await supabase
            .from("stockin_records")
            .select("item_id, quantity")
            .eq("purchase_order_id", po_id);

          if (fetchError) {
            console.error("Error fetching stock-in records:", fetchError);
            throw new Error("Failed to fetch associated stock-in records");
          }

          // Update inventory quantities for each item
          for (const record of stockInRecords || []) {
            const { error: updateError } = await supabase.rpc(
              "decrease_inventory_quantity",
              {
                p_item_id: record.item_id,
                p_quantity: record.quantity,
              }
            );

            if (updateError) {
              console.error("Error updating inventory quantity:", updateError);
              throw new Error("Failed to update inventory quantities");
            }
          }

          // Now delete the stock-in records
          const { error: stockInError } = await supabase
            .from("stockin_records")
            .delete()
            .eq("purchase_order_id", po_id);

          if (stockInError) {
            console.error("Error deleting stock-in records:", stockInError);
            throw new Error("Failed to delete associated stock-in records");
          }

          // Delete associated expenses
          const { error: expenseError } = await supabase
            .from("expenses")
            .delete()
            .eq("linked_id", po_id)
            .eq("category", "Purchase Order");

          if (expenseError) {
            console.error("Error deleting expenses:", expenseError);
            throw new Error("Failed to delete associated expenses");
          }

          // Finally delete the purchase order
          const { error: poError } = await supabase
            .from("purchase_orders")
            .delete()
            .eq("po_id", po_id);

          if (poError) {
            console.error("Error deleting purchase order:", poError);
            throw new Error("Failed to delete purchase order");
          }
        }

        toast.dismiss(loadingToast);
        toast.success(
          `${selectedOrderIds.length} purchase order(s) deleted successfully.`
        );
        setSelectedOrderIds([]);
        fetchOrders();
      } catch (error) {
        console.error("Delete operation failed:", error);
        toast.dismiss(loadingToast);
        toast.error(
          error.message || "Failed to delete one or more purchase orders."
        );
      }
    });
  };

  // Add click outside handler
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
      setSelectedOrder(null);
      setSelectedOrderId(null);
    }
  };

  const handleStockIn = (order) => {
    // Navigate to stock in page with the order data
    navigate("/admin/stockin", {
      state: {
        selectedPO: {
          po_id: order.po_id,
          supplier_id: order.supplier_id,
          supplier: order.supplier,
          items: order.items,
          staff: order.staff_profiles,
          date_ordered: order.date_ordered,
          expected_delivery: order.expected_delivery,
          date_delivered: order.date_delivered,
          remarks: order.remarks,
          total_cost: order.total_cost,
        },
      },
    });
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" reverseOrder={false} />
      <h1 className="text-2xl font-bold mb-4">Purchase Orders</h1>

      {/* Status Cards Filter */}
      <div className="flex w-full gap-4 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">
        {statusCardConfig.map((card) => (
          <button
            key={card.label}
            onClick={() =>
              setFilterStatus(filterStatus === card.label ? "All" : card.label)
            }
            className={`flex-1 min-w-[140px] sm:min-w-0 rounded-xl shadow flex flex-col items-center py-4 transition-all duration-150 cursor-pointer border-2 focus:outline-none
              ${card.color}
              ${
                filterStatus === card.label
                  ? "border-fuchsia-500 ring-2 ring-fuchsia-200"
                  : "border-transparent"
              }
            `}
            aria-pressed={filterStatus === card.label}
          >
            <span className="text-2xl sm:text-3xl mb-1">{card.icon}</span>
            <span className="text-lg sm:text-2xl font-bold">
              {statusCounts[card.label] || 0}
            </span>
            <span className="text-xs sm:text-sm font-medium mt-1 text-center">
              {card.label}
            </span>
          </button>
        ))}
      </div>

      {/* Action Buttons - Repositioned below cards */}
      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setShowModal(true)}
        >
          New Purchase Order
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-bold"
          onClick={handleDeleteSelectedOrders}
          disabled={selectedOrderIds.length === 0}
        >
          Delete
          {selectedOrderIds.length > 0 ? ` (${selectedOrderIds.length})` : ""}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-fixed w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-pink-200">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-center w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Select all purchase orders"
                />
              </th>
              {[
                { key: "po_id", label: "Purchase Order ID", width: "w-40" },
                { key: "supplier_id", label: "Supplier", width: "w-48" },
                { key: "date_ordered", label: "Date Ordered", width: "w-40" },
                { key: "status", label: "Status", width: "w-32" },
                {
                  key: "date_delivered",
                  label: "Date Delivered",
                  width: "w-40",
                },
                {
                  key: "total_price",
                  label: "Total Cost",
                  width: "w-32",
                  align: "right",
                },
              ].map(({ key, label, width, align }) => (
                <th
                  key={key}
                  className={`border border-gray-300 px-4 py-2 cursor-pointer select-none ${width} ${
                    align === "right" ? "text-right" : "text-left"
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
                        <FiChevronUp size={14} />
                      ) : (
                        <FiChevronDown size={14} />
                      )}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const isChecked = selectedOrderIds.includes(order.po_id);
              return (
                <tr
                  key={order.po_id}
                  onClick={() => setSelectedOrderId(order.po_id)}
                  onDoubleClick={() => handleOrderDoubleClick(order)}
                  className={`cursor-pointer ${
                    isChecked
                      ? "bg-pink-100"
                      : selectedOrderId === order.po_id
                      ? "bg-pink-100"
                      : "hover:bg-pink-100"
                  }`}
                >
                  <td
                    className="border border-gray-300 px-4 py-2 text-center w-12"
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectOne(order.po_id);
                      }}
                      aria-label={`Select purchase order ${order.po_id}`}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 w-40 truncate">
                    {order.po_id}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 w-48 truncate">
                    {order.supplier?.supplier_name || order.supplier_id}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 w-40">
                    {new Date(order.date_ordered).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 w-32">
                    {order.status}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 w-40">
                    {(order.status === "Completed" ||
                      order.status === "Stocked") &&
                    order.date_delivered
                      ? new Date(order.date_delivered).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "-"}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 w-32 text-right">
                    ₱
                    {order.total_cost?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, orders.length)} of{" "}
          {orders.length} entries
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
            Page {currentPage} of {Math.ceil(orders.length / itemsPerPage)}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) =>
                p < Math.ceil(orders.length / itemsPerPage) ? p + 1 : p
              )
            }
            className={`px-3 py-1 rounded border ${
              currentPage === Math.ceil(orders.length / itemsPerPage)
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            disabled={currentPage === Math.ceil(orders.length / itemsPerPage)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal for Adding Order */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClickOutside}
        >
          <div className="bg-white p-6 rounded shadow w-full max-w-5xl relative">
            <button
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(false);
              }}
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
                  min={new Date().toISOString().split("T")[0]}
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
                            {[i.brand, i.item_name, i.size]
                              .filter(Boolean)
                              .join("-")}
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
                className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
              >
                Add Item
              </button>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Ordered by: <span className="font-medium">{staffName}</span>
              </p>
              <p className="font-bold">
                Total Cost: {formatPrice(getTotalPrice())}
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
                    ? "bg-blue-500 text-white hover:bg-blue-600"
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClickOutside}
        >
          <div className="bg-white p-6 rounded shadow w-full max-w-4xl relative">
            <button
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(null);
              }}
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

            <h3 className="font-semibold mb-2">Ordered Items</h3>
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              <table className="table-auto w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-pink-200">
                  <tr>
                    {[
                      { key: "item_name", label: "Item" },
                      { key: "uom", label: "UOM" },
                      { key: "quantity", label: "Qty", align: "right" },
                      {
                        key: "unit_price",
                        label: "Unit Price",
                        align: "right",
                      },
                      { key: "total_price", label: "Total", align: "right" },
                      { key: "stock_status", label: "Stock Status" },
                    ].map(({ key, label, align }) => (
                      <th
                        key={key}
                        className={`border border-gray-300 px-4 py-2 ${
                          align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, idx) => {
                    const itemObj = item.item || {};
                    const itemName = [
                      itemObj.brand,
                      itemObj.item_name || item.item_name || item.item_id,
                      itemObj.size,
                      itemObj.uom || item.uom,
                    ]
                      .filter(Boolean)
                      .join("-");
                    const uom = item.uom;
                    const quantity = parseFloat(item.quantity) || 0;
                    const unitPrice = parseFloat(item.unit_price) || 0;
                    const totalPrice = quantity * unitPrice;
                    const stock = getStockStatus(
                      selectedOrder.po_id,
                      item.item_id,
                      quantity
                    );
                    let stockColor = "";
                    if (stock.status === "Stocked")
                      stockColor = "text-green-700";
                    else if (stock.status === "Partially Stocked")
                      stockColor = "text-yellow-700";
                    else stockColor = "text-red-700";
                    return (
                      <tr key={idx} className={`hover:bg-pink-100`}>
                        <td className="border border-gray-300 px-4 py-2">
                          {itemName}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {uom}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {quantity}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          ₱
                          {unitPrice.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          ₱
                          {totalPrice.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`border border-gray-300 px-4 py-2 font-semibold ${stockColor}`}
                        >
                          {stock.status}
                          {stock.status !== "Unstocked" &&
                            ` (${stock.stocked || 0}/${quantity})`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No items in this order.</p>
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
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
                            toast.success(
                              "Purchase Order marked as Completed."
                            );
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

                    {selectedOrder.status === "Completed" && (
                      <button
                        onClick={() => handleStockIn(selectedOrder)}
                        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                      >
                        Stock In
                      </button>
                    )}

                    {selectedOrder.status !== "Completed" &&
                      selectedOrder.status !== "Cancelled" &&
                      selectedOrder.status !== "Stocked" && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirmAction(
                              "Cancel this Purchase Order?"
                            );
                            if (!confirmed) return;

                            try {
                              await handleStatusChange(
                                selectedOrder.po_id,
                                "Cancelled"
                              );
                              toast.success("Purchase Order cancelled.");
                              setSelectedOrder(null); // Close modal
                            } catch {
                              toast.error("Failed to cancel Purchase Order.");
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
