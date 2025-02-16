// src/pages/AdminSignup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    idNumber: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add signup logic here
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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Create an account
        </h2>
        <input
          type="text"
          placeholder="First Name"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
        <input
          type="text"
          placeholder="Last Name"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email Address"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <input
          type="text"
          placeholder="ID Number"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
        />
        <p className="text-sm text-gray-600 mb-4">
          By continuing, you agree to our{" "}
          <a href="#" className="text-red-400 underline">
            terms of service
          </a>
          .
        </p>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
        >
          Sign up
        </button>
        <p className="text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <a
            href="#"
            onClick={() => navigate("/admin-login")}
            className="text-red-400 underline"
          >
            Sign in here
          </a>
        </p>
      </form>
    </div>
  );
};

export default AdminSignup;
