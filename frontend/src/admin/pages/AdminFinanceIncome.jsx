import { useState, useEffect } from "react";
import { supabase } from "../../api/supabaseClient";
import { FaSearch } from "react-icons/fa";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { DateTime } from "luxon";

const AdminFinanceIncome = () => {
  const [incomeData, setIncomeData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [comparisonChartData, setComparisonChartData] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchIncome();
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("amount, created_at")
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching expenses:", error.message);
      return null;
    }
    
    const total = data.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    setTotalExpenses(total);

    // Group expenses by month
    const monthlyExpenses = {};
    data.forEach(item => {
      const month = DateTime.fromISO(item.created_at).toFormat("LLLL yyyy");
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + parseFloat(item.amount);
    });

    return monthlyExpenses;
  };

  const fetchIncome = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("order_id, customer_name, total_amount, date_ordered, payment_status, status")
      .eq("status", "Complete")
      .order("date_ordered", { ascending: false });

    if (error) {
      console.error("Error fetching income data:", error.message);
      return;
    }

    const filtered = data.map(item => ({
      invoiceId: item.order_id,
      customer: item.customer_name,
      totalAmount: item.total_amount,
      orderDate: DateTime.fromISO(item.date_ordered).toFormat("yyyy-MM-dd"),
      paymentStatus: item.payment_status || "Paid",
    }));

    // Group income by month
    const monthlyIncome = {};
    filtered.forEach(item => {
      const month = DateTime.fromISO(item.orderDate).toFormat("LLLL yyyy");
      monthlyIncome[month] = (monthlyIncome[month] || 0) + parseFloat(item.totalAmount);
    });

    // Calculate monthly revenue
    const currentMonth = DateTime.now().toFormat("yyyy-MM");
    const thisMonthRevenue = filtered
      .filter(item => item.orderDate.startsWith(currentMonth))
      .reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
    
    setMonthlyRevenue(thisMonthRevenue);
    setIncomeData(filtered);
    setTotalIncome(filtered.reduce((sum, i) => sum + parseFloat(i.totalAmount), 0));

    return monthlyIncome;
  };

  useEffect(() => {
    const loadData = async () => {
      const monthlyIncome = await fetchIncome();
      const monthlyExpenses = await fetchExpenses();

      if (monthlyIncome && monthlyExpenses) {
        // Combine income and expenses data
        const allMonths = new Set([
          ...Object.keys(monthlyIncome),
          ...Object.keys(monthlyExpenses)
        ]);

        const comparisonData = Array.from(allMonths)
          .sort((a, b) => DateTime.fromFormat(a, "LLLL yyyy") - DateTime.fromFormat(b, "LLLL yyyy"))
          .map(month => ({
            month,
            income: monthlyIncome[month] || 0,
            expenses: monthlyExpenses[month] || 0,
            profit: (monthlyIncome[month] || 0) - (monthlyExpenses[month] || 0)
          }));

        setComparisonChartData(comparisonData);
      }
    };

    loadData();
  }, []);

  const filteredData = incomeData.filter(item =>
    item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.invoiceId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Income</h1>

      {/* Income Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">₱{totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">₱{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Net Income</h3>
          <p className="text-2xl font-bold text-green-600">₱{(totalIncome - totalExpenses).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Revenue This Month</h3>
          <p className="text-2xl font-bold text-gray-900">₱{monthlyRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="bg-white p-4 rounded-lg shadow-md col-span-2">
          <h2 className="font-bold text-lg mb-2">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#36a2eb" name="Revenue" />
              <Bar dataKey="expenses" fill="#ff6384" name="Expenses" />
              <Bar dataKey="profit" fill="#4bc0c0" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="font-bold text-lg mb-2">Goals</h2>
          <p className="text-xl font-semibold">₱{totalIncome.toFixed(2)}</p>
          <p className="text-gray-500">Achievement vs. Target</p>
          <div className="h-4 bg-gray-200 rounded-full mt-2">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "70%" }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md mt-4">
        <h2 className="text-xl font-bold">₱{totalIncome.toFixed(2)}</h2>
        <p className="text-gray-500">Total Income</p>
      </div>

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

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-red-200 text-lg font-semibold">
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-gray-500 p-4">
                    No income records found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.invoiceId}</td>
                    <td>{item.orderDate}</td>
                    <td>{item.customer}</td>
                    <td>₱{parseFloat(item.totalAmount).toFixed(2)}</td>
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
