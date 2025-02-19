import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Profile = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Customer Profile</h2>
      
      {/* Account Settings */}
      <section className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Account Setting</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Business Name</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Username</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Phone Number</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Email</label>
            <input type="email" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>City</label>
            <select className="border p-2 rounded w-full">
              <option>Davao</option>
            </select>
          </div>
          <div>
            <label>Barangay</label>
            <select className="border p-2 rounded w-full">
              <option>Publication District</option>
            </select>
          </div>
          <div>
            <label>Zip Code</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
        </div>
        <button className="bg-pink-500 text-white px-4 py-2 mt-4 rounded">Save Changes</button>
      </section>
      
      {/* Shipping Address */}
      <section className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Company Name</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Address</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Barangay</label>
            <select className="border p-2 rounded w-full">
              <option>Publication District</option>
            </select>
          </div>
          <div>
            <label>Region/State</label>
            <select className="border p-2 rounded w-full">
              <option>Davao del Sur</option>
            </select>
          </div>
          <div>
            <label>City</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Zip Code</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Email</label>
            <input type="email" className="border p-2 rounded w-full"/>
          </div>
          <div>
            <label>Phone Number</label>
            <input type="text" className="border p-2 rounded w-full"/>
          </div>
        </div>
        <button className="bg-pink-500 text-white px-4 py-2 mt-4 rounded">Save Changes</button>
      </section>
      
      {/* Change Password */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Current Password</label>
            <input type="password" className="border p-2 rounded w-full" />
          </div>
          <div>
            <label>New Password</label>
            <input type="password" className="border p-2 rounded w-full" />
          </div>
          <div>
            <label>Confirm Password</label>
            <input type="password" className="border p-2 rounded w-full" />
          </div>
        </div>
        <button className="bg-pink-500 text-white px-4 py-2 mt-4 rounded">Change Password</button>
      </section>
    </div>
  );
};

export default Profile;