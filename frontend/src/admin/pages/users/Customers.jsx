import { useState, useEffect } from "react";
import { fetchCustomers, deleteCustomer } from "../../../api/customers";
import { Link } from "react-router-dom";
import axios from "../../../api/api";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer to delete.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedCustomer.name}?`
      )
    ) {
      try {
        await deleteCustomer(selectedCustomer.customer_id);
        setCustomers(
          customers.filter((c) => c.customer_id !== selectedCustomer.customer_i)
        );
        alert("Customer deleted successfully.");
        setSelectedCustomer(null);
      } catch (error) {
        console.error("Failed to delete customer:", error);
        alert("Failed to delete customer.");
      }
    }
  };

  const activateCustomer = async (id) => {
    try {
      await axios.post(`/customers/${id}/activate/`);
      alert("Customer activated!");
      loadCustomers();
    } catch (error) {
      alert(error.response?.data?.error || "Activation failed.");
    }
  };

  const filtered = customers.filter((c) =>
    Object.values(c).some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Customer Management</h1>

      {/* Search Bar and Buttons */}
      <div className="flex items-center mb-6">
        <input
          type="text"
          placeholder="Search customers..."
          className="border px-4 py-2 w-1/3 rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={handleDeleteCustomer}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Delete
        </button>
        <Link
          to={`/admin/users/customers/${selectedCustomer?.customer_id || ""}`}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Update
        </Link>
      </div>

      {/* Customer Table */}
      <table className="table-auto w-full">
        <thead className="bg-red-200">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Company</th>
            <th className="p-2 border">Contact</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.id}
              className={`cursor-pointer ${
                selectedCustomer?.customer_i === c.customer_i
                  ? "bg-gray-100"
                  : ""
              }`}
              onClick={() => setSelectedCustomer(c)}
            >
              <td className="border border-gray-300 px-4 py-2">
                {c.customer_id}
              </td>
              <td className="border border-gray-300 px-4 py-2">{c.name}</td>
              <td className="border border-gray-300 px-4 py-2">{c.email}</td>
              <td className="border border-gray-300 px-4 py-2">{c.company}</td>
              <td className="border border-gray-300 px-4 py-2">{c.contact}</td>
              <td className="border border-gray-300 px-4 py-2">
                <Link
                  to={`/admin/users/customers/${c.customer_id}`}
                  className="text-blue-500 underline"
                >
                  View Details
                </Link>
              </td>
              <td className="border px-4 py-2">
                {c.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </td>
              <td className="border px-4 py-2">
                {!c.is_active && (
                  <button
                    onClick={() => activateCustomer(c.customer_id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  >
                    Activate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerManagement;
