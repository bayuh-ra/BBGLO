// src/pages/CustomerSignup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/api";


function CustomerSignup() {  // ✅ Changed from export default to normal function declaration
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    business_name: "",
    manager_first_name: "",
    manager_last_name: "",
    business_email: "",
    contact_number: "",
    region: "",
    city: "",
    barangay: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const response = await axios.post("/signup/", {
        business_name: formData.business_name,
        manager_first_name: formData.manager_first_name,
        manager_last_name: formData.manager_last_name,
        business_email: formData.business_email,
        contact_number: formData.contact_number,
        region: formData.region,
        city: formData.city,
        barangay: formData.barangay,
        address: formData.address,
        password: formData.password,  // ✅ Ensure this field is included
      });
  
      console.log("Server Response:", response.data);
      alert("Signup successful! Wait for admin approval.");
      navigate("/customer-login");
    } catch (error) {
      console.log("Signup Error:", error.response?.data);  // ✅ Show exact API error
      alert(error.response?.data?.error || "Signup failed. Check your input.");
    }
  
    setLoading(false);
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
                <label className="block text-gray-700 font-medium mb-2">First Name (Contact Person)</label>
                <input type="text" name="manager_first_name" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
              </div>
              <div className="w-1/2">
                <label className="block text-gray-700 font-medium mb-2">Last Name (Contact Person)</label>
                <input type="text" name="manager_last_name" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Business Name</label>
              <input type="text" name="business_name" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Business Contact No.</label>
              <input type="text" name="contact_number" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Business Address</label>
                <select name="region" onChange={handleChange} required className="w-full px-4 py-2 border rounded">
                  <option value="">Select Region</option>
                  <option value="Region IX">Zamboanga Peninsula</option>
                  <option value="Region X">Northern Mindanao</option>
                </select>
                <input type="text" name="city" placeholder="City" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
                <input type="text" name="barangay" placeholder="Barangay" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
                <input type="text" name="address" placeholder="Address" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
            </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Email</label>
                <input type="email" name="business_email" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Password</label>
                <input type="password" name="password" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                By creating an account, you agree to our{" "}
                <a href="#" className="text-red-400 underline">Terms of use</a> and{" "}
                <a href="#" className="text-red-400 underline">Privacy Policy</a>.
              </p>
              <button type="submit" className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition">
                {loading ? "Creating account..." : "Create account"}
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