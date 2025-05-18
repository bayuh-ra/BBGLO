import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";
import toast from "react-hot-toast";
import { ChevronUp, ChevronDown } from "lucide-react";

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
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from("delivery")
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
        toast.error("Error fetching orders: " + error.message);
        return;
      }
      setOrders(data || []);
    } catch (err) {
      toast.error("Unexpected error while fetching orders");
    }
  };

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("staff_profiles")
      .select("id, name")
      .eq("role", "driver")
      .eq("status", "Active");
    setDrivers(data || []);
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_id, brand, model, plate_number")
        .eq("status", "Active");
      setVehicles(data || []);
    } catch (err) {
      toast.error("Failed to fetch active vehicles");
    }
  };

  useEffect(() => {
    fetchDeliveries();
    const subscription = supabase
      .channel("delivery-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery" },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

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
      .from("delivery")
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
    const { error: deliveryError } = await supabase.from("delivery").insert([
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
      .from("delivery")
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
    const matchesDriver = driverFilter ? d.staff_profiles?.name === driverFilter : true;
    const matchesVehicle = vehicleFilter ? d.vehicle === vehicleFilter : true;
    return matchesStatus && matchesDriver && matchesVehicle;
  });

  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Delivery Management</h1>
      </div>

      {/* Filter Bar */}
      <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
        {/* Filter dropdowns - left side */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2"
          >
            <option value="">All Statuses</option>
            <option value="Packed">Packed</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Assign button - right side */}
        <button
          onClick={openAssignModal}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          + Assign Delivery
        </button>
      </div>

      <table className="w-full text-sm border border-red-200">
        <thead className="bg-pink-200">
          <tr>
            <th
              className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
              onClick={() => {
                setSortBy("delivery_id");
                setSortOrder((prev) => (sortBy === "delivery_id" && prev === "asc" ? "desc" : "asc"));
              }}
            >
              <span className="flex items-center">
                Delivery ID
                {sortBy === "delivery_id" && (
                  <span className="ml-1">{sortOrder === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                )}
              </span>
            </th>
            <th
              className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
              onClick={() => {
                setSortBy("order_id");
                setSortOrder((prev) => (sortBy === "order_id" && prev === "asc" ? "desc" : "asc"));
              }}
            >
              <span className="flex items-center">
                Order ID
                {sortBy === "order_id" && (
                  <span className="ml-1">{sortOrder === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                )}
              </span>
            </th>
            <th
              className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
              onClick={() => {
                setSortBy("customer");
                setSortOrder((prev) => (sortBy === "customer" && prev === "asc" ? "desc" : "asc"));
              }}
            >
              <span className="flex items-center">
                Customer
                {sortBy === "customer" && (
                  <span className="ml-1">{sortOrder === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                )}
              </span>
            </th>
            <th
              className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
              onClick={() => {
                setSortBy("driver");
                setSortOrder((prev) => (sortBy === "driver" && prev === "asc" ? "desc" : "asc"));
              }}
            >
              <span className="flex items-center">
                Driver
                {sortBy === "driver" && (
                  <span className="ml-1">{sortOrder === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                )}
              </span>
            </th>
            <th
              className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
              onClick={() => {
                setSortBy("status");
                setSortOrder((prev) => (sortBy === "status" && prev === "asc" ? "desc" : "asc"));
              }}
            >
              <span className="flex items-center">
                Status
                {sortBy === "status" && (
                  <span className="ml-1">{sortOrder === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                )}
              </span>
            </th>
            <th
              className="border border-gray-300 px-4 py-2 text-left cursor-pointer select-none"
              onClick={() => {
                setSortBy("delivery_date");
                setSortOrder((prev) => (sortBy === "delivery_date" && prev === "asc" ? "desc" : "asc"));
              }}
            >
              <span className="flex items-center">
                Date
                {sortBy === "delivery_date" && (
                  <span className="ml-1">{sortOrder === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                )}
              </span>
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">Vehicle</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Plate #</th>
          </tr>
        </thead>
        <tbody>
          {paginatedDeliveries.map((d) => (
            <tr
              key={d.delivery_id}
              className={`cursor-pointer hover:bg-pink-100 ${
                selectedDelivery?.delivery_id === d.delivery_id ? "bg-pink-100" : ""
              }`}
              onClick={() => setSelectedDelivery(d)}
              onDoubleClick={() => setSelectedDelivery(d)}
            >
              <td className="border border-gray-300 px-4 py-2 text-left">{d.delivery_id}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{d.order_id}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{d.orders?.customer_name}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{d.staff_profiles?.name}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{d.status}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{DateTime.fromISO(d.delivery_date).toFormat("LLLL d, yyyy h:mm a")}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{d.vehicle}</td>
              <td className="border border-gray-300 px-4 py-2 text-left">{d.plate_number}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing { (currentPage - 1) * itemsPerPage + 1 } to { Math.min(currentPage * itemsPerPage, deliveries.length) } of { deliveries.length } entries
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
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
      className={`px-3 py-1 rounded border ${currentPage === totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
      disabled={currentPage === totalPages}
    >
      Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Assign Delivery</h2>
            <label>Order</label>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-2"
              onChange={(e) => setForm({ ...form, order_id: e.target.value })}
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
            <label>Driver</label>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-2"
              onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
              value={form.driver_id}
            >
              <option value="">Select Driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <label>Delivery Date and Time</label>
            <input
              type="datetime-local"
              className="w-full p-2 border border-gray-300 rounded mb-2"
              onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              value={form.delivery_date}
            />
            <label>Vehicle</label>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-2"
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
                  {v.brand} {v.model} ({v.plate_number})
                </option>
              ))}
            </select>
            <label>Plate Number</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded mb-2"
              placeholder="e.g. KAC-3456"
              value={form.plate_number}
              readOnly
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDelivery}
                className={`px-3 py-1 text-white rounded ${
                  !form.order_id ||
                  !form.driver_id ||
                  !form.delivery_date ||
                  !form.vehicle ||
                  !form.plate_number
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={
                  !form.order_id ||
                  !form.driver_id ||
                  !form.delivery_date ||
                  !form.vehicle ||
                  !form.plate_number
                }
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Details Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4">
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
    </div>
  );
}
