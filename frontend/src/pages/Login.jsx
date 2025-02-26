import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types"; // ✅ Import PropTypes

const Login = ({ setLoggedInUser }) => { // ✅ Ensure setLoggedInUser is received
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = () => {
    const registeredUser = JSON.parse(localStorage.getItem("registeredUser"));

    if (!registeredUser) {
      alert("No registered account found. Please create an account.");
      navigate("/signup");
      return;
    }

    if (
      credentials.email === registeredUser.email &&
      credentials.password === registeredUser.password
    ) {
      alert("Login successful!");
      localStorage.setItem("loggedInUser", JSON.stringify(registeredUser)); // ✅ Save logged-in user

      // ✅ Update Navbar instantly without refresh
      setLoggedInUser(registeredUser);

      navigate("/"); // ✅ Redirect to Home after login
    } else {
      alert("Invalid email or password.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Login to Your Account</h2>

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
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Login
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

// ✅ Add Prop Validation
Login.propTypes = {
  setLoggedInUser: PropTypes.func.isRequired, // ✅ Ensure it's a required function
};

export default Login;
