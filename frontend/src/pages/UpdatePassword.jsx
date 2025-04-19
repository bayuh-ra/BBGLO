import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const UpdatePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    setConfirming(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage("✅ Password updated successfully. Redirecting...");
      setTimeout(() => navigate("/login"), 2000);
    }

    setConfirming(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-green-50">
      <form
        onSubmit={handleUpdate}
        className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-gray-700">
          Set New Password
        </h2>

        {message && (
          <div
            className={`text-center p-3 rounded ${
              message.startsWith("✅")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
        />

        <button
          type="submit"
          disabled={confirming}
          className="w-full bg-gradient-to-r from-pink-500 via-blue-500 to-green-500 text-white font-semibold py-3 rounded-lg hover:scale-105 transition"
        >
          {confirming ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default UpdatePassword;
