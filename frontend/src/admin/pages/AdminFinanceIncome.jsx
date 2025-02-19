import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const AdminFinanceIncome = () => {
  const [incomeData, setIncomeData] = useState([]); // Placeholder for future API integration
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch income data from backend when API is ready
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Income</h1>

      {/* Projected Sales & Goals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Projected Sales */}
        <div className="bg-white p-4 rounded-lg shadow-md col-span-2">
          <h2 className="font-bold text-lg mb-2">Projected Sales</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="projected" stroke="#ff6384" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="actual" stroke="#36a2eb" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Goals */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="font-bold text-lg mb-2">Goals</h2>
          <p className="text-xl font-semibold">₱0</p>
          <p className="text-gray-500">Achievement vs. Target</p>
          <div className="h-4 bg-gray-200 rounded-full mt-2">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "0%" }}></div>
          </div>
        </div>
      </div>

      {/* Total Income */}
      <div className="bg-white p-4 rounded-lg shadow-md mt-4">
        <h2 className="text-xl font-bold">₱0.00</h2>
        <p className="text-gray-500">Total Income</p>
      </div>

      {/* Search & Table */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <div className="relative w-1/3">
            <input
              type="text"
              placeholder="Search..."
              className="input input-bordered w-full pl-12 py-3 border-2 rounded-lg text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
          </div>
        </div>

        {/* Income Table */}
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-red-200 text-lg font-semibold">
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {incomeData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 p-4">
                    No income records found.
                  </td>
                </tr>
              ) : (
                incomeData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.invoiceId}</td>
                    <td>{item.orderDate}</td>
                    <td>{item.customer}</td>
                    <td>₱{item.totalAmount}</td>
                    <td>{item.paymentMethod}</td>
                    <td>{item.paymentStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminFinanceIncome;

