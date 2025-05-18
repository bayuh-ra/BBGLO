import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEmployees } from "../../../api/employees";
import axios from "../../../api/api";
import { ChevronUp, ChevronDown } from "lucide-react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filter, setFilter] = useState("All");
  const [editFormData, setEditFormData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const [selectedEmployees, setSelectedEmployees] = useState({});

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  const handleDelete = async (staff_id) => {
    try {
      await axios.delete(`/staff-profiles/${staff_id}/`);
      setEmployees(employees.filter((emp) => emp.staff_id !== staff_id));
      setSelectedEmployee(null);
      setShowConfirmModal(false);
      setEditFormData(null);
      alert("✅ Employee moved to deleted accounts successfully!");
    } catch (error) {
      console.error("Failed to delete:", error);
      console.error("Error details:", error.response?.data);
      alert("❌ Failed to delete employee. Please try again.");
    }
  };

  const handleDeactivate = async (staff_id) => {
    try {
      await axios.patch(`/staff-profiles/${staff_id}/deactivate/`);
      setEmployees(
        employees.map((emp) =>
          emp.staff_id === staff_id ? { ...emp, status: "Deactivated" } : emp
        )
      );
      setShowConfirmModal(false);
      setSelectedEmployee(null);
      setEditFormData(null);
      alert("✅ Employee deactivated successfully!");
    } catch (error) {
      console.error("Failed to deactivate:", error);
      alert("❌ Failed to deactivate employee. Please try again.");
    }
  };

  const handleActivate = async (staff_id) => {
    try {
      await axios.patch(`/staff-profiles/${staff_id}/activate/`);
      setEmployees(
        employees.map((emp) =>
          emp.staff_id === staff_id ? { ...emp, status: "Active" } : emp
        )
      );
      setShowConfirmModal(false);
      setSelectedEmployee(null);
      setEditFormData(null);
      alert("✅ Employee activated successfully!");
    } catch {
      alert("❌ Activation failed.");
    }
  };

  const handleEdit = () => setEditFormData({ ...selectedEmployee });

  const handleEditChange = (e) =>
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleSaveEdit = async () => {
    try {
      const response = await axios.patch(
        `/staff-profiles/${editFormData.staff_id}/`,
        editFormData
      );
      setEmployees(
        employees.map((emp) =>
          emp.staff_id === editFormData.staff_id ? response.data : emp
        )
      );
      setSelectedEmployee(response.data);
      setEditFormData(null);
      setShowConfirmModal(false);
      alert("✅ Employee updated successfully!");
    } catch (error) {
      console.error("Failed to save changes:", error);
      console.error("Error details:", error.response?.data);
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

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return (
      <span className="inline-block ml-1 align-middle transition-transform duration-200">
        {sortConfig.direction === "asc" ? (
          <ChevronUp size={16} className="transition-transform duration-200" style={{ transform: 'rotate(0deg)', opacity: 1 }} />
        ) : (
          <ChevronDown size={16} className="transition-transform duration-200" style={{ transform: 'rotate(0deg)', opacity: 1 }} />
        )}
      </span>
    );
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      if (sortConfig.key === "staff_id") {
        // Extract numbers from EMP-XXXX format
        const idA = parseInt(a.staff_id.split("-")[1], 10);
        const idB = parseInt(b.staff_id.split("-")[1], 10);
        return sortConfig.direction === "asc" ? idA - idB : idB - idA;
      } else if (sortConfig.key === "name") {
        return sortConfig.direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortConfig.key === "role") {
        return sortConfig.direction === "asc"
          ? a.role.localeCompare(b.role)
          : b.role.localeCompare(a.role);
      }
      return 0;
    });
  };

  const filtered = getSortedData(
    employees.filter((emp) => {
      const matchesSearch = `${emp.name} ${emp.role} ${emp.contact}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesFilter = filter === "All" || emp.status === filter;
      return matchesSearch && matchesFilter && emp.status !== "Deleted";
    })
  );

  // Update filtered to be paginated
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Bulk remove selected employees
  const handleRemoveSelected = () => {
    const selectedIds = Object.entries(selectedEmployees)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
    if (selectedIds.length === 0) {
      alert("Please select at least one employee to delete.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete the selected employees?")) return;
    Promise.all(selectedIds.map(staff_id => handleDelete(staff_id)));
    // Remove from selectedEmployees as well
    const updatedSelections = { ...selectedEmployees };
    selectedIds.forEach(id => { delete updatedSelections[id]; });
    setSelectedEmployees(updatedSelections);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-gray-800">
          Employee Management
        </h2>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <input
            type="text"
            className="border rounded px-4 py-2 w-full sm:w-64"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-4 py-2 w-full sm:w-48"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>
        <div className="flex gap-4 justify-end w-full sm:w-auto">
          <button
            onClick={handleRemoveSelected}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 shadow-sm"
          >
            Remove Selected
          </button>
          <button
            onClick={() => navigate("/admin/deleted-accounts")}
            className="bg-gray-600 text-white px-5 py-2 rounded-lg shadow hover:bg-gray-700"
          >
            View Deleted Accounts
          </button>
          <button
            onClick={() => navigate("/admin/add-staff")}
            className="bg-blue-500 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full rounded text-sm">
          <thead className="bg-pink-200 text-black font-bold">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && paginated.every(emp => selectedEmployees[emp.staff_id])}
                  onChange={e => {
                    const checked = e.target.checked;
                    const newSelections = { ...selectedEmployees };
                    paginated.forEach(emp => {
                      newSelections[emp.staff_id] = checked;
                    });
                    setSelectedEmployees(newSelections);
                  }}
                />
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => handleSort("staff_id")}
              >
                <span className="flex items-center">
                  ID
                  {getSortIcon("staff_id")}
                </span>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <span className="flex items-center">
                  Name
                  {getSortIcon("name")}
                </span>
              </th>
              <th
                className="px-4 py-2 text-left cursor-pointer select-none"
                onClick={() => handleSort("role")}
              >
                <span className="flex items-center">
                  Role
                  {getSortIcon("role")}
                </span>
              </th>
              <th className="px-4 py-2 text-left">Contact</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((emp) => (
              <tr
                key={emp.id}
                className={`hover:bg-pink-100 cursor-pointer ${selectedEmployee?.id === emp.id ? "bg-blue-50" : ""}`}
                onClick={() => setSelectedEmployee(emp)}
              >
                <td className="border border-gray-300 px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={!!selectedEmployees[emp.staff_id]}
                    onChange={e => {
                      const checked = e.target.checked;
                      setSelectedEmployees(prev => ({
                        ...prev,
                        [emp.staff_id]: checked
                      }));
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2 text-left">{emp.staff_id}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{emp.name}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{emp.role}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{emp.contact}</td>
                <td className="border border-gray-300 px-4 py-2 text-left">{emp.status}</td>
                <td className="border border-gray-300 px-4 py-2 text-left space-x-2">
                  {emp.status === "Deactivated" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirmation(
                          "activate",
                          "Are you sure you want to activate this employee?",
                          () => handleActivate(emp.staff_id)
                        );
                      }}
                      className="text-green-600 font-semibold hover:underline"
                    >
                      Activate
                    </button>
                  )}
                  {emp.status === "Active" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirmation(
                          "deactivate",
                          "Are you sure you want to deactivate this employee?",
                          () => handleDeactivate(emp.staff_id)
                        );
                      }}
                      className="text-yellow-600 font-semibold hover:underline"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded border ${currentPage === 1 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded border ${currentPage === totalPages ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white"}`}
          >
            Next
          </button>
        </div>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => setSelectedEmployee(null)}
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
              Employee Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p>
                <strong>ID:</strong> {selectedEmployee.staff_id}
              </p>
              <p>
                <strong>Name:</strong> {selectedEmployee.name}
              </p>
              <p>
                <strong>Username:</strong> {selectedEmployee.username}
              </p>
              <p>
                <strong>Role:</strong> {selectedEmployee.role}
              </p>
              <p>
                <strong>Email:</strong> {selectedEmployee.email}
              </p>
              <p>
                <strong>Contact:</strong> {selectedEmployee.contact}
              </p>
              <p>
                <strong>Address:</strong> {selectedEmployee.address}
              </p>
              <p>
                <strong>Status:</strong> {selectedEmployee.status}
              </p>
            </div>
            <div className="mt-4 space-x-4">
              {selectedEmployee.status === "Active" && (
                <>
                  <button
                    onClick={() =>
                      showConfirmation(
                        "edit",
                        "Are you sure you want to edit this employee?",
                        handleEdit
                      )
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Edit Employee
                  </button>
                  <button
                    onClick={() =>
                      showConfirmation(
                        "deactivate",
                        "Are you sure you want to deactivate this employee?",
                        () => handleDeactivate(selectedEmployee.staff_id)
                      )
                    }
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                  >
                    Deactivate
                  </button>
                </>
              )}
              {selectedEmployee.status === "Deactivated" && (
                <button
                  onClick={() =>
                    showConfirmation(
                      "activate",
                      "Are you sure you want to activate this employee?",
                      () => handleActivate(selectedEmployee.staff_id)
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
                    "Are you sure you want to delete this employee? This action cannot be undone.",
                    () => handleDelete(selectedEmployee.staff_id)
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
              Edit Employee
            </h3>
            <div className="space-y-4">
              {[
                { label: "Name", name: "name", required: true },
                { label: "Role", name: "role", required: true },
                { label: "Contact", name: "contact", required: true },
                { label: "Address", name: "address", required: true },
                { label: "Email", name: "email", required: true },
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

export default EmployeeManagement;
