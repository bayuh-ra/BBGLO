import { useState } from "react";
import axios from "../../../api/api";

const AddEmployee = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/invite-staff/", { email, role });
      alert("✅ Invitation sent successfully!");
      setEmail("");
      setRole("");
    } catch (err) {
      console.error("❌ Error sending invitation:", err);
      alert(err.response?.data?.error || "Error sending invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Invite New Employee</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          className="border p-2 rounded w-full"
          placeholder="Employee Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          required
          className="border p-2 rounded w-full"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select Role</option>
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Driver">Driver</option>
          <option value="Cashier">Cashier</option>
          <option value="Inventory Clerk">Inventory Clerk</option>
          <option value="Sales Clerk">Sales Clerk</option>
          <option value="Delivery Assistant">Delivery Assistant</option>
        </select>
        <button
          type="submit"
          className={`bg-blue-600 text-white px-4 py-2 rounded ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Invitation"}
        </button>
      </form>
    </div>
  );
};

export default AddEmployee;
