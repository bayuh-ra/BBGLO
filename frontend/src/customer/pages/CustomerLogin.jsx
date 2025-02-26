import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/api";

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ usernameOrEmailOrPhone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post("/login/", {
        username_or_email_or_phone: formData.usernameOrEmailOrPhone,
        password: formData.password,
      });

      console.log("Login Response:", response.data);
      
      // ✅ Store token in localStorage
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);

      alert("Login successful!");
      navigate("/customer"); // ✅ Redirect to CustomerLayout
    } catch (error) {
      console.log("Login Error:", error.response?.data || "Unknown error");
      alert(error.response?.data?.error || "Login failed. Check your input.");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex w-3/4 max-w-5xl bg-white rounded-lg shadow-lg">
        {/* Left Section */}
        <div className="w-1/2 bg-gray-100 flex flex-col items-left justify-center p-8">
          <img
            src="/src/assets/logo.png" // Replace with the actual logo path
            alt="BabyGlo Logo"
            className="w-24 mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800">Welcome back!</h1>
          <p className="text-gray-600 mt-2">Log in to access your baby essentials.</p>
          <img
            src="/src/assets/login.png" // Replace with the actual image path
            alt="Baby Essentials"
            className="w-full rounded-lg mt-4"
          />
        </div>

        {/* Right Form Section */}
        <div className="w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 text-left mb-6">Log in</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="usernameOrEmailOrPhone" className="block text-gray-700 font-medium mb-2">Username, Email, or Phone Number</label>
                <input
                  type="text"
                  name="usernameOrEmailOrPhone"
                  placeholder="Enter your username, email, or phone number"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                  onChange={handleChange}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                  onChange={handleChange}
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <a href="#" className="text-sm text-red-400 underline">
                  Forgot your password?
                </a>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>
            <p className="text-sm text-gray-600 mt-4 text-left">
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
    </div>
  );
};

export default CustomerLogin;
