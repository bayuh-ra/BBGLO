import { useState } from "react";
import { supabase } from "../../../api/supabaseClient";

const AddStaff = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    role: "employee", // default role
    name: "",
    contact: "",
    region: "",
    city: "",
    barangay: "",
    address: "",
    license_number: "", // optional for driver role
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = async () => {
    setLoading(true);
    setMessage("");

    const { email, password, role, name, contact } = formData;

    if (!email || !password || !role || !name || !contact) {
      setMessage("⚠️ Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      // 🔢 Step 1: Count existing staff to generate number suffix
      const { count, error: countError } = await supabase
        .from("staff_profiles")
        .select("id", { count: "exact", head: true });

      if (countError) {
        setMessage("❌ Failed to count existing staff.");
        setLoading(false);
        return;
      }

      // 🔤 Step 2: Generate initials (first letters of up to 3 words in name)
      const nameInitials = name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 3)
        .join("")
        .toLowerCase();

      const rolePrefix = role === "admin" ? "a" : "e";
      const paddedNumber = String(count + 1).padStart(4, "0");
      const generatedUsername = `${rolePrefix}-${nameInitials}-${paddedNumber}`;

      // 🔐 Step 3: Create user in Supabase Auth
      const { data: signUpData, error: signUpError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (signUpError) {
        setMessage("❌ Failed to create account: " + signUpError.message);
        setLoading(false);
        return;
      }

      const newUserId = signUpData.user.id;

      // 📥 Step 4: Insert into staff_profiles
      const { error: insertError } = await supabase
        .from("staff_profiles")
        .insert([
          {
            id: newUserId,
            email,
            username: generatedUsername,
            role,
            name,
            contact,
            region: formData.region,
            city: formData.city,
            barangay: formData.barangay,
            address: formData.address,
            license_number: role === "driver" ? formData.license_number : null,
          },
        ]);

      if (insertError) {
        setMessage("❌ Error saving profile: " + insertError.message);
        setLoading(false);
        return;
      }

      setMessage(`✅ Staff account created! Username: ${generatedUsername}`);
      setFormData({
        email: "",
        password: "",
        role: "employee",
        name: "",
        contact: "",
        region: "",
        city: "",
        barangay: "",
        address: "",
        license_number: "",
      });
    } catch (err) {
      setMessage("❌ Unexpected error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Add Staff Account</h2>

      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded ${
            message.includes("✅")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className="border p-2 rounded"
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
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="inventory clerk">Inventory Clerk</option>
          <option value="cashier">Cashier</option>
          <option value="driver">Driver</option>
          <option value="sales clerk">Sales Clerk</option>
          <option value="delivery assistant">Delivery Assistant</option>
        </select>
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
          name="region"
          placeholder="Region"
          value={formData.region}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="city"
          placeholder="City"
          value={formData.city}
          onChange={handleChange}
          className="border p-2 rounded"
        />
        <input
          type="text"
          name="barangay"
          placeholder="Barangay"
          value={formData.barangay}
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
        {formData.role === "driver" && (
          <input
            type="text"
            name="license_number"
            placeholder="License Number"
            value={formData.license_number}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        )}
      </div>

      <button
        onClick={handleAddStaff}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Creating Account..." : "Add Staff"}
      </button>
    </div>
  );
};

export default AddStaff;
