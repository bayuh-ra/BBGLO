import { useState, useEffect } from "react";
import { fetchEmployees, deleteEmployee } from "../../../api/employees";
import { useNavigate } from "react-router-dom";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  const handleDelete = async (id) => {
    await deleteEmployee(id);
    setEmployees(employees.filter((employee) => employee.employee_id !== id));
  };

  const filteredEmployees = employees.filter(employee =>
    Object.values(employee).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Employees</h1>
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-1/3 mr-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => navigate("/admin/users/employees/new")}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Add
        </button>
      </div>

      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead className="bg-gray-200">
          <tr>
            <th className="border border-gray-300 px-4 py-2">Employee ID</th>
            <th className="border border-gray-300 px-4 py-2">Employee Name</th>
            <th className="border border-gray-300 px-4 py-2">Role</th>
            <th className="border border-gray-300 px-4 py-2">Contact Number</th>
            <th className="border border-gray-300 px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((employee) => (
            <tr key={employee.employee_id}>
              <td className="border border-gray-300 px-4 py-2">{employee.employee_id}</td>
              <td className="border border-gray-300 px-4 py-2">{`${employee.first_name} ${employee.last_name}`}</td>
              <td className="border border-gray-300 px-4 py-2">{employee.role}</td>
              <td className="border border-gray-300 px-4 py-2">{employee.contact_number}</td>
              <td className="border border-gray-300 px-4 py-2">
                <button onClick={() => navigate(`/admin/users/employees/${employee.employee_id}`)} className="text-blue-500 hover:underline">
                  View Details
                </button>
                <button onClick={() => handleDelete(employee.employee_id)} className="text-red-500 ml-4">
                                    Delete
                                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Employees;
