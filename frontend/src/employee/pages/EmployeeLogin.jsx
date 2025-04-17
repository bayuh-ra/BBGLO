import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/api";

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    usernameOrEmailOrPhone: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { usernameOrEmailOrPhone, password } = formData;

    try {
      const response = await axios.post("/api/token/", {
        username_or_email_or_phone: usernameOrEmailOrPhone,
        password: password,
      });

      if (response.data.access) {
        // Store the tokens
        localStorage.setItem("accessToken", response.data.access);
        localStorage.setItem("refreshToken", response.data.refresh);

        // Get the user profile
        const profileResponse = await axios.get("/staff-profiles/me/", {
          headers: {
            Authorization: `Bearer ${response.data.access}`,
          },
        });

        const userData = profileResponse.data;
        localStorage.setItem("loggedInUser", JSON.stringify(userData));
        navigate("/employee/inventory-management");
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError("This account has been deleted and cannot be accessed.");
      } else if (err.response?.status === 401) {
        setError("Invalid credentials. Please try again.");
      } else {
        setError("An error occurred during login. Please try again.");
      }
      console.error("Login error:", err);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-lg w-96 text-center"
      >
        <img
          src="/src/assets/logo.png"
          alt="BabyGlo Logo"
          className="mx-auto w-20 mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Log in</h2>
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-600 rounded">
            {error}
          </div>
        )}
        <input
          type="text"
          placeholder="Username, Email, or Phone Number"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) =>
            setFormData({ ...formData, usernameOrEmailOrPhone: e.target.value })
          }
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-red-400 text-white font-semibold rounded-lg hover:bg-red-500 transition"
        >
          Login
        </button>
        <p className="text-sm text-gray-600 mt-4">
          Don&apos;t have an account?{" "}
          <a
            href="#"
            onClick={() => navigate("/employee-signup")}
            className="text-red-400 underline"
          >
            Sign up here
          </a>
        </p>
      </form>
    </div>
  );
};

export default EmployeeLogin;
