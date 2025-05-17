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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { FiPackage, FiDollarSign, FiUsers, FiAlertCircle, FiTruck, FiClock, FiCalendar, FiTrendingUp, FiTrendingDown, FiPlus, FiEdit2, FiSearch, FiFilter, FiShoppingCart, FiBox } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesView, setSalesView] = useState('weekly');
  const [salesData, setSalesData] = useState([]);
  const [salesMetrics, setSalesMetrics] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    trend: 0,
    previousPeriodSales: 0,
  });
  const [totalInventoryItems, setTotalInventoryItems] = useState(0);
  const [ordersInDelivery, setOrdersInDelivery] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [pendingSupplierOrders, setPendingSupplierOrders] = useState(0);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [salesPerformanceView, setSalesPerformanceView] = useState('weekly');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [stockInRequests, setStockInRequests] = useState([]);
  const [recentStock, setRecentStock] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Function to calculate trend percentage
  const calculateTrend = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Function to prepare sales data
  const prepareSalesData = (ordersData, view = 'weekly') => {
    const now = new Date();
    const data = [];
    let currentPeriodSales = 0;
    let previousPeriodSales = 0;
    
    // Filter out non-completed orders and ensure valid amounts
    const validOrders = ordersData?.filter(order => 
      order.status === 'Complete' && 
      !isNaN(Number(order.total_amount)) && 
      Number(order.total_amount) > 0
    ) || [];

    const getDateRange = (view) => {
      const now = new Date();
      switch (view) {
        case 'daily':
          return {
            current: {
              start: new Date(now.setHours(0, 0, 0, 0)),
              end: new Date(now.setHours(23, 59, 59, 999))
            },
            previous: {
              start: new Date(now.setDate(now.getDate() - 1)),
              end: new Date(now.setHours(23, 59, 59, 999))
            }
          };
        case 'weekly':
          return {
            current: {
              start: new Date(now.setDate(now.getDate() - 6)),
              end: new Date()
            },
            previous: {
              start: new Date(now.setDate(now.getDate() - 13)),
              end: new Date(now.setDate(now.getDate() + 6))
            }
          };
        case 'monthly':
          return {
            current: {
              start: new Date(now.getFullYear(), now.getMonth(), 1),
              end: new Date()
            },
            previous: {
              start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
              end: new Date(now.getFullYear(), now.getMonth(), 0)
            }
          };
        case 'quarterly':
          return {
            current: {
              start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
              end: new Date()
            },
            previous: {
              start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1),
              end: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
            }
          };
        case 'yearly':
          return {
            current: {
              start: new Date(now.getFullYear(), 0, 1),
              end: new Date()
            },
            previous: {
              start: new Date(now.getFullYear() - 1, 0, 1),
              end: new Date(now.getFullYear() - 1, 11, 31)
            }
          };
        default:
          return {
            current: {
              start: new Date(now.setDate(now.getDate() - 6)),
              end: new Date()
            },
            previous: {
              start: new Date(now.setDate(now.getDate() - 13)),
              end: new Date(now.setDate(now.getDate() + 6))
            }
          };
      }
    };

    const { current, previous } = getDateRange(view);
    
    // Calculate current period sales
    currentPeriodSales = validOrders.reduce((sum, order) => {
      const orderDate = new Date(order.date_ordered);
      return orderDate >= current.start && orderDate <= current.end
        ? sum + Number(order.total_amount)
        : sum;
    }, 0);

    // Calculate previous period sales
    previousPeriodSales = validOrders.reduce((sum, order) => {
      const orderDate = new Date(order.date_ordered);
      return orderDate >= previous.start && orderDate <= previous.end
        ? sum + Number(order.total_amount)
        : sum;
    }, 0);

    // Calculate trend
    const trend = calculateTrend(currentPeriodSales, previousPeriodSales);

    // Calculate total orders for current period
    const totalOrders = validOrders.filter(order => {
      const orderDate = new Date(order.date_ordered);
      return orderDate >= current.start && orderDate <= current.end;
    }).length;

    const averageOrderValue = totalOrders > 0 ? currentPeriodSales / totalOrders : 0;

    setSalesMetrics({
      totalSales: currentPeriodSales,
      totalOrders,
      averageOrderValue,
      trend,
      previousPeriodSales,
    });

    // Prepare chart data based on view
    switch (view) {
      case 'daily':
        // Last 24 hours by hour
        for (let i = 23; i >= 0; i--) {
          const date = new Date(now);
          date.setHours(date.getHours() - i);
          const hourStart = new Date(date);
          const hourEnd = new Date(date);
          hourEnd.setHours(hourEnd.getHours() + 1);

          const hourSales = validOrders.reduce((sum, order) => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= hourStart && orderDate < hourEnd
              ? sum + Number(order.total_amount)
              : sum;
          }, 0);

          const hourOrders = validOrders.filter(order => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= hourStart && orderDate < hourEnd;
          }).length;

          data.push({
            date: date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
            sales: hourSales,
            orders: hourOrders,
            aov: hourOrders > 0 ? hourSales / hourOrders : 0,
          });
        }
        break;

      case 'weekly':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date.setHours(0, 0, 0, 0));
          const dayEnd = new Date(date.setHours(23, 59, 59, 999));

          const daySales = validOrders.reduce((sum, order) => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= dayStart && orderDate <= dayEnd
              ? sum + Number(order.total_amount)
              : sum;
          }, 0);

          const dayOrders = validOrders.filter(order => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= dayStart && orderDate <= dayEnd;
          }).length;

          data.push({
            date: date.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
            sales: daySales,
            orders: dayOrders,
            aov: dayOrders > 0 ? daySales / dayOrders : 0,
          });
        }
        break;

      case 'monthly':
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(date);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const monthSales = validOrders.reduce((sum, order) => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= monthStart && orderDate <= monthEnd
              ? sum + Number(order.total_amount)
              : sum;
          }, 0);

          const monthOrders = validOrders.filter(order => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= monthStart && orderDate <= monthEnd;
          }).length;

          data.push({
            date: date.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
            sales: monthSales,
            orders: monthOrders,
            aov: monthOrders > 0 ? monthSales / monthOrders : 0,
          });
        }
        break;

      case 'quarterly':
        // Last 4 quarters
        for (let i = 3; i >= 0; i--) {
          const date = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - (i * 3), 1);
          const quarterStart = new Date(date);
          const quarterEnd = new Date(date.getFullYear(), date.getMonth() + 3, 0);

          const quarterSales = validOrders.reduce((sum, order) => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= quarterStart && orderDate <= quarterEnd
              ? sum + Number(order.total_amount)
              : sum;
          }, 0);

          const quarterOrders = validOrders.filter(order => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= quarterStart && orderDate <= quarterEnd;
          }).length;

          data.push({
            date: `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`,
            sales: quarterSales,
            orders: quarterOrders,
            aov: quarterOrders > 0 ? quarterSales / quarterOrders : 0,
          });
        }
        break;

      case 'yearly':
        // Last 3 years
        for (let i = 2; i >= 0; i--) {
          const year = now.getFullYear() - i;
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31);

          const yearSales = validOrders.reduce((sum, order) => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= yearStart && orderDate <= yearEnd
              ? sum + Number(order.total_amount)
              : sum;
          }, 0);

          const yearOrders = validOrders.filter(order => {
            const orderDate = new Date(order.date_ordered);
            return orderDate >= yearStart && orderDate <= yearEnd;
          }).length;

          data.push({
            date: year.toString(),
            sales: yearSales,
            orders: yearOrders,
            aov: yearOrders > 0 ? yearSales / yearOrders : 0,
          });
        }
        break;
    }
    
    return data;
  };

  // Function to prepare sales performance data
  const prepareSalesPerformanceData = (ordersData, view = 'weekly') => {
    const now = new Date();
    const data = [];
    
    // Filter completed orders
    const validOrders = ordersData?.filter(order => 
      order.status === 'Complete' && 
      !isNaN(Number(order.total_amount)) && 
      Number(order.total_amount) > 0
    ) || [];

    // Calculate top selling products
    const productSales = {};
    validOrders.forEach(order => {
      try {
        // Safely parse order items
        const items = Array.isArray(order.items)
          ? order.items
          : typeof order.items === "string"
          ? JSON.parse(order.items)
          : [];

        items.forEach(item => {
          const productId = item.item_id;
          const productName = item.item_name || productId;
          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              totalSales: 0,
              quantity: 0
            };
          }
          productSales[productId].totalSales += Number(item.total_price || 0);
          productSales[productId].quantity += Number(item.quantity || 0);
        });
      } catch (error) {
        console.error("Failed to process order items:", error, order);
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    setTopSellingProducts(topProducts);

    // Prepare time-based sales data
    const getDateRange = (view) => {
      switch (view) {
        case 'weekly':
          return {
            start: new Date(now.setDate(now.getDate() - 6)),
            end: new Date()
          };
        case 'monthly':
          return {
            start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            end: new Date()
          };
        default:
          return {
            start: new Date(now.setDate(now.getDate() - 6)),
            end: new Date()
          };
      }
    };

    const { start, end } = getDateRange(view);
    const periodData = {};

    validOrders.forEach(order => {
      const orderDate = new Date(order.date_ordered);
      if (orderDate >= start && orderDate <= end) {
        let periodKey;
        if (view === 'weekly') {
          periodKey = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
          periodKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        if (!periodData[periodKey]) {
          periodData[periodKey] = {
            sales: 0,
            orders: 0
          };
        }
        periodData[periodKey].sales += Number(order.total_amount || 0);
        periodData[periodKey].orders += 1;
      }
    });

    return Object.entries(periodData).map(([period, data]) => ({
      period,
      ...data
    }));
  };

  // Function to fetch all dashboard data
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch orders from Django API
        const ordersResponse = await API.get("orders/");
        const ordersData = ordersResponse.data;

      // Prepare sales data
      const preparedSalesData = prepareSalesData(ordersData, salesView);
      setSalesData(preparedSalesData);

      // Prepare sales performance data
      const salesPerformanceData = prepareSalesPerformanceData(ordersData, salesPerformanceView);
      setSalesData(salesPerformanceData);

        // Fetch customers from Supabase
        const { data: customerData, error: customerError } = await supabase
          .from("profiles")
          .select("*");

        if (customerError) {
          console.error("Error fetching customers:", customerError);
          throw customerError;
        }

      // Calculate revenue and time periods
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));

      // Calculate total revenue
      const totalRev = ordersData?.reduce(
          (sum, o) => sum + (o.status === 'Complete' ? Number(o.total_amount || 0) : 0),
          0
        );

      // Calculate monthly revenue
      const monthlyRev = ordersData?.reduce(
        (sum, o) => {
          const orderDate = new Date(o.date_ordered);
          return orderDate >= startOfMonth && o.status === 'Complete'
            ? sum + Number(o.total_amount || 0)
            : sum;
        },
        0
      );

      // Calculate today's income
      const todayRev = ordersData?.reduce(
        (sum, o) => {
          const orderDate = new Date(o.date_ordered);
          return orderDate >= startOfDay && o.status === 'Complete'
            ? sum + Number(o.total_amount || 0)
            : sum;
        },
        0
      );

      // Calculate pending orders
      const pending = ordersData?.filter(o => o.status === 'Pending').length || 0;

      // Fetch total inventory items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("management_inventoryitem")
        .select("*");

      if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError);
        toast.error("Failed to fetch inventory data");
      }

      // Fetch deliveries
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from("delivery")
        .select("*");

      if (deliveriesError) {
        console.error("Error fetching deliveries:", deliveriesError);
        toast.error("Failed to fetch delivery data");
      }

      // Calculate today's deliveries
      const todayDeliveriesCount = deliveriesData?.filter(d => {
        const deliveryDate = new Date(d.delivery_date);
        return deliveryDate >= startOfDay && deliveryDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      }).length || 0;

      // Calculate orders in delivery
      const inDeliveryCount = deliveriesData?.filter(d => d.status === "In Transit").length || 0;

      // Fetch purchase orders
      const { data: purchaseOrdersData, error: purchaseOrdersError } = await supabase
        .from("purchase_orders")
        .select("*");

      if (purchaseOrdersError) {
        console.error("Error fetching purchase orders:", purchaseOrdersError);
        toast.error("Failed to fetch purchase orders");
      }

      // Calculate pending supplier orders
      const pendingSupplierCount = purchaseOrdersData?.filter(po => po.status === "Pending").length || 0;

      // Fetch recent activity
      let activityData = [];
      try {
        const { data: activityLogData, error: activityError } = await supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (activityError) {
          console.error("Error fetching activity logs:", activityError);
        } else {
          activityData = activityLogData || [];
        }
      } catch (err) {
        console.error("Error in activity log fetch:", err);
      }

      // Update all state variables
        setOrders(ordersData || []);
      setTotalRevenue(totalRev);
      setMonthlyRevenue(monthlyRev);
        setTotalOrders(ordersData?.length || 0);
        setTotalCustomers(customerData?.length || 0);
      setPendingOrders(pending);
      setTodayDeliveries(todayDeliveriesCount);
      setLowStockItems(inventoryData?.filter(item => item.quantity < 10) || []);
      setActivityFeed(activityData);
      setTotalInventoryItems(inventoryData?.length || 0);
      setOrdersInDelivery(inDeliveryCount);
      setTodayIncome(todayRev);
      setPendingSupplierOrders(pendingSupplierCount);

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setError(error.message || "Failed to load dashboard data");
      toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

  // Set up real-time subscriptions
  useEffect(() => {
    // Initial data fetch
    fetchStats();

    // Set up real-time subscriptions
    const subscriptions = [
      // Orders subscription
      supabase
        .channel('orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchStats();
        })
        .subscribe(),

      // Delivery subscription
      supabase
        .channel('delivery-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery' }, () => {
          fetchStats();
        })
        .subscribe(),

      // Inventory subscription
      supabase
        .channel('inventory-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'management_inventoryitem' }, () => {
          fetchStats();
        })
        .subscribe(),

      // Purchase orders subscription
      supabase
        .channel('purchase-orders-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
          fetchStats();
        })
        .subscribe(),

      // Activity log subscription
      supabase
        .channel('activity-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
          fetchStats();
        })
        .subscribe(),

      // Customer subscription
      supabase
        .channel('customer-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchStats();
        })
        .subscribe(),
    ];

    // Cleanup subscriptions on component unmount
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, []);

  // Add effect to update sales data when view changes
  useEffect(() => {
    if (orders.length > 0) {
      const preparedSalesData = prepareSalesData(orders, salesView);
      setSalesData(preparedSalesData);
    }
  }, [salesView, orders]);

  // Add effect to update sales performance data when view changes
  useEffect(() => {
    if (orders.length > 0) {
      const salesPerformanceData = prepareSalesPerformanceData(orders, salesPerformanceView);
      setSalesData(salesPerformanceData);
    }
  }, [salesPerformanceView, orders]);

  const orderStatusData = [
    { name: 'Pending', value: orders.filter(o => o.status === 'Pending').length },
    { name: 'Completed', value: orders.filter(o => o.status === 'Complete').length },
    { name: 'Cancelled', value: orders.filter(o => o.status === 'Cancelled').length },
  ];

  // Add function to update payment method
  const updatePaymentMethod = async (orderId, paymentMethod) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_method: paymentMethod })
        .eq('order_id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.order_id === orderId 
          ? { ...order, payment_method: paymentMethod }
          : order
      ));

      toast.success('Payment method updated successfully');
      setEditingPaymentMethod(null);
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error('Failed to update payment method');
    }
  };

  // Add payment method details to the order details section
  const renderPaymentMethodDetails = (order) => {
    if (editingPaymentMethod === order.order_id) {
      return (
        <div className="flex items-center gap-2">
          <select
            value={newPaymentMethod}
            onChange={(e) => setNewPaymentMethod(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">Select Payment Method</option>
            <option value="Cash on Delivery">Cash on Delivery</option>
            <option value="Credit/Debit Card">Credit/Debit Card</option>
            <option value="Cheque">Cheque</option>
          </select>
          <button
            onClick={() => updatePaymentMethod(order.order_id, newPaymentMethod)}
            className="bg-green-500 text-white px-2 py-1 rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setEditingPaymentMethod(null)}
            className="bg-gray-500 text-white px-2 py-1 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {order.payment_method || 'Not specified'}
        </span>
        <button
          onClick={() => {
            setEditingPaymentMethod(order.order_id);
            setNewPaymentMethod(order.payment_method || '');
          }}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          Edit
        </button>
      </div>
    );
  };

  // Calculate revenue breakdown data
  const revenueData = [
    { name: 'Cash on Delivery', value: orders.filter(o => /cash on delivery/i.test(o.payment_method || '')).reduce((sum, o) => sum + Number(o.total_amount || 0), 0) },
    { name: 'Credit/Debit Card', value: orders.filter(o => /credit|debit/i.test(o.payment_method || '')).reduce((sum, o) => sum + Number(o.total_amount || 0), 0) },
    { name: 'Cheque', value: orders.filter(o => /cheque|check/i.test(o.payment_method || '')).reduce((sum, o) => sum + Number(o.total_amount || 0), 0) },
  ].filter(d => d.value > 0);

  useEffect(() => {
    // Stock-In Requests Awaiting Supplier Confirmation: purchase_orders with status 'Approved'
    supabase
      .from('purchase_orders')
      .select('*')
      .eq('status', 'Approved')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching approved purchase orders:', error);
          setStockInRequests([]);
        } else {
          setStockInRequests(data || []);
        }
      });

    // Fetch stock-in records from the last 2 days for safety
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    supabase
      .from('stock_in_records')
      .select('*')
      .gte('date_stocked', yesterday.toISOString())
      .order('date_stocked', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching stock-in records:', error);
          setRecentStock([]);
        } else {
          // Filter for records where date_stocked is today (local time)
          // This ensures the dashboard matches the local date shown in your table
          const today = new Date();
          const todayStr = today.toLocaleDateString();
          const filtered = (data || []).filter(stock => {
            const d = new Date(stock.date_stocked);
            return d.toLocaleDateString() === todayStr;
          });
          setRecentStock(filtered);
        }
      });
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
      <div className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          Admin Dashboard
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiBox className="text-3xl text-blue-500" />
            <div>
              <p className="text-gray-500">Total Inventory Items</p>
              <h3 className="text-xl font-bold">{totalInventoryItems}</h3>
            </div>
          </div>
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiShoppingCart className="text-3xl text-yellow-500" />
            <div>
              <p className="text-gray-500">Pending Sales Orders</p>
              <h3 className="text-xl font-bold">{pendingOrders}</h3>
            </div>
          </div>
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiTruck className="text-3xl text-green-500" />
            <div>
              <p className="text-gray-500">Orders in Delivery</p>
              <h3 className="text-xl font-bold">{ordersInDelivery}</h3>
            </div>
          </div>
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiDollarSign className="text-3xl text-purple-500" />
            <div>
              <p className="text-gray-500">Today's Income</p>
              <h3 className="text-xl font-bold">₱{todayIncome.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white shadow p-4 rounded-lg flex items-center space-x-4">
            <FiPackage className="text-3xl text-orange-500" />
            <div>
              <p className="text-gray-500">Pending Supplier Orders</p>
              <h3 className="text-xl font-bold">{pendingSupplierOrders}</h3>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white shadow p-6 rounded-lg mb-10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiAlertCircle className="text-red-500" />
            Low Stock Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lowStockItems.map((item) => (
              <div key={item.item_id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="font-medium text-red-800">{item.item_name}</p>
                <p className="text-sm text-red-600">Current Stock: {item.quantity} {item.uom}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Alerts Section */}
        <div className="bg-white shadow p-6 rounded-lg mb-10">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">📥 Inventory Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Low Stock Items List */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-600"><FiAlertCircle /> Low Stock Items</h4>
              {lowStockItems.length === 0 ? (
                <div className="text-gray-400">No low stock items.</div>
              ) : (
                <ul className="space-y-2">
                  {lowStockItems.map(item => (
                    <li key={item.item_id} className="flex justify-between items-center bg-red-50 p-2 rounded">
                      <span>{item.item_name}</span>
                      <span className="font-bold text-red-700">{item.quantity} {item.uom}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Stock-In Requests Awaiting Supplier Confirmation */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-600"><FiClock /> Stock-In Requests Awaiting Supplier Confirmation</h4>
              {Array.isArray(stockInRequests) && stockInRequests.length === 0 ? (
                <div className="text-gray-400">No pending stock-in requests.</div>
              ) : (
                <ul className="space-y-2">
                  {Array.isArray(stockInRequests) && stockInRequests.map(req => (
                    <li key={req.po_id || req.purchase_order || req.purchase_order_id || req.id} className="flex flex-col bg-yellow-50 p-2 rounded">
                      <span className="font-semibold"> {req.po_id || req.purchase_order || req.purchase_order_id || req.id} {req.supplier_name}</span>
                      <span className="text-xs text-gray-500">Ordered: {req.date_ordered ? new Date(req.date_ordered).toLocaleDateString() : '-'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Recently Added Stock */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600"><FiBox /> Recently Added Stock</h4>
              {Array.isArray(recentStock) && recentStock.length === 0 ? (
                <div className="text-gray-400">No recent stock additions.</div>
              ) : (
                <ul className="space-y-2">
                  {recentStock.map(stock => (
                    <li key={stock.stock_in_id} className="flex flex-col bg-green-50 p-2 rounded">
                      <span className="font-semibold">
                        {stock.item_name} (+{stock.quantity} {stock.uom})
                      </span>
                      <span className="text-xs text-gray-500">
                        Stock-In ID: {stock.stock_in_id} | {new Date(stock.date_stocked).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400">Raw: {stock.date_stocked}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Sales Performance Section */}
        <div className="bg-white shadow p-6 rounded-lg mb-10">
          <h3 className="text-lg font-semibold mb-6">Sales Performance</h3>
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setSalesPerformanceView('weekly')}
              className={`px-3 py-1 rounded text-sm ${salesPerformanceView === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setSalesPerformanceView('monthly')}
              className={`px-3 py-1 rounded text-sm ${salesPerformanceView === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Monthly
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sales Over Time Line Chart */}
            <div className="bg-white p-4 rounded-lg border col-span-1">
              <h4 className="text-md font-semibold mb-4">Sales Over Time</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={v => `₱${v.toLocaleString()}`} />
                  <Tooltip formatter={v => `₱${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Top Selling Products Horizontal Bar Chart */}
            <div className="bg-white p-4 rounded-lg border col-span-1 md:col-span-2">
              <h4 className="text-md font-semibold mb-4">Top Selling Products</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSellingProducts.sort((a, b) => b.quantity - a.quantity)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={v => v} />
                  <Legend />
                  <Bar dataKey="quantity" fill="#10b981" name="Quantity Sold">
                    <LabelList dataKey="quantity" position="right" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Sales Chart */}
        <div className="bg-white shadow p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sales Overview</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSalesView('daily')}
                  className={`px-3 py-1 rounded text-sm ${
                    salesView === 'daily'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setSalesView('weekly')}
                  className={`px-3 py-1 rounded text-sm ${
                    salesView === 'weekly'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setSalesView('monthly')}
                  className={`px-3 py-1 rounded text-sm ${
                    salesView === 'monthly'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSalesView('quarterly')}
                  className={`px-3 py-1 rounded text-sm ${
                    salesView === 'quarterly'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setSalesView('yearly')}
                  className={`px-3 py-1 rounded text-sm ${
                    salesView === 'yearly'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Sales Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-lg font-semibold">₱{salesMetrics.totalSales.toLocaleString()}</p>
                <div className="flex items-center text-sm">
                  {salesMetrics.trend > 0 ? (
                    <FiTrendingUp className="text-green-500 mr-1" />
                  ) : (
                    <FiTrendingDown className="text-red-500 mr-1" />
                  )}
                  <span className={salesMetrics.trend > 0 ? "text-green-500" : "text-red-500"}>
                    {Math.abs(salesMetrics.trend).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-lg font-semibold">{salesMetrics.totalOrders}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Average Order Value</p>
                <p className="text-lg font-semibold">₱{salesMetrics.averageOrderValue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Previous Period</p>
                <p className="text-lg font-semibold">₱{salesMetrics.previousPeriodSales.toLocaleString()}</p>
              </div>
            </div>

          <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#8884d8" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'sales' || name === 'aov' 
                      ? `₱${value.toLocaleString()}` 
                      : value,
                    name === 'sales' 
                      ? 'Sales' 
                      : name === 'orders' 
                        ? 'Orders' 
                        : 'AOV'
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="sales"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  name="Sales"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#82ca9d"
                  name="Orders"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="aov"
                  stroke="#8884d8"
                  name="AOV"
                />
            </BarChart>
          </ResponsiveContainer>
          </div>

          {/* Order Status Chart */}
          <div className="bg-white shadow p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {activityFeed.length > 0 ? (
            <div className="space-y-4">
              {activityFeed.map((activity, index) => (
                <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity to display</p>
              <p className="text-sm mt-2">
                Activity logging will be available soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
