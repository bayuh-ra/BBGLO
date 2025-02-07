import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCustomerById, addCustomer, updateCustomer, deleteCustomer } from "../../../api/customers";

const CustomerProfile = () => {
    const { id } = useParams();  // Get customer ID from URL
    const navigate = useNavigate();
    const [customer, setCustomer] = useState({
        customer_id: "",
        manager_first_name: "",
        manager_last_name: "",
        business_email: "",
        business_name: "",
        contact_number: "",
        region: "",
        city: "",
        barangay: "",
        address: "",
    });
    const [isEditing, setIsEditing] = useState(id ? false : true);

    useEffect(() => {
        if (id) {
            const loadCustomer = async () => {
                const data = await fetchCustomerById(id);
                setCustomer(data);
            };
            loadCustomer();
        }
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomer({ ...customer, [name]: value });
    };

    const handleSave = async () => {
        if (id) {
            await updateCustomer(id, customer);
            alert("Customer updated successfully.");
        } else {
            await addCustomer(customer);
            alert("Customer added successfully.");
        }
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this customer?")) {
            await deleteCustomer(id);
            alert("Customer deleted successfully.");
            navigate("/admin/users/customers");
        }
    };

    return (
        <div className="p-4">
            <button onClick={() => navigate("/admin/users/customers")} className="bg-gray-500 text-white px-4 py-2 rounded mb-4">
                Back to Customers
            </button>
            <h1 className="text-2xl font-bold mb-4">Customer Profile</h1>
            <div className="grid grid-cols-2 gap-4">
                <input type="text" name="customer_id" value={customer.customer_id} disabled className="border p-2" />
                <input type="text" name="business_name" value={customer.business_name} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="text" name="manager_first_name" value={customer.manager_first_name} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="text" name="manager_last_name" value={customer.manager_last_name} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="email" name="business_email" value={customer.business_email} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="text" name="contact_number" value={customer.contact_number} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <select name="region" value={customer.region} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select Region</option>
                    <option value="Region 1">Region 1</option>
                </select>
                <select name="city" value={customer.city} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select City</option>
                    <option value="Davao City">Davao City</option>
                </select>
                <select name="barangay" value={customer.barangay} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select Barangay</option>
                    <option value="Barangay 1">Barangay 1</option>
                </select>
                <input type="text" name="address" value={customer.address} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
            </div>
            <div className="mt-4">
                {isEditing ? (
                    <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">Save Changes</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="bg-yellow-500 text-white px-4 py-2 rounded">Edit</button>
                )}
                <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded ml-2">Delete User</button>
            </div>
        </div>
    );
};

export default CustomerProfile;
