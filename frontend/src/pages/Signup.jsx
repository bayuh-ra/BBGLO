import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Use useMemo to stabilize userData
  const userData = useMemo(() => location.state?.userData || {}, [location.state]);

  const [user, setUser] = useState({
    name: userData.name || "",
    email: userData.email || "",
    contact: userData.contact || "",
    password: "",
  });

  useEffect(() => {
    if (!userData.name) {
      navigate("/"); // Redirect if no user data
    }
  }, [userData, navigate]); // ✅ Now userData is stable

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSignup = () => {
    if (!user.name || !user.email || !user.contact || !user.password) {
      alert("Please fill in all fields.");
      return;
    }

    // Simulate saving to backend
    localStorage.setItem("registeredUser", JSON.stringify(user));
    alert("Account created successfully!");
    navigate("/"); // Redirect to home
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white shadow-md rounded-lg text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create Your Account</h2>

        <div className="mb-4">
          <input type="text" name="name" value={user.name} onChange={handleChange} className="border px-2 py-2 w-full rounded-md" placeholder="Full Name" />
        </div>

        <div className="mb-4">
          <input type="email" name="email" value={user.email} onChange={handleChange} className="border px-2 py-2 w-full rounded-md" placeholder="Email Address" />
        </div>

        <div className="mb-4">
          <input type="text" name="contact" value={user.contact} onChange={handleChange} className="border px-2 py-2 w-full rounded-md" placeholder="Contact Number" />
        </div>

        <div className="mb-4">
          <input type="password" name="password" value={user.password} onChange={handleChange} className="border px-2 py-2 w-full rounded-md" placeholder="Set Password" />
        </div>

        <button onClick={handleSignup} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Signup;
