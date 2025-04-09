import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import {
  createPurchaseOrder,
  fetchPurchaseOrderDetails,
} from "../../api/purchaseOrder";
import { FiPlus, FiX } from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PurchaseOrder() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [newOrder, setNewOrder] = useState({
    supplier_id: "",
    expected_delivery: "",
    status: "Pending",
    remarks: "",
    items: [
      { item_id: "", quantity: 1, uom: "", unit_price: 0, total_price: 0 },
    ],
    ordered_by: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const uomOptions = ["pcs", "unit", "kg", "liter", "meter", "box", "pack"]; // Add your common UOMs

  const handleOrderDoubleClick = async (order) => {
    try {
      const detailedOrder = await fetchPurchaseOrderDetails(order.po_id); // Use order.po_id as that's your identifier
      setSelectedOrder(detailedOrder);
    } catch (error) {
      toast.error(`Error fetching order details: ${error.message}`);
    }
  };

  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchItems();

    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setNewOrder((prevOrder) => ({
          ...prevOrder,
          ordered_by: user.id,
        }));

        // Fetch staff name from staff_profiles
        const { data, error } = await supabase
          .from("staff_profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        if (data) setStaffName(data.name);
        else console.error("Could not fetch staff name", error);
      }
    };

    getUser();

    const sub = supabase
      .channel("purchase_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        fetchOrders
      )
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(
        "*, supplier:supplier_id(supplier_name), staff_profiles:ordered_by(name)"
      )
      .order("date_ordered", { ascending: false });
    if (error) {
      toast.error(`Error fetching orders: ${error.message}`);
    } else {
      setOrders(data);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from("management_supplier")
      .select("supplier_id, supplier_name");
    if (error) {
      toast.error(`Error fetching suppliers: ${error.message}`);
    } else {
      setSuppliers(data || []);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("management_inventoryitem")
      .select("item_id, item_name, supplier_id, selling_price");
    if (error) {
      toast.error(`Error fetching items: ${error.message}`);
    } else {
      console.log("Fetched Items from Supabase:", data);
      setItemsList(data || []);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!newOrder.supplier_id) {
      errors.supplier_id = "Supplier is required.";
    }
    if (!newOrder.expected_delivery) {
      errors.expected_delivery = "Expected delivery date is required.";
    }
    if (!newOrder.ordered_by) {
      errors.ordered_by = "Ordered by is required.";
    }
    newOrder.items.forEach((item, idx) => {
      if (!item.item_id || !item.uom || !item.quantity) {
        errors.items = errors.items || [];
        errors.items[idx] = {};
        if (!item.item_id) errors.items[idx].item_id = "Item is required.";
        if (!item.uom) errors.items[idx].uom = "UOM is required.";
        if (!item.quantity)
          errors.items[idx].quantity = "Quantity is required.";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddOrder = async () => {
    if (!validateForm()) return;
    const {
      supplier_id,
      items,
      expected_delivery,
      ordered_by,
      ...restOfOrderData
    } = newOrder;

    const poDataToSend = {
      supplier: supplier_id,
      ...restOfOrderData,
      expected_delivery: expected_delivery || null,
      ordered_by: ordered_by || null,
      items: items.map((item) => ({
        item: item.item_id,
        quantity: item.quantity,
        uom: item.uom,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
      })),
    };

    try {
      console.log("Data being sent to Django:", poDataToSend);
      const newPo = await createPurchaseOrder(poDataToSend);
      toast.success(`Purchase order created successfully! ${newPo.po_id}`);
      setShowModal(false);
      setNewOrder({
        supplier_id: "",
        expected_delivery: "",
        status: "Pending",
        remarks: "",
        items: [
          { item_id: "", quantity: 1, uom: "", unit_price: 0, total_price: 0 },
        ],
        ordered_by: "", // user?.id already set in useEffect
      });
      fetchOrders();
    } catch (error) {
      toast.error(`Error creating purchase order: ${error.message}`);
      console.error("Error creating purchase order:", error);
    }
  };

  const updateItemField = (idx, field, value) => {
    const updated = [...newOrder.items];
    updated[idx][field] =
      field === "quantity" || field === "unit_price"
        ? parseFloat(value) || 0
        : value;

    if (field === "item_id" && value) {
      const selectedItem = itemsList.find((item) => item.item_id === value);
      if (selectedItem) {
        updated[idx].unit_price = parseFloat(selectedItem.selling_price) || 0; // Auto-populate unit price
      } else {
        updated[idx].unit_price = 0; // Reset if no item selected
      }
    }

    updated[idx].total_price = updated[idx].quantity * updated[idx].unit_price;
    setNewOrder({ ...newOrder, items: updated });
  };

  const getTotalCost = () => {
    return newOrder.items.reduce(
      (acc, item) => acc + (parseFloat(item.total_price) || 0),
      0
    );
  };

  const paginatedOrders = orders
    .filter((o) => filterStatus === "All" || o.status === filterStatus)
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const generatePOReceipt = (po) => {
    const doc = new jsPDF();

    doc.text("Purchase Order Receipt", 14, 20);
    doc.text(`PO ID: ${po.po_id}`, 14, 30);
    doc.text(
      `Supplier: ${po.supplier?.supplier_name || po.supplier_id}`,
      14,
      40
    );
    doc.text(`Ordered by: ${po.ordered_by}`, 14, 50);

    autoTable(doc, {
      startY: 60,
      head: [["Item", "Qty", "UOM", "Unit Price", "Total"]],
      body: po.items.map((item) => [
        item.item?.item_name || item.item_id,
        item.quantity,
        item.uom,
        `₱${item.unit_price.toFixed(2)}`,
        `₱${item.total_price.toFixed(2)}`,
      ]),
    });

    doc.text(
      `Total Cost: ₱${po.total_cost.toFixed(2)}`,
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.save(`PO-${po.po_id}.pdf`);
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" reverseOrder={false} />{" "}
      {/* Toast container */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <FiPlus className="h-5 w-5 inline mr-2" /> New Purchase Order
        </button>
      </div>
      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border px-3 py-1 rounded"
        >
          {["All", "Pending", "Approved", "Completed", "Cancelled"].map(
            (status) => (
              <option key={status} value={status}>
                {status}
              </option>
            )
          )}
        </select>
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">PO ID</th>
              <th className="px-4 py-2 text-left">Supplier</th>
              <th className="px-4 py-2 text-left">Date Ordered</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.po_id}
                className="border-t cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => handleOrderDoubleClick(order)} // Use the new function here
              >
                <td className="px-4 py-2">{order.po_id}</td>
                <td className="px-4 py-2">
                  {order.supplier?.supplier_name || order.supplier_id}
                </td>
                <td className="px-4 py-2">
                  {new Date(order.date_ordered).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          className="px-3 py-1 border rounded"
        >
          Previous
        </button>
        <span className="px-4">Page {currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
      {/* Modal for Adding Order */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2"
              onClick={() => setShowModal(false)}
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
            <h2 className="text-xl font-bold mb-4">New Purchase Order</h2>
            {/* PO ID will be generated on backend, no need to display here for new orders */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Supplier</label>
                <select
                  value={newOrder.supplier_id}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, supplier_id: e.target.value })
                  }
                  className={`border p-2 rounded w-full ${
                    validationErrors.supplier_id ? "border-red-500" : ""
                  }`}
                  required
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
                {validationErrors.supplier_id && (
                  <p className="text-red-500 text-sm">
                    {validationErrors.supplier_id}
                  </p>
                )}
              </div>
              <div>
                <label className="block mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={newOrder.expected_delivery}
                  onChange={(e) =>
                    setNewOrder({
                      ...newOrder,
                      expected_delivery: e.target.value,
                    })
                  }
                  className={`border p-2 rounded w-full ${
                    validationErrors.expected_delivery ? "border-red-500" : ""
                  }`}
                  required
                />
                {validationErrors.expected_delivery && (
                  <p className="text-red-500 text-sm">
                    {validationErrors.expected_delivery}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block mb-1">Remarks</label>
                <textarea
                  value={newOrder.remarks}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, remarks: e.target.value })
                  }
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="grid grid-cols-6 gap-2 mb-2 font-semibold">
                {/* Header Row */}
                <label className="block text-sm col-span-2">Item</label>{" "}
                {/* Make "Item" span 2 columns */}
                <label className="block text-sm">UOM</label>
                <label className="block text-sm">Qty</label>
                <label className="block text-sm">Unit Price</label>
                <label className="block text-sm">Total</label>
                <div>
                  {/* Empty cell for the remove button if you add one later */}
                </div>
              </div>
              {newOrder.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 mb-2">
                  {/* Item Row */}
                  <div className="col-span-2">
                    <select
                      value={item.item_id}
                      onChange={(e) =>
                        updateItemField(idx, "item_id", e.target.value)
                      }
                      className={`border p-2 rounded w-full text-sm ${
                        validationErrors.items?.[idx]?.item_id
                          ? "border-red-500"
                          : ""
                      }`}
                      required
                    >
                      <option value="">Select Item</option>
                      {itemsList
                        .filter((i) => i.supplier_id === newOrder.supplier_id)
                        .map((i) => (
                          <option key={i.item_id} value={i.item_id}>
                            {i.item_name}
                          </option>
                        ))}
                    </select>
                    {validationErrors.items?.[idx]?.item_id && (
                      <p className="text-red-500 text-sm">
                        {validationErrors.items[idx].item_id}
                      </p>
                    )}
                  </div>
                  {/* UOM */}
                  <div>
                    <select
                      value={item.uom}
                      onChange={(e) =>
                        updateItemField(idx, "uom", e.target.value)
                      }
                      className={`border p-2 rounded w-full text-sm ${
                        validationErrors.items?.[idx]?.uom
                          ? "border-red-500"
                          : ""
                      }`}
                      required
                    >
                      <option value="">Select UOM</option>
                      {uomOptions.map((uom) => (
                        <option key={uom} value={uom}>
                          {uom}
                        </option>
                      ))}
                    </select>
                    {validationErrors.items?.[idx]?.uom && (
                      <p className="text-red-500 text-sm">
                        {validationErrors.items[idx].uom}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 || isNaN(value)) {
                          updateItemField(idx, "quantity", e.target.value);
                        }
                      }}
                      className={`border p-2 rounded w-full text-sm ${
                        validationErrors.items?.[idx]?.quantity
                          ? "border-red-500"
                          : ""
                      }`}
                      required
                    />
                    {validationErrors.items?.[idx]?.quantity && (
                      <p className="text-red-500 text-sm">
                        {validationErrors.items[idx].quantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItemField(idx, "unit_price", e.target.value)
                      }
                      className="border p-2 rounded w-full text-sm"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={item.total_price.toFixed(2)}
                      readOnly
                      className="border p-2 rounded w-full bg-gray-100 text-sm"
                    />
                  </div>
                </div>
              ))}
              {validationErrors.items &&
                typeof validationErrors.items === "string" && (
                  <p className="text-red-500 text-sm">
                    {validationErrors.items}
                  </p>
                )}
              <button
                onClick={() =>
                  setNewOrder({
                    ...newOrder,
                    items: [
                      ...newOrder.items,
                      {
                        item_id: "",
                        quantity: 1,
                        uom: "",
                        unit_price: 0,
                        total_price: 0,
                      },
                    ],
                  })
                }
                className="text-blue-500 text-sm mt-2"
              >
                + Add Item
              </button>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Ordered by: <span className="font-medium">{staffName}</span>
              </p>
              <p className="font-bold">
                Total Cost: ₱ {getTotalCost().toFixed(2)}
              </p>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                className="border border-gray-300 px-4 py-2 rounded"
                onClick={() =>
                  setNewOrder({
                    supplier_id: "",
                    expected_delivery: "",
                    status: "Pending",
                    remarks: "",
                    items: [
                      {
                        item_id: "",
                        quantity: 1,
                        uom: "",
                        unit_price: 0,
                        total_price: 0,
                      },
                    ],
                  })
                }
              >
                Clear
              </button>
              <button
                className={`px-4 py-2 rounded ${
                  newOrder.ordered_by
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
                disabled={!newOrder.ordered_by}
                onClick={handleAddOrder}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2"
              onClick={() => setSelectedOrder(null)}
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
            <h2 className="text-xl font-bold mb-4">Order Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <strong>PO ID:</strong> {selectedOrder.po_id}
              </div>
              <div>
                <strong>Supplier:</strong>{" "}
                {selectedOrder.supplier?.supplier_name ||
                  selectedOrder.supplier_id}
              </div>
              <div>
                <strong>Expected Delivery:</strong>{" "}
                {selectedOrder.expected_delivery
                  ? new Date(
                      selectedOrder.expected_delivery
                    ).toLocaleDateString()
                  : "Not Specified"}
              </div>
              <div>
                <strong>Date Ordered:</strong>{" "}
                {new Date(selectedOrder.date_ordered).toLocaleDateString()}
              </div>
              <div>
                <strong>Status:</strong> {selectedOrder.status}
              </div>
              <div>
                <strong>Remarks:</strong>{" "}
                {selectedOrder.remarks ? (
                  <span>{selectedOrder.remarks}</span>
                ) : (
                  <span className="italic text-gray-500">None</span>
                )}
              </div>
            </div>

            <h3 className="font-semibold mb-2">Ordered Items</h3>
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              <div className="overflow-x-auto mb-4">
                <table className="w-full table-auto border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-left">Unit</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          {item.item?.item_name || item.item_id}
                        </td>
                        <td className="px-4 py-2">{item.uom}</td>
                        <td className="px-4 py-2 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {typeof item.unit_price === "number"
                            ? item.unit_price.toFixed(2)
                            : "N/A"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {typeof item.total_price === "number"
                            ? item.total_price.toFixed(2)
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No items in this order.</p>
            )}

            <div className="mt-4 flex flex-col items-end">
              {" "}
              {/* Changed to flex-col and items-end */}
              <p className="text-sm text-gray-600 self-start mb-2">
                {" "}
                {/* Added self-start for alignment */}
                Ordered by: <span className="font-medium">{staffName}</span>
              </p>
              <p className="font-bold mb-2">
                {" "}
                {/* Added mb-2 for spacing */}
                Total Cost: ₱{" "}
                {typeof selectedOrder.total_cost === "number"
                  ? selectedOrder.total_cost.toFixed(2)
                  : "0.00"}
              </p>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={() => generatePOReceipt(selectedOrder)}
              >
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
