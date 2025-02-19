import { useEffect, useState } from "react";
import { fetchSalesOrders, confirmOrder, deleteOrder } from "../../api/sales";


const PendingSalesOrders = () => {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [inProgressOrders, setInProgressOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const pending = await fetchPendingOrders();
            const inProgress = await fetchInProgressOrders();
            setPendingOrders(pending);
            setInProgressOrders(inProgress);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        }
    };

    const handleConfirmOrder = async (orderId) => {
        try {
            await confirmOrder(orderId);
            alert("Order confirmed successfully.");
            loadOrders();
        } catch (error) {
            console.error("Failed to confirm order:", error);
            alert("Failed to confirm order.");
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to delete this order?")) return;
        try {
            await deleteOrder(orderId);
            alert("Order deleted successfully.");
            loadOrders();
        } catch (error) {
            console.error("Failed to delete order:", error);
            alert("Failed to delete order.");
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Pending Sales Orders</h1>
            
            {/* Pending Orders */}
            <h2 className="text-xl font-bold mb-2">Pending</h2>
            <table className="table-auto w-full mb-4">
                <thead className="bg-red-200">
                    <tr>
                        <th className="px-4 py-2">Customer</th>
                        <th className="px-4 py-2">Order Date</th>
                        <th className="px-4 py-2">Payment Method</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">Total Amount</th>
                        <th className="px-4 py-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pendingOrders.map((order) => (
                        <tr key={order.id}>
                            <td className="px-4 py-2">{order.customer}</td>
                            <td className="px-4 py-2">{order.orderDate}</td>
                            <td className="px-4 py-2">{order.paymentMethod}</td>
                            <td className="px-4 py-2">{order.location}</td>
                            <td className="px-4 py-2">₱{order.totalAmount}</td>
                            <td className="px-4 py-2">
                                <button 
                                    onClick={() => handleConfirmOrder(order.id)} 
                                    className="bg-green-500 text-white px-4 py-1 rounded"
                                >Confirm</button>
                                <button 
                                    onClick={() => handleDeleteOrder(order.id)} 
                                    className="bg-red-500 text-white px-4 py-1 rounded"
                                >Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* In Progress Orders */}
            <h2 className="text-xl font-bold mb-2">In Progress</h2>
            <input
                type="text"
                placeholder="Search..."
                className="border border-gray-300 rounded px-4 py-2 w-full mb-4"
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
                        <th className="px-4 py-2">Delivery Status</th>
                        <th className="px-4 py-2">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {inProgressOrders.filter(order => 
                        Object.values(order).some(field => 
                            String(field).toLowerCase().includes(searchTerm.toLowerCase())
                        )
                    ).map((order) => (
                        <tr key={order.id}>
                            <td className="border px-4 py-2">{order.soId}</td>
                            <td className="border px-4 py-2">{order.customer}</td>
                            <td className="border px-4 py-2">{order.orderDate}</td>
                            <td className="border px-4 py-2">{order.paymentMethod}</td>
                            <td className="border px-4 py-2">{order.location}</td>
                            <td className="border px-4 py-2">{order.deliveryStatus}</td>
                            <td className="border px-4 py-2">₱{order.totalAmount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PendingSalesOrders;
