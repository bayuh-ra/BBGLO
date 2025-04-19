import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEmployees } from "../../../api/employees";
import axios from "../../../api/api";

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
  const navigate = useNavigate();

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">
          Employee Management
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/admin/deleted-accounts")}
            className="bg-gray-600 text-white px-5 py-2 rounded-lg shadow hover:bg-gray-700"
          >
            View Deleted Accounts
          </button>
          <button
            onClick={() => navigate("/admin/add-staff")}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            + Add Employee
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="text"
          className="border rounded px-4 py-2 w-full sm:w-1/3"
          placeholder="Search employees..."
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

      <div className="overflow-x-auto rounded-lg border shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th
                className="p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("staff_id")}
              >
                ID{" "}
                {sortConfig.key === "staff_id" && (
                  <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
              <th
                className="p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort("name")}
              >
                Name{" "}
                {sortConfig.key === "name" && (
                  <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
              <th className="p-2">Role</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr
                key={emp.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedEmployee?.id === emp.id ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelectedEmployee(emp)}
              >
                <td className="p-2 border-t">{emp.staff_id}</td>
                <td className="p-2 border-t">{emp.name}</td>
                <td className="p-2 border-t">{emp.role}</td>
                <td className="p-2 border-t">{emp.contact}</td>
                <td className="p-2 border-t">{emp.status}</td>
                <td className="p-2 border-t space-x-2">
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
