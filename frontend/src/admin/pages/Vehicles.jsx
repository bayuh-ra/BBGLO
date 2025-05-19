import { useEffect, useState } from "react";
import { supabase } from "../../api/supabaseClient";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { ChevronUp, ChevronDown } from "lucide-react";

const isFormCompletelyFilled = (form) => {
  const requiredFields = [
    "plate_number",
    "model",
    "brand",
    "year_manufactured",
    "type",
    "date_acquired",
    "insurance_expiry",
    "registration_expiry",
  ];

  return requiredFields.every((field) => {
    return form[field] !== null && form[field] !== "";
  });
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    plate_number: "",
    model: "",
    brand: "",
    year_manufactured: new Date().getFullYear(),
    type: "Van",
    status: "Active",
    date_acquired: new Date().toISOString().slice(0, 10),
    assigned_driver: "",
    last_maintenance: "",
    insurance_expiry: "",
    registration_expiry: "",
  });

  // --- SORTING & PAGINATION STATE ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const vehiclesPerPage = 10;
  const [sortBy, setSortBy] = useState("vehicle_id");
  const [sortOrder, setSortOrder] = useState("asc");

  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);

  // Add state for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `
          *,
          assigned_driver:staff_profiles!vehicles_assigned_driver_fkey(id, name),
          updated_by:staff_profiles!vehicles_updated_by_fkey(id, name)
        `
        )
        .order("vehicle_id");

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      toast.error("Error fetching vehicles: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, name")
        .eq("role", "driver")
        .eq("status", "Active");

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      toast.error("Error fetching drivers: " + err.message);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("vehicles_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicles",
        },
        async (payload) => {
          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            const { data: newVehicle } = await supabase
              .from("vehicles")
              .select(
                `
                *,
                assigned_driver:staff_profiles!vehicles_assigned_driver_fkey(id, name),
                updated_by:staff_profiles!vehicles_updated_by_fkey(id, name)
              `
              )
              .eq("vehicle_id", payload.new.vehicle_id)
              .single();

            if (newVehicle) {
              setVehicles((current) => [...current, newVehicle]);
            }
          } else if (payload.eventType === "UPDATE") {
            const { data: updatedVehicle } = await supabase
              .from("vehicles")
              .select(
                `
                *,
                assigned_driver:staff_profiles!vehicles_assigned_driver_fkey(id, name),
                updated_by:staff_profiles!vehicles_updated_by_fkey(id, name)
              `
              )
              .eq("vehicle_id", payload.new.vehicle_id)
              .single();

            if (updatedVehicle) {
              setVehicles((current) =>
                current.map((vehicle) =>
                  vehicle.vehicle_id === updatedVehicle.vehicle_id
                    ? updatedVehicle
                    : vehicle
                )
              );
            }
          } else if (payload.eventType === "DELETE") {
            setVehicles((current) =>
              current.filter(
                (vehicle) => vehicle.vehicle_id !== payload.old.vehicle_id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const validateForm = () => {
    // Required fields validation
    const requiredFields = {
      plate_number: "Plate Number",
      model: "Model",
      brand: "Brand",
      year_manufactured: "Year Manufactured",
      type: "Type",
      date_acquired: "Date Acquired",
      insurance_expiry: "Insurance Expiry",
      registration_expiry: "Registration Expiry",
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!form[field]) {
        toast.error(`${label} is required`);
        return false;
      }
    }

    // Year validation
    const currentYear = new Date().getFullYear();
    if (form.year_manufactured < 1900 || form.year_manufactured > currentYear) {
      toast.error(`Year must be between 1900 and ${currentYear}`);
      return false;
    }

    try {
      // Date validations
      const normalizeDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null; // Invalid date
        // Reset time to midnight in local timezone
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const today = normalizeDate(new Date());
      const dateAcquired = normalizeDate(form.date_acquired);
      const lastMaintenance = normalizeDate(form.last_maintenance);
      const insuranceExpiry = normalizeDate(form.insurance_expiry);
      const registrationExpiry = normalizeDate(form.registration_expiry);

      // Debug logging
      console.log({
        today: today?.toISOString(),
        lastMaintenance: lastMaintenance?.toISOString(),
        dateAcquired: dateAcquired?.toISOString(),
        comparison:
          lastMaintenance && today
            ? {
                lastMaintenanceTime: lastMaintenance.getTime(),
                todayTime: today.getTime(),
                isGreater: lastMaintenance.getTime() > today.getTime(),
              }
            : null,
      });

      if (!dateAcquired || dateAcquired.getTime() > today.getTime()) {
        toast.error("Date Acquired cannot be in the future");
        return false;
      }

      if (lastMaintenance) {
        if (lastMaintenance.getTime() > today.getTime()) {
          toast.error("Last Maintenance date cannot be in the future");
          return false;
        }
        if (lastMaintenance.getTime() < dateAcquired.getTime()) {
          toast.error("Last Maintenance date cannot be before Date Acquired");
          return false;
        }
      }

      if (
        !insuranceExpiry ||
        insuranceExpiry.getTime() <= dateAcquired.getTime()
      ) {
        toast.error("Insurance Expiry date must be after Date Acquired");
        return false;
      }

      if (
        !registrationExpiry ||
        registrationExpiry.getTime() <= dateAcquired.getTime()
      ) {
        toast.error("Registration Expiry date must be after Date Acquired");
        return false;
      }

      return true;
    } catch (err) {
      console.error("Date validation error:", err);
      toast.error(`Invalid date format: ${err.message}`);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("No active session found");
        return;
      }

      const vehicleData = {
        ...form,
        assigned_driver: form.assigned_driver || null,
        updated_by: session.user.id,
        date_acquired: form.date_acquired || null,
        last_maintenance: form.last_maintenance || null,
        insurance_expiry: form.insurance_expiry || null,
        registration_expiry: form.registration_expiry || null,
      };

      let error;
      let data;

      if (editingVehicle) {
        const result = await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("vehicle_id", editingVehicle.vehicle_id)
          .select(
            `
            *,
            assigned_driver:staff_profiles!vehicles_assigned_driver_fkey(id, name),
            updated_by:staff_profiles!vehicles_updated_by_fkey(id, name)
          `
          )
          .single();

        error = result.error;
        data = result.data;
      } else {
        const result = await supabase
          .from("vehicles")
          .insert([vehicleData])
          .select(
            `
            *,
            assigned_driver:staff_profiles!vehicles_assigned_driver_fkey(id, name),
            updated_by:staff_profiles!vehicles_updated_by_fkey(id, name)
          `
          )
          .single();

        error = result.error;
        data = result.data;
      }

      if (error) throw error;

      // Update local state immediately
      if (editingVehicle) {
        setVehicles((current) =>
          current.map((vehicle) =>
            vehicle.vehicle_id === data.vehicle_id ? data : vehicle
          )
        );
      } else {
        setVehicles((current) => [...current, data]);
      }

      toast.success(
        `Vehicle ${editingVehicle ? "updated" : "added"} successfully`
      );
      setShowModal(false);
      setEditingVehicle(null);
      setForm({
        plate_number: "",
        model: "",
        brand: "",
        year_manufactured: new Date().getFullYear(),
        type: "Van",
        status: "Active",
        date_acquired: new Date().toISOString().slice(0, 10),
        assigned_driver: "",
        last_maintenance: "",
        insurance_expiry: "",
        registration_expiry: "",
      });
    } catch (err) {
      toast.error(
        `Error ${editingVehicle ? "updating" : "adding"} vehicle: ${
          err.message
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      plate_number: vehicle.plate_number,
      model: vehicle.model,
      brand: vehicle.brand,
      year_manufactured: vehicle.year_manufactured,
      type: vehicle.type,
      status: vehicle.status,
      date_acquired: vehicle.date_acquired,
      assigned_driver: vehicle.assigned_driver,
      last_maintenance: vehicle.last_maintenance || "",
      insurance_expiry: vehicle.insurance_expiry,
      registration_expiry: vehicle.registration_expiry,
    });
    setShowModal(true);
  };

  const handleDelete = (vehicleId) => {
    const vehicle = vehicles.find((v) => v.vehicle_id === vehicleId);
    setVehicleToDelete(vehicle);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("vehicle_id", vehicleToDelete.vehicle_id);

      if (error) throw error;

      // Update local state immediately
      setVehicles((current) =>
        current.filter(
          (vehicle) => vehicle.vehicle_id !== vehicleToDelete.vehicle_id
        )
      );

      toast.success("Vehicle deleted successfully");
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (err) {
      toast.error("Error deleting vehicle: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (!confirm("Are you sure you want to delete the selected vehicles?"))
      return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .in("vehicle_id", selectedVehicleIds);

      if (error) throw error;

      // Update local state immediately
      setVehicles((current) =>
        current.filter(
          (vehicle) => !selectedVehicleIds.includes(vehicle.vehicle_id)
        )
      );
      setSelectedVehicleIds([]); // Clear selection

      toast.success("Selected vehicles deleted successfully");
    } catch (err) {
      toast.error("Error deleting vehicles: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const getValue = (obj, path) =>
      path.split(".").reduce((o, p) => o?.[p], obj) ?? "";
    const aVal = getValue(a, sortBy).toString().toLowerCase();
    const bVal = getValue(b, sortBy).toString().toLowerCase();
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const paginatedVehicles = sortedVehicles.slice(
    (currentPage - 1) * vehiclesPerPage,
    currentPage * vehiclesPerPage
  );
  const totalPages = Math.ceil(vehicles.length / vehiclesPerPage);

  // Add click outside handler for the modal
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
      setEditingVehicle(null);
    }
  };

  // Add click outside handler for delete modal
  const handleDeleteModalClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Vehicles</h2>
        <div className="flex gap-4">
          <button
            onClick={handleRemoveSelected}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold shadow-sm hover:bg-red-600 transition-colors duration-300"
            disabled={selectedVehicleIds.length === 0}
          >
            Remove Selected
            {selectedVehicleIds.length > 0
              ? ` (${selectedVehicleIds.length})`
              : ""}
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-blue-700"
            onClick={() => {
              setEditingVehicle(null);
              setForm({
                plate_number: "",
                model: "",
                brand: "",
                year_manufactured: new Date().getFullYear(),
                type: "Van",
                status: "Active",
                date_acquired: new Date().toISOString().slice(0, 10),
                assigned_driver: "",
                last_maintenance: "",
                insurance_expiry: "",
                registration_expiry: "",
              });
              setShowModal(true);
            }}
          >
            Add Vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 text-sm rounded-none">
            <thead className="bg-pink-200 rounded-none">
              <tr>
                <th className="px-4 py-2 text-center align-middle rounded-none w-10">
                  <input
                    type="checkbox"
                    className="align-middle w-4 h-4"
                    checked={
                      paginatedVehicles.length > 0 &&
                      paginatedVehicles.every((v) =>
                        selectedVehicleIds.includes(v.vehicle_id)
                      )
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setSelectedVehicleIds([
                          ...selectedVehicleIds,
                          ...paginatedVehicles
                            .filter(
                              (v) => !selectedVehicleIds.includes(v.vehicle_id)
                            )
                            .map((v) => v.vehicle_id),
                        ]);
                      } else {
                        setSelectedVehicleIds(
                          selectedVehicleIds.filter(
                            (id) =>
                              !paginatedVehicles.some(
                                (v) => v.vehicle_id === id
                              )
                          )
                        );
                      }
                    }}
                  />
                </th>
                {[
                  {
                    key: "vehicle_id",
                    label: "ID",
                  },
                  { key: "plate_number", label: "Plate Number" },
                  { key: "model", label: "Model" },
                  { key: "brand", label: "Brand" },
                  { key: "type", label: "Type" },
                  { key: "status", label: "Status" },
                  { key: "assigned_driver", label: "Driver" },
                  { key: "insurance_expiry", label: "Insurance Expiry" },
                  { key: "registration_expiry", label: "Registration Expiry" },
                  { key: "actions", label: "Actions" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => {
                      if (
                        key !== "actions" &&
                        key !== "assigned_driver" &&
                        key !== "insurance_expiry" &&
                        key !== "registration_expiry"
                      ) {
                        setSortBy(key);
                        setSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc"
                        );
                      }
                    }}
                    className={`px-4 py-2 text-left cursor-pointer select-none transition ${
                      key === "actions" ||
                      key === "assigned_driver" ||
                      key === "insurance_expiry" ||
                      key === "registration_expiry"
                        ? "cursor-default"
                        : "hover:bg-pink-100"
                    }`}
                  >
                    {label}
                    {sortBy === key && key !== "actions" && (
                      <span className="inline-block ml-1 align-middle">
                        {sortOrder === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedVehicles.map((vehicle) => (
                <tr
                  key={vehicle.vehicle_id}
                  className={`border-t cursor-pointer hover:bg-pink-100 transition ${
                    selectedVehicleIds.includes(vehicle.vehicle_id)
                      ? "bg-pink-100"
                      : ""
                  }`}
                >
                  <td className="p-2 text-center align-middle w-10">
                    <input
                      type="checkbox"
                      className="align-middle w-4 h-4"
                      checked={selectedVehicleIds.includes(vehicle.vehicle_id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedVehicleIds((prev) =>
                          checked
                            ? [...prev, vehicle.vehicle_id]
                            : prev.filter((id) => id !== vehicle.vehicle_id)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-2">{vehicle.vehicle_id}</td>
                  <td className="p-2">{vehicle.plate_number}</td>
                  <td className="p-2">{vehicle.model}</td>
                  <td className="p-2">{vehicle.brand}</td>
                  <td className="p-2">{vehicle.type}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        vehicle.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : vehicle.status === "Under Maintenance"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="p-2">
                    {vehicle.assigned_driver?.name || "Not Assigned"}
                  </td>
                  <td className="p-2">
                    {format(new Date(vehicle.insurance_expiry), "MMMM d, yyyy")}
                  </td>
                  <td className="p-2">
                    {format(
                      new Date(vehicle.registration_expiry),
                      "MMMM d, yyyy"
                    )}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.vehicle_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * vehiclesPerPage + 1} to{" "}
          {Math.min(currentPage * vehiclesPerPage, vehicles.length)} of{" "}
          {vehicles.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded border ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : ""
            }`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
            className={`px-3 py-1 rounded border ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : ""
            }`}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClickOutside}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-xl">
            <h3 className="text-xl font-bold mb-4">
              {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Plate Number</label>
                  <input
                    type="text"
                    name="plate_number"
                    value={form.plate_number}
                    onChange={(e) =>
                      setForm({ ...form, plate_number: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={form.model}
                    onChange={(e) =>
                      setForm({ ...form, model: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Brand</label>
                  <input
                    type="text"
                    name="brand"
                    value={form.brand}
                    onChange={(e) =>
                      setForm({ ...form, brand: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Year Manufactured</label>
                  <input
                    type="number"
                    name="year_manufactured"
                    value={form.year_manufactured}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        year_manufactured: parseInt(e.target.value),
                      })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Motorcycle">Motorcycle</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Date Acquired</label>
                  <input
                    type="date"
                    name="date_acquired"
                    value={form.date_acquired}
                    onChange={(e) =>
                      setForm({ ...form, date_acquired: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Assigned Driver</label>
                  <select
                    name="assigned_driver"
                    value={form.assigned_driver || ""}
                    onChange={(e) =>
                      setForm({ ...form, assigned_driver: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Last Maintenance</label>
                  <input
                    type="date"
                    name="last_maintenance"
                    value={form.last_maintenance}
                    onChange={(e) =>
                      setForm({ ...form, last_maintenance: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                  />
                </div>
                <div>
                  <label className="block mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    name="insurance_expiry"
                    value={form.insurance_expiry}
                    onChange={(e) =>
                      setForm({ ...form, insurance_expiry: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Registration Expiry</label>
                  <input
                    type="date"
                    name="registration_expiry"
                    value={form.registration_expiry}
                    onChange={(e) =>
                      setForm({ ...form, registration_expiry: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded text-white ${
                    isFormCompletelyFilled(form) && !submitting
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-blue-300 cursor-not-allowed"
                  }`}
                  disabled={!isFormCompletelyFilled(form) || submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingVehicle
                    ? "Update Vehicle"
                    : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && vehicleToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleDeleteModalClickOutside}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="mb-4">
              Are you sure you want to delete vehicle{" "}
              {vehicleToDelete.plate_number} ({vehicleToDelete.brand}{" "}
              {vehicleToDelete.model})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setVehicleToDelete(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
