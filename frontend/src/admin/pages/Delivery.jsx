import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { DateTime } from "luxon";
import { FiEye } from "react-icons/fi";
import toast from "react-hot-toast";

export default function DeliveryManagement() {
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select(
          `*, orders(order_id, customer_name, shipping_address, items), staff_profiles(name)`
        )
        .order("delivery_date", { ascending: false });

      if (error) {
        toast.error("Failed to fetch deliveries");
        console.error(error);
      } else {
        setDeliveries(data || []);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("An error occurred while fetching deliveries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Subscribe to real-time updates for deliveries
    const deliverySub = supabase
      .channel("deliveries-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        (payload) => {
          console.log("Delivery update received:", payload);
          fetchDeliveries();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for orders
    const orderSub = supabase
      .channel("orders-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("Order update received:", payload);
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      deliverySub.unsubscribe();
      orderSub.unsubscribe();
    };
  }, []);

  const formatDate = (isoDate) => {
    if (!isoDate) return "—";
    return DateTime.fromISO(isoDate)
      .setZone("Asia/Manila")
      .toFormat("MMM dd, yyyy hh:mm a");
  };

  const handleStatusUpdate = async (delivery_id, newStatus) => {
    try {
      const updateFields = { status: newStatus };
      if (newStatus === "Delivered") {
        updateFields.date_delivered = new Date().toISOString();
      }

      const { error } = await supabase
        .from("deliveries")
        .update(updateFields)
        .eq("delivery_id", delivery_id)
        .select();

      if (error) {
        toast.error("Failed to update delivery status");
        console.error(error);
      } else {
        toast.success(`Marked as ${newStatus}`);
        // Update local state immediately
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) =>
            delivery.delivery_id === delivery_id
              ? {
                  ...delivery,
                  status: newStatus,
                  date_delivered: updateFields.date_delivered,
                }
              : delivery
          )
        );
      }
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("An error occurred while updating the status");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Delivery Management</h1>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500">Loading deliveries...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Delivery ID</th>
                <th className="p-2 border">Order ID</th>
                <th className="p-2 border">Customer</th>
                <th className="p-2 border">Delivery Date</th>
                <th className="p-2 border">Driver</th>
                <th className="p-2 border">Vehicle</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr
                  key={delivery.delivery_id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-2">{delivery.delivery_id}</td>
                  <td className="p-2">{delivery.order_id}</td>
                  <td className="p-2">
                    {delivery.orders?.customer_name || "—"}
                  </td>
                  <td className="p-2">{formatDate(delivery.delivery_date)}</td>
                  <td className="p-2">
                    {delivery.staff_profiles?.name || "—"}
                  </td>
                  <td className="p-2">{delivery.vehicle || "—"}</td>
                  <td className="p-2">
                    <span
                      className={`font-semibold ${
                        delivery.status === "In Transit"
                          ? "text-blue-600"
                          : delivery.status === "Delivered"
                          ? "text-green-600"
                          : delivery.status === "Scheduled"
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }`}
                    >
                      {delivery.status}
                    </span>
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                    {delivery.status === "In Transit" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(delivery.delivery_id, "Delivered")
                        }
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-gray-500 py-4">
                    No deliveries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative">
            <button
              onClick={() => setSelectedDelivery(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-2">Delivery Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <strong>Order ID:</strong> {selectedDelivery.order_id}
              </p>
              <p>
                <strong>Customer:</strong>{" "}
                {selectedDelivery.orders?.customer_name}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {selectedDelivery.orders?.shipping_address}
              </p>
              <p>
                <strong>Driver:</strong> {selectedDelivery.staff_profiles?.name}
              </p>
              <p>
                <strong>Vehicle:</strong> {selectedDelivery.vehicle || "—"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`font-semibold ${
                    selectedDelivery.status === "In Transit"
                      ? "text-blue-600"
                      : selectedDelivery.status === "Delivered"
                      ? "text-green-600"
                      : selectedDelivery.status === "Scheduled"
                      ? "text-yellow-600"
                      : "text-gray-600"
                  }`}
                >
                  {selectedDelivery.status}
                </span>
              </p>
              <p>
                <strong>Delivery Date:</strong>{" "}
                {formatDate(selectedDelivery.delivery_date)}
              </p>
              <p>
                <strong>Date Delivered:</strong>{" "}
                {formatDate(selectedDelivery.date_delivered)}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="font-bold mb-1">Delivered Items</h3>
              <ul className="list-disc list-inside text-sm">
                {selectedDelivery.orders?.items &&
                  JSON.parse(selectedDelivery.orders.items).map((item, idx) => (
                    <li key={idx}>
                      {item.item_name} – {item.quantity} {item.uom}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
