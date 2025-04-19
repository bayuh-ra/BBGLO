import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { toast } from "react-toastify";

const Signup = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    if (!user.name || !user.email || !user.contact || !user.password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (user.password !== confirmPassword) {
      toast.error("❌ Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    // ✅ Ensure contact number starts with +63
    let formattedContact = user.contact.trim();
    if (!formattedContact.startsWith("+63")) {
      formattedContact = `+63${formattedContact.replace(/^0/, "")}`;
    }

    try {
      // ✅ Check if email already exists in the profiles table
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", user.email)
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

      // ✅ Sign up the user and enforce email verification
      const { error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          emailRedirectTo: "http://localhost:5173/login",
          data: {
            name: user.name,
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
      navigate("/login"); // ✅ Redirect to login page after sign-up
    } catch (error) {
      toast.error("❌ Unexpected error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create Your Account</h2>
        {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

        <div className="mb-4">
          <input
            type="text"
            name="name"
            value={user.name}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Full Name"
          />
        </div>

        <div className="mb-4">
          <input
            type="email"
            name="email"
            value={user.email}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Email Address"
          />
        </div>

        <div className="mb-4">
          <label className="text-gray-600 text-sm">Contact Number</label>
          <div className="flex">
            <div className="border px-2 py-2 rounded-l-md bg-gray-100 flex items-center">
              +63
            </div>
            <input
              type="text"
              name="contact"
              value={user.contact}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (
                  value.length <= 10 &&
                  (value.length === 0 || value.startsWith("9"))
                ) {
                  setUser({ ...user, contact: value });
                }
              }}
              className="border px-2 py-2 w-full rounded-r-md"
              placeholder="9XXXXXXXXX"
              maxLength={10}
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <input
            type="password"
            name="password"
            value={user.password}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Set Password"
            required
            minLength={6}
          />
        </div>

        <div className="mb-4">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Confirm Password"
            required
            minLength={6}
          />
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 w-full"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-500 cursor-pointer"
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
