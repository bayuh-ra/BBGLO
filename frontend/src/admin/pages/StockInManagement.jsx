import { useEffect, useState } from "react";
import { fetchStockInRecords, addStockInRecord } from "@/api/stockin";
import { fetchInventoryItems } from "@/api/inventory";
import { fetchEmployees } from "@/api/employees";
import { fetchSuppliers } from "@/api/supplier";
import { fetchPurchaseOrders } from "@/api/purchaseOrder"; // ✅ Add this API call

const StockInManagement = () => {
  const [records, setRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [staff, setStaff] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]); // ✅ For PO list
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    remarks: "",
    stocked_by_id: "",
    supplier_id: "",
    purchase_order_id: "", // ✅ new
  });

  const loadData = async () => {
    const [stockIns, items, employees, vendors, pos] = await Promise.all([
      fetchStockInRecords(),
      fetchInventoryItems(),
      fetchEmployees(),
      fetchSuppliers(),
      fetchPurchaseOrders(), // ✅ Fetch POs
    ]);
    setRecords(stockIns);
    setInventory(items);
    setStaff(employees);
    setSuppliers(vendors);
    setPurchaseOrders(pos);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.item_id || !form.quantity || !form.stocked_by_id) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await addStockInRecord({
        ...form,
        quantity: parseInt(form.quantity),
      });
      setShowModal(false);
      setForm({
        item_id: "",
        quantity: "",
        remarks: "",
        stocked_by_id: "",
        supplier_id: "",
        purchase_order_id: "",
      });
      loadData();
    } catch (err) {
      console.error("Failed to submit stock-in record", err);
      alert("Failed to add stock-in record.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Stock-In Management</h1>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Add Stock-In
      </button>

      <table className="table-auto w-full border text-sm">
        <thead className="bg-red-200">
          <tr>
            <th className="border px-2 py-1">Stock-In ID</th>
            <th className="border px-2 py-1">Item</th>
            <th className="border px-2 py-1">Quantity</th>
            <th className="border px-2 py-1">Stocked By</th>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.stockin_id}>
              <td className="border px-2 py-1">{rec.stockin_id}</td>
              <td className="border px-2 py-1">{rec.item_name}</td>
              <td className="border px-2 py-1">{rec.quantity}</td>
              <td className="border px-2 py-1">{rec.stocked_by_name || "—"}</td>
              <td className="border px-2 py-1">{rec.created_at}</td>
              <td className="border px-2 py-1">{rec.remarks || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Stock-In Record</h2>

            {/* Item */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Item</label>
              <select
                name="item_id"
                value={form.item_id}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Select Item</option>
                {inventory.map((inv) => (
                  <option key={inv.item_id} value={inv.item_id}>
                    {inv.item_name} ({inv.brand}, {inv.size})
                  </option>
                ))}
              </select>
            </div>

            {/* Staff */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">
                Stocked By
              </label>
              <select
                name="stocked_by_id"
                value={form.stocked_by_id}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Select Staff</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Supplier</label>
              <select
                name="supplier_id"
                value={form.supplier_id}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.business_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Order */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">
                Purchase Order
              </label>
              <select
                name="purchase_order_id"
                value={form.purchase_order_id}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Optional - Link to PO</option>
                {purchaseOrders.map((po) => (
                  <option key={po.po_id} value={po.po_id}>
                    {po.po_id} ({po.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            {/* Remarks */}
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium">Remarks</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInManagement;
