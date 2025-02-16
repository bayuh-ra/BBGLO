import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

// Dummy Data for Initial Load
const dummyIncomeData = [
  {
    invoiceId: "INC1001",
    orderDate: "OCT-10-2024, 10:10AM",
    customer: "Josh Pharmacy",
    totalAmount: "₱50,000.00",
    paymentMethod: "Cash",
    paymentStatus: "Cleared",
  },
  {
    invoiceId: "INC1002",
    orderDate: "OCT-10-2024, 10:10AM",
    customer: "Josh Pharmacy",
    totalAmount: "₱50,000.00",
    paymentMethod: "Cash",
    paymentStatus: "Cleared",
  },
  {
    invoiceId: "INC1003",
    orderDate: "OCT-10-2024, 10:10AM",
    customer: "Mercury Drug Co.",
    totalAmount: "₱60,000.00",
    paymentMethod: "Cheque",
    paymentStatus: "Cleared",
  },
  {
    invoiceId: "INC1004",
    orderDate: "OCT-10-2024, 10:10AM",
    customer: "HB1 Pharmacy",
    totalAmount: "₱50,000.00",
    paymentMethod: "Cheque",
    paymentStatus: "Pending",
  },
  {
    invoiceId: "INC1005",
    orderDate: "OCT-10-2024, 10:10AM",
    customer: "Josh Pharmacy",
    totalAmount: "₱77,000.00",
    paymentMethod: "PDC",
    paymentStatus: "Pending",
  },
];

// Sample data for projected vs. actual income (Graph)
const barChartData = {
  labels: ["MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV"],
  datasets: [
    {
      label: "Projected Income",
      data: [120000, 110000, 90000, 70000, 95000, 180000, 150000],
      backgroundColor: "#f87171",
    },
    {
      label: "Actual Income",
      data: [100000, 95000, 70000, 50000, 85000, 160000, 130000],
      backgroundColor: "#c084fc",
    },
  ],
};

// Sample data for target progress (Gauge Chart)
const doughnutChartData = {
  labels: ["Target Achieved", "Target Shortfall"],
  datasets: [
    {
      data: [112505, 37500],
      backgroundColor: ["#f87171", "#e5e7eb"],
    },
  ],
};

const FinanceIncome = () => {
  const [incomeData, setIncomeData] = useState(dummyIncomeData);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Fetch data when component mounts (Replace with API call later)
    setIncomeData(dummyIncomeData);
  }, []);

  const filteredIncomeData = incomeData.filter((item) =>
    Object.values(item).some((field) =>
      String(field).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      {/* Title Section */}
      <h1 className="text-2xl font-bold mb-4">Income</h1>

      {/* Projected Sales & Goals Section */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Projected Sales Graph */}
        <div className="bg-white shadow-md p-4 rounded-lg">
          <h2 className="text-gray-600 text-sm mb-2">Projected Sales</h2>
          <Bar data={barChartData} />
        </div>

        {/* Goals Progress */}
        <div className="bg-white shadow-md p-4 rounded-lg">
          <h2 className="text-gray-600 text-sm mb-2">Goals</h2>
          <div className="text-lg font-semibold">₱150,500</div>
          <p className="text-sm text-gray-500">Nov, 2024</p>
          <Doughnut data={doughnutChartData} />
        </div>
      </div>

      {/* Total Income Section */}
      <h2 className="text-2xl font-bold mt-4 mb-4">₱240,399.00</h2>
      <p className="text-gray-600 text-sm">Total Income</p>

      {/* Search Bar */}
      <div className="flex items-center border border-gray-300 rounded px-4 py-2 mb-4 w-1/3">
        <FaSearch className="text-gray-500 mr-2" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Income Transactions Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full border-collapse">
          <thead className="bg-pink-100">
            <tr>
              <th className="p-3 text-left">Invoice ID</th>
              <th className="p-3 text-left">Order Date</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Total Amount</th>
              <th className="p-3 text-left">Payment Method</th>
              <th className="p-3 text-left">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncomeData.map((item, index) => (
              <tr
                key={index}
                className="border-t hover:bg-gray-100 cursor-pointer"
              >
                <td className="p-3">{item.invoiceId}</td>
                <td className="p-3">{item.orderDate}</td>
                <td className="p-3">{item.customer}</td>
                <td className="p-3">{item.totalAmount}</td>
                <td className="p-3">{item.paymentMethod}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.paymentStatus === "Cleared"
                        ? "bg-green-200 text-green-800"
                        : "bg-yellow-200 text-yellow-800"
                    }`}
                  >
                    {item.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-end">
        <button className="px-3 py-1 mx-1 bg-gray-200 rounded">&lt;</button>
        <button className="px-3 py-1 mx-1 bg-pink-500 text-white rounded">
          1
        </button>
        <button className="px-3 py-1 mx-1 bg-gray-200 rounded">2</button>
        <button className="px-3 py-1 mx-1 bg-gray-200 rounded">3</button>
        <button className="px-3 py-1 mx-1 bg-gray-200 rounded">&gt;</button>
      </div>
    </div>
  );
};

export default FinanceIncome;
