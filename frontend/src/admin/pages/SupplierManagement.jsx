import { useState, useEffect } from "react";
import {
    fetchSuppliers,
    addSupplier,
    deleteSupplier,
    updateSupplier,
} from "../../api/supplier";

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [newSupplier, setNewSupplier] = useState({
        supplier_name: "",
        contact_no: "",
        email: "",
        address: "",
    });

    // Load suppliers from the backend
    const loadSuppliers = async () => {
        try {
            const data = await fetchSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error("Failed to load suppliers:", error);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSupplier({ ...newSupplier, [name]: value });
    };

    // Clear the form
    const handleClearForm = () => {
        setNewSupplier({
            supplier_name: "",
            contact_no: "",
            email: "",
            address: "",
        });
        setIsEditing(false);
        setSelectedSupplier(null);
    };

    // Handle adding/updating a supplier
    const handleAddOrUpdateSupplier = async () => {
        if (!newSupplier.supplier_name || !newSupplier.contact_no || !newSupplier.email || !newSupplier.address) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            if (isEditing && selectedSupplier) {
                await updateSupplier(selectedSupplier.supplier_id, newSupplier);
                alert("Supplier updated successfully.");
            } else {
                await addSupplier(newSupplier);
                alert("Supplier added successfully.");
            }

            loadSuppliers();
            handleClearForm();
            setShowForm(false);
        } catch (error) {
            console.error("Failed to add/update supplier:", error);
            alert("Failed to add/update supplier.");
        }
    };

    // Handle deleting a supplier
    const handleDeleteSupplier = async () => {
        if (!selectedSupplier) {
            alert("Please select a supplier to delete.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${selectedSupplier.supplier_name}?`)) {
            try {
                await deleteSupplier(selectedSupplier.supplier_id);
                alert("Supplier deleted successfully.");
                loadSuppliers();
                setSelectedSupplier(null);
            } catch (error) {
                console.error("Failed to delete supplier:", error);
                alert("Failed to delete supplier.");
            }
        }
    };

    // Select a supplier when clicking a row
    const handleRowClick = (supplier) => {
        setSelectedSupplier(supplier);
        setNewSupplier({
            supplier_name: supplier.supplier_name,
            contact_no: supplier.contact_no,
            email: supplier.email,
            address: supplier.address,
        });
        setIsEditing(true);
    };

    // ✅ Fix: Use filteredSuppliers in the table
    const filteredSuppliers = suppliers.filter((supplier) =>
        Object.values(supplier).some((field) =>
            String(field).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Supplier Management</h1>

            {/* Search Bar and Buttons */}
            <div className="flex items-center mb-4">
                <input
                    type="text"
                    placeholder="Search..."
                    className="border border-gray-300 rounded px-4 py-2 w-1/3 mr-4"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                    onClick={() => {
                        setShowForm(true);
                        setIsEditing(false);
                        handleClearForm();
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
                >
                    Add
                </button>
                <button
                    onClick={handleDeleteSupplier}
                    className="bg-red-500 text-white px-4 py-2 rounded mr-2"
                >
                    Delete
                </button>
                <button
                    onClick={() => {
                        if (selectedSupplier) setShowForm(true);
                        else alert("Please select a row to edit.");
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                >
                    Update
                </button>
            </div>

            {/* Supplier Form */}
            {showForm && (
                <div className="mb-4 p-4 border border-gray-300 rounded">
                    <h2 className="text-xl font-bold mb-4">
                        {isEditing ? "Update Supplier" : "Add New Supplier"}
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            name="supplier_name"
                            placeholder="Supplier Name"
                            value={newSupplier.supplier_name}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-4 py-2"
                        />
                        <input
                            type="text"
                            name="contact_no"
                            placeholder="Contact No."
                            value={newSupplier.contact_no}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-4 py-2"
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={newSupplier.email}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-4 py-2"
                        />
                        <textarea
                            name="address"
                            placeholder="Address"
                            value={newSupplier.address}
                            onChange={handleInputChange}
                            className="border border-gray-300 rounded px-4 py-2"
                        />
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleClearForm} className="bg-gray-300 text-black px-4 py-2 rounded mr-2">
                            Clear
                        </button>
                        <button onClick={handleAddOrUpdateSupplier} className="bg-blue-500 text-white px-4 py-2 rounded">
                            {isEditing ? "Update Supplier" : "Add Supplier"}
                        </button>
                    </div>
                </div>
            )}

            {/* ✅ Fix: Ensure `filteredSuppliers` is used in the table */}
            <table className="table-auto border-collapse border border-gray-300 w-full">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="border border-gray-300 px-4 py-2">Supplier ID</th>
                        <th className="border border-gray-300 px-4 py-2">Supplier Name</th>
                        <th className="border border-gray-300 px-4 py-2">Contact No.</th>
                        <th className="border border-gray-300 px-4 py-2">Email</th>
                        <th className="border border-gray-300 px-4 py-2">Address</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSuppliers.map((supplier) => (
                        <tr key={supplier.supplier_id} onClick={() => handleRowClick(supplier)}>
                            <td className="border border-gray-300 px-4 py-2">{supplier.supplier_id}</td>
                            <td className="border border-gray-300 px-4 py-2">{supplier.supplier_name}</td>
                            <td className="border border-gray-300 px-4 py-2">{supplier.contact_no}</td>
                            <td className="border border-gray-300 px-4 py-2">{supplier.email}</td>
                            <td className="border border-gray-300 px-4 py-2">{supplier.address}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SupplierManagement;
