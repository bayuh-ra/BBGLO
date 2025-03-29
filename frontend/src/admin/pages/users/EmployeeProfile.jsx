import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../api/supabaseClient";

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employee, setEmployee] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact: "",
    role: "",
    license_number: "",
    region: "",
    city: "",
    barangay: "",
    address: "",
  });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setMessage("Error fetching employee data.");
      } else {
        setEmployee(data);
      }
    };

    fetchEmployee();
  }, [id]);

  const handleChange = (e) => {
    setEmployee({ ...employee, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("employees")
      .update(employee)
      .eq("id", id);

    if (error) {
      setMessage("Failed to update employee.");
    } else {
      setMessage("Employee updated successfully!");
      setEditing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Employee Profile</h2>
      {message && (
        <p
          className={`mb-4 ${
            message.includes("Failed") ? "text-red-500" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={employee.first_name}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={employee.last_name}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={employee.email}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="contact"
          placeholder="Contact Number"
          value={employee.contact}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="role"
          placeholder="Role"
          value={employee.role}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        {employee.role.toLowerCase() === "driver" && (
          <input
            type="text"
            name="license_number"
            placeholder="License Number"
            value={employee.license_number}
            onChange={handleChange}
            disabled={!editing}
            className="border p-2 rounded"
          />
        )}
        <input
          type="text"
          name="region"
          placeholder="Region"
          value={employee.region}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="city"
          placeholder="City"
          value={employee.city}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="barangay"
          placeholder="Barangay"
          value={employee.barangay}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="address"
          placeholder="Full Address"
          value={employee.address}
          onChange={handleChange}
          disabled={!editing}
          className="border p-2 rounded col-span-2"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Back
        </button>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Edit
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;
