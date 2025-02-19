import { useEffect, useState } from "react";
import { fetchSalesOrders } from "../../api/sales";

const formatDate = (dateString) => {
    const options = {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    };
    return new Date(dateString).toLocaleString("en-US", options);
};

const PreviousSalesOrders = () => {
    const [salesOrders, setSalesOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ordersPerPage = 10;

    useEffect(() => {
        const loadSalesOrders = async () => {
            try {
                const data = await fetchSalesOrders();
                setSalesOrders(data);
            } catch (error) {
                console.error("Failed to load sales orders:", error);
            }
        };
        loadSalesOrders();
    }, []);

    const filteredOrders = salesOrders.filter((order) =>
        Object.values(order).some((field) =>
            String(field).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Previous Sales Orders</h1>
            <input
                type="text"
                placeholder="Search..."
                className="border border-gray-300 rounded px-4 py-2 w-1/3 mb-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <table className="table-auto w-full">
                <thead className="bg-red-200">
                    <tr>
                        <th className="px-4 py-2">SO ID</th>
                        <th className="px-4 py-2">Customer</th>
                        <th className="px-4 py-2">Order Date</th>
                        <th className="px-4 py-2">Payment Method</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">Delivery Date</th>
                        <th className="px-4 py-2">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {currentOrders.map((order) => (
                        <tr key={order.so_id} className="border border-gray-300">
                            <td className="px-4 py-2">{order.so_id}</td>
                            <td className="px-4 py-2">{order.customer}</td>
                            <td className="px-4 py-2">{formatDate(order.order_date)}</td>
                            <td className="px-4 py-2">{order.payment_method}</td>
                            <td className="px-4 py-2">{order.location}</td>
                            <td className="px-4 py-2">{formatDate(order.delivery_date)}</td>
                            <td className="px-4 py-2">₱{order.total_amount.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-center mt-4">
                {[...Array(Math.ceil(filteredOrders.length / ordersPerPage)).keys()].map((number) => (
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
