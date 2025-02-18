// src/pages/Home.jsx
import "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <img
           src="/src/assets/logo.png"
          alt="BabyGlo Logo"
          className="mx-auto w-32 mb-6"
        />
        <h1 className="text-4xl font-bold text-gray-800">Welcome to BabyGlo!</h1>
        <p className="text-gray-600 mt-4">
          Empowering your business with baby essentials.
        </p>
        <div className="mt-8 space-y-4">
          <button
            className="w-64 py-2 bg-red-400 text-white font-semibold rounded-lg shadow-md hover:bg-red-500 transition"
            onClick={() => navigate("/admin-signup")}
          >
            I am an Admin
          </button>
          <br></br>
          <button
            className="w-64 py-2 bg-red-400 text-white font-semibold rounded-lg shadow-md hover:bg-red-500 transition"
            onClick={() => navigate("/employee-signup")}
          >
            I am an Employee
          </button>
          <br></br>
          <button
            className="w-64 py-2 bg-red-400 text-white font-semibold rounded-lg shadow-md hover:bg-red-500 transition"
            onClick={() => navigate("/customer-signup")}
          >
            I am a Customer
          </button>

        </div>
      </div>
    </div>
  );
};

export default Home;
