import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { FiPlus, FiDownload, FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  format,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const today = new Date();

  // Filter states
  const [startDate, setStartDate] = useState(
    format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paidToFilter, setPaidToFilter] = useState("");

  const [form, setForm] = useState({
    category: "",
    amount: "",
    date: format(today, "yyyy-MM-dd"),
    paid_to: "",
    description: "",
    vehicle_id: "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsExpense, setDetailsExpense] = useState(null);

  const fetchExpenses = async () => {
    try {
      console.log("Fetching expenses...");
      setLoading(true);

      // Check user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("Session:", session);
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Authentication error: " + sessionError.message);
        return;
      }

      if (!session?.user?.id) {
        console.error("No user ID found in session");
        toast.error("No user ID found in session");
        return;
      }

      // Check user role
      const { data: staffProfile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("role, status")
        .eq("id", session.user.id)
        .single();

      console.log("Staff profile:", staffProfile);
      if (profileError) {
        console.error("Profile error:", profileError);
        toast.error("Profile error: " + profileError.message);
        return;
      }

      if (!staffProfile) {
        console.error("No staff profile found");
        toast.error("No staff profile found");
        return;
      }

      if (staffProfile.role !== "admin" || staffProfile.status !== "Active") {
        console.error("User is not an active admin", staffProfile);
        toast.error("You don't have permission to access expenses");
        return;
      }

      // Fetch expenses
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "*, purchase_orders:linked_id (status, po_id, supplier_id(supplier_name), date_ordered, expected_delivery, date_delivered, remarks, staff_profiles:ordered_by(name), items:purchaseorder_item(*, item:item_id(item_name,brand,size,uom)))"
        )
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching expenses:", error);
        toast.error("Failed to load expenses: " + error.message);
      } else {
        console.log("Expenses loaded:", data);
        const filtered = (data || []).filter((exp) => {
          // For Purchase Order expenses, check if the linked PO exists and is not cancelled
          if (exp.category === "Purchase Order") {
            // If the PO doesn't exist or is cancelled, filter out the expense
            return (
              exp.purchase_orders && exp.purchase_orders.status !== "Cancelled"
            );
          }
          return true; // Keep all non-PO expenses
        });
        setExpenses(filtered);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, name, status")
        .eq("status", "Active")
        .order("name");

      if (error) {
        console.error("Error fetching staff:", error);
        toast.error("Failed to load staff list");
        return;
      }

      setStaffList(data || []);
    } catch (err) {
      console.error("Unexpected error fetching staff:", err);
      toast.error("An unexpected error occurred while loading staff");
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_id, plate_number, model, brand, status")
        .order("plate_number");

      if (error) {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles list");
        return;
      }

      console.log("Vehicles loaded:", data);
      setVehicles(data || []);
    } catch (err) {
      console.error("Unexpected error fetching vehicles:", err);
      toast.error("An unexpected error occurred while loading vehicles");
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchStaffList();
    fetchVehicles();

    // Subscribe to realtime changes for expenses
    const expensesChannel = supabase
      .channel("expenses_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        () => {
          console.log("Expenses updated, refreshing...");
          fetchExpenses();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for purchase orders
    const purchaseOrdersChannel = supabase
      .channel("purchase_orders_channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "purchase_orders",
          filter: "status=eq.Cancelled",
        },
        async (payload) => {
          console.log("Purchase order cancelled:", payload);
          // Delete the corresponding expense if it exists
          const { error } = await supabase
            .from("expenses")
            .delete()
            .eq("linked_id", payload.new.po_id)
            .eq("category", "Purchase Order");

          if (error) {
            console.error("Error deleting expense:", error);
            toast.error("Failed to delete expense for cancelled PO");
          } else {
            console.log("Expense deleted for cancelled PO");
            fetchExpenses(); // Refresh the expenses list
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(purchaseOrdersChannel);
    };
  }, []);

  const validateForm = () => {
    if (!form.category) {
      toast.error("Please select a category");
      return false;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }
    if (!form.date) {
      toast.error("Please select a date");
      return false;
    }
    if (!form.paid_to.trim()) {
      toast.error("Please enter who the expense was paid to");
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "amount" && value && !value.match(/^\d*\.?\d{0,2}$/)) {
      return; // Only allow numbers with up to 2 decimal places
    }

    // Reset vehicle_id when category changes
    if (name === "category") {
      setForm({ ...form, [name]: value, vehicle_id: "" });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      console.log("Submitting expense:", form);

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log("Session data:", session);

      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Authentication error: " + sessionError.message);
        return;
      }

      // Verify the user's role and status
      const { data: staffProfile, error: profileError } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("id", session?.user?.id)
        .single();

      console.log("Full staff profile:", staffProfile);

      if (profileError) {
        console.error("Profile error:", profileError);
        toast.error("Profile error: " + profileError.message);
        return;
      }

      let finalDescription = form.description;

      // If it's a vehicle expense, append vehicle info
      if (form.category === "Vehicle" && form.vehicle_id) {
        const selectedVehicle = vehicles.find(
          (v) => v.vehicle_id === form.vehicle_id
        );
        if (selectedVehicle) {
          finalDescription = `${finalDescription} | Vehicle Info: [Plate: ${selectedVehicle.plate_number}, Model: ${selectedVehicle.model}, Brand: ${selectedVehicle.brand}, Status: ${selectedVehicle.status}]`;
        }
      }

      // Add user ID to the expense record
      const expenseData = {
        category: form.category,
        amount: parseFloat(form.amount),
        date: form.date,
        paid_to: form.paid_to,
        description: finalDescription,
        created_by: session.user.id,
      };

      console.log("Submitting expense data:", expenseData);

      const { data: insertData, error: insertError } = await supabase
        .from("expenses")
        .insert([expenseData])
        .select();

      console.log("Insert response:", { data: insertData, error: insertError });

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error("Failed to add expense: " + insertError.message);
      } else {
        console.log("Expense added successfully:", insertData);
        toast.success("Expense added successfully");
        fetchExpenses();
        setShowModal(false);
        setForm({
          category: "",
          amount: "",
          date: format(today, "yyyy-MM-dd"),
          paid_to: "",
          description: "",
          vehicle_id: "",
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setForm({
      category: expense.category,
      amount: expense.amount,
      date: format(new Date(expense.date), "yyyy-MM-dd"),
      paid_to: expense.paid_to,
      description: expense.description,
      vehicle_id: expense.vehicle_id || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("expense_id", selectedExpense.expense_id);

      if (error) {
        throw error;
      }

      toast.success("Expense deleted successfully");
      setShowDeleteModal(false);
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense: " + error.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const updatedExpense = {
        category: form.category,
        amount: parseFloat(form.amount),
        date: form.date,
        paid_to: form.paid_to,
        description: form.description,
        vehicle_id: form.vehicle_id || null,
      };

      const { error } = await supabase
        .from("expenses")
        .update(updatedExpense)
        .eq("expense_id", selectedExpense.expense_id);

      if (error) {
        throw error;
      }

      toast.success("Expense updated successfully");
      setShowModal(false);
      setIsEditing(false);
      setSelectedExpense(null);
      setForm({
        category: "",
        amount: "",
        date: format(today, "yyyy-MM-dd"),
        paid_to: "",
        description: "",
        vehicle_id: "",
      });
      await fetchExpenses();
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique categories and paid_to values for filters
  // const uniqueCategories = [...new Set(expenses.map((exp) => exp.category))]; // Removed as category dropdown is removed
  const uniquePaidTo = [...new Set(expenses.map((exp) => exp.paid_to))];

  // Filter expenses based on all criteria
  const filteredExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const matchesDateRange = isWithinInterval(expDate, {
      start: startDateObj,
      end: endDateObj,
    });

    const matchesCategory = categoryFilter
      ? exp.category === categoryFilter
      : true;
    const matchesPaidTo = paidToFilter ? exp.paid_to === paidToFilter : true;

    return matchesDateRange && matchesCategory && matchesPaidTo;
  });

  // Add these helper functions after the filteredExpenses calculation and before the return statement
  const calculateTotals = () => {
    const totalExpenses = filteredExpenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const thisMonthTotal = expenses.reduce((sum, exp) => {
      const expDate = new Date(exp.date);
      if (
        expDate.getMonth() === thisMonth &&
        expDate.getFullYear() === thisYear
      ) {
        return sum + Number(exp.amount);
      }
      return sum;
    }, 0);

    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {});

    const topCategory =
      Object.entries(categoryTotals).length > 0
        ? Object.entries(categoryTotals).reduce((a, b) =>
            b[1] > a[1] ? b : a
          )[0]
        : "N/A";

    return {
      totalExpenses,
      thisMonthTotal,
      topCategory,
    };
  };

  const { totalExpenses, thisMonthTotal, topCategory } = calculateTotals();

  // Add chart data preparation functions
  const prepareChartData = () => {
    // Prepare category data for pie chart
    const categoryData = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {});

    const pieChartData = Object.entries(categoryData).map(([name, value]) => ({
      name,
      value,
    }));

    // Prepare monthly data for bar chart
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, "MMM yyyy"),
        date: startOfMonth(date),
      };
    }).reverse();

    const barChartData = last6Months.map(({ month, date }) => {
      const monthTotal = expenses.reduce((sum, exp) => {
        const expDate = new Date(exp.date);
        if (expDate >= startOfMonth(date) && expDate <= endOfMonth(date)) {
          return sum + Number(exp.amount);
        }
        return sum;
      }, 0);

      return {
        month,
        amount: monthTotal,
      };
    });

    return {
      pieChartData,
      barChartData,
    };
  };

  const { pieChartData, barChartData } = prepareChartData();

  // Define colors for pie chart
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
    "#FF6B6B",
  ];

  const formatCurrency = (value) => {
    return `₱${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Add CSV export function
  const exportToCSV = () => {
    try {
      // Define CSV headers
      const headers = [
        "Expense ID",
        "Date & Time",
        "Category",
        "Amount",
        "Paid To",
        "Description",
        "Linked ID",
        "PO Status",
        "Created By",
        "Created At",
        "Updated At",
      ];

      // Convert expenses to CSV format
      const csvData = filteredExpenses.map((exp) => [
        exp.expense_id,
        format(new Date(exp.date), "MMMM dd, yyyy, h:mm a"),
        exp.category,
        Number(exp.amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
        }),
        exp.paid_to,
        exp.description,
        exp.linked_id || "N/A",
        exp.purchase_orders?.status || "N/A",
        exp.created_by || "N/A",
        exp.created_at
          ? format(new Date(exp.created_at), "MMMM dd, yyyy, h:mm a")
          : "N/A",
        exp.updated_at
          ? format(new Date(exp.updated_at), "MMMM dd, yyyy, h:mm a")
          : "N/A",
      ]);

      // Combine headers and data
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          row
            .map(
              (cell) =>
                // Wrap cells in quotes and escape existing quotes
                `"${String(cell).replace(/"/g, '""')}"`
            )
            .join(",")
        ),
      ].join("\n");

      // Create blob and download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Set download attributes
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `expenses_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Expenses exported successfully!");
    } catch (error) {
      console.error("Error exporting expenses:", error);
      toast.error("Failed to export expenses");
    }
  };

  const handleRemoveSelected = async () => {
    if (
      !window.confirm("Are you sure you want to delete the selected expenses?")
    )
      return;
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("expenses")
        .delete()
        .in("expense_id", selectedExpenseIds);
      if (error) throw error;
      setExpenses((current) =>
        current.filter((exp) => !selectedExpenseIds.includes(exp.expense_id))
      );
      setSelectedExpenseIds([]);
      toast.success("Selected expenses deleted successfully");
    } catch (err) {
      toast.error("Error deleting expenses: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Category Cards with Filter (copied/adapted from SalesOrder.jsx) ---
  const expenseCategoryCounts = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + 1;
    return acc;
  }, {});
  const cardColors = [
    "bg-pink-100 text-pink-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
  ];

  // Update handleClickOutside to include details modal
  const handleClickOutside = (e, modalType) => {
    if (e.target === e.currentTarget) {
      switch (modalType) {
        case "addEdit":
          setShowModal(false);
          setSelectedExpense(null);
          break;
        case "delete":
          setShowDeleteModal(false);
          setSelectedExpense(null);
          break;
        case "details":
          setShowDetailsModal(false);
          setDetailsExpense(null);
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-left mb-4">Expenses</h2>
      {/* Category Filter Cards */}
      <div className="flex w-full gap-4 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">
        <button
          onClick={() => setCategoryFilter("")}
          className={`flex-1 min-w-[140px] sm:min-w-0 rounded-xl shadow flex flex-col items-center py-6 transition-all duration-150 cursor-pointer border-2 focus:outline-none bg-gray-100 text-gray-700 ${
            !categoryFilter
              ? "border-fuchsia-500 ring-2 ring-fuchsia-200 bg-fuchsia-100"
              : "border-transparent"
          }`}
          aria-pressed={!categoryFilter}
        >
          <span className="text-2xl sm:text-3xl mb-1">📊</span>
          <span className="text-lg sm:text-2xl font-bold">
            {expenses.length}
          </span>
          <span className="text-xs sm:text-sm font-medium mt-1 text-center">
            All Categories
          </span>
        </button>
        {Object.entries(expenseCategoryCounts).map(([cat, count], idx) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
            className={`flex-1 min-w-[140px] sm:min-w-0 rounded-xl shadow flex flex-col items-center py-6 transition-all duration-150 cursor-pointer border-2 focus:outline-none ${
              cardColors[idx % cardColors.length]
            } ${
              categoryFilter === cat
                ? "border-fuchsia-500 ring-2 ring-fuchsia-200 bg-fuchsia-100"
                : "border-transparent"
            }`}
            aria-pressed={categoryFilter === cat}
          >
            <span className="text-2xl sm:text-3xl mb-1">💸</span>
            <span className="text-lg sm:text-2xl font-bold">{count}</span>
            <span className="text-xs sm:text-sm font-medium mt-1 text-center">
              {cat}
            </span>
          </button>
        ))}
      </div>
      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">
            ₱
            {totalExpenses.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">
            This Month&apos;s Total
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            ₱
            {thisMonthTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">
            Top Expense Category
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {topCategory || "N/A"}
          </p>
        </div>
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Expenses by Category - Pie Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Month - Bar Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Expenses by Month</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#4F46E5" name="Total Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Filters and Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Date and Paid To Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid To
            </label>
            <select
              value={paidToFilter}
              onChange={(e) => setPaidToFilter(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Recipients</option>
              {uniquePaidTo.map((paidTo) => (
                <option key={paidTo} value={paidTo}>
                  {paidTo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Remove Selected, Export CSV, Add Expense */}
        <div className="flex gap-2">
          <button
            onClick={handleRemoveSelected}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold shadow-sm hover:bg-red-600 transition-colors duration-300"
            disabled={selectedExpenseIds.length === 0}
          >
            Remove Selected
            {selectedExpenseIds.length > 0
              ? ` (${selectedExpenseIds.length})`
              : ""}
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
            onClick={exportToCSV}
          >
            <FiDownload className="mr-2" /> Export to CSV
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
            onClick={() => setShowModal(true)}
          >
            <FiPlus className="mr-2" /> Add Expense
          </button>
        </div>
      </div>
      {/* Expense Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <table className="min-w-full text-sm border border-gray-300 text-left">
            <thead className="bg-pink-200 text-black font-bold">
              <tr>
                <th className="px-4 py-2 text-left border border-gray-300 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={
                      filteredExpenses.length > 0 &&
                      filteredExpenses.every((exp) =>
                        selectedExpenseIds.includes(exp.expense_id)
                      )
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setSelectedExpenseIds([
                          ...selectedExpenseIds,
                          ...filteredExpenses
                            .filter(
                              (exp) =>
                                !selectedExpenseIds.includes(exp.expense_id)
                            )
                            .map((exp) => exp.expense_id),
                        ]);
                      } else {
                        setSelectedExpenseIds(
                          selectedExpenseIds.filter(
                            (id) =>
                              !filteredExpenses.some(
                                (exp) => exp.expense_id === id
                              )
                          )
                        );
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Expense ID
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Date & Time
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Category
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Amount
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Paid To
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Description
                </th>
                <th className="px-4 py-2 text-left border border-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-4 text-center text-gray-500 border border-gray-300"
                  >
                    No expenses found
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.expense_id}
                    className={`border border-gray-300 hover:bg-pink-100 transition ${
                      selectedExpenseIds.includes(exp.expense_id)
                        ? "bg-pink-100"
                        : "bg-white"
                    }`}
                    onClick={() => {
                      setDetailsExpense(exp);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td
                      className="p-2 text-center border border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={selectedExpenseIds.includes(exp.expense_id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedExpenseIds((prev) =>
                            checked
                              ? [...prev, exp.expense_id]
                              : prev.filter((id) => id !== exp.expense_id)
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-2 border border-gray-300">
                      {exp.expense_id}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {format(new Date(exp.date), "MMMM dd, yyyy, h:mm a")}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {exp.category}
                    </td>
                    <td className="p-2 text-right border border-gray-300">
                      ₱{Number(exp.amount).toLocaleString()}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {exp.paid_to}
                    </td>
                    <td className="p-2 border border-gray-300">
                      {exp.description}
                    </td>
                    <td
                      className="p-2 border border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExpense(exp);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
      {/* Add/Edit Expense Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => handleClickOutside(e, "addEdit")}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {isEditing ? "Edit Expense" : "Add Expense"}
            </h3>
            <form
              onSubmit={isEditing ? handleUpdate : handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="">-- Select --</option>
                  <option>Salary</option>
                  <option>Office and Operational</option>
                  <option>Software and Systems</option>
                  <option>Licensing and Legal</option>
                  <option>Vehicle</option>
                  <option>Packaging and Supplies</option>
                  <option>Loan and Credit Payment</option>
                  <option>Tax-Related</option>
                </select>
              </div>

              {form.category === "Vehicle" && (
                <div>
                  <label className="block mb-1">Vehicle</label>
                  <select
                    name="vehicle_id"
                    value={form.vehicle_id}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((vehicle) => (
                      <option
                        key={vehicle.vehicle_id}
                        value={vehicle.vehicle_id}
                      >
                        {vehicle.plate_number} ({vehicle.model},{" "}
                        {vehicle.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>

              <div>
                <label className="block mb-1">Date</label>
                <input
                  type="text"
                  value={format(parseISO(form.date), "MMMM d, yyyy")}
                  className="w-full border px-3 py-2 rounded bg-gray-50"
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="block mb-1">Paid To</label>
                {form.category === "Salary" ? (
                  <select
                    name="paid_to"
                    value={form.paid_to}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    <option value="">-- Select Staff --</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.name}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="paid_to"
                    value={form.paid_to}
                    onChange={handleChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                ></textarea>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setIsEditing(false);
                    setSelectedExpense(null);
                    setForm({
                      category: "",
                      amount: "",
                      date: format(today, "yyyy-MM-dd"),
                      paid_to: "",
                      description: "",
                      vehicle_id: "",
                    });
                  }}
                  className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => handleClickOutside(e, "delete")}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-4">
              Are you sure you want to delete this expense? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedExpense(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Expense Details Modal */}
      {showDetailsModal && detailsExpense && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0 overflow-x-hidden"
          onClick={(e) => handleClickOutside(e, "details")}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[600px] max-h-[95vh] overflow-y-auto overflow-x-hidden border-2 border-pink-200 relative">
            {/* X Close Button */}
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setDetailsExpense(null);
              }}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-pink-100 text-pink-500 hover:text-pink-700 rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-pink-400 z-10"
              aria-label="Close"
              type="button"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 rounded-t-2xl px-6 py-5 flex items-center gap-4">
              <span className="text-3xl">💸</span>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Expense Details
              </h3>
            </div>
            {/* Modal Content: Name on top, then info */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-pink-50 to-rose-50 overflow-x-hidden">
              {/* Highlighted Expense ID */}
              <div className="text-fuchsia-700 text-xl font-bold mb-4 leading-tight break-words text-center">
                {detailsExpense.expense_id}
              </div>
              {/* Info Section */}
              <div className="flex flex-col gap-2 mb-6">
                {Object.entries({
                  "Date & Time": format(
                    new Date(detailsExpense.date),
                    "MMMM dd, yyyy, h:mm a"
                  ),
                  Category: detailsExpense.category,
                  Amount: `₱${Number(detailsExpense.amount).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}`,
                  "Paid To": detailsExpense.paid_to,
                  Description: detailsExpense.description,
                  ...(detailsExpense.vehicle_id && {
                    "Vehicle ID": detailsExpense.vehicle_id,
                  }),
                }).map(([label, value], idx) => (
                  <div key={idx} className="flex items-center gap-1 min-w-0">
                    <span className="font-semibold text-pink-600 whitespace-nowrap">
                      {label}:
                    </span>
                    <span className="truncate text-gray-800 ml-1 whitespace-pre-line">
                      {value}
                    </span>
                  </div>
                ))}
                {detailsExpense.category === "Purchase Order" &&
                  detailsExpense.purchase_orders && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <h4 className="font-bold text-pink-700">
                        Linked Purchase Order Details:
                      </h4>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          PO ID:
                        </span>
                        <span className="truncate text-gray-800 ml-1">
                          {detailsExpense.purchase_orders.po_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          Status:
                        </span>
                        <span className="truncate text-gray-800 ml-1">
                          {detailsExpense.purchase_orders.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          Supplier:
                        </span>
                        <span className="truncate text-gray-800 ml-1">
                          {detailsExpense.purchase_orders.supplier_id
                            ?.supplier_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          Date Ordered:
                        </span>
                        <span className="truncate text-gray-800 ml-1">
                          {detailsExpense.purchase_orders.date_ordered
                            ? format(
                                new Date(
                                  detailsExpense.purchase_orders.date_ordered
                                ),
                                "MMMM dd, yyyy"
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          Expected Delivery:
                        </span>
                        <span className="truncate text-gray-800 ml-1">
                          {detailsExpense.purchase_orders.expected_delivery
                            ? format(
                                new Date(
                                  detailsExpense.purchase_orders.expected_delivery
                                ),
                                "MMMM dd, yyyy"
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          Date Delivered:
                        </span>
                        <span className="truncate text-gray-800 ml-1">
                          {detailsExpense.purchase_orders.date_delivered
                            ? format(
                                new Date(
                                  detailsExpense.purchase_orders.date_delivered
                                ),
                                "MMMM dd, yyyy"
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-start gap-1 min-w-0">
                        <span className="font-semibold text-pink-600 whitespace-nowrap">
                          Remarks:
                        </span>
                        <span className="text-gray-800 ml-1 whitespace-pre-wrap">
                          {detailsExpense.purchase_orders.remarks || "None"}
                        </span>
                      </div>
                      {/* Display Linked Purchase Order Items */}
                      {detailsExpense.purchase_orders.items &&
                        detailsExpense.purchase_orders.items.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="font-bold text-pink-700 mb-2">
                              Ordered Items:
                            </h5>
                            <div className="max-h-40 overflow-y-auto text-xs">
                              <table className="w-full table-auto border-collapse border border-gray-300">
                                <thead className="bg-pink-100 sticky top-0">
                                  <tr>
                                    <th className="border border-gray-300 px-2 py-1 text-left">
                                      Item
                                    </th>
                                    <th className="border border-gray-300 px-2 py-1 text-right">
                                      Qty
                                    </th>
                                    <th className="border border-gray-300 px-2 py-1 text-right">
                                      Unit Price
                                    </th>
                                    <th className="border border-gray-300 px-2 py-1 text-right">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailsExpense.purchase_orders.items.map(
                                    (item, itemIdx) => (
                                      <tr key={itemIdx}>
                                        <td className="border border-gray-300 px-2 py-1">
                                          {[
                                            item.item?.brand,
                                            item.item?.item_name ||
                                              item.item_name,
                                            item.item?.size,
                                            item.item?.uom || item.uom,
                                          ]
                                            .filter(Boolean)
                                            .join("-")}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                          {item.quantity}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                          ₱
                                          {Number(
                                            item.unit_price || 0
                                          ).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">
                                          ₱
                                          {Number(
                                            item.total_price || 0
                                          ).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setDetailsExpense(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg font-bold shadow-sm hover:bg-gray-300 transition-colors duration-200"
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
