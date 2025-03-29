import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import PropTypes from "prop-types";

const Login = ({ setLoggedInUser }) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    // 🔐 Sign in
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (loginError) {
      setErrorMessage("Invalid email or password.");
      setLoading(false);
      return;
    }

    // ✅ Get session user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setErrorMessage("Failed to get user session. Try again.");
      setLoading(false);
      return;
    }

    const user = userData.user;

    // ✅ Check staff_profiles first
    const { data: staffProfile } = await supabase
      .from("staff_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (staffProfile) {
      const staffUser = {
        ...staffProfile,
        email: user.email,
        role: staffProfile.role,
      };

      localStorage.setItem("loggedInUser", JSON.stringify(staffUser));
      setLoggedInUser(staffUser);
      window.dispatchEvent(new Event("profile-updated"));
      setLoading(false);
      alert("Login successful!");

      // ✅ Redirect based on staff role
      if (staffUser.role === "admin") return navigate("/admin");
      if (staffUser.role === "employee")
        return navigate("/employee/inventory-management");
      return navigate("/");
    }

    // ✅ Else: fallback to customer profile
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

    // ✅ Store & Navigate (customer)
    localStorage.setItem("loggedInUser", JSON.stringify(finalProfile));
    setLoggedInUser(finalProfile);
    window.dispatchEvent(new Event("profile-updated"));

    alert("Login successful!");
    setLoading(false);
    navigate("/customer/dashboard");
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Login to Your Account</h2>
        {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

        <div className="mb-4">
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Email Address"
          />
        </div>

        <div className="mb-4">
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Password"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-full"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-blue-500 cursor-pointer"
          >
            Sign up here
          </span>
        </p>
      </div>
    </div>
  );
};

Login.propTypes = {
  setLoggedInUser: PropTypes.func.isRequired,
};

export default Login;
