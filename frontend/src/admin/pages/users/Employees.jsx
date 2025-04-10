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
      const url = `http://localhost:8000/api/staff-profiles/${staff_id}/delete/`;
      console.log("Delete URL:", url); // Debugging
      const response = await axios.post(url);
      console.log(response.data);
      fetchEmployees(); // Refresh data
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleDeactivate = async (staff_id) => {
    try {
      await axios.post(`http://localhost:8000/api/staff-profiles/${staff_id}/deactivate/`);
      const updated = await fetchEmployees();
      setEmployees(updated);
    } catch (error) {
      console.error("❌ Deactivate error", error);
      alert("Deactivation failed.");
    }
  };
  
  const handleActivate = async (staff_id) => {
    try {
      await axios.post(`http://localhost:8000/api/staff-profiles/${staff_id}/activate/`);
      const updated = await fetchEmployees();
      setEmployees(updated);
    } catch (error) {
      console.error("❌ Activate error", error);
      alert("Activation failed.");
    }
  };
  
  
  const handleEdit = () => {
    setEditFormData({ ...selectedEmployee });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    try {
      const isUpdate = editFormData.staff_id !== undefined;
      const httpMethod = isUpdate ? "PATCH" : "POST";
      const endpoint = isUpdate
        ? `/staff-profiles/${editFormData.staff_id}/`
        : "/staff-profiles/";
      await axios({
        method: httpMethod,
        url: endpoint,
        data: editFormData,
      });
      const updated = await fetchEmployees();
      setEmployees(updated);
      setSelectedEmployee(editFormData);
      setEditFormData(null);
    } catch (error) {
      console.error("Failed to save changes:", error);
      alert("Failed to save changes.");
    }
  };

  const filtered = employees.filter((emp) => {
    const matchesSearch = `${emp.name} ${emp.role} ${emp.contact}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      (filter === "Active" && emp.status === "Active") ||
      (filter === "Deactivated" && emp.status === "Deactivated") ||
      (filter === "Deleted" && emp.status === "Deleted");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Employee Management</h2>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
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
          <option value="Deleted">Deleted</option>
        </select>
        <button
          onClick={() => navigate("/admin/add-staff")}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Employee
        </button>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Contact</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((emp) => (
            <tr
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className={`cursor-pointer ${
                selectedEmployee?.id === emp.id ? "bg-gray-200" : ""
              }`}
            >
              <td className="p-2 border">{emp.staff_id}</td>
              <td className="p-2 border">{emp.name}</td>
              <td className="p-2 border">{emp.role}</td>
              <td className="p-2 border">{emp.contact}</td>
              <td className="p-2 border">{emp.status}</td>
              <td className="p-2 border space-x-1">
                {emp.status === "Deactivated" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivate(emp.staff_id);
                    }}
                    className="bg-green-600 text-white px-2 py-1 text-xs rounded"
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeactivate(emp.staff_id);
                    }}
                    className="bg-yellow-600 text-white px-2 py-1 text-xs rounded"
                  >
                    Deactivate
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(emp.staff_id);
                  }}
                  className="bg-red-600 text-white px-2 py-1 text-xs rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedEmployee && (
        <div className="mt-6 border p-4 rounded bg-gray-50">
          <h3 className="text-lg font-bold mb-2">Employee Details</h3>
          <p>
            <strong>ID:</strong> {selectedEmployee.staff_id}
          </p>
          <p>
            <strong>Name:</strong> {selectedEmployee.name}
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

          {selectedEmployee.status === "Active" && (
            <button
              onClick={handleEdit}
              className="mt-4 bg-blue-600 text-black px-4 py-2 rounded"
            >
              Edit Employee
            </button>
          )}
        </div>
      )}
      {editFormData && (
        <div className="mt-6 border p-4 rounded bg-gray-50">
          <h3 className="text-lg font-bold mb-2">Edit Employee</h3>
          <input
            name="name"
            value={editFormData.name}
            onChange={handleEditChange}
            placeholder="Name"
            className="border p-2 rounded w-full mb-2"
          />
          <input
            name="role"
            value={editFormData.role}
            onChange={handleEditChange}
            placeholder="Role"
            className="border p-2 rounded w-full mb-2"
          />
          <input
            name="contact"
            value={editFormData.contact}
            onChange={handleEditChange}
            placeholder="Contact"
            className="border p-2 rounded w-full mb-2"
          />
          <input
            name="address"
            value={editFormData.address}
            onChange={handleEditChange}
            placeholder="Address"
            className="border p-2 rounded w-full mb-2"
          />
          <select
            name="status"
            value={editFormData.status}
            onChange={handleEditChange}
            className="border p-2 rounded w-full mb-2"
          >
            <option value="Active">Active</option>
            <option value="Deactivated">Deactivated</option>
            <option value="Deleted">Deleted</option>
          </select>
          <button
            onClick={handleSaveEdit}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
