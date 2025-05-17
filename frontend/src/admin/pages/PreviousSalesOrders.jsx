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
  const [selectedOrderId, setSelectedOrderId] = useState(null); // Add selected row state
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
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

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
      <table className="table-auto w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-pink-200">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Order ID
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Customer
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Status
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Date Ordered
            </th>
            <th className="border border-gray-300 px-4 py-2 text-right">
              Total Amount
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Payment Method
            </th>
          </tr>
        </thead>
        <tbody>
          {currentOrders.map((order) => (
            <tr
              key={order.order_id}
              className={`cursor-pointer ${selectedOrderId === order.order_id ? "bg-pink-100" : "hover:bg-pink-100"}`}
              onClick={() => setSelectedOrderId(order.order_id)}
            >
              <td className="border border-gray-300 px-4 py-2">
                {order.order_id}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {order.customer_name}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    order.status === "Complete"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {formatDate(order.date_ordered)}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                ₱{order.total_amount?.toFixed(2)}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {order.payment_method}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded border ${currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
            className={`px-3 py-1 rounded border ${currentPage === totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : ""}`}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviousSalesOrders;
