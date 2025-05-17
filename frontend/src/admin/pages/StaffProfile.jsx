import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { FiEdit, FiSave, FiLock, FiMail, FiPhone, FiUser, FiHome, FiBriefcase } from "react-icons/fi";
import { toast } from "react-toastify";

const StaffProfile = () => {
  const [staff, setStaff] = useState({
    name: "",
    email: "",
    username: "",
    contact: "",
    address: "",
    role: "",
    license_number: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const fetchStaffProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setMessage("You must be logged in.");
        return;
      }

      const { data: profile, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        setMessage("Error fetching profile: " + error.message);
        return;
      }

      // Auto-generate username if missing
      if (!profile.username) {
        const initials = profile.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toLowerCase();
        const prefix = profile.role === "admin" ? "a" : "e";

        const { count } = await supabase
          .from("staff_profiles")
          .select("*", { count: "exact", head: true });

        const newUsername = `${prefix}${initials}${String(count + 1).padStart(
          4,
          "0"
        )}`;

        const { error: updateError } = await supabase
          .from("staff_profiles")
          .update({ username: newUsername })
          .eq("id", userId);

        if (!updateError) {
          profile.username = newUsername;
        }
      }

      // Remove +63 prefix for display and editing
      const displayProfile = {
        ...profile,
        contact: profile.contact ? profile.contact.replace("+63", "") : "",
      };
      setStaff(displayProfile);

      // Update navbar and localStorage
      window.dispatchEvent(new CustomEvent("profile-updated"));
      const updated = {
        ...JSON.parse(localStorage.getItem("loggedInUser")),
        name: profile.name,
        username: profile.username,
        contact: displayProfile.contact,
      };
      localStorage.setItem("loggedInUser", JSON.stringify(updated));
    };

    fetchStaffProfile();
  }, []);

  const handleChange = (e) => {
    setStaff({ ...staff, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    // Ensure contact has +63 prefix when saving
    const formattedContact = staff.contact.startsWith("+63")
      ? staff.contact
      : `+63${staff.contact}`;

    const { error } = await supabase
      .from("staff_profiles")
      .update({
        name: staff.name,
        contact: formattedContact,
        address: staff.address,
        license_number: staff.role === "driver" ? staff.license_number : null,
      })
      .eq("id", staff.id);

    if (error) {
      setMessage("Failed to update profile: " + error.message);
    } else {
      setMessage("Profile updated successfully!");
      setIsEditing(false);
      window.dispatchEvent(new Event("profile-updated"));
      const updated = JSON.parse(localStorage.getItem("loggedInUser")) || {};
      updated.name = staff.name;
      updated.contact = formattedContact;
      localStorage.setItem("loggedInUser", JSON.stringify(updated));
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-green-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-pink-200 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-200 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-green-200 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-4xl p-8 transition-all relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-pink-600 flex items-center gap-2">
              <FiUser /> {staff.name || "Staff Name"}
            </h2>
            <p className="text-gray-500 flex items-center gap-2"><FiMail /> {staff.email}</p>
            <p className="text-sm font-medium text-gray-700 capitalize flex items-center gap-2">
              <FiBriefcase /> {staff.role}
            </p>
          </div>
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className={`${
              isEditing
                ? "bg-green-500 hover:bg-green-600 border border-green-600"
                : "bg-pink-500 hover:bg-pink-600 border border-pink-600"
            } text-white font-bold px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300 z-20`}
            style={{ minWidth: 140 }}
          >
            {isEditing ? <FiSave /> : <FiEdit />}
            {isEditing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>

        {message && (
          <p className={`mb-4 text-sm ${message.includes("Failed") ? "text-red-500" : "text-green-500"}`}>
            {message}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-gray-600 text-sm">👤 Username</label>
            <input
              type="text"
              name="username"
              value={staff.username}
              disabled
              className="border-2 px-3 py-2 w-full rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="text-gray-600 text-sm">👤 Full Name</label>
            <input
              type="text"
              name="name"
              value={staff.name}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border-2 px-3 py-2 w-full rounded-lg focus:border-pink-400 focus:ring-2 focus:ring-pink-200 transition-all ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
            />
          </div>

          <div>
            <label className="text-gray-600 text-sm">📞 Contact Number</label>
            <div className="flex">
              <div className="bg-gray-100 border px-3 py-2 rounded-l-lg flex items-center">
                +63
              </div>
              <input
                type="text"
                name="contact"
                value={staff.contact}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10 && (value.length === 0 || value.startsWith("9"))) {
                    setStaff({ ...staff, contact: value });
                  }
                }}
                disabled={!isEditing}
                className={`border-2 px-3 py-2 w-full rounded-r-lg focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all ${
                  isEditing ? "bg-white" : "bg-gray-100"
                }`}
                placeholder="9XXXXXXXXX"
                maxLength={10}
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="text-gray-600 text-sm">🏠 Full Address</label>
            <input
              type="text"
              name="address"
              value={staff.address}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border-2 px-3 py-2 w-full rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
            />
          </div>

          {staff.role === "driver" && (
            <div className="col-span-2">
              <label className="text-gray-600 text-sm">🚗 License Number</label>
              <input
                type="text"
                name="license_number"
                value={staff.license_number}
                onChange={handleChange}
                disabled={!isEditing}
                className={`border-2 px-3 py-2 w-full rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all ${
                  isEditing ? "bg-white" : "bg-gray-100"
                }`}
              />
            </div>
          )}
        </div>

        {/* Password Change Section */}
        {!showPasswordForm && (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="mt-10 flex items-center gap-2 text-purple-600 hover:text-purple-800 font-semibold transition"
          >
            <FiLock /> Change Password
          </button>
        )}

        {showPasswordForm && (
          <div className="mt-8 bg-purple-50 border-l-4 border-purple-400 rounded-xl p-6 shadow-md transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                <FiLock /> Change Password
              </h3>
              <button
                onClick={() => setShowPasswordForm(false)}
                className="text-gray-400 hover:text-purple-600 text-xl font-bold"
                title="Cancel"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-gray-600 text-sm">🔑 New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border-2 px-3 py-2 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-gray-600 text-sm">🔁 Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border-2 px-3 py-2 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
                  required
                  minLength={6}
                />
              </div>
              <div className="col-span-1 md:col-span-2 text-right">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-gradient-to-r from-pink-500 via-blue-500 to-green-500 text-white px-6 py-2 rounded-md hover:from-pink-600 hover:via-blue-600 hover:to-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  {updatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProfile;
