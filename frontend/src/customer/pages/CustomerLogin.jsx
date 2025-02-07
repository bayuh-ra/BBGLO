// src/pages/CustomerLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add login logic here
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex bg-white shadow-lg rounded-lg w-4/5 max-w-4xl overflow-hidden">
        {/* Left Image Section */}
        <div className="w-1/2 bg-gray-100 flex items-center justify-center p-8">
          <div>
            <img src="/path-to-image.png" alt="Baby Essentials" className="w-full rounded-lg" />
            <h1 className="text-3xl font-bold mt-4 text-gray-800">Welcome back!</h1>
            <p className="text-gray-600 mt-2">Log in to access your baby essentials.</p>
          </div>
        </div>
        {/* Right Form Section */}
        <div className="w-1/2 p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Log in</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded mb-4"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded mb-4"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <div className="flex items-center justify-between mb-4">
              <a href="#" className="text-sm text-red-400 underline">
                Forgot your password?
              </a>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
            >
              Log in
            </button>
          </form>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Don’t have an account?{" "}
            <a
              href="#"
              onClick={() => navigate("/customer-signup")}
              className="text-red-400 underline"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
