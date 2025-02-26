import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/api";

function CustomerSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone_number: "",
    business_name: "",
    business_email: "",
    contact_number: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Log the request payload
    console.log("Signup Request Payload:", formData);

    try {
      const response = await axios.post("/signup/", {
        business_name: formData.business_name,
        business_email: formData.business_email,
        contact_number: formData.contact_number,
        password: formData.password,
      });

      console.log("Server Response:", response.data);
      alert("Signup successful! Wait for admin approval.");
      navigate("/customer-login");
    } catch (error) {
      console.log("Signup Error:", error.response?.data);
      alert(error.response?.data?.error || "Signup failed. Check your input.");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row bg-white shadow-lg rounded-lg w-full max-w-5xl">
        <div className="md:w-1/2 w-full bg-gray-100 flex flex-col items-start justify-center p-8">
          <img
            src="/src/assets/logo.png"
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

        <div className="w-1/2 p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-left mb-6">Create an account</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Business Name</label>
              <input type="text" name="business_name" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
              <input type="text" name="phone_number" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Gmail or Phone Number</label>
              <input type="text" name="business_email" required className="w-full px-4 py-2 border rounded" onChange={handleChange} />
            </div>
            <div className="mb-4 flex items-center">
              <button 
                onClick={() => window.location.href='https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?gsiwebsdk=3&client_id=549970890748-gsamk7k873sfkchk55nil15feru4lp1f.apps.googleusercontent.com&scope=profile%20email&redirect_uri=storagerelay%3A%2F%2Fhttps%2Fshopee.ph%3Fid%3Dauth267840&prompt=consent&access_type=offline&response_type=code&include_granted_scopes=true&enable_granular_consent=true&service=lso&o2v=2&ddm=1&flowName=GeneralOAuthFlow&hl=en'} 
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
              >
                <img src="/src/assets/google-icon.png" alt="Google Icon" className="w-5 h-5 mr-2" />
                Sign up with Google
              </button>
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