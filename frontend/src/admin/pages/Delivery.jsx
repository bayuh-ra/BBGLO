import { useEffect, useState } from "react";
import { fetchDeliveries, updateDeliveryStatus } from "../../api/delivery";

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      const data = await fetchDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error("Error loading deliveries:", error);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedDelivery) {
      alert("Please select an order to update.");
      return;
    }

    try {
      await updateDeliveryStatus(selectedDelivery.id, status);
      alert("Delivery status updated successfully!");
      loadDeliveries();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Delivery Management</h1>

      {/* Delivery Table */}
      <table className="w-full">
        <thead className="bg-red-200">
          <tr>
            <th className="px-4 py-2">Order ID</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Driver</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr
              key={delivery.id}
              onClick={() => setSelectedDelivery(delivery)}
              className={`cursor-pointer ${
                selectedDelivery?.id === delivery.id ? "bg-gray-200" : ""
              }`}
            >
              <td className="border px-4 py-2">{delivery.order_id}</td>
              <td className="border px-4 py-2">{delivery.customer_name}</td>
              <td className="border px-4 py-2">{delivery.driver || "Not Assigned"}</td>
              <td className="border px-4 py-2">{delivery.status}</td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => handleStatusUpdate("Packed")}
                  className="bg-yellow-400 px-2 py-1 rounded text-white mr-2"
                >
                  Mark Packed
                </button>
                <button
                  onClick={() => handleStatusUpdate("In Transit")}
                  className="bg-blue-400 px-2 py-1 rounded text-white mr-2"
                >
                  Mark In Transit
                </button>
                <button
                  onClick={() => handleStatusUpdate("Delivered")}
                  className="bg-green-400 px-2 py-1 rounded text-white"
                >
                  Mark Delivered
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Display Selected Order Details */}
      {selectedDelivery && (
        <div className="mt-4 p-4 border border-gray-300 rounded">
          <h2 className="text-xl font-bold mb-2">Selected Order Details</h2>
          <p><strong>Order ID:</strong> {selectedDelivery.order_id}</p>
          <p><strong>Customer:</strong> {selectedDelivery.customer_name}</p>
          <p><strong>Current Status:</strong> {selectedDelivery.status}</p>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
