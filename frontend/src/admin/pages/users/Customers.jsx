import { useState, useEffect } from "react";
import { fetchCustomers } from "../../../api/customers";
import axios from "../../../api/api";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown } from "lucide-react";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filter, setFilter] = useState("All");
  const [editFormData, setEditFormData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to load customers:", error);
      alert("❌ Failed to load customers.");
    }
  };

  const handleDelete = async (customer_id) => {
    try {
      await axios.delete(`/customer/${customer_id}/`);
      setCustomers(customers.filter((c) => c.customer_id !== customer_id));
      setSelectedCustomer(null);
      setShowConfirmModal(false);
      setEditFormData(null);
      alert("✅ Customer deleted successfully!");
      navigate("/admin/deleted-accounts"); // ✅ Redirect after deletion
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("❌ Failed to delete customer. Please try again.");
    }
  };

  const handleActivate = async (customer_id) => {
    try {
      await axios.patch(`/customer/${customer_id}/`, { status: "Active" });
      setCustomers(
        customers.map((cust) =>
          cust.customer_id === customer_id
            ? { ...cust, status: "Active" }
            : cust
        )
      );
      setShowConfirmModal(false);
      setSelectedCustomer(null);
      setEditFormData(null);
      alert("✅ Customer activated successfully!");
    } catch (error) {
      console.error("Failed to activate:", error);
      alert("❌ Failed to activate customer. Please try again.");
    }
  };

  const handleDeactivate = async (customer_id) => {
    try {
      await axios.patch(`/customer/${customer_id}/`, { status: "Deactivated" });
      setCustomers(
        customers.map((cust) =>
          cust.customer_id === customer_id
            ? { ...cust, status: "Deactivated" }
            : cust
        )
      );
      setShowConfirmModal(false);
      setSelectedCustomer(null);
      setEditFormData(null);
      alert("✅ Customer deactivated successfully!");
    } catch (error) {
      console.error("Failed to deactivate:", error);
      alert("❌ Failed to deactivate customer. Please try again.");
    }
  };

  const handleEdit = () => setEditFormData({ ...selectedCustomer });

  const handleEditChange = (e) =>
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleSaveEdit = async () => {
    try {
      const response = await axios.patch(
        `/customer/${editFormData.customer_id}/`,
        editFormData
      );
      setCustomers(
        customers.map((cust) =>
          cust.customer_id === editFormData.customer_id ? response.data : cust
        )
      );
      setSelectedCustomer(response.data);
      setEditFormData(null);
      setShowConfirmModal(false);
      alert("✅ Customer updated successfully!");
    } catch (error) {
      console.error("Failed to save changes:", error);
      alert("❌ Failed to save changes. Please try again.");
    }
  };

  const showConfirmation = (action, message, callback) => {
    setConfirmAction(() => callback);
    setConfirmMessage(message);
    setShowConfirmModal(true);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      if (sortConfig.key === "customer_id") {
        const idA = parseInt(a.customer_id.split("-")[1], 10);
        const idB = parseInt(b.customer_id.split("-")[1], 10);
        return sortConfig.direction === "asc" ? idA - idB : idB - idA;
      } else if (sortConfig.key === "name") {
        return sortConfig.direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortConfig.key === "company") {
        return sortConfig.direction === "asc"
          ? (a.company || "").localeCompare(b.company || "")
          : (b.company || "").localeCompare(a.company || "");
      } else if (sortConfig.key === "contact") {
        return sortConfig.direction === "asc"
          ? (a.contact || "").localeCompare(b.contact || "")
          : (b.contact || "").localeCompare(a.contact || "");
      } else if (sortConfig.key === "status") {
        return sortConfig.direction === "asc"
          ? (a.status || "").localeCompare(b.status || "")
          : (b.status || "").localeCompare(a.status || "");
      }
      return 0;
    });
  };

  const filtered = getSortedData(
    customers.filter((cust) => {
      const matchesSearch = `${cust.name} ${cust.company} ${cust.contact}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "All" || cust.status === filter;
      return cust.status !== "Deleted" && matchesSearch && matchesFilter;
    })
  );

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Helper: get all customer IDs on current page
  const customerIdsOnPage = paginated.map(cust => cust.customer_id);
  const allCustomersSelected = customerIdsOnPage.length > 0 && customerIdsOnPage.every(id => selectedCustomerIds.includes(id));

  // Checkbox handlers
  const handleMasterCheckbox = () => {
    if (allCustomersSelected) {
      setSelectedCustomerIds(selectedCustomerIds.filter(id => !customerIdsOnPage.includes(id)));
    } else {
      setSelectedCustomerIds([
        ...selectedCustomerIds.filter(id => !customerIdsOnPage.includes(id)),
        ...customerIdsOnPage
      ]);
    }
  };
  const handleRowCheckbox = (id) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Bulk delete handler
  const handleBulkDelete = async (e) => {
    e.preventDefault();
    if (selectedCustomerIds.length === 0) {
      window.alert("Please select at least one customer to remove.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete the selected customers? This cannot be undone.")) return;
    try {
      await Promise.all(selectedCustomerIds.map(id => axios.delete(`/customer/${id}/`)));
      setCustomers(prev => prev.filter(cust => !selectedCustomerIds.includes(cust.customer_id)));
      setSelectedCustomerIds([]);
      window.alert("✅ Selected customers deleted.");
    } catch (e) {
      window.alert("❌ Failed to delete some customers. Please try again.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">
          Customer Management
        </h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            className="border rounded px-4 py-2 w-full sm:w-64"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-4 py-2"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate("/admin/deleted-accounts")}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            View Deleted Accounts
          </button>
          {customerIdsOnPage.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded font-semibold bg-red-500 text-white hover:bg-red-600"
            >
              Remove Selected
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-pink-200">
            <tr>
              <th className="p-2 border border-red-200 text-center">
                <input
                  type="checkbox"
                  checked={allCustomersSelected}
                  onChange={handleMasterCheckbox}
                  className="accent-pink-500"
                />
              </th>
              <th
                className="p-2 border border-red-200 text-left cursor-pointer select-none"
                onClick={() => handleSort("customer_id")}
              >
                <span className="flex items-center">
                  ID
                  {sortConfig.key === "customer_id" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="p-2 border border-red-200 text-left cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <span className="flex items-center">
                  Name
                  {sortConfig.key === "name" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th className="p-2 border border-red-200 text-left">Email</th>
              <th
                className="p-2 border border-red-200 text-left cursor-pointer select-none"
                onClick={() => handleSort("company")}
              >
                <span className="flex items-center">
                  Company
                  {sortConfig.key === "company" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="p-2 border border-red-200 text-left cursor-pointer select-none"
                onClick={() => handleSort("contact")}
              >
                <span className="flex items-center">
                  Contact
                  {sortConfig.key === "contact" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="p-2 border border-red-200 text-left cursor-pointer select-none"
                onClick={() => handleSort("status")}
              >
                <span className="flex items-center">
                  Status
                  {sortConfig.key === "status" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
              <th className="p-2 border border-red-200 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((cust) => (
              <tr
                key={cust.id}
                className={`hover:bg-pink-100 cursor-pointer ${
                  selectedCustomer?.id === cust.id ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelectedCustomer(cust)}
              >
                <td className="border border-gray-300 px-4 py-2 text-center" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.includes(cust.customer_id)}
                    onChange={() => handleRowCheckbox(cust.customer_id)}
                    className="accent-pink-500"
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {cust.customer_id}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {cust.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {cust.email}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {cust.company}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {cust.contact}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">
                  {cust.status}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left space-x-2">
                  {cust.status === "Active" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirmation(
                          "deactivate",
                          "Are you sure you want to deactivate this customer?",
                          () => handleDeactivate(cust.customer_id)
                        );
                      }}
                      className="text-yellow-600 font-semibold hover:underline"
                    >
                      Deactivate
                    </button>
                  ) : cust.status === "Deactivated" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirmation(
                          "activate",
                          "Are you sure you want to activate this customer?",
                          () => handleActivate(cust.customer_id)
                        );
                      }}
                      className="text-green-600 font-semibold hover:underline"
                    >
                      Activate
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing{" "}
          {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
          {filtered.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded border ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded border ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3 className="text-lg font-bold text-gray-700 mb-3">
              Customer Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p>
                <strong>ID:</strong> {selectedCustomer.customer_id}
              </p>
              <p>
                <strong>Name:</strong> {selectedCustomer.name}
              </p>
              <p>
                <strong>Email:</strong> {selectedCustomer.email}
              </p>
              <p>
                <strong>Company:</strong> {selectedCustomer.company}
              </p>
              <p>
                <strong>Contact:</strong> {selectedCustomer.contact}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {selectedCustomer.status === "Active"
                  ? "Active"
                  : "Deactivated"}
              </p>
            </div>
            <div className="mt-4 space-x-4">
              {selectedCustomer.status === "Active" && (
                <>
                  <button
                    onClick={() =>
                      showConfirmation(
                        "edit",
                        "Are you sure you want to edit this customer?",
                        handleEdit
                      )
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Edit Customer
                  </button>
                  <button
                    onClick={() =>
                      showConfirmation(
                        "deactivate",
                        "Are you sure you want to deactivate this customer?",
                        () => handleDeactivate(selectedCustomer.customer_id)
                      )
                    }
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                  >
                    Deactivate
                  </button>
                </>
              )}
              {selectedCustomer.status === "Deactivated" && (
                <button
                  onClick={() =>
                    showConfirmation(
                      "activate",
                      "Are you sure you want to activate this customer?",
                      () => handleActivate(selectedCustomer.customer_id)
                    )
                  }
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Activate
                </button>
              )}
              <button
                onClick={() =>
                  showConfirmation(
                    "delete",
                    "Are you sure you want to delete this customer? This action cannot be undone.",
                    () => handleDelete(selectedCustomer.customer_id)
                  )
                }
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-md w-full mx-4 relative">
            <h3 className="text-lg font-bold text-gray-700 mb-3">
              Confirm Action
            </h3>
            <p className="mb-4">{confirmMessage}</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmAction()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {editFormData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => setEditFormData(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3 className="text-lg font-bold mb-4 text-gray-700">
              Edit Customer
            </h3>
            <div className="space-y-4">
              {[
                { label: "Name", name: "name", required: true },
                { label: "Email", name: "email", required: true },
                { label: "Company", name: "company", required: true },
                { label: "Contact", name: "contact", required: true },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}{" "}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    name={field.name}
                    value={editFormData[field.name] ?? ""}
                    onChange={handleEditChange}
                    placeholder={field.label}
                    className="border p-2 rounded w-full"
                    required={field.required}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={() => setEditFormData(null)}
                className="bg-gray-500 text-white px-5 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
