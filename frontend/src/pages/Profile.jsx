import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { FiEdit } from "react-icons/fi"; // Edit icon

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "",
    email: "",
    contact: "",
    company: "",
    shippingAddress: "",
  });

  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false); // Controls edit mode

  useEffect(() => {
    const fetchUserProfile = async () => {
      setMessage("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.user) {
        setMessage("User not found. Please log in.");
        navigate("/login");
        return;
      }

      const userId = sessionData.session.user.id;

      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        setMessage("Error fetching profile: " + fetchError.message);
        return;
      }

      if (!profile) {
        setMessage("Profile not found. Please complete your profile.");
      } else {
        setUser(profile);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async () => {
    if (!user.name || !user.contact || !user.company || !user.shippingAddress) {
      setMessage("All fields are required.");
      return;
    }

    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session.user.id;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: user.name,
        contact: user.contact,
        company: user.company,
        shippingAddress: user.shippingAddress,
      })
      .eq("id", userId);

    if (error) {
      setMessage("Error updating profile: " + error.message);
    } else {
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-pink-100">
      <div className="p-8 bg-white shadow-md rounded-lg max-w-3xl w-full">
        {/* Profile Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {user.name || "Your Name"}
              </h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
          {/* Edit Button */}
          <button
            onClick={() =>
              isEditing ? handleUpdateProfile() : setIsEditing(true)
            }
            className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 flex items-center"
          >
            <FiEdit className="mr-2" />
            {isEditing ? "Save Changes" : "Edit"}
          </button>
        </div>

        {message && (
          <p
            className={`mb-4 ${
              message.includes("Error") ? "text-red-500" : "text-green-500"
            }`}
          >
            {message}
          </p>
        )}

        {/* Profile Fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="text-gray-600 text-sm">Full Name</label>
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
              placeholder="Your Name"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="text-gray-600 text-sm">Company Name</label>
            <input
              type="text"
              name="company"
              value={user.company}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
              placeholder="Company Name"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="text-gray-600 text-sm">Contact Number</label>
            <input
              type="text"
              name="contact"
              value={user.contact}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
              placeholder="Contact Number"
            />
          </div>

          {/* Shipping Address */}
          <div>
            <label className="text-gray-600 text-sm">Shipping Address</label>
            <input
              type="text"
              name="shippingAddress"
              value={user.shippingAddress}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
              placeholder="Shipping Address"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
