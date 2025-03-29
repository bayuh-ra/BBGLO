import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const StaffSetup = () => {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
    role: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      setMessage("User not logged in.");
      setLoading(false);
      return;
    }

    const { name, contact, address, role, password } = formData;

    if (!name || !contact || !address || !role || !password) {
      setMessage("All fields are required.");
      setLoading(false);
      return;
    }

    // Optional: Set the user's password if they came from an invite
    const { error: updateAuthError } = await supabase.auth.updateUser({
      password,
    });

    if (updateAuthError) {
      setMessage("Failed to update password: " + updateAuthError.message);
      setLoading(false);
      return;
    }

    // Save or update staff profile
    const { error } = await supabase.from("staff_profiles").upsert([
      {
        id: user.id,
        email: user.email,
        name,
        contact,
        address,
        role,
      },
    ]);

    if (error) {
      setMessage("Failed to save profile: " + error.message);
      setLoading(false);
      return;
    }

    setMessage("✅ Profile setup complete!");
    localStorage.setItem(
      "loggedInUser",
      JSON.stringify({
        id: user.id,
        email: user.email,
        name,
        contact,
        address,
        role,
      })
    );
    window.dispatchEvent(new Event("profile-updated"));

    setTimeout(() => {
      if (role === "admin") navigate("/admin");
      else navigate("/employee/inventory-management");
    }, 1500);

    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow mt-10">
      <h2 className="text-2xl font-bold mb-4">Complete Staff Profile</h2>

      {message && (
        <p
          className={`mb-4 text-sm ${
            message.includes("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="contact"
          placeholder="Contact Number"
          value={formData.contact}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="address"
          placeholder="Full Address"
          value={formData.address}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="inventory clerk">Inventory Clerk</option>
          <option value="cashier">Cashier</option>
          <option value="driver">Driver</option>
          <option value="sales clerk">Sales Clerk</option>
          <option value="delivery assistant">Delivery Assistant</option>
        </select>
        <input
          type="password"
          name="password"
          placeholder="Set New Password"
          value={formData.password}
          onChange={handleChange}
          className="border p-2 rounded"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Saving..." : "Submit"}
      </button>
    </div>
  );
};

export default StaffSetup;
