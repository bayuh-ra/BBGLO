import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const Signup = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
  });

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

    setLoading(true);
    setErrorMessage("");

    // ✅ Ensure contact number starts with +63
    let formattedContact = user.contact.trim();
    if (!formattedContact.startsWith("+63")) {
      formattedContact = `+63${formattedContact.replace(/^0/, "")}`;
    }

    try {
      // ✅ Check if email already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", user.email)
        .single();

      if (existingUser) {
        setErrorMessage("An account with this email already exists.");
        setLoading(false);
        return;
      }

      if (fetchError && fetchError.code !== "PGRST116") {
        setErrorMessage("Error checking user: " + fetchError.message);
        setLoading(false);
        return;
      }

      // ✅ Sign up the user and enforce email verification
      const { error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: { emailRedirectTo: "http://localhost:5173/login" }, // Redirects after verification
      });

      if (authError) {
        setErrorMessage("Signup Error: " + authError.message);
        setLoading(false);
        return;
      }

      // ✅ Wait for user authentication before inserting profile data
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.user) {
        setErrorMessage("User session not found. Try logging in after verification.");
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      // ✅ Insert Profile Data
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: userId, // Auth User ID from Supabase
          name: user.name,
          email: user.email,
          contact: formattedContact,
        },
      ]);

      if (insertError) {
        setErrorMessage("Error saving user data: " + insertError.message);
        setLoading(false);
        return;
      }

      alert("A verification email has been sent. Please check your inbox.");
      navigate("/login"); // ✅ Redirect to login page after sign-up
    } catch (error) {
      setErrorMessage("Unexpected error: " + error.message);
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
          <input
            type="text"
            name="contact"
            value={user.contact}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Contact Number"
          />
        </div>

        <div className="mb-4">
          <input
            type="password"
            name="password"
            value={user.password}
            onChange={handleChange}
            className="border px-2 py-2 w-full rounded-md"
            placeholder="Set Password"
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
