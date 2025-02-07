// src/pages/CustomerSignup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CustomerSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    businessContact: "",
    businessAddress: "",
    email: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add signup logic here
    navigate("/customer-login");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex bg-white shadow-lg rounded-lg w-4/5 max-w-4xl overflow-hidden">
        {/* Left Image Section */}
        <div className="w-1/2 bg-gray-100 flex items-center justify-center p-8">
          <div>
            <img src="/path-to-image.png" alt="Baby Essentials" className="w-full rounded-lg" />
            <h1 className="text-3xl font-bold mt-4 text-gray-800">Join us!</h1>
            <p className="text-gray-600 mt-2">Empowering your business with baby essentials.</p>
          </div>
        </div>
        {/* Right Form Section */}
        <div className="w-1/2 p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Create an account</h2>
          <form onSubmit={handleSubmit}>
            <div className="flex space-x-4 mb-4">
              <input
                type="text"
                placeholder="First Name (Contact Person)"
                className="w-1/2 px-4 py-2 border rounded"
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Last Name (Contact Person)"
                className="w-1/2 px-4 py-2 border rounded"
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <input
              type="text"
              placeholder="Business Name"
              className="w-full px-4 py-2 border rounded mb-4"
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Business Contact No."
              className="w-full px-4 py-2 border rounded mb-4"
              onChange={(e) => setFormData({ ...formData, businessContact: e.target.value })}
            />
            <input
              type="text"
              placeholder="Business Address"
              className="w-full px-4 py-2 border rounded mb-4"
              onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
            />
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
            <p className="text-sm text-gray-600 mb-4">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-red-400 underline">
                Terms of use
              </a>{" "}
              and{" "}
              <a href="#" className="text-red-400 underline">
                Privacy Policy
              </a>
              .
            </p>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
            >
              Create account
            </button>
          </form>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Already have an account?{" "}
            <a
              href="#"
              onClick={() => navigate("/customer-login")}
              className="text-red-400 underline"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSignup;
