import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ usernameOrEmailOrPhone: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { usernameOrEmailOrPhone, password } = formData;

    // Simulated login logic
    if (usernameOrEmailOrPhone === "admin@example.com" && password === "password") {
      navigate("/admin");
    } else {
      alert("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-lg w-96 text-center"
      >
        <img
          src="/src/assets/logo.png" // Replace with the actual logo path
          alt="BabyGlo Logo"
          className="mx-auto w-20 mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Log in</h2>
        <input
          type="text"
          placeholder="Username, Email, or Phone Number"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, usernameOrEmailOrPhone: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
        >
          Login
        </button>
        <p className="text-sm text-gray-600 mt-4">
          Don’t have an account?{" "}
          <a
            href="#"
            onClick={() => navigate("/admin-signup")}
            className="text-red-400 underline"
          >
            Sign up here
          </a>
        </p>
      </form>
    </div>
  );
};

export default AdminLogin;
