import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import PropTypes from "prop-types";
import { FiEye, FiEyeOff } from "react-icons/fi";

const Login = ({ setLoggedInUser }) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        console.log("🔍 Looking up username:", emailToUse);

        const { data: staffMatch, error: staffError } = await supabase
          .from("staff_profiles")
          .select("email, username")
          .eq("username", emailToUse)
          .maybeSingle();

        console.log("🔍 Lookup result →", staffMatch);
        console.log("🔍 Lookup error →", staffError);

        if (staffError || !staffMatch?.email) {
          console.error("❌ Failed lookup:", {
            error: staffError,
            result: staffMatch,
          });
          setErrorMessage("Username not found or not linked to email.");
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

        localStorage.setItem("loggedInUser", JSON.stringify(finalStaff));
        setLoggedInUser(finalStaff);
        window.dispatchEvent(new Event("profile-updated"));

        alert("Login successful!");
        setLoading(false);

        return finalStaff.role === "admin"
          ? navigate("/admin")
          : navigate("/employee/inventory-management");
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

      localStorage.setItem("loggedInUser", JSON.stringify(finalProfile));
      setLoggedInUser(finalProfile);
      window.dispatchEvent(new Event("profile-updated"));

      alert("Login successful!");
      navigate("/customer/dashboard");
    } catch (err) {
      setErrorMessage("Unexpected error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="p-6 bg-white shadow-md rounded-lg text-center max-w-md w-full"
      >
        <h2 className="text-2xl font-bold mb-4">Login to Your Account</h2>
        {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

        <input
          type="text"
          name="identifier"
          value={credentials.identifier}
          onChange={handleChange}
          className="border px-3 py-2 w-full rounded-md mb-4"
          placeholder="Username or Email"
        />

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={credentials.password}
            onChange={handleChange}
            className="border px-3 py-2 w-full rounded-md pr-10"
            placeholder="Password"
          />
          <div
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </div>
        </div>

        <button
          type="submit"
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
      </form>
    </div>
  );
};

Login.propTypes = {
  setLoggedInUser: PropTypes.func.isRequired,
};

export default Login;
