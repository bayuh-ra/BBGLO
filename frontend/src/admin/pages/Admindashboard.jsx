import { useEffect, useState } from "react";
import API from "../../api/api";
import { supabase } from "../../api/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FiPackage, FiDollarSign, FiUsers } from "react-icons/fi";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch orders from Django API
        const ordersResponse = await API.get("orders/");
        const ordersData = ordersResponse.data;

        // Fetch customers from Supabase
        const { data: customerData, error: customerError } = await supabase
          .from("profiles")
          .select("*");

        if (customerError) {
          console.error("Error fetching customers:", customerError);
          throw customerError;
        }

        console.log("Customer data from Supabase:", customerData); // Debug log

        // Calculate revenue
        const revenue = ordersData?.reduce(
          (sum, o) => sum + Number(o.total_amount || 0),
          0
        );

        // Update state
        setOrders(ordersData || []);
        setTotalRevenue(revenue);
        setTotalOrders(ordersData?.length || 0);
        setTotalCustomers(customerData?.length || 0);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setError(error.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const chartData = orders.reduce((acc, order) => {
    const date = new Date(order.date_ordered).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.sales += Number(order.total_amount);
    } else {
      acc.push({ date, sales: Number(order.total_amount) });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Dashboard */}
      <div className="flex-1 p-6 bg-gray-50">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Admin Dashboard
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiDollarSign className="text-3xl text-green-500" />
            <div>
              <p className="text-gray-500">Total Revenue</p>
              <h3 className="text-xl font-bold">
                ₱{totalRevenue.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiPackage className="text-3xl text-blue-500" />
            <div>
              <p className="text-gray-500">Total Orders</p>
              <h3 className="text-xl font-bold">{totalOrders}</h3>
            </div>
          </div>
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiUsers className="text-3xl text-purple-500" />
            <div>
              <p className="text-gray-500">Total Customers</p>
              <h3 className="text-xl font-bold">{totalCustomers}</h3>
            </div>
          </div>
        </div>

        {/* Sales Chart */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
