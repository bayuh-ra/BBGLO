import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiCheck } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { supabase } from "../api/supabaseClient";

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "contact") {
      const formatted = value.replace(/\D/g, "");
      if (
        formatted.length <= 10 &&
        (formatted === "" || formatted.startsWith("9"))
      ) {
        setFormData((prev) => ({ ...prev, contact: formatted }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.contact ||
      !formData.password
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("❌ Passwords do not match.");
      return;
    }

    let formattedContact = formData.contact.trim();
    if (!formattedContact.startsWith("+63")) {
      formattedContact = `+63${formattedContact.replace(/^0/, "")}`;
    }

    try {
      setLoading(true);

      // Check if email exists in Supabase `profiles` table
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email)
        .single();

      if (existingProfile) {
        toast.error("❌ An account with this email already exists.");
        setLoading(false);
        return;
      }

      if (fetchError && fetchError.code !== "PGRST116") {
        toast.error("❌ Error checking user: " + fetchError.message);
        setLoading(false);
        return;
      }

      // Sign up via Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: "http://localhost:5173/login",
          data: {
            name: formData.name,
            contact: formattedContact,
          },
        },
      });

      if (authError) {
        toast.error("❌ Signup Error: " + authError.message);
        setLoading(false);
        return;
      }

      toast.success(
        "✅ A verification email has been sent. Please check your inbox."
      );
      navigate("/login");
    } catch (err) {
      toast.error("❌ Unexpected error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 via-blue-100 to-green-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-64 h-64 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="max-w-5xl w-full mx-4 relative z-10">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Side - Form */}
          <div className="w-full md:w-1/2 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Create Account
              </h2>
              <p className="text-gray-600">Join us and start your journey!</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <div className="flex">
                  <div className="px-4 py-3 border border-r-0 bg-gray-100 rounded-l-lg text-gray-700 flex items-center">
                    +63
                  </div>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-l-0 rounded-r-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="9XXXXXXXXX"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <FiEyeOff size={20} />
                    ) : (
                      <FiEye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff size={20} />
                    ) : (
                      <FiEye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold shadow-lg hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <span>{loading ? "Signing up..." : "Create Account"}</span>
                <FiCheck size={20} />
              </button>

              <p className="text-center text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-pink-600 hover:text-pink-700 font-semibold transition-colors"
                >
                  Login here
                </Link>
              </p>
            </form>
          </div>

          {/* Right Side - Image Section */}
          <div className="w-full md:w-1/2 bg-gradient-to-b from-pink-100 via-blue-100 to-green-100 p-12 flex flex-col items-center justify-center">
            <img
              src="/src/assets/logo.png"
              alt="BabyGlo Logo"
              className="w-32 mb-8 transform hover:scale-110 transition-transform duration-300 hover:rotate-3 hover:drop-shadow-lg"
            />
            <div className="relative group">
              <img
                src="/src/assets/signup.png"
                alt="Signup illustration"
                className="w-full max-w-md rounded-lg shadow-lg transform group-hover:scale-105 transition-all duration-500 group-hover:rotate-1 group-hover:drop-shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <div className="mt-8 text-center transform hover:scale-105 transition-transform duration-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-2 hover:text-pink-600 transition-colors duration-300">
                Welcome to BabyGlo!
              </h3>
              <p className="text-gray-600 hover:text-purple-600 transition-colors duration-300">
                Your one-stop shop for all baby essentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
