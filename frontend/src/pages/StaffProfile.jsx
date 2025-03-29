import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { FiEdit } from "react-icons/fi";

const StaffProfile = () => {
  const [staff, setStaff] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    role: "",
    license_number: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchStaffProfile = async () => {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        setMessage("You must be logged in.");
        return;
      }

      const userId = sessionData.session.user.id;

      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        setMessage("Error fetching profile: " + error.message);
      } else {
        setStaff(data);
      }
    };

    fetchStaffProfile();
  }, []);

  const handleChange = (e) => {
    setStaff({ ...staff, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("staff_profiles")
      .update({
        name: staff.name,
        contact: staff.contact,
        address: staff.address,
        license_number: staff.role === "driver" ? staff.license_number : null,
      })
      .eq("id", staff.id);

    if (error) {
      setMessage("Failed to update profile: " + error.message);
    } else {
      setMessage("Profile updated successfully!");
      setIsEditing(false);

      // update localStorage name too
      const updated = JSON.parse(localStorage.getItem("loggedInUser")) || {};
      updated.name = staff.name;
      localStorage.setItem("loggedInUser", JSON.stringify(updated));
      window.dispatchEvent(new Event("profile-updated"));
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-pink-100">
      <div className="p-8 bg-white shadow-md rounded-lg max-w-3xl w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {staff.name || "Staff Name"}
            </h2>
            <p className="text-gray-500">{staff.email}</p>
            <p className="text-sm font-medium text-gray-700 capitalize">
              {staff.role}
            </p>
          </div>
          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 flex items-center"
          >
            <FiEdit className="mr-2" />
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>

        {message && (
          <p
            className={`mb-4 ${
              message.includes("Failed") ? "text-red-500" : "text-green-500"
            }`}
          >
            {message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Full Name</label>
            <input
              type="text"
              name="name"
              value={staff.name}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Contact Number</label>
            <input
              type="text"
              name="contact"
              value={staff.contact}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm text-gray-600">Full Address</label>
            <input
              type="text"
              name="address"
              value={staff.address}
              onChange={handleChange}
              disabled={!isEditing}
              className={`border px-2 py-2 w-full rounded-md ${
                isEditing ? "bg-white" : "bg-gray-100"
              }`}
            />
          </div>

          {staff.role === "driver" && (
            <div className="col-span-2">
              <label className="text-sm text-gray-600">License Number</label>
              <input
                type="text"
                name="license_number"
                value={staff.license_number}
                onChange={handleChange}
                disabled={!isEditing}
                className={`border px-2 py-2 w-full rounded-md ${
                  isEditing ? "bg-white" : "bg-gray-100"
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
