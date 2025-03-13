import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient"; // Ensure this file exists
import PropTypes from "prop-types"; // Import PropTypes for validation

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

    // ✅ Attempt to log in using Supabase (Removed unused `data` variable)
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setErrorMessage("Invalid email or password.");
      setLoading(false);
      return;
    }

    // ✅ Fetch user session
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setErrorMessage("No registered account found. Please create an account.");
      navigate("/signup");
      setLoading(false);
      return;
    }

    // ✅ Ensure user is confirmed before allowing login
    if (!userData.user.confirmed_at) {
      setErrorMessage("Please confirm your email before logging in.");
      setLoading(false);
      return;
    }

    // ✅ Fetch user profile from Supabase
    const userId = userData.user.id;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, email") // Fetch only needed fields
      .eq("id", userId)
      .single();

    if (profileError) {
      setErrorMessage("Error fetching profile: " + profileError.message);
      setLoading(false);
      return;
    }

    // ✅ Save profile in localStorage and update global state
    localStorage.setItem("loggedInUser", JSON.stringify(profile));
    setLoggedInUser(profile); // ✅ Now using setLoggedInUser from App.jsx

    alert("Login successful!");
    navigate("/"); // Redirect to Home
    setLoading(false);
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

// ✅ Prop validation to prevent ESLint errors
Login.propTypes = {
  setLoggedInUser: PropTypes.func.isRequired,
};

export default Login;
