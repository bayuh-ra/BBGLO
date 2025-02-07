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
  <div className="flex flex-col md:flex-row bg-white shadow-lg rounded-lg w-full max-w-5xl">
    {/* Left Section */}
    <div className="md:w-1/2 w-full bg-gray-100 flex flex-col items-start justify-center p-8">
      <img
        src="/src/assets/logo.png" // Replace with the actual logo path
        alt="BabyGlo Logo"
        className="w-16 mb-4"
      />
      <h1 className="text-2xl font-bold text-gray-800">Join us!</h1>
      <p className="text-sm text-gray-600 mt-2">
        Empowering your business with baby essentials.
      </p>
      <img
        src="/src/assets/signup.png"
        alt="Baby Essentials"
        className="w-full rounded-lg mt-4"
      />
    </div>

    {/* Right Section */}
    <div className="w-1/2 p-8">
  <h2 className="text-2xl font-bold text-gray-800 text-left mb-6">Create an account</h2>
  <form onSubmit={handleSubmit}>
    <div className="flex space-x-4 mb-4">
      <div className="w-1/2">
        <label htmlFor="firstName" className="block text-gray-700 font-medium mb-2">
          First Name (Contact Person)
        </label>
        <input
          type="text"
          id="firstName"
          className="w-full px-4 py-2 border rounded"
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
      </div>
      <div className="w-1/2">
        <label htmlFor="lastName" className="block text-gray-700 font-medium mb-2">
          Last Name (Contact Person)
        </label>
        <input
          type="text"
          id="lastName"
          className="w-full px-4 py-2 border rounded"
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        />
      </div>
    </div>
    <div className="mb-4">
      <label htmlFor="businessName" className="block text-gray-700 font-medium mb-2">
        Business Name
      </label>
      <input
        type="text"
        id="businessName"
        className="w-full px-4 py-2 border rounded"
        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
      />
    </div>
    <div className="mb-4">
      <label htmlFor="businessContact" className="block text-gray-700 font-medium mb-2">
        Business Contact No.
      </label>
      <input
        type="text"
        id="businessContact"
        className="w-full px-4 py-2 border rounded"
        onChange={(e) => setFormData({ ...formData, businessContact: e.target.value })}
      />
    </div>
    <div className="mb-4">
      <label htmlFor="businessAddress" className="block text-gray-700 font-medium mb-2">
        Business Address
      </label>
      <input
        type="text"
        id="businessAddress"
        className="w-full px-4 py-2 border rounded"
        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
      />
    </div>
    <div className="mb-4">
      <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
        Email
      </label>
      <input
        type="email"
        id="email"
        className="w-full px-4 py-2 border rounded"
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
    </div>
    <div className="mb-4">
      <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
        Password
      </label>
      <input
        type="password"
        id="password"
        className="w-full px-4 py-2 border rounded"
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />
    </div>
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
  <p className="text-sm text-gray-600 mt-4 text-left">
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
