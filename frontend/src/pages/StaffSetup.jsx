import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";

const StaffSetup = () => {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
    role: "",
    password: "",
    username: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const generateUsername = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user || !formData.role) return;

      const emailPrefix = user.email.split("@")[0].toLowerCase();
      const rolePrefix = formData.role === "admin" ? "a" : "e";
      setFormData((prev) => ({
        ...prev,
        username: (rolePrefix + emailPrefix).toLowerCase(),
      }));
    };

    generateUsername();
  }, [formData.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      setMessage("User not logged in.");
      setLoading(false);
      return;
    }

    const { name, contact, address, role, password, username } = formData;

    if (!name || !contact || !address || !role || !password || !username) {
      setMessage("All fields are required.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setMessage("❌ Failed to update password: " + authError.message);
      setLoading(false);
      return;
    }

    const newProfile = {
      id: user.id,
      email: user.email,
      name,
      contact,
      address,
      role,
      username: username.toLowerCase(),
    };

    const { error: profileError } = await supabase
      .from("staff_profiles")
      .upsert([newProfile]);

    if (profileError) {
      setMessage("❌ Failed to save profile: " + profileError.message);
      setLoading(false);
      return;
    }

    await supabase.from("profiles").delete().eq("id", user.id); // clean up

    setMessage("✅ Profile setup complete!");
    localStorage.setItem("loggedInUser", JSON.stringify(newProfile));
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <input
          type="text"
          name="username"
          value={formData.username}
          disabled
          className="border p-2 rounded bg-gray-100"
          placeholder="Auto-generated Username"
        />

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

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Set Password"
            value={formData.password}
            onChange={handleChange}
            className="border p-2 rounded w-full pr-10"
            required
          />
          <div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-600"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
};

export default StaffSetup;
