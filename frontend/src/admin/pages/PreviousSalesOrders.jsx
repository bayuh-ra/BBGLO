import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    return DateTime.fromISO(dateString)
      .setZone("Asia/Manila")
      .toLocaleString(DateTime.DATETIME_MED);
  } catch (error) {
    console.error("Error formatting date", error);
    return "Invalid Date";
  }
};

const PreviousSalesOrders = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const ordersPerPage = 10;

  useEffect(() => {
    const loadSalesOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .in("status", ["Complete", "Cancelled"])
          .order("date_ordered", { ascending: false });

        if (error) {
          console.error("Failed to load sales orders:", error);
          return;
        }

        setSalesOrders(data);
      } catch (error) {
        console.error("Failed to load sales orders:", error);
      }
    };
    loadSalesOrders();
  }, []);

  const filteredOrders = salesOrders.filter((order) => {
    const matchesSearch = Object.values(order).some((field) =>
      String(field).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Previous Sales Orders</h1>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border p-2 rounded"
        >
          <option value="All">All Status</option>
          <option value="Complete">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <table className="table-auto w-full">
        <thead className="bg-red-200">
          <tr>
            <th className="px-4 py-2">Order ID</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Order Date</th>
            <th className="px-4 py-2">Delivery Date</th>
            <th className="px-4 py-2">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {currentOrders.map((order) => (
            <tr key={order.order_id} className="border border-gray-300">
              <td className="px-4 py-2">{order.order_id}</td>
              <td className="px-4 py-2">{order.customer_name}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    order.status === "Complete"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-2">{formatDate(order.date_ordered)}</td>
              <td className="px-4 py-2">{formatDate(order.delivered_at)}</td>
              <td className="px-4 py-2">
                ₱{Number(order.total_amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-center mt-4">
        {[
          ...Array(Math.ceil(filteredOrders.length / ordersPerPage)).keys(),
        ].map((number) => (
          <button
            key={number + 1}
            onClick={() => paginate(number + 1)}
            className={`px-3 py-1 mx-1 border rounded ${
              currentPage === number + 1 ? "bg-gray-300" : ""
            }`}
          >
            {number + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PreviousSalesOrders;
