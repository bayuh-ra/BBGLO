import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import { Dialog } from "@headlessui/react";
import { toast } from "react-hot-toast";
import { DateTime } from "luxon";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesOrder = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const totalAmount = orderProducts.reduce(
    (acc, item) => acc + item.total_price,
    0
  );

  // New state for sorting
  const [sortBy, setSortBy] = useState("date_ordered");
  const [sortOrder, setSortOrder] = useState("desc");

  // Status counts for summary cards
  const statusCounts = {
    Pending: orders.filter((o) => o.status === "Pending").length,
    "Order Confirmed": orders.filter((o) => o.status === "Order Confirmed").length,
    Packed: orders.filter((o) => o.status === "Packed").length,
    "In Transit": orders.filter((o) => o.status === "In Transit").length,
    Delivered: orders.filter((o) => o.status === "Delivered").length,
    Complete: orders.filter((o) => o.status === "Complete").length,
  };

  useEffect(() => {
    const fetchStaffId = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: staffProfile } = await supabase
          .from("staff_profiles")
          .select("id")
          .eq("id", userId)
          .single();
        if (staffProfile) setStaffId(staffProfile.id);
      }
    };
    fetchStaffId();
  }, []);

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);

    try {
      console.log("🔍 Raw order.items:", order.items);
      const items = JSON.parse(order.items);

      const itemIds = items
        .map((item) => {
          const rawId = item.item_id || item.id || item.product_id;
          if (rawId && rawId.startsWith("IT") && !rawId.includes("-")) {
            return rawId.slice(0, 2) + "-" + rawId.slice(2);
          }
          return rawId;
        })
        .filter(Boolean);

      console.log("🆔 Extracted item IDs:", itemIds);

        const { data, error } = await supabase
        .from("management_inventoryitem")
        .select("item_id, item_name, category, uom, selling_price")
        .in("item_id", itemIds);

      if (error) {
        console.error("❌ Failed to fetch inventory:", error);
        setOrderProducts([]);
      } else {
        const merged = data.map((inv) => {
          const match = items.find((itm) => {
            const rawId = itm.item_id || itm.id || itm.product_id;
            const normalizedRawId =
              rawId?.startsWith("IT") && !rawId.includes("-")
                ? rawId.slice(0, 2) + "-" + rawId.slice(2)
                : rawId;

            const normalizedInvId =
              inv.item_id?.startsWith("IT") && !inv.item_id.includes("-")
                ? inv.item_id.slice(0, 2) + "-" + inv.item_id.slice(2)
                : inv.item_id;

            return normalizedRawId === normalizedInvId;
          });

          return {
            ...inv,
            quantity: match?.quantity || 0,
            total_price: (match?.quantity || 0) * Number(inv.selling_price),
          };
        });

        console.log("✅ Merged products:", merged);
        setOrderProducts(merged);
      }
    } catch (e) {
      console.error("❌ Error parsing items or fetching inventory:", e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      console.log("Fetching orders...");
      const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
        .neq("status", "Cancelled")
          .order("date_ordered", { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        toast.error(
          "Failed to fetch orders. Please check your connection and try again."
        );
        return;
      }

      // Get all unique staff IDs from the orders
      const staffIds = new Set();
      ordersData.forEach((order) => {
        if (order.confirmed_by) staffIds.add(order.confirmed_by);
        if (order.packed_by) staffIds.add(order.packed_by);
        if (order.in_transit_by) staffIds.add(order.in_transit_by);
        if (order.delivered_by) staffIds.add(order.delivered_by);
      });

      // Fetch staff profiles
      const { data: staffData, error: staffError } = await supabase
        .from("staff_profiles")
        .select("id, name")
        .in("id", Array.from(staffIds));

      if (staffError) {
        console.error("Error fetching staff profiles:", staffError);
        toast.error("Failed to fetch staff profiles.");
        return;
      }

      // Create a map of staff IDs to names
      const staffMap = new Map(
        staffData.map((staff) => [staff.id, staff.name])
      );

      // Merge staff names into orders
      const ordersWithStaffNames = ordersData.map((order) => ({
        ...order,
        confirmed_profile: {
          name: order.confirmed_by ? staffMap.get(order.confirmed_by) : null,
        },
        packed_profile: {
          name: order.packed_by ? staffMap.get(order.packed_by) : null,
        },
        in_transit_profile: {
          name: order.in_transit_by ? staffMap.get(order.in_transit_by) : null,
        },
        delivered_profile: {
          name: order.delivered_by ? staffMap.get(order.delivered_by) : null,
        },
      }));

      console.log("Orders fetched successfully:", ordersWithStaffNames);
      setOrders(ordersWithStaffNames);
    } catch (err) {
      console.error("Unexpected error while fetching orders:", err);
      toast.error("An unexpected error occurred while fetching orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Initial fetch of orders...");
    fetchOrders();

    // Set up realtime subscription
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: "status=neq.Cancelled",
        },
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchOrders();
          // If the modal is open and the updated order is the selected one, update it
          if (selectedOrder && payload.new && payload.new.order_id === selectedOrder.order_id) {
            setSelectedOrder((prev) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [selectedOrder]);

  const handleStatusUpdate = async (newStatus) => {
    if (!staffId) {
      alert("Only staff can update status.");
      return;
    }

    // Map status to their corresponding timestamp fields
    const timestampMap = {
      "Order Confirmed": "confirmed_at",
      Packed: "packed_at",
      "In Transit": "in_transit_at",
      Delivered: "delivered_at",
      Complete: "completed_at",
    };

    // Map status to their corresponding staff fields
    const staffFieldMap = {
      "Order Confirmed": "confirmed_by",
      Packed: "packed_by",
      "In Transit": "in_transit_by",
      Delivered: "delivered_by",
    };

    const updateData = {
      status: newStatus,
      updated_by: staffId,
    };

    // Add timestamp if applicable
    const timestampField = timestampMap[newStatus];
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString();
    }

    // Add staff ID based on status
    const staffField = staffFieldMap[newStatus];
    if (staffField) {
      updateData[staffField] = staffId;
    }

    // Update order status
    const { error: orderError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("order_id", selectedOrder.order_id);

    if (orderError) {
      console.error("Order status update failed:", orderError);
      alert("Failed to update order status.");
      return;
    }

    // If status is "In Transit", handle delivery record
    if (newStatus === "In Transit") {
      // First check if delivery record exists
      const { data: existingDelivery, error: fetchError } = await supabase
        .from("deliveries")
        .select("delivery_id")
        .eq("order_id", selectedOrder.order_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error checking delivery record:", fetchError);
        alert("Failed to check delivery record.");
        return;
      }

      if (!existingDelivery) {
        // Create new delivery record if it doesn't exist
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
        const rand = Math.floor(Math.random() * 9000 + 1000);
        const deliveryId = `DEL-${dateStr}-${rand}`;

        const { error: createError } = await supabase
          .from("deliveries")
          .insert([
            {
              delivery_id: deliveryId,
              order_id: selectedOrder.order_id,
              driver_id: staffId,
              delivery_date: today.toISOString(),
              status: "In Transit",
              customer_id: selectedOrder.customer_id || null,
              vehicle: "",
            },
          ]);

        if (createError) {
          console.error("Failed to create delivery record:", createError);
          alert("Failed to create delivery record.");
          return;
        }
      } else {
        // Update existing delivery record
        const { error: updateError } = await supabase
          .from("deliveries")
          .update({ status: "In Transit" })
          .eq("delivery_id", existingDelivery.delivery_id);

        if (updateError) {
          console.error("Failed to update delivery status:", updateError);
          alert("Failed to update delivery status.");
          return;
        }
      }
    }

    // Update the selected order's status locally
    setSelectedOrder((prev) => ({
      ...prev,
      status: newStatus,
      ...(timestampField && { [timestampField]: new Date().toISOString() }),
    }));

    // Refresh the orders list
    fetchOrders();
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    const confirm = window.confirm(
      `Are you sure you want to delete order ${selectedOrder.order_id}?`
    );
    if (!confirm) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("order_id", selectedOrder.order_id);

    if (error) {
      console.error("Failed to delete order:", error);
      alert("Failed to delete order.");
      return;
    }

    toast.success("Order deleted successfully.");
    setSelectedOrder(null);
    fetchOrders();
  };

  const getStatusBadge = (status) => {
    let color = "bg-gray-100 text-gray-800";
    if (status === "Pending") color = "bg-yellow-100 text-yellow-800";
    else if (status === "Order Confirmed") color = "bg-blue-100 text-blue-800";
    else if (status === "Packed") color = "bg-purple-100 text-purple-800";
    else if (status === "In Transit") color = "bg-indigo-100 text-indigo-800";
    else if (status === "Delivered") color = "bg-green-100 text-green-800";
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{status}</span>
    );
  };

  const exportCSV = () => {
    const csv = Papa.unparse(orders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "orders.csv");
  };

  // Sorting logic
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

  const filteredOrders =
    statusFilter === "All"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  // Sort orders before paginating
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    if (sortBy === "date_ordered") {
      aValue = aValue || "";
      bValue = bValue || "";
    } else {
      aValue = (aValue || "").toString().toLowerCase();
      bValue = (bValue || "").toString().toLowerCase();
    }
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  const handleDeliveryConfirm = async () => {
    if (!selectedOrder || !staffId) return;

    try {
      // Update order status to Delivered
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "Delivered",
          delivered_at: new Date().toISOString(),
          delivered_by: staffId,
          updated_by: staffId
        })
        .eq("order_id", selectedOrder.order_id);

      if (orderError) {
        console.error("Failed to update order status:", orderError);
        toast.error("Failed to update order status");
        return;
      }

      // Update delivery record if it exists
      const { data: delivery, error: deliveryFetchError } = await supabase
        .from("deliveries")
        .select("delivery_id")
        .eq("order_id", selectedOrder.order_id)
        .single();

      if (delivery) {
        const { error: deliveryUpdateError } = await supabase
          .from("deliveries")
          .update({
            status: "Delivered",
            delivered_at: new Date().toISOString()
          })
          .eq("delivery_id", delivery.delivery_id);

        if (deliveryUpdateError) {
          console.error("Failed to update delivery status:", deliveryUpdateError);
          toast.error("Failed to update delivery status");
          return;
        }
      }

      toast.success("Order marked as delivered successfully");
      setShowConfirmModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast.error("An error occurred while confirming delivery");
    }
  };

  const handleAssignDelivery = () => {
    if (!selectedOrder) return;
    
    // Store the order ID in sessionStorage
    sessionStorage.setItem('selectedOrderForDelivery', selectedOrder.order_id);
    
    // Navigate to delivery management page
    navigate('/admin/delivery-management');
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAllOrders = () => {
    const allOrderIds = filteredOrders.map(order => order.order_id);
    setSelectedOrders(new Set(allOrderIds));
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  const handleDeleteOrders = async () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select at least one order to delete");
      return;
    }

    try {
      // Convert Set to Array for the query
      const orderIdsToDelete = Array.from(selectedOrders);
      console.log("Attempting to delete orders:", orderIdsToDelete);

      // First, delete related records in deliveries table
      const { error: deliveryError } = await supabase
        .from("deliveries")
        .delete()
        .in("order_id", orderIdsToDelete);

      if (deliveryError) {
        console.error("Failed to delete delivery records:", deliveryError);
        toast.error("Failed to delete related delivery records.");
        return;
      }

      // Then delete the orders
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .in("order_id", orderIdsToDelete);

      if (orderError) {
        console.error("Failed to delete orders:", orderError);
        toast.error("Failed to delete orders. Please try again.");
        return;
      }

      // If we get here, deletion was successful
      console.log("Successfully deleted orders:", orderIdsToDelete);
      toast.success(`${selectedOrders.size} order(s) deleted successfully.`);
      
      // Update UI state
      setSelectedOrders(new Set());
      setShowDeleteModal(false);
      setSelectedOrder(null);
      
      // Refresh the orders list
      await fetchOrders();
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An error occurred while deleting orders.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Sales Orders</h2>

      {/* Status Summary Cards */}
      <div className="flex w-full gap-4 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">
        {[
          { label: "Pending", icon: "⏳", color: "bg-yellow-100 text-yellow-700", count: statusCounts.Pending },
          { label: "Order Confirmed", icon: "✅", color: "bg-blue-100 text-blue-700", count: statusCounts["Order Confirmed"] },
          { label: "Packed", icon: "📦", color: "bg-purple-100 text-purple-700", count: statusCounts.Packed },
          { label: "In Transit", icon: "🚚", color: "bg-indigo-100 text-indigo-700", count: statusCounts["In Transit"] },
          { label: "Delivered", icon: "📬", color: "bg-green-100 text-green-700", count: statusCounts.Delivered },
          { label: "Complete", icon: "🏁", color: "bg-fuchsia-100 text-fuchsia-700", count: statusCounts.Complete },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => setStatusFilter(statusFilter === card.label ? "All" : card.label)}
            className={`flex-1 min-w-[140px] sm:min-w-0 rounded-xl shadow flex flex-col items-center py-4 transition-all duration-150 cursor-pointer border-2 focus:outline-none
              ${card.color}
              ${statusFilter === card.label ? 'border-fuchsia-500 ring-2 ring-fuchsia-200' : 'border-transparent'}
            `}
            aria-pressed={statusFilter === card.label}
          >
            <span className="text-2xl sm:text-3xl mb-1">{card.icon}</span>
            <span className="text-lg sm:text-2xl font-bold">{card.count}</span>
            <span className="text-xs sm:text-sm font-medium mt-1 text-center">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6 w-full">
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full sm:w-auto"
        >
          Export CSV
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full sm:w-auto"
        >
          Delete Selected ({selectedOrders.size})
        </button>
        <button
          onClick={selectAllOrders}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
        >
          Select All
        </button>
        <button
          onClick={clearSelection}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 w-full sm:w-auto"
        >
          Clear Selection
        </button>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto w-full">
        <table className="table-auto w-full border-collapse border border-gray-300 text-sm min-w-[700px]">
        <thead className="bg-pink-200">
          <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedOrders.size === filteredOrders.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllOrders();
                    } else {
                      clearSelection();
                    }
                  }}
                  className="w-4 h-4"
                />
              </th>
              {Object.entries({
                order_id: "Order ID",
                customer_name: "Customer",
                status: "Status",
                date_ordered: "Date Ordered",
              }).map(([key, label]) => (
              <th
                key={key}
                  className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => handleSort(key)}
              >
                {label}
                {getSortIcon(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
            {paginatedOrders.map((order) => (
            <tr
              key={order.order_id}
                className={`cursor-pointer border-b ${
                  selectedOrder?.order_id === order.order_id
                  ? "bg-pink-100"
                  : "hover:bg-pink-100"
              }`}
              >
                <td 
                  className="border border-gray-300 px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.order_id)}
                    onChange={() => toggleOrderSelection(order.order_id)}
                    className="w-4 h-4"
                  />
                </td>
                <td 
                  className="border border-gray-300 px-4 py-2"
                  onClick={() => handleSelectOrder(order)}
                >
                {order.order_id}
              </td>
                <td 
                  className="border border-gray-300 px-4 py-2"
                  onClick={() => handleSelectOrder(order)}
                >
                {order.customer_name}
              </td>
                <td 
                  className="border border-gray-300 px-4 py-2"
                  onClick={() => handleSelectOrder(order)}
                >
                  {getStatusBadge(order.status)}
              </td>
                <td 
                  className="border border-gray-300 px-4 py-2"
                  onClick={() => handleSelectOrder(order)}
                >
                  {order.date_ordered
                    ? DateTime.fromISO(order.date_ordered).toLocaleString(
                        DateTime.DATETIME_MED
                      )
                    : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2 w-full">
          <div className="text-sm text-gray-600 text-center sm:text-left w-full sm:w-auto">
          Showing{" "}
            {(currentPage - 1) * ordersPerPage + 1} to{" "}
            {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of{" "}
          {filteredOrders.length} entries
        </div>
          <div className="flex gap-2 w-full justify-center sm:w-auto sm:justify-end">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className={`px-4 py-2 rounded border text-sm font-medium ${currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
            <span className="text-sm font-medium flex items-center">
              Page {currentPage} of {Math.ceil(filteredOrders.length / ordersPerPage)}
          </span>
          <button
              onClick={() =>
                setCurrentPage((p) =>
                  p < Math.ceil(filteredOrders.length / ordersPerPage)
                    ? p + 1
                    : p
                )
              }
              className={`px-4 py-2 rounded border text-sm font-medium ${
                currentPage === Math.ceil(filteredOrders.length / ordersPerPage)
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
              disabled={
                currentPage === Math.ceil(filteredOrders.length / ordersPerPage)
              }
          >
            Next
          </button>
        </div>
      </div>
      )}

      {/* Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0">
          <div className="bg-white p-0 rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[850px] max-h-[95vh] overflow-y-auto border-2 border-pink-200">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 rounded-t-2xl px-4 sm:px-8 py-5 flex items-center gap-4">
              <span className="text-2xl sm:text-3xl">🧾</span>
              <h3 className="text-lg sm:text-2xl font-bold text-white tracking-wide">Sales Order Details</h3>
            </div>

            {/* Order Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm mb-6 px-4 sm:px-8 pt-6 pb-2 bg-gradient-to-br from-pink-50 to-rose-50 rounded-b-xl">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs font-semibold">Order ID</span>
                <span className="font-mono text-pink-700">{selectedOrder.order_id}</span>
              </div>
              {selectedOrder.delivery_id && (
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">Delivery ID</span>
                  <span className="font-mono text-purple-700">{selectedOrder.delivery_id}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-pink-500">👤</span>
                <strong>Customer:</strong> {selectedOrder.customer_name || "N/A"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">✉️</span>
                <strong>Email:</strong> {selectedOrder.customer_email || "N/A"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-rose-500">🏢</span>
                <strong>Company:</strong> {selectedOrder.company || "N/A"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-fuchsia-500">📦</span>
                <strong>Shipping:</strong> {selectedOrder.shipping_address || "N/A"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-500">🔖</span>
                <strong>Status:</strong> {getStatusBadge(selectedOrder.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">⏰</span>
                <strong>Cancel Until:</strong> {(() => {
                  const orderTime = DateTime.fromISO(selectedOrder.date_ordered);
                  const cancelDeadline = orderTime.plus({ hours: 3 });
                  const now = DateTime.local();
                  const cancelWindowExpired = now > cancelDeadline;
                  return (
                    <span className={cancelWindowExpired ? "text-red-500" : "text-green-600"}>
                      {cancelDeadline.toFormat("ff")}
                      {cancelWindowExpired ? " (Expired)" : " (Still valid)"}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Order Progress Section */}
            <div className="mb-6 bg-gradient-to-br from-fuchsia-50 to-pink-50 p-4 sm:p-6 rounded-xl border border-fuchsia-200 mx-4 sm:mx-8 mt-4">
              <h4 className="font-semibold mb-3 text-fuchsia-700 flex items-center gap-2 text-base sm:text-lg">
                <span>📈</span> Order Progress
              </h4>
              {/* Redesigned Stepper Timeline */}
              <div className="flex items-start gap-0 mt-8 mb-2 relative overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">
                {[
                  {
                    label: "Ordered",
                    icon: <span className="text-xl">📝</span>,
                    active: true,
                    done: true,
                    timestamp: selectedOrder.date_ordered,
                    staff: selectedOrder.placed_by,
                  },
                  {
                    label: "Confirmed",
                    icon: <span className="text-xl">✅</span>,
                    active: !!selectedOrder.confirmed_at,
                    done: !!selectedOrder.confirmed_at,
                    timestamp: selectedOrder.confirmed_at,
                    staff: selectedOrder.confirmed_profile?.name,
                  },
                  {
                    label: "Packed",
                    icon: <span className="text-xl">📦</span>,
                    active: !!selectedOrder.packed_at,
                    done: !!selectedOrder.packed_at,
                    timestamp: selectedOrder.packed_at,
                    staff: selectedOrder.packed_profile?.name,
                  },
                  {
                    label: "In Transit",
                    icon: <span className="text-xl">🚚</span>,
                    active: !!selectedOrder.in_transit_at,
                    done: !!selectedOrder.in_transit_at,
                    timestamp: selectedOrder.in_transit_at,
                    staff: selectedOrder.in_transit_profile?.name,
                  },
                  {
                    label: "Delivered",
                    icon: <span className="text-xl">📬</span>,
                    active: !!selectedOrder.delivered_at,
                    done: !!selectedOrder.delivered_at,
                    timestamp: selectedOrder.delivered_at,
                    staff: selectedOrder.delivered_profile?.name,
                  },
                  {
                    label: "Complete",
                    icon: <span className="text-xl">🏁</span>,
                    active: selectedOrder.status === "Complete",
                    done: selectedOrder.status === "Complete",
                    timestamp: selectedOrder.completed_at,
                    staff: null,
                  },
                ].map((step, idx, arr) => {
                  const isCurrent = !step.done && (idx === 0 || arr[idx-1].done);
                  return (
                    <div key={step.label} className="flex flex-col items-center relative flex-shrink-0 w-28 min-w-[7rem]">
                      {/* Row for connectors and circle */}
                      <div className="flex items-center w-full relative z-10">
                        {/* Left connector (not for first step) */}
                        {idx > 0 && (
                          <div className={`flex-grow h-1 rounded-full ${arr[idx-1].done ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                        )}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 shadow-sm transition-all duration-300
                          ${step.done ? 'bg-white border-green-400 shadow-green-100' : isCurrent ? 'bg-white border-fuchsia-400 shadow-fuchsia-100 animate-pulse' : 'bg-gray-100 border-gray-300'}
                        `}>
                          {step.icon}
                          {isCurrent && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-fuchsia-400 rounded-full shadow-lg animate-pulse"></span>}
                        </div>
                        {/* Right connector (not for last step) */}
                        {idx < arr.length - 1 && (
                          <div className={`flex-grow h-1 rounded-full ${step.done ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                        )}
                      </div>
                      <span className={`mt-2 text-xs font-semibold ${step.done ? 'text-green-700' : isCurrent ? 'text-fuchsia-700' : 'text-gray-400'}`}>{step.label}</span>
                      <span className="text-[11px] text-gray-500 mt-1 text-center min-h-[16px]">
                        {step.timestamp ? DateTime.fromISO(step.timestamp).toFormat('MMM d, yyyy h:mm a') : ''}
                      </span>
                      {step.staff && (
                        <span className="text-[10px] text-gray-400 mt-0.5 text-center">{step.staff}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Table */}
            <div className="overflow-x-auto mx-4 sm:mx-8 mb-6">
              <table className="w-full border text-xs sm:text-sm rounded-xl overflow-hidden shadow min-w-[500px]">
                <thead className="bg-pink-100 text-fuchsia-700">
                  <tr>
                    <th className="p-2 border">Product ID</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">UoM</th>
                    <th className="p-2 border">Unit Price</th>
                    <th className="p-2 border">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {orderProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-gray-500">
                        No product details available
                      </td>
                    </tr>
                  ) : (
                    orderProducts.map((item, i) => (
                      <tr key={i} className="hover:bg-pink-50">
                        <td className="p-2 border text-center">{item.item_id}</td>
                        <td className="p-2 border">{item.item_name}</td>
                        <td className="p-2 border">{item.category}</td>
                        <td className="p-2 border text-center">{item.quantity}</td>
                        <td className="p-2 border text-center">{item.uom}</td>
                        <td className="p-2 border text-right">₱{Number(item.selling_price).toFixed(2)}</td>
                        <td className="p-2 border text-right">₱{Number(item.total_price).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total & Confirm */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 mx-4 sm:mx-8 gap-4">
              <div>
                <p className="text-xs text-gray-500">
                  <strong>Placed By:</strong> {selectedOrder.placed_by}
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Last Updated:</strong>{" "}
                  {selectedOrder.delivered_profile?.name
                    || selectedOrder.in_transit_profile?.name
                    || selectedOrder.packed_profile?.name
                    || selectedOrder.confirmed_profile?.name
                    || "Unknown"}
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Date Ordered:</strong> {new Date(selectedOrder.date_ordered).toLocaleString()}
                </p>
              </div>

              <div className="text-right w-full sm:w-auto">
                <p className="text-base sm:text-lg font-semibold text-fuchsia-700">
                  Total Amount: ₱{Number(totalAmount).toLocaleString()}
                </p>

                {/* Status Action Buttons */}
                <div className="flex gap-2 mt-2">
                  {selectedOrder.status === "Pending" && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate("Order Confirmed")}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Mark as Order Confirmed
                      </button>
                      {(() => {
                        const orderTime = DateTime.fromISO(selectedOrder.date_ordered);
                        const cancelDeadline = orderTime.plus({ hours: 3 });
                        const now = DateTime.local();
                        const cancelWindowExpired = now > cancelDeadline;

                        return (
                          <>
                            {cancelWindowExpired && (
                              <p className="text-sm text-yellow-500 mt-1 italic">
                                ⚠️ Cancellation deadline passed. Admin override allowed.
                              </p>
                            )}
                            <button
                              onClick={() => handleStatusUpdate("Cancelled")}
                              className={`${
                                cancelWindowExpired
                                  ? "bg-yellow-500 hover:bg-yellow-600"
                                  : "bg-red-500 hover:bg-red-600"
                              } text-white px-4 py-2 rounded`}
                            >
                              {cancelWindowExpired ? "Cancel (Admin Override)" : "Cancel Order"}
                            </button>
                          </>
                        );
                      })()}
                    </>
                  )}
                  {selectedOrder.status === "Order Confirmed" && (
                    <button
                      onClick={() => handleStatusUpdate("Packed")}
                      className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    >
                      Mark as Packed
                    </button>
                  )}
                  {/* Show Assign Delivery only if status is Packed and no delivery_id */}
                  {selectedOrder.status === "Packed" && !selectedOrder.delivery_id && (
                    <button
                      onClick={handleAssignDelivery}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Assign Delivery
                    </button>
                  )}
                  {/* Show View Delivery Details if delivery_id exists and status is Packed or later */}
                  {(selectedOrder.delivery_id && ["Packed", "In Transit", "Delivered", "Complete"].includes(selectedOrder.status)) && (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('selectedDeliveryForDetails', selectedOrder.delivery_id);
                        navigate('/admin/delivery-management');
                      }}
                      className="bg-fuchsia-600 text-white px-4 py-2 rounded hover:bg-fuchsia-700"
                    >
                      View Delivery Details
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end mt-6 px-4 sm:px-8 pb-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-gray-300 text-black px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="bg-white rounded-lg shadow-lg w-[400px] z-50 p-6 relative">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Confirm Completion
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4">
            Are you sure you want to mark this order as{" "}
            <strong>Complete</strong>?
          </Dialog.Description>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeliveryConfirm}
              className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded"
            >
              Confirm
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete Modal */}
      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="bg-white rounded-lg shadow-lg w-[400px] z-50 p-6 relative">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Delete Orders
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4">
            Are you sure you want to delete {selectedOrders.size} selected order(s)?
            This action cannot be undone.
          </Dialog.Description>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteOrders}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SalesOrder;
