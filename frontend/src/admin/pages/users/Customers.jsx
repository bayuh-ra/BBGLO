import { useState, useEffect } from "react";
import { fetchCustomers, deleteCustomer } from "../../../api/customers";
import { Link } from "react-router-dom";
import axios from "../../../api/api"


const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const data = await fetchCustomers();
                setCustomers(data);
            } catch (error) {
                console.error("Failed to load customers:", error);
            }
        };
        loadCustomers();
    }, []);

    const handleDeleteCustomer = async () => {
        if (!selectedCustomer) {
            alert("Please select a customer to delete.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${selectedCustomer.business_name}?`)) {
            try {
                await deleteCustomer(selectedCustomer.customer_id);
                setCustomers(customers.filter(c => c.customer_id !== selectedCustomer.customer_id));
                alert("Customer deleted successfully.");
                setSelectedCustomer(null);
            } catch (error) {
                console.error("Failed to delete customer:", error);
                alert("Failed to delete customer.");
            }
        }
    };

    const activateCustomer = async (customer_id) => {
        try {
          await axios.post(`/customers/${customer_id}/activate/`);
          alert("Customer activated!");
          fetchCustomers(); // ✅ Refresh list after activation
        } catch (error) {
          alert(error.response?.data?.error || "Activation failed.");
        }
      };

    const filteredCustomers = customers.filter((customer) =>
        Object.values(customer).some((field) =>
            String(field || "").toLowerCase().includes(searchTerm.toLowerCase())
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
                    className="border border-gray-300 rounded px-4 py-2 w-1/3 mr-4"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Link to="/admin/users/customers/new" className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
                    Add Customer
                </Link>
                <button onClick={handleDeleteCustomer} className="bg-red-500 text-white px-4 py-2 rounded mr-2">
                    Delete
                </button>
                <Link to={`/admin/users/customers/${selectedCustomer?.customer_id || ""}`} className="bg-yellow-500 text-white px-4 py-2 rounded">
                    Update
                </Link>
            </div>

            {/* Customer Table */}
            <table className="table-auto border-collapse border border-gray-300 w-full">
                <thead className="bg-red-200">
                    <tr>
                        <th className="border border-gray-300 px-4 py-2">Customer ID</th>
                        <th className="border border-gray-300 px-4 py-2">Business Name</th>
                        <th className="border border-gray-300 px-4 py-2">Inventory Manager</th>
                        <th className="border border-gray-300 px-4 py-2">Contact Number</th>
                        <th className="border border-gray-300 px-4 py-2">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCustomers.map((customer) => (
                        <tr key={customer.customer_id} onClick={() => setSelectedCustomer(customer)}
                            className={`cursor-pointer ${selectedCustomer?.customer_id === customer.customer_id ? "bg-gray-200" : ""}`}>
                            <td className="border border-gray-300 px-4 py-2">{customer.customer_id}</td>
                            <td className="border border-gray-300 px-4 py-2">{customer.business_name}</td>
                            <td className="border border-gray-300 px-4 py-2">
                                {/* ✅ Fixed: Properly concatenates first and last name */}
                                {`${customer.manager_first_name || ""} ${customer.manager_last_name || ""}`.trim()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">{customer.contact_number}</td>
                            <td className="border border-gray-300 px-4 py-2">

                                <Link to={`/admin/users/customers/${customer.customer_id}`} className="text-blue-500 underline">
                                    View Details
                                </Link>
                            </td>      
                            <td className="border px-4 py-2">
                                {customer.is_active ? (
                                <span className="text-green-600">Active</span>
                                ) : (
                                <span className="text-red-600">Inactive</span>
                                )}
                            </td>
                            <td className="border px-4 py-2">
                                {!customer.is_active && (
                                <button
                                    onClick={() => activateCustomer(customer.customer_id)}
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
