import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";
import toast from "react-hot-toast";
import { ChevronUp, ChevronDown } from "lucide-react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { Dialog } from "@headlessui/react";

export default function DeliveryManagement() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [form, setForm] = useState({
    order_id: "",
    driver_id: "",
    delivery_date: "",
    vehicle: "",
    plate_number: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isFromSalesOrder, setIsFromSalesOrder] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [dateTimeDone, setDateTimeDone] = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Status counts for summary cards
  const statusCounts = {
    Packed: deliveries.filter((d) => d.status === "Packed").length,
    "In Transit": deliveries.filter((d) => d.status === "In Transit").length,
    Delivered: deliveries.filter((d) => d.status === "Delivered").length,
  };

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from("deliveries")
      .select(
        `
        *,
        staff_profiles:driver_id(name),
        orders:order_id(
          order_id,
          customer_name,
          company,
          customer_email,
          shipping_address,
          items,
          date_ordered
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch Deliveries Error:", error);
      toast.error("Failed to fetch deliveries");
      return;
    }

    setDeliveries(data || []);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("order_id, customer_name, date_ordered, delivery_id, status")
        .eq("status", "Order Confirmed")
        .is("delivery_id", null)
        .order("date_ordered", { ascending: true });

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("Error fetching orders");
        return;
      }
      setOrders(data || []);
    } catch (err) {
      console.error("Unexpected error while fetching orders:", err);
      toast.error("Unexpected error while fetching orders");
    }
  };

  const fetchDrivers = async () => {
    const { data, error: fetchError } = await supabase
      .from("staff_profiles")
      .select("id, name")
      .eq("role", "driver")
      .eq("status", "Active");
    if (fetchError) {
      console.error("Error fetching drivers:", fetchError);
      toast.error("Failed to fetch drivers");
    } else {
      setDrivers(data || []);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("vehicles")
        .select("vehicle_id, brand, model, plate_number")
        .eq("status", "Active");
      if (fetchError) {
        console.error("Error fetching active vehicles:", fetchError);
        toast.error("Failed to fetch active vehicles");
      } else {
        setVehicles(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching vehicles:", err);
      toast.error("An unexpected error occurred while loading vehicles");
    }
  };

  useEffect(() => {
    fetchDeliveries();
    const subscription = supabase
      .channel("delivery-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    // Check if we should open the Assign Delivery modal
    const orderId = sessionStorage.getItem("selectedOrderForDelivery");

    if (orderId) {
      // Fetch necessary data
      fetchDrivers();
      fetchVehicles();

      // Set flag that we're coming from SalesOrders
      setIsFromSalesOrder(true);

      // Fetch order details
      const fetchOrderDetails = async () => {
        const { data } = await supabase
          .from("orders")
          .select("order_id, customer_name, shipping_address, date_ordered")
          .eq("order_id", orderId)
          .single();

        if (data) {
          setSelectedOrderDetails(data);
          setForm((prev) => ({
            ...prev,
            order_id: orderId,
          }));
        }
      };

      fetchOrderDetails();

      // Open the existing modal
      setShowModal(true);

      // Clear the sessionStorage
      sessionStorage.removeItem("selectedOrderForDelivery");
    }
  }, []);

  // Add effect for viewing delivery details from SalesOrders
  useEffect(() => {
    const deliveryId = sessionStorage.getItem("selectedDeliveryForDetails");
    if (deliveryId && deliveries.length > 0) {
      const found = deliveries.find((d) => d.delivery_id === deliveryId);
      if (found) {
        setSelectedDelivery(found);
        sessionStorage.removeItem("selectedDeliveryForDetails");
      }
    }
  }, [deliveries]);

  const openAssignModal = () => {
    setForm({
      order_id: "",
      driver_id: "",
      delivery_date: "",
      vehicle: "",
      plate_number: "",
    });
    fetchOrders();
    fetchDrivers();
    fetchVehicles();
    setShowModal(true);
  };

  const handleAssignDelivery = async () => {
    if (
      !form.order_id ||
      !form.driver_id ||
      !form.delivery_date ||
      !form.vehicle ||
      !form.plate_number
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to assign deliveries");
      return;
    }
    const now = new Date().toISOString();
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const { data: latestDelivery } = await supabase
      .from("deliveries")
      .select("delivery_id")
      .ilike("delivery_id", `DEL-${dateStr}%`)
      .order("delivery_id", { ascending: false })
      .limit(1);
    let sequence = "0000";
    if (latestDelivery && latestDelivery.length > 0) {
      const lastSequence = parseInt(
        latestDelivery[0].delivery_id.split("-")[2]
      );
      sequence = String(lastSequence + 1).padStart(4, "0");
    }
    const delivery_id = `DEL-${dateStr}-${sequence}`;
    const { error: deliveryError } = await supabase.from("deliveries").insert([
      {
        delivery_id,
        order_id: form.order_id,
        driver_id: form.driver_id,
        delivery_date: form.delivery_date,
        vehicle: form.vehicle,
        plate_number: form.plate_number,
        status: "Packed",
        updated_by: user.id,
        date_packed: now,
      },
    ]);
    if (deliveryError) {
      toast.error("Failed to assign delivery: " + deliveryError.message);
      return;
    }
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        delivery_id: delivery_id,
        status: "Packed",
        packed_at: now,
        packed_by: user.id,
      })
      .eq("order_id", form.order_id);
    if (orderError) {
      toast.error("Failed to update order: " + orderError.message);
      return;
    }
    toast.success("Delivery assigned successfully!");
    fetchDeliveries();
    setShowModal(false);
  };

  const handleUpdateStatus = async (
    delivery_id,
    newStatus,
    order_id = null
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to update status");
      return;
    }
    const now = new Date().toISOString();
    const deliveryUpdates = {
      status: newStatus,
      updated_by: user.id,
    };
    if (newStatus === "Delivered") {
      deliveryUpdates.date_delivered = now;
    }
    const { error: deliveryError } = await supabase
      .from("deliveries")
      .update(deliveryUpdates)
      .eq("delivery_id", delivery_id);
    if (deliveryError) {
      toast.error("Failed to update delivery.");
      return;
    }
    if (order_id) {
      const orderUpdates = {
        status: newStatus,
      };
      if (newStatus === "In Transit") {
        orderUpdates.in_transit_at = now;
        orderUpdates.in_transit_by = user.id;
      }
      if (newStatus === "Delivered") {
        orderUpdates.delivered_at = now;
        orderUpdates.delivered_by = user.id;
      }
      const { error: orderError } = await supabase
        .from("orders")
        .update(orderUpdates)
        .eq("order_id", order_id);
      if (orderError) {
        toast.error("Failed to update order status.");
        return;
      }
    }
    toast.success(`Marked as ${newStatus}`);
    fetchDeliveries();
    setSelectedDelivery(null);
  };

  // Sort deliveries by created_at descending (latest first)
  const sortedDeliveries = [...deliveries].sort((a, b) => {
    if (!sortBy) return 0;
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    // Special handling for nested fields
    if (sortBy === "driver") {
      aVal = a.staff_profiles?.name || "";
      bVal = b.staff_profiles?.name || "";
    } else if (sortBy === "customer") {
      aVal = a.orders?.customer_name || "";
      bVal = b.orders?.customer_name || "";
    } else if (sortBy === "delivery_date") {
      aVal = a.delivery_date || "";
      bVal = b.delivery_date || "";
    } else {
      aVal = aVal?.toString().toLowerCase() || "";
      bVal = bVal?.toString().toLowerCase() || "";
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const filteredDeliveries = sortedDeliveries.filter((d) => {
    const matchesStatus = statusFilter ? d.status === statusFilter : true;
    return matchesStatus;
  });

  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);

  // Export CSV functionality
  const exportCSV = () => {
    const dataToExport = deliveries.map((delivery) => ({
      delivery_id: delivery.delivery_id,
      order_id: delivery.order_id,
      driver_name: delivery.staff_profiles?.name || "N/A", // Include driver's name as string
      delivery_date: delivery.delivery_date
        ? DateTime.fromISO(delivery.delivery_date).toFormat(
            "MMM-dd-yyyy hh:mm a"
          )
        : "N/A",
      vehicle: delivery.vehicle,
      plate_number: delivery.plate_number,
      status: delivery.status,
      date_packed: delivery.date_packed
        ? DateTime.fromISO(delivery.date_packed).toFormat("MMM-dd-yyyy hh:mm a")
        : "N/A",
      date_delivered: delivery.date_delivered
        ? DateTime.fromISO(delivery.date_delivered).toFormat(
            "MMM-dd-yyyy hh:mm a"
          )
        : "N/A",
      created_at: delivery.created_at
        ? DateTime.fromISO(delivery.created_at).toFormat("MMM-dd-yyyy hh:mm a")
        : "N/A",
      updated_at: delivery.updated_at
        ? DateTime.fromISO(delivery.updated_at).toFormat("MMM-dd-yyyy hh:mm a")
        : "N/A",
      // Explicitly exclude staff_profiles and orders objects
      // If order details like customer name were needed, they'd be added here as strings.
      // For now, removing the objects is the direct interpretation.
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "deliveries.csv");
  };

  // Multi-select logic
  const toggleDeliverySelection = (deliveryId) => {
    setSelectedDeliveries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deliveryId)) {
        newSet.delete(deliveryId);
      } else {
        newSet.add(deliveryId);
      }
      return newSet;
    });
  };

  const selectAllDeliveries = () => {
    const allIds = filteredDeliveries.map((d) => d.delivery_id);
    setSelectedDeliveries(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedDeliveries(new Set());
  };

  const handleDeleteDeliveries = async () => {
    if (selectedDeliveries.size === 0) {
      toast.error("Please select at least one delivery to delete");
      return;
    }
    try {
      // Convert Set to Array for the query
      const deliveryIdsToDelete = Array.from(selectedDeliveries);
      console.log("Attempting to delete deliveries:", deliveryIdsToDelete);

      // Delete the deliveries
      const { error } = await supabase
        .from("deliveries")
        .delete()
        .in("delivery_id", deliveryIdsToDelete);

      if (error) {
        console.error("Failed to delete deliveries:", error);
        toast.error("Failed to delete deliveries");
        return;
      }

      // Also update the associated orders by removing their delivery_id and changing status if needed
      // Fetch orders linked to these deliveries first
      const { data: linkedOrders, error: fetchOrdersError } = await supabase
        .from("orders")
        .select("order_id, status")
        .in("delivery_id", deliveryIdsToDelete);

      if (fetchOrdersError) {
        console.error(
          "Error fetching linked orders for update:",
          fetchOrdersError
        );
        // Continue with deletion even if fetching orders fails
      } else if (linkedOrders && linkedOrders.length > 0) {
        // Prepare update data for orders (remove delivery_id, potentially change status)
        const updates = linkedOrders.map((order) => {
          let statusUpdate = {};
          // If the order status was In Transit or Delivered, revert it, maybe to Packed or Order Confirmed?
          // Let's set it back to 'Order Confirmed' as a safe default after delivery deletion.
          if (["In Transit", "Delivered", "Complete"].includes(order.status)) {
            statusUpdate = { status: "Order Confirmed" };
          }
          return { ...statusUpdate, delivery_id: null };
        });

        // Perform bulk update on orders
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .upsert(updates, { onConflict: "order_id" }); // Use upsert to handle multiple updates

        if (orderUpdateError) {
          console.error("Error updating linked orders:", orderUpdateError);
          toast.error("Failed to update linked orders status.");
        }
      }

      // If we get here, deletion was successful
      console.log("Successfully deleted deliveries:", deliveryIdsToDelete);
      toast.success(
        `${selectedDeliveries.size} delivery(ies) deleted successfully.`
      );

      // Update UI state
      setSelectedDeliveries(new Set());
      setShowDeleteModal(false);
      // No need to fetchDeliveries here, the realtime subscription will handle it
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An error occurred while deleting deliveries.");
    }
  };

  // Add handleClickOutside function
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
      setSelectedDelivery(null);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Delivery Management</h2>

      {/* Status Summary Cards */}
      <div className="flex w-full gap-4 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">
        {[
          {
            label: "Packed",
            icon: "📦",
            color: "bg-purple-100 text-purple-700",
            count: statusCounts.Packed,
          },
          {
            label: "In Transit",
            icon: "🚚",
            color: "bg-indigo-100 text-indigo-700",
            count: statusCounts["In Transit"],
          },
          {
            label: "Delivered",
            icon: "📬",
            color: "bg-green-100 text-green-700",
            count: statusCounts.Delivered,
          },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() =>
              setStatusFilter(statusFilter === card.label ? "" : card.label)
            }
            className={`flex-1 min-w-[140px] sm:min-w-0 rounded-xl shadow flex flex-col items-center py-6 transition-all duration-150 cursor-pointer border-2 focus:outline-none
              ${card.color}
              ${
                statusFilter === card.label
                  ? "border-fuchsia-500 ring-2 ring-fuchsia-200"
                  : "border-transparent"
              }
            `}
            aria-pressed={statusFilter === card.label}
          >
            <span className="text-2xl sm:text-3xl mb-1">{card.icon}</span>
            <span className="text-lg sm:text-2xl font-bold">{card.count}</span>
            <span className="text-xs sm:text-sm font-medium mt-1 text-center">
              {card.label}
            </span>
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
          Delete Selected ({selectedDeliveries.size})
        </button>
        <button
          onClick={selectAllDeliveries}
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
        <button
          onClick={openAssignModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full sm:w-auto"
        >
          Assign Delivery
        </button>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm border border-red-200 min-w-[700px]">
          <thead className="bg-pink-200">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedDeliveries.size === filteredDeliveries.length &&
                    filteredDeliveries.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllDeliveries();
                    } else {
                      clearSelection();
                    }
                  }}
                  className="w-4 h-4"
                />
              </th>
              <th
                className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => {
                  setSortBy("delivery_id");
                  setSortOrder((prev) =>
                    sortBy === "delivery_id" && prev === "asc" ? "desc" : "asc"
                  );
                }}
              >
                <span className="flex items-center">
                  Delivery ID
                  {sortBy === "delivery_id" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => {
                  setSortBy("order_id");
                  setSortOrder((prev) =>
                    sortBy === "order_id" && prev === "asc" ? "desc" : "asc"
                  );
                }}
              >
                <span className="flex items-center">
                  Order ID
                  {sortBy === "order_id" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => {
                  setSortBy("customer");
                  setSortOrder((prev) =>
                    sortBy === "customer" && prev === "asc" ? "desc" : "asc"
                  );
                }}
              >
                <span className="flex items-center">
                  Customer
                  {sortBy === "customer" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => {
                  setSortBy("driver");
                  setSortOrder((prev) =>
                    sortBy === "driver" && prev === "asc" ? "desc" : "asc"
                  );
                }}
              >
                <span className="flex items-center">
                  Driver
                  {sortBy === "driver" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => {
                  setSortBy("status");
                  setSortOrder((prev) =>
                    sortBy === "status" && prev === "asc" ? "desc" : "asc"
                  );
                }}
              >
                <span className="flex items-center">
                  Status
                  {sortBy === "status" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => {
                  setSortBy("delivery_date");
                  setSortOrder((prev) =>
                    sortBy === "delivery_date" && prev === "asc"
                      ? "desc"
                      : "asc"
                  );
                }}
              >
                <span className="flex items-center">
                  Date
                  {sortBy === "delivery_date" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Vehicle
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Plate #
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedDeliveries.map((d) => (
              <tr
                key={d.delivery_id}
                className={`cursor-pointer hover:bg-pink-100 ${
                  selectedDelivery?.delivery_id === d.delivery_id
                    ? "bg-pink-100"
                    : ""
                }`}
                onClick={() => setSelectedDelivery(d)}
                onDoubleClick={() => setSelectedDelivery(d)}
              >
                <td
                  className="border border-gray-300 px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedDeliveries.has(d.delivery_id)}
                    onChange={() => toggleDeliverySelection(d.delivery_id)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.delivery_id}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.order_id}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.orders?.customer_name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.staff_profiles?.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.status}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {DateTime.fromISO(d.delivery_date).toFormat(
                    "LLLL d, yyyy h:mm a"
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.vehicle}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {d.plate_number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2 w-full">
        <div className="text-sm text-gray-600 text-center sm:text-left w-full sm:w-auto">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, deliveries.length)} of{" "}
          {deliveries.length} entries
        </div>
        <div className="flex gap-2 w-full justify-center sm:w-auto sm:justify-end">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-4 py-2 rounded border text-sm font-medium ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
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
                : "bg-blue-500 text-white"
            }`}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={handleClickOutside}
        >
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-2 border-pink-200">
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 -m-6 mb-6 p-6 rounded-t-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🚚</span> Assign Delivery
              </h2>
            </div>

            {isFromSalesOrder ? (
              <>
                {/* Order Details Section */}
                <div className="mb-6 bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-100">
                  <h3 className="text-md font-semibold text-rose-600 mb-3 pb-2 border-b border-rose-200 flex items-center gap-2">
                    <span className="text-lg">📦</span> Order Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-rose-600 mb-1">
                        Order ID
                      </label>
                      <div className="p-2 bg-white border border-rose-200 rounded-lg shadow-sm">
                        {selectedOrderDetails?.order_id}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rose-600 mb-1">
                        Customer
                      </label>
                      <div className="p-2 bg-white border border-rose-200 rounded-lg shadow-sm">
                        {selectedOrderDetails?.customer_name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rose-600 mb-1">
                        Shipping Address
                      </label>
                      <div className="p-2 bg-white border border-rose-200 rounded-lg shadow-sm">
                        {selectedOrderDetails?.shipping_address}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rose-600 mb-1">
                        Date Ordered
                      </label>
                      <div className="p-2 bg-white border border-rose-200 rounded-lg shadow-sm">
                        {DateTime.fromISO(
                          selectedOrderDetails?.date_ordered
                        ).toFormat("LLLL d, yyyy h:mm a")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Details Section */}
                <div className="bg-gradient-to-br from-fuchsia-50 to-purple-50 p-4 rounded-lg border border-fuchsia-100">
                  <h3 className="text-md font-semibold text-fuchsia-600 mb-3 pb-2 border-b border-fuchsia-200 flex items-center gap-2">
                    <span className="text-lg">🚗</span> Delivery Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-fuchsia-600 mb-1">
                        Driver
                      </label>
                      <select
                        className="w-full p-2 border border-fuchsia-200 rounded-lg shadow-sm focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 transition-all"
                        onChange={(e) =>
                          setForm({ ...form, driver_id: e.target.value })
                        }
                        value={form.driver_id}
                      >
                        <option value="">Select Driver</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fuchsia-600 mb-1">
                        Delivery Date and Time
                      </label>
                      <div className="flex flex-col gap-2">
                        {!dateTimeDone && (
                          <input
                            type="datetime-local"
                            className="w-full p-2 border border-fuchsia-200 rounded-lg shadow-sm focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 transition-all"
                            onChange={(e) => {
                              setForm({
                                ...form,
                                delivery_date: e.target.value,
                              });
                              setDateTimeDone(false);
                            }}
                            value={form.delivery_date}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        )}
                        {form.delivery_date && (
                          <input
                            type="text"
                            className="w-full p-2 border border-fuchsia-200 rounded-lg bg-fuchsia-50 text-fuchsia-700 font-semibold shadow-sm cursor-default"
                            value={DateTime.fromISO(
                              form.delivery_date
                            ).toFormat("MMMM d, yyyy 'at' h:mm a")}
                            readOnly
                            tabIndex={-1}
                          />
                        )}
                        {form.delivery_date && !dateTimeDone && (
                          <button
                            type="button"
                            className="w-fit px-4 py-1 bg-fuchsia-500 text-white rounded hover:bg-fuchsia-600 transition self-end"
                            onClick={() => setDateTimeDone(true)}
                          >
                            Done
                          </button>
                        )}
                        {form.delivery_date && dateTimeDone && (
                          <button
                            type="button"
                            className="w-fit px-4 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition self-end"
                            onClick={() => setDateTimeDone(false)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fuchsia-600 mb-1">
                        Vehicle
                      </label>
                      <select
                        className="w-full p-2 border border-fuchsia-200 rounded-lg shadow-sm focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 transition-all"
                        onChange={(e) => {
                          const selectedVehicle = vehicles.find(
                            (v) => v.vehicle_id === e.target.value
                          );
                          setForm({
                            ...form,
                            vehicle: `${selectedVehicle?.brand} ${selectedVehicle?.model}`,
                            plate_number: selectedVehicle?.plate_number || "",
                          });
                        }}
                      >
                        <option value="">Select Vehicle</option>
                        {vehicles.map((v) => (
                          <option key={v.vehicle_id} value={v.vehicle_id}>
                            {v.brand} {v.model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fuchsia-600 mb-1">
                        Plate Number
                      </label>
                      <div className="p-2 bg-gray-50 border border-fuchsia-200 rounded-lg shadow-sm text-gray-600">
                        {form.plate_number ||
                          "Select a vehicle to see plate number"}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-rose-600 mb-1">
                    Order
                  </label>
                  <select
                    className="w-full p-2 border border-rose-200 rounded-lg shadow-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                    onChange={(e) =>
                      setForm({ ...form, order_id: e.target.value })
                    }
                    value={form.order_id}
                  >
                    <option value="">Select Order</option>
                    {orders.map((o) => (
                      <option key={o.order_id} value={o.order_id}>
                        {o.order_id} - {o.customer_name} (
                        {DateTime.fromISO(o.date_ordered).toRelative()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-rose-600 mb-1">
                    Driver
                  </label>
                  <select
                    className="w-full p-2 border border-rose-200 rounded-lg shadow-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                    onChange={(e) =>
                      setForm({ ...form, driver_id: e.target.value })
                    }
                    value={form.driver_id}
                  >
                    <option value="">Select Driver</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-rose-600 mb-1">
                    Delivery Date and Time
                  </label>
                  <div className="flex flex-col gap-2">
                    {!dateTimeDone && (
                      <input
                        type="datetime-local"
                        className="w-full p-2 border border-rose-200 rounded-lg shadow-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                        onChange={(e) => {
                          setForm({ ...form, delivery_date: e.target.value });
                          setDateTimeDone(false);
                        }}
                        value={form.delivery_date}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    )}
                    {form.delivery_date && (
                      <input
                        type="text"
                        className="w-full p-2 border border-rose-200 rounded-lg bg-rose-50 text-rose-700 font-semibold shadow-sm cursor-default"
                        value={DateTime.fromISO(form.delivery_date).toFormat(
                          "MMMM d, yyyy 'at' h:mm a"
                        )}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                    {form.delivery_date && !dateTimeDone && (
                      <button
                        type="button"
                        className="w-fit px-4 py-1 bg-rose-500 text-white rounded hover:bg-rose-600 transition self-end"
                        onClick={() => setDateTimeDone(true)}
                      >
                        Done
                      </button>
                    )}
                    {form.delivery_date && dateTimeDone && (
                      <button
                        type="button"
                        className="w-fit px-4 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition self-end"
                        onClick={() => setDateTimeDone(false)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-rose-600 mb-1">
                    Vehicle
                  </label>
                  <select
                    className="w-full p-2 border border-rose-200 rounded-lg shadow-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
                    onChange={(e) => {
                      const selectedVehicle = vehicles.find(
                        (v) => v.vehicle_id === e.target.value
                      );
                      setForm({
                        ...form,
                        vehicle: `${selectedVehicle?.brand} ${selectedVehicle?.model}`,
                        plate_number: selectedVehicle?.plate_number || "",
                      });
                    }}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-rose-600 mb-1">
                    Plate Number
                  </label>
                  <div className="p-2 bg-gray-50 border border-rose-200 rounded-lg shadow-sm text-gray-600">
                    {form.plate_number ||
                      "Select a vehicle to see plate number"}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setIsFromSalesOrder(false);
                  setSelectedOrderDetails(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDelivery}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  !form.order_id ||
                  !form.driver_id ||
                  !form.delivery_date ||
                  !form.vehicle ||
                  !form.plate_number
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                }`}
                disabled={
                  !form.order_id ||
                  !form.driver_id ||
                  !form.delivery_date ||
                  !form.vehicle ||
                  !form.plate_number
                }
              >
                Assign Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Details Modal */}
      {selectedDelivery && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4"
          onClick={handleClickOutside}
        >
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                📦 Delivery Details
              </h2>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="text-white hover:text-gray-200 transition duration-150 text-xl font-semibold"
              >
                ✖
              </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-8 py-6">
              {/* Delivery Details Card */}
              <div className="bg-gray-50 p-5 rounded-xl border border-rose-200 shadow-sm">
                <h3 className="text-lg font-semibold text-rose-500 mb-3 flex items-center gap-2">
                  🚚 Delivery Info
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Delivery ID:</strong> {selectedDelivery.delivery_id}
                  </p>
                  <p>
                    <strong>Delivery Date:</strong>{" "}
                    {DateTime.fromISO(selectedDelivery.delivery_date).toFormat(
                      "LLLL d, yyyy h:mm a"
                    )}
                  </p>
                  <p>
                    <strong>Assigned Date:</strong>{" "}
                    {DateTime.fromISO(selectedDelivery.created_at).toFormat(
                      "LLLL d, yyyy"
                    )}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded">
                      {selectedDelivery.status}
                    </span>
                  </p>
                  <p>
                    <strong>Driver:</strong>{" "}
                    {selectedDelivery.staff_profiles?.name}
                  </p>
                  <p>
                    <strong>Vehicle:</strong> {selectedDelivery.vehicle}
                  </p>
                  <p>
                    <strong>Plate Number:</strong>{" "}
                    {selectedDelivery.plate_number}
                  </p>

                  {/* Status Update Buttons */}
                  <div className="pt-4 flex gap-2">
                    {selectedDelivery.status === "Packed" && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            selectedDelivery.delivery_id,
                            "In Transit",
                            selectedDelivery.order_id
                          )
                        }
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow transition duration-200 flex items-center gap-2"
                      >
                        🚚 Mark as In Transit
                      </button>
                    )}
                    {selectedDelivery.status === "In Transit" && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            selectedDelivery.delivery_id,
                            "Delivered",
                            selectedDelivery.order_id
                          )
                        }
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition duration-200 flex items-center gap-2"
                      >
                        ✅ Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Details Card */}
              <div className="bg-gray-50 p-5 rounded-xl border border-fuchsia-200 shadow-sm">
                <h3 className="text-lg font-semibold text-fuchsia-600 mb-3 flex items-center gap-2">
                  🧍 Customer Info
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Order ID:</strong>{" "}
                    {selectedDelivery.orders?.order_id}
                  </p>
                  <p>
                    <strong>Customer Name:</strong>{" "}
                    {selectedDelivery.orders?.customer_name}
                  </p>
                  <p>
                    <strong>Company:</strong> {selectedDelivery.orders?.company}
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    {selectedDelivery.orders?.customer_email}
                  </p>
                  <p>
                    <strong>Shipping Address:</strong>{" "}
                    {selectedDelivery.orders?.shipping_address}
                  </p>
                  <p>
                    <strong>Date Ordered:</strong>{" "}
                    {DateTime.fromISO(
                      selectedDelivery.orders?.date_ordered
                    ).toFormat("LLLL d, yyyy")}
                  </p>

                  <div className="mt-4">
                    <p className="font-medium text-fuchsia-500 mb-2">
                      📋 Order Items:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-fuchsia-200 rounded-md shadow-sm">
                        <thead className="bg-fuchsia-100 text-fuchsia-800">
                          <tr>
                            <th className="px-3 py-2 text-left">Item ID</th>
                            <th className="px-3 py-2 text-left">Quantity</th>
                            <th className="px-3 py-2 text-left">
                              Unit Price (₱)
                            </th>
                            <th className="px-3 py-2 text-left">
                              Total Price (₱)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {(() => {
                            const items = JSON.parse(
                              selectedDelivery.orders?.items || "[]"
                            );

                            return (
                              <>
                                {items.map((item, idx) => {
                                  const id =
                                    item.item_id || item.item?.item_id || "N/A";
                                  const qty = item.quantity || 0;
                                  const price =
                                    item.unit_price || item.selling_price || 0;
                                  const itemTotal = qty * price;

                                  return (
                                    <tr
                                      key={idx}
                                      className="border-t border-fuchsia-100 hover:bg-fuchsia-50 transition cursor-help relative"
                                      onMouseEnter={() => setHoveredItem(item)}
                                      onMouseLeave={() => setHoveredItem(null)}
                                    >
                                      <td className="px-3 py-2">{id}</td>
                                      <td className="px-3 py-2">{qty}</td>
                                      <td className="px-3 py-2">
                                        ₱{price.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2">
                                        ₱{itemTotal.toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-fuchsia-50 border-t border-fuchsia-300 font-semibold">
                                  <td
                                    className="px-3 py-2 text-right"
                                    colSpan={3}
                                  >
                                    Total Cost:
                                  </td>
                                  <td className="px-3 py-2 text-fuchsia-700">
                                    ₱
                                    {items
                                      .reduce((acc, item) => {
                                        const qty = item.quantity || 0;
                                        const price =
                                          item.unit_price ||
                                          item.selling_price ||
                                          0;
                                        return acc + qty * price;
                                      }, 0)
                                      .toLocaleString()}
                                  </td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-8 pb-6">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-lg shadow transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-fuchsia-300 w-96 pointer-events-auto">
            <div className="space-y-3 text-base">
              <h4 className="text-lg font-semibold text-fuchsia-600 border-b pb-2 flex items-center gap-2">
                📦 Item Details
              </h4>
              <p>
                <strong className="text-fuchsia-600">Brand:</strong>{" "}
                {hoveredItem.brand || hoveredItem.item?.brand || "N/A"}
              </p>
              <p>
                <strong className="text-fuchsia-600">Size:</strong>{" "}
                {hoveredItem.size || hoveredItem.item?.size || "N/A"}
              </p>
              <p>
                <strong className="text-fuchsia-600">UOM:</strong>{" "}
                {hoveredItem.uom || hoveredItem.item?.uom || "N/A"}
              </p>
              <p>
                <strong className="text-fuchsia-600">Category:</strong>{" "}
                {hoveredItem.category || hoveredItem.item?.category || "N/A"}
              </p>
              <p>
                <strong className="text-fuchsia-600">Supplier:</strong>{" "}
                {hoveredItem.supplier_name ||
                  hoveredItem.supplier?.name ||
                  hoveredItem.item?.supplier_name ||
                  hoveredItem.item?.supplier?.name ||
                  "N/A"}
              </p>
              <p>
                <strong className="text-fuchsia-600">Item Name:</strong>{" "}
                {hoveredItem.item_name ||
                  hoveredItem.item?.item_name ||
                  hoveredItem.name ||
                  hoveredItem.item?.name ||
                  "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Dialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div
          className="fixed inset-0 bg-black/40"
          aria-hidden="true"
          onClick={handleClickOutside}
        />
        <div className="bg-white rounded-lg shadow-lg w-[400px] z-50 p-6 relative">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Delete Deliveries
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4">
            Are you sure you want to delete {selectedDeliveries.size} selected
            delivery(ies)? This action cannot be undone.
          </Dialog.Description>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDeliveries}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
