import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { FiEdit } from "react-icons/fi";
import { toast } from "react-toastify";

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
  const [isEditing, setIsEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

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

      const authUser = sessionData.session.user;
      const userId = authUser.id;

      // 🔍 Try to fetch profile
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        setMessage("Error fetching profile: " + fetchError.message);
        return;
      }

      // ❌ No profile yet — insert one using auth metadata
      if (!profile) {
        const newProfile = {
          id: userId,
          name: authUser.user_metadata?.name || "",
          email: authUser.email,
          contact: authUser.user_metadata?.contact || "",
          company: "",
          shippingAddress: "",
        };

        const { error: insertError } = await supabase
          .from("profiles")
          .insert([newProfile]);

        if (insertError) {
          setMessage("Error creating profile: " + insertError.message);
        } else {
          setUser(newProfile);
          localStorage.setItem("loggedInUser", JSON.stringify(newProfile));
          window.dispatchEvent(new Event("profile-updated"));
        }
      } else {
        // Remove +63 prefix for display and editing
        const displayProfile = {
          ...profile,
          contact: profile.contact ? profile.contact.replace("+63", "") : "",
        };
        setUser(displayProfile);
        localStorage.setItem("loggedInUser", JSON.stringify(displayProfile));
        window.dispatchEvent(new Event("profile-updated"));
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

    // Ensure contact has +63 prefix when saving
    const formattedContact = user.contact.startsWith("+63")
      ? user.contact
      : `+63${user.contact}`;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: user.name,
        contact: formattedContact,
        company: user.company,
        shippingAddress: user.shippingAddress,
      })
      .eq("id", userId);

    if (error) {
      setMessage("Error updating profile: " + error.message);
    } else {
      setMessage("Profile updated successfully!");
      setIsEditing(false);

      // ✅ Update cached name for navbar and localStorage
      const updated = {
        ...user,
        name: user.name,
        contact: formattedContact,
      };
      localStorage.setItem("loggedInUser", JSON.stringify(updated));
      window.dispatchEvent(new Event("profile-updated"));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("❌ New password and confirm password do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("❌ User not authenticated.");
        setUpdatingPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("❌ " + updateError.message);
      } else {
        toast.success("✅ Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error("❌ Unexpected error: " + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-pink-100">
      <div className="p-8 bg-white shadow-md rounded-lg max-w-3xl w-full">
        {/* Profile Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {user.name || "Your Name"}
            </h2>
            <p className="text-gray-500">{user.email}</p>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-600 text-sm">
              Inventory Manager Full Name
            </label>
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

          <div>
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
                disabled={!isEditing}
                className={`border px-2 py-2 w-full rounded-r-md ${
                  isEditing ? "bg-white" : "bg-gray-100"
                }`}
                placeholder="9XXXXXXXXX"
                maxLength={10}
              />
            </div>
          </div>

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

        <div className="mt-10 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="text-gray-600 text-sm">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border px-4 py-2 rounded-md"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-gray-600 text-sm">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border px-4 py-2 rounded-md"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className="bg-pink-500 text-white px-6 py-2 rounded-md hover:bg-pink-600 transition-colors"
            >
              {updatingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
