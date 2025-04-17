import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import PropTypes from "prop-types";
import { FiEye, FiEyeOff, FiCheck } from "react-icons/fi";

const Login = ({ setLoggedInUser }) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectPath, setRedirectPath] = useState(null);

  // Add debug effect for loggedInUser changes
  useEffect(() => {
    console.log("🧪 loggedInUser was updated:", setLoggedInUser);
  }, [setLoggedInUser]);

  // Add useEffect for handling navigation after modal
  useEffect(() => {
    if (showSuccessModal) {
      console.log("✅ Showing success modal");
      const timeout = setTimeout(() => {
        if (redirectPath) {
          navigate(redirectPath);
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [showSuccessModal, redirectPath, navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page reload
    const { identifier, password } = credentials;
    if (!identifier || !password) {
      setErrorMessage("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      let emailToUse = identifier.trim().toLowerCase();
      const isEmail = emailToUse.includes("@");

      if (!isEmail) {
        const usernameToCheck = emailToUse.trim().toLowerCase();
        console.log("🔍 Looking up username:", usernameToCheck);

        // Try exact match first
        const { data: staffMatches, error: staffError } = await supabase
          .from("staff_profiles")
          .select("username, email, status")
          .ilike("username", usernameToCheck) // Case-insensitive exact match
          .limit(1);

        console.log("🔍 Raw query results:", staffMatches);
        console.log("🔍 Query error if any:", staffError);

        if (staffError) {
          console.error("❌ Database error:", staffError);
          setErrorMessage("Error checking username. Please try again.");
          setLoading(false);
          return;
        }

        let staffMatch = staffMatches?.[0];

        if (!staffMatch) {
          setErrorMessage(
            "Username not found. Please check your username or try using your email."
          );
          setLoading(false);
          return;
        }

        console.log("🔍 Staff match status:", staffMatch.status);

        // Check account status and show specific messages
        if (staffMatch.status === "Deactivated") {
          setErrorMessage(
            "Your account has been Deactivated. Please contact your administrator."
          );
          setLoading(false);
          return;
        }

        if (staffMatch.status === "Deleted") {
          setErrorMessage(
            "Your account has been Deleted. Please contact support."
          );
          setLoading(false);
          return;
        }

        if (staffMatch.status !== "Active") {
          setErrorMessage(
            "Your account status is invalid. Please contact your administrator."
          );
          setLoading(false);
          return;
        }

        emailToUse = staffMatch.email;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (loginError) {
        if (
          loginError.message.toLowerCase().includes("invalid login") ||
          loginError.status === 400
        ) {
          setErrorMessage("Incorrect password.");
        } else {
          setErrorMessage("Login failed: " + loginError.message);
        }
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setErrorMessage("Failed to retrieve session.");
        setLoading(false);
        return;
      }

      const { data: staffProfile } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (staffProfile) {
        const finalStaff = {
          ...staffProfile,
          email: user.email,
          role: staffProfile.role,
        };

        // Show success modal first, then update user state after delay
        setShowSuccessModal(true);
        setTimeout(() => {
          localStorage.setItem("loggedInUser", JSON.stringify(finalStaff));
          setLoggedInUser(finalStaff);
          window.dispatchEvent(new Event("profile-updated"));
          setRedirectPath(
            finalStaff.role === "admin"
              ? "/admin"
              : "/employee/inventory-management"
          );
        }, 2000);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let finalProfile = profile;

      if (profileError?.code === "PGRST116" || !profile) {
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || "",
          email: user.email,
          contact: user.user_metadata?.contact || "",
          company: "",
          shippingAddress: "",
        };

        const { error: insertError } = await supabase
          .from("profiles")
          .insert([newProfile]);

        if (insertError) {
          setErrorMessage("Error creating profile: " + insertError.message);
          setLoading(false);
          return;
        }

        finalProfile = newProfile;
      } else if (profileError) {
        setErrorMessage("Error fetching profile: " + profileError.message);
        setLoading(false);
        return;
      }

      // Show success modal first, then update user state after delay
      setShowSuccessModal(true);
      setTimeout(() => {
        localStorage.setItem("loggedInUser", JSON.stringify(finalProfile));
        setLoggedInUser(finalProfile);
        window.dispatchEvent(new Event("profile-updated"));
        setRedirectPath("/customer/");
      }, 2000);
    } catch (err) {
      setErrorMessage("Unexpected error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-green-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-pink-200 rounded-full opacity-10 animate-pulse"></div>
        <div
          className="absolute top-1/2 right-0 w-80 h-80 bg-blue-200 rounded-full opacity-10 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-0 left-1/2 w-72 h-72 bg-green-200 rounded-full opacity-10 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="bg-white rounded-2xl p-6 shadow-2xl relative z-10 transform animate-float">
            <div className="relative">
              {/* Decorative circles */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-pink-200 rounded-full animate-pulse opacity-50"></div>
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200 rounded-full animate-pulse opacity-50"
                style={{ animationDelay: "0.5s" }}
              ></div>
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-4 w-16 h-16 bg-green-200 rounded-full animate-pulse opacity-50"
                style={{ animationDelay: "1s" }}
              ></div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 via-blue-500 to-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <FiCheck className="text-3xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 via-blue-500 to-green-500 text-transparent bg-clip-text">
                  Login Successful!
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  Welcome back to BabyGlo!
                </p>
                <div className="flex justify-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full bg-pink-500 animate-bounce"
                    style={{ animationDelay: "0s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-green-500 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex w-3/4 max-w-5xl bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Left Section */}
        <div className="w-1/2 bg-gradient-to-br from-pink-100/80 via-blue-100/80 to-green-100/80 flex flex-col items-left justify-center p-8 relative">
          {/* Decorative elements */}
          <div className="absolute top-4 left-4 w-16 h-16 rounded-full bg-pink-200/30 animate-bounce"></div>
          <div
            className="absolute top-20 right-4 w-20 h-20 rounded-full bg-blue-200/30 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute bottom-20 left-8 w-24 h-24 rounded-full bg-green-200/30 animate-bounce"
            style={{ animationDelay: "1s" }}
          ></div>

          <div className="relative z-10">
            <img
              src="/src/assets/logo.png"
              alt="BabyGlo Logo"
              className="w-32 mb-6 transform hover:scale-110 transition-transform duration-300"
            />
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Welcome back!
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Log in to access your baby essentials.
            </p>
            <div className="relative group">
              <img
                src="/src/assets/login.png"
                alt="Baby Essentials"
                className="w-full rounded-xl shadow-lg transform group-hover:scale-105 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-500/20 via-blue-500/20 to-green-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="w-1/2 flex items-center justify-center p-12 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/30 via-blue-50/30 to-green-50/30"></div>

          <div className="w-full max-w-md relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Log in</h2>
              <div className="flex justify-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {errorMessage && (
                <div className="p-3 bg-red-100 text-red-600 rounded-lg border border-red-200 animate-shake">
                  {errorMessage}
                </div>
              )}

              <div className="group">
                <label
                  htmlFor="usernameOrEmailOrPhone"
                  className="block text-gray-700 font-medium mb-2 group-hover:text-pink-500 transition-colors duration-300"
                >
                  Username or Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="identifier"
                    value={credentials.identifier}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all duration-300 group-hover:border-pink-300"
                    placeholder="Username or Email"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              </div>

              <div className="group">
                <label
                  htmlFor="password"
                  className="block text-gray-700 font-medium mb-2 group-hover:text-blue-500 transition-colors duration-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-300 group-hover:border-blue-300"
                    placeholder="Password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-blue-500 transition-colors duration-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href="#"
                  className="text-sm text-pink-500 hover:text-pink-600 transition-colors duration-300"
                >
                  Forgot your password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 via-blue-500 to-green-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:via-blue-600 hover:to-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? "Logging in..." : "Login"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-blue-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>

            <p className="text-sm text-gray-600 mt-6 text-center">
              Don&apos;t have an account?{" "}
              <span
                onClick={() => navigate("/signup")}
                className="text-pink-500 hover:text-pink-600 cursor-pointer transition-colors duration-300"
              >
                Sign up here
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  setLoggedInUser: PropTypes.func.isRequired,
};

export default Login;
