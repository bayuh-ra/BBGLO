import { useEffect, useState } from "react";
import { fetchEmployees } from "../../../api/employees";
import { fetchCustomers } from "../../../api/customers";
import axios from "../../../api/api";
import { useNavigate } from "react-router-dom";

const DeletedAccounts = () => {
  const navigate = useNavigate();
  const [deletedData, setDeletedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("All");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

      <div className="flex flex-wrap gap-4 items-center">
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

      <div className="overflow-x-auto rounded-lg border shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Email</th>
              <th className="p-2">Deleted Date</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((acc) => (
              <tr key={acc.id} className="hover:bg-gray-50">
                <td className="p-2 border-t">{acc.accountType}</td>
                <td className="p-2 border-t">
                  {acc.staff_id || acc.customer_id}
                </td>
                <td className="p-2 border-t">{acc.name}</td>
                <td className="p-2 border-t">{acc.contact}</td>
                <td className="p-2 border-t">{acc.email}</td>
                <td className="p-2 border-t">
                  {new Date(
                    acc.updated_at || acc.created_at
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
                <td className="p-2 border-t">
                  <button
                    onClick={() => {
                      setSelectedAccount(acc);
                      setShowConfirmModal(true);
                    }}
                    className="text-green-600 font-semibold hover:underline"
                  >
                    Activate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default DeletedAccounts;
