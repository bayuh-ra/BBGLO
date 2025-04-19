import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(
    DateTime.now().minus({ days: 30 }).toISODate()
  );
  const [endDate, setEndDate] = useState(DateTime.now().toISODate());

  const navigate = useNavigate();

  const formatDateToPhilippines = (utcDate) => {
    try {
      return DateTime.fromISO(utcDate, { zone: "utc" })
        .setZone("Asia/Manila")
        .toFormat("MMM dd, yyyy | hh:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("date_ordered", { ascending: false });

    if (error) {
      console.error("Error fetching orders", error);
    } else {
      setOrders(data || []);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const filtered = orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;
      const matchesSearch =
        order.customer_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.order_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const orderDate = DateTime.fromISO(order.date_ordered).toISODate();
      const withinRange = orderDate >= startDate && orderDate <= endDate;

      return matchesStatus && matchesSearch && withinRange;
    });

    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchQuery, startDate, endDate]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order History</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Packed">Packed</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <input
          type="text"
          placeholder="Search by customer or order ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />

        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <span className="px-1">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-black border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Order ID</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date Ordered</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const items =
                typeof order.items === "string"
                  ? JSON.parse(order.items)
                  : order.items || [];

              const totalQty = items.reduce(
                (sum, i) => sum + (i.quantity || 0),
                0
              );
              const totalAmt = items.reduce(
                (sum, i) =>
                  sum + parseFloat(i.selling_price || 0) * (i.quantity || 1),
                0
              );

              return (
                <tr key={order.order_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{order.order_id}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      order.status === "Cancelled"
                        ? "text-red-500"
                        : order.status === "Delivered"
                        ? "text-green-500"
                        : "text-yellow-600"
                    }`}
                  >
                    {order.status}
                  </td>
                  <td className="px-4 py-2">
                    {formatDateToPhilippines(order.date_ordered)}
                  </td>
                  <td className="px-4 py-2">
                    ₱{totalAmt.toLocaleString()} ({totalQty}{" "}
                    {totalQty === 1 ? "Product" : "Products"})
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() =>
                        navigate("/order-details", {
                          state: { orderId: order.order_id },
                        })
                      }
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-gray-500 py-4">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;
