import { useEffect, useState } from "react";
import { fetchEmployees } from "../../../api/employees";

const DeletedAccounts = () => {
  const [deletedEmployees, setDeletedEmployees] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadDeletedEmployees = async () => {
      const data = await fetchEmployees();
      const deleted = data.filter((emp) => emp.status === "Deleted");
      setDeletedEmployees(deleted);
    };
    loadDeletedEmployees();
  }, []);

  const filtered = deletedEmployees.filter((emp) => {
    return `${emp.name} ${emp.role} ${emp.contact}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Deleted Accounts</h2>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="text"
          className="border rounded px-4 py-2 w-full sm:w-1/3"
          placeholder="Search deleted accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Email</th>
              <th className="p-2">Deleted Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="p-2 border-t">{emp.staff_id}</td>
                <td className="p-2 border-t">{emp.name}</td>
                <td className="p-2 border-t">{emp.role}</td>
                <td className="p-2 border-t">{emp.contact}</td>
                <td className="p-2 border-t">{emp.email}</td>
                <td className="p-2 border-t">
                  {new Date(emp.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeletedAccounts;
