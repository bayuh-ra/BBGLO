import { useState, useEffect } from "react";
import { fetchCustomers, deleteCustomer } from "@/api/customers";
import { useNavigate } from "react-router-dom";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadCustomers = async () => {
      const data = await fetchCustomers();
      setCustomers(data);
    };
    loadCustomers();
  }, []);

  const handleDelete = async (id) => {
    await deleteCustomer(id);
    setCustomers(customers.filter((customer) => customer.customer_id !== id));
  };

  const filteredCustomers = customers.filter((customer) =>
    Object.values(customer).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-1/3 mr-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => navigate("/admin/users/customers/new")}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Add
        </button>
      </div>

      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead className="bg-red-200">
          <tr>
            <th className="border border-gray-300 px-4 py-2">Customer ID</th>
            <th className="border border-gray-300 px-4 py-2">Business Name</th>
            <th className="border border-gray-300 px-4 py-2">
              Inventory Manager
            </th>
            <th className="border border-gray-300 px-4 py-2">Contact Number</th>
            <th className="border border-gray-300 px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((customer) => (
            <tr key={customer.customer_id}>
              <td className="border border-gray-300 px-4 py-2">
                {customer.customer_id}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {customer.business_name}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {customer.manager_name}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {customer.contact_number}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <button
                  onClick={() =>
                    navigate(`/admin/users/customers/${customer.customer_id}`)
                  }
                  className="text-blue-500 hover:underline"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleDelete(customer.customer_id)}
                  className="text-red-500 hover:underline ml-2"
                >
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

export default Customers;
