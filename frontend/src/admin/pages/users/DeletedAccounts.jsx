import { useEffect, useState } from "react";
import { fetchEmployees } from "../../../api/employees";
import { fetchCustomers } from "../../../api/customers";
import axios from "../../../api/api";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown } from "lucide-react";

const DeletedAccounts = () => {
  const navigate = useNavigate();
  const [deletedData, setDeletedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("All");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState({});

  useEffect(() => {
    const loadDeletedAccounts = async () => {
      const empData = await fetchEmployees();
      const custData = await fetchCustomers();

      const deletedEmps = empData
        .filter((emp) => emp.status === "Deleted")
        .map((emp) => ({ ...emp, accountType: "Employee" }));

      const deletedCusts = custData
        .filter((cust) => cust.status === "Deleted")
        .map((cust) => ({ ...cust, accountType: "Customer" }));

      const combined = [...deletedEmps, ...deletedCusts];
      setDeletedData(combined);
      setFilteredData(combined);
    };

    loadDeletedAccounts();
  }, []);

  useEffect(() => {
    const result = deletedData.filter((acc) => {
      const matchesSearch = `${acc.name} ${acc.contact}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType =
        accountTypeFilter === "All" || acc.accountType === accountTypeFilter;
      return matchesSearch && matchesType;
    });
    setFilteredData(result);
  }, [search, accountTypeFilter, deletedData]);

  const handleActivate = async (acc) => {
    try {
      if (acc.accountType === "Employee") {
        await axios.patch(`/staff-profiles/${acc.staff_id}/activate/`);
      } else {
        await axios.patch(`/customer/${acc.customer_id}/status/`, {
          action: "activate",
        });
      }

      // Remove reactivated account from UI
      setDeletedData((prev) =>
        prev.filter(
          (x) =>
            x.staff_id !== acc.staff_id && x.customer_id !== acc.customer_id
        )
      );

      setShowConfirmModal(false);
      setSelectedAccount(null);
      alert("✅ Account activated successfully!");
    } catch (error) {
      console.error("Failed to activate:", error);
      alert("❌ Failed to activate. Please try again.");
    }
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
      let aVal = a[sortConfig.key] || "";
      let bVal = b[sortConfig.key] || "";
      if (sortConfig.key === "id") {
        aVal = a.staff_id || a.customer_id || "";
        bVal = b.staff_id || b.customer_id || "";
      } else if (sortConfig.key === "updated_at") {
        aVal = a.updated_at || a.created_at || "";
        bVal = b.updated_at || b.created_at || "";
      }
      aVal = (aVal || "").toString().toLowerCase();
      bVal = (bVal || "").toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sorted = getSortedData(filteredData);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Helper: get all employee and customer IDs on current page
  const employeeIdsOnPage = paginated.filter(acc => acc.accountType === "Employee").map(acc => acc.staff_id);
  const customerIdsOnPage = paginated.filter(acc => acc.accountType === "Customer").map(acc => acc.customer_id);
  const allEmployeesSelected = employeeIdsOnPage.length > 0 && employeeIdsOnPage.every(id => selectedEmployeeIds.includes(id));
  const allCustomersSelected = customerIdsOnPage.length > 0 && customerIdsOnPage.every(id => selectedCustomerIds.includes(id));

  // Checkbox handlers
  const handleMasterCheckbox = () => {
    // Select/deselect all employees and customers on page
    let newSelectedEmployees = selectedEmployeeIds;
    let newSelectedCustomers = selectedCustomerIds;
    if (allEmployeesSelected && allCustomersSelected) {
      newSelectedEmployees = selectedEmployeeIds.filter(id => !employeeIdsOnPage.includes(id));
      newSelectedCustomers = selectedCustomerIds.filter(id => !customerIdsOnPage.includes(id));
    } else {
      newSelectedEmployees = [
        ...selectedEmployeeIds.filter(id => !employeeIdsOnPage.includes(id)),
        ...employeeIdsOnPage
      ];
      newSelectedCustomers = [
        ...selectedCustomerIds.filter(id => !customerIdsOnPage.includes(id)),
        ...customerIdsOnPage
      ];
    }
    setSelectedEmployeeIds(newSelectedEmployees);
    setSelectedCustomerIds(newSelectedCustomers);
  };
  const handleRowCheckbox = (id, type) => {
    if (type === "Employee") {
      setSelectedEmployeeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelectedCustomerIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async (e) => {
    e.preventDefault();
    if (selectedEmployeeIds.length === 0 && selectedCustomerIds.length === 0) {
      window.alert("Please select at least one account to remove.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete the selected accounts? This cannot be undone.")) return;
    try {
      // Delete employees
      await Promise.all(selectedEmployeeIds.map(id => axios.delete(`/staff-profiles/${id}/`)));
      // Delete customers
      await Promise.all(selectedCustomerIds.map(id => axios.delete(`/customer/${id}/`)));
      setDeletedData(prev => prev.filter(acc =>
        !((acc.accountType === "Employee" && selectedEmployeeIds.includes(acc.staff_id)) ||
          (acc.accountType === "Customer" && selectedCustomerIds.includes(acc.customer_id)))
      ));
      setSelectedEmployeeIds([]);
      setSelectedCustomerIds([]);
      window.alert("✅ Selected accounts deleted.");
    } catch (e) {
      window.alert("❌ Failed to delete some accounts. Please try again.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back
          </button>
          <h2 className="text-3xl font-bold text-gray-800">Deleted Accounts</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-0 flex gap-4 items-center">
          <input
            type="text"
            className="border rounded px-4 py-2 w-full sm:w-1/3"
            placeholder="Search deleted accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            className="border rounded px-4 py-2"
          >
            <option value="All">All</option>
            <option value="Employee">Employee</option>
            <option value="Customer">Customer</option>
          </select>
        </div>
        {(employeeIdsOnPage.length > 0 || customerIdsOnPage.length > 0) && (
          <div className="mb-2 flex-shrink-0">
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-none hover:bg-red-600 transition-colors duration-300"
            >
              Remove Selected{Object.values(selectedAccounts).filter(Boolean).length > 0 ? ` (${Object.values(selectedAccounts).filter(Boolean).length})` : ""}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-none">
        <table className="min-w-full text-sm rounded-none">
          <thead className="bg-pink-200 text-black font-bold rounded-none">
            <tr>
              <th className="px-4 py-2 text-left rounded-none">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && paginated.every(acc => selectedAccounts[acc.id])}
                  onChange={e => {
                    const checked = e.target.checked;
                    const newSelections = { ...selectedAccounts };
                    paginated.forEach(acc => {
                      newSelections[acc.id] = checked;
                    });
                    setSelectedAccounts(newSelections);
                  }}
                />
              </th>
              { [
                { key: "accountType", label: "Type" },
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "contact", label: "Contact" },
                { key: "email", label: "Email" },
                { key: "updated_at", label: "Deleted Date" },
                { key: "actions", label: "Actions" },
              ].map(({ key, label }, idx, arr) => (
                <th
                  key={key}
                  onClick={() => {
                    if (key !== "actions") handleSort(key);
                  }}
                  className={`px-4 py-2 text-left select-none font-bold bg-pink-200
                    ${key !== "actions" ? "cursor-pointer" : ""}
                    ${idx === 0 ? "border-l-2 border-t-2 border-red-200" : ""}
                    ${idx === arr.length - 1 ? "border-r-2 border-t-2 border-red-200" : ""}
                    ${idx !== 0 && idx !== arr.length - 1 ? "border-t-2 border-red-200" : ""}
                  `}
                >
                  <span className="flex items-center">
                    {label}
                    {sortConfig.key === key && key !== "actions" && (
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
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((acc) => (
              <tr
                key={acc.id}
                className={`hover:bg-pink-100 cursor-pointer ${selectedAccounts[acc.id] ? "bg-pink-100" : ""}`}
                onClick={() => setSelectedAccount(acc)}
              >
                <td className="border border-gray-300 px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={!!selectedAccounts[acc.id]}
                    onChange={e => {
                      const checked = e.target.checked;
                      setSelectedAccounts(prev => ({
                        ...prev,
                        [acc.id]: checked
                      }));
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">{acc.accountType}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{acc.staff_id || acc.customer_id}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{acc.name}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{acc.contact}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{acc.email}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{new Date(acc.updated_at || acc.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                <td className="border border-gray-300 px-4 py-2 text-left" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedAccount(acc);
                      setShowConfirmModal(true);
                    }}
                    className="text-green-600 font-semibold hover:underline ml-2"
                  >
                    Activate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">o
          Showing{" "}
          {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, filteredData.length)} of{" "}
          {filteredData.length} entries
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

      {showConfirmModal && selectedAccount && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-md w-full mx-4 relative">
            <h3 className="text-lg font-bold text-gray-700 mb-3">
              Confirm Activation
            </h3>
            <p className="mb-4">
              Are you sure you want to activate{" "}
              <strong>{selectedAccount.name}</strong>?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleActivate(selectedAccount)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedAccount && !showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4 relative">
            <button
              onClick={() => setSelectedAccount(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              title="Close"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-gray-800">Account Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Type:</strong> {selectedAccount.accountType}</p>
              <p><strong>ID:</strong> {selectedAccount.staff_id || selectedAccount.customer_id}</p>
              <p><strong>Name:</strong> {selectedAccount.name}</p>
              <p><strong>Contact:</strong> {selectedAccount.contact}</p>
              <p><strong>Email:</strong> {selectedAccount.email}</p>
              <p><strong>Deleted Date:</strong> {new Date(selectedAccount.updated_at || selectedAccount.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              {selectedAccount.accountType === "Employee" && (
                <>
                  <p><strong>Role:</strong> {selectedAccount.role}</p>
                  <p><strong>Username:</strong> {selectedAccount.username}</p>
                  <p><strong>Address:</strong> {selectedAccount.address}</p>
                </>
              )}
              {selectedAccount.accountType === "Customer" && (
                <>
                  <p><strong>Company:</strong> {selectedAccount.company}</p>
                  <p><strong>Address:</strong> {selectedAccount.address}</p>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAccount(null)}
                className="bg-gray-400 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedAccounts;