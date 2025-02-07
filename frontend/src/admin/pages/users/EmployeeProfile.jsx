import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmployeeById, addEmployee, updateEmployee, deleteEmployee } from "../../../api/employees";

const EmployeeProfile = () => {
    const { id } = useParams();  // Get employee ID from URL
    const navigate = useNavigate();
    const [employee, setEmployee] = useState({
        employee_id: "",
        first_name: "",
        last_name: "",
        email: "",
        contact_number: "",
        role: "",
        region: "",
        city: "",
        barangay: "",
        address: "",
        license_number: "",
    });
    const [isEditing, setIsEditing] = useState(id ? false : true);

    useEffect(() => {
        if (id) {
            const loadEmployee = async () => {
                const data = await fetchEmployeeById(id);
                setEmployee(data);
            };
            loadEmployee();
        }
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEmployee({ ...employee, [name]: value });
    };

    const handleSave = async () => {
        if (id) {
            await updateEmployee(id, employee);
            alert("Employee updated successfully.");
        } else {
            await addEmployee(employee);
            alert("Employee added successfully.");
        }
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this employee?")) {
            await deleteEmployee(id);
            alert("Employee deleted successfully.");
            navigate("/admin/users/employees");
        }
    };

    return (
        <div className="p-4">
            <button onClick={() => navigate("/admin/users/employees")} className="bg-gray-500 text-white px-4 py-2 rounded mb-4">
                Back to Employees
            </button>
            <h1 className="text-2xl font-bold mb-4">Employee Profile</h1>
            <div className="grid grid-cols-2 gap-4">
                <input type="text" name="employee_id" value={employee.employee_id} disabled className="border p-2" />
                <input type="text" name="first_name" value={employee.first_name} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="text" name="last_name" value={employee.last_name} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="email" name="email" value={employee.email} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <input type="text" name="contact_number" value={employee.contact_number} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
                <select name="role" value={employee.role} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Driver">Driver</option>
                    <option value="Inventory Clerk">Inventory Clerk</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Delivery Assistant">Delivery Assistant</option>
                </select>
                {employee.role === "Driver" && (
                    <input type="text" name="license_number" value={employee.license_number} onChange={handleInputChange} disabled={!isEditing} className="border p-2" placeholder="License Number" />
                )}
                <select name="region" value={employee.region} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select Region</option>
                    <option value="Region 1">Region 1</option>
                </select>
                <select name="city" value={employee.city} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select City</option>
                    <option value="Davao City">Davao City</option>
                </select>
                <select name="barangay" value={employee.barangay} onChange={handleInputChange} disabled={!isEditing} className="border p-2">
                    <option value="">Select Barangay</option>
                    <option value="Barangay 1">Barangay 1</option>
                </select>
                <input type="text" name="address" value={employee.address} onChange={handleInputChange} disabled={!isEditing} className="border p-2" />
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

export default EmployeeProfile;
