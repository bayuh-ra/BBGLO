import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { FiPlus } from "react-icons/fi";
import { format } from "date-fns";
import { toast } from "react-toastify";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    paid_to: "",
    description: "",
  });

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
        .select(`*,purchase_orders:linked_id (status, po_id)`)
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
            return exp.purchase_orders && exp.purchase_orders.status !== "Cancelled";
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

  useEffect(() => {
    fetchExpenses();

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

    setForm({ ...form, [name]: value });
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
        .select("*") // Select all fields for debugging
        .eq("id", session?.user?.id)
        .single();

      console.log("Full staff profile:", staffProfile);

      if (profileError) {
        console.error("Profile error:", profileError);
        toast.error("Profile error: " + profileError.message);
        return;
      }

      // Add user ID to the expense record
      const expenseData = {
        ...form,
        amount: parseFloat(form.amount),
        created_by: session.user.id, // Add this line
      };

      console.log("Submitting expense data:", expenseData);

      const { data: insertData, error: insertError } = await supabase
        .from("expenses")
        .insert([expenseData])
        .select(); // Add .select() to get the inserted row

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
          date: new Date().toISOString().slice(0, 10),
          paid_to: "",
          description: "",
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Expenses</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <FiPlus className="inline mr-1" /> Add Expense
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <table className="min-w-full bg-white shadow rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Paid To</th>
              <th className="p-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.expense_id} className="border-t">
                  <td className="p-2">
                    {format(new Date(exp.date), "yyyy-MM-dd")}
                  </td>
                  <td className="p-2">{exp.category}</td>
                  <td className="p-2">
                    ₱{Number(exp.amount).toLocaleString()}
                  </td>
                  <td className="p-2">{exp.paid_to}</td>
                  <td className="p-2">{exp.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Paid To</label>
                <input
                  type="text"
                  name="paid_to"
                  value={form.paid_to}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
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
                  onClick={() => setShowModal(false)}
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
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
