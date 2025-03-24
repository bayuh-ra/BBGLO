import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FiPackage, FiUsers, FiDollarSign } from "react-icons/fi";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: orderData } = await supabase.from("orders").select("*");
      const { data: customerData } = await supabase
        .from("profiles")
        .select("*");

      const revenue = orderData?.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0
      );

      setOrders(orderData || []);
      setTotalRevenue(revenue);
      setTotalOrders(orderData?.length || 0);
      setTotalCustomers(customerData?.length || 0);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

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
          <FiUsers className="text-3xl text-pink-500" />
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
  );
}
