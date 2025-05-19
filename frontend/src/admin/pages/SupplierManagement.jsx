import React, { useState, useEffect, useRef } from "react";
import {
  fetchSuppliers,
  addSupplier,
  deleteSupplier,
  updateSupplier,
} from "../../api/supplier";
import { supabase } from "../../api/supabaseClient";
import { X } from "lucide-react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabaseUrl = "https://lsxeozlhxgzhngskzizn.supabase.co"; // For consistency with InventoryManagement

const SupplierManagement = () => {
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [newSupplier, setNewSupplier] = useState({
    supplier_name: "",
    contact_no: "",
    email: "",
    address: "",
  });
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);

  const modalRef = useRef(null);

  // Handle click outside modal
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      setShowForm(false);
      setShowDetailsModal(false);
      handleClearForm();
    }
  };

  // Load suppliers from the backend
  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error("Failed to load suppliers:", error);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const populateFormWithSupplier = (supplier) => {
    let contactNo = supplier.contact_no || "";
    contactNo = contactNo.replace(/\D/g, "").slice(-10); // keep last 10 digits
    setNewSupplier({
      supplier_name: supplier.supplier_name,
      contact_no: contactNo,
      email: supplier.email,
      address: supplier.address,
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupplier({ ...newSupplier, [name]: value });
  };

  const handleContactChange = (e) => {
    const value = e.target.value;
    // Allow only numbers, up to 10 digits
    if (/^\d{0,10}$/.test(value)) {
      setNewSupplier({ ...newSupplier, contact_no: value });
    }
  };

  // Clear the form
  const handleClearForm = () => {
    setNewSupplier({
      supplier_name: "",
      contact_no: "",
      email: "",
      address: "",
    });
    setIsEditing(false);
    setSelectedSupplier(null);
  };

  // Handle adding/updating a supplier
  const handleAddOrUpdateSupplier = async () => {
    if (
      !newSupplier.supplier_name ||
      !newSupplier.contact_no ||
      !newSupplier.email ||
      !newSupplier.address
    ) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      // Format the contact number with +63 prefix
      const formattedSupplier = {
        ...newSupplier,
        contact_no: `+63${newSupplier.contact_no}`,
      };

      if (isEditing && selectedSupplier) {
        await updateSupplier(selectedSupplier.supplier_id, formattedSupplier);
        toast.success("Supplier updated successfully.");
      } else {
        await addSupplier(formattedSupplier);
        toast.success("Supplier added successfully.");
      }

      loadSuppliers();
      handleClearForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to add/update supplier:", error);
      toast.error("Failed to add/update supplier.");
    }
  };

  // Custom confirm toast for delete
  const showDeleteConfirmToast = (count, onConfirm) => {
    toast(
      ({ closeToast }) => (
        <div className="flex flex-col items-center p-2 text-center">
          <div className="font-semibold text-gray-800 mb-2">
            Are you sure you want to delete {count} selected supplier
            {count > 1 ? "s" : ""}?
          </div>
          <div className="flex gap-2 mt-2 justify-center">
            <button
              className="px-4 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
              onClick={() => closeToast()}
            >
              Cancel
            </button>
            <button
              className="px-4 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                await onConfirm();
                closeToast();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        position: "top-center",
        style: {
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          textAlign: "center",
        },
      }
    );
  };

  // Handle deleting a supplier
  const handleDeleteSupplier = async () => {
    if (selectedSupplierIds.length > 0) {
      showDeleteConfirmToast(selectedSupplierIds.length, async () => {
        try {
          for (const supplierId of selectedSupplierIds) {
            await deleteSupplier(supplierId);
          }
          toast.success(
            `${selectedSupplierIds.length} supplier(s) deleted successfully.`
          );
          loadSuppliers();
          setSelectedSupplierIds([]);
          setSelectedSupplier(null);
        } catch (error) {
          console.error("Failed to delete suppliers:", error);
          toast.error("Failed to delete one or more suppliers.");
        }
      });
      return;
    }
    if (!selectedSupplier) {
      toast.info("Please select a supplier to delete.");
      return;
    }
    // Single row confirm toast
    showDeleteConfirmToast(1, async () => {
      try {
        await deleteSupplier(selectedSupplier.supplier_id);
        toast.success("Supplier deleted successfully.");
        loadSuppliers();
        setSelectedSupplier(null);
      } catch (error) {
        console.error("Failed to delete supplier:", error);
        toast.error("Failed to delete supplier.");
      }
    });
  };

  const clickTimeoutRef = useRef(null);

  const handleClickRowWithDelay = (event, supplier) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleRowDoubleClick(supplier);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        handleRowClick(event, supplier);
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  // Select a supplier when clicking a row
  // const handleRowClick = (supplier) => {
  //   setSelectedSupplierId(supplier.supplier_id);
  //   setSelectedSupplier(supplier);
  //   // Remove all non-digits and keep only the last 10 digits
  //   let contactNo = supplier.contact_no || "";
  //   contactNo = contactNo.replace(/\D/g, "");
  //   if (contactNo.length > 10) {
  //     contactNo = contactNo.slice(-10);
  //   }
  //   setNewSupplier({
  //     supplier_name: supplier.supplier_name,
  //     contact_no: contactNo,
  //     email: supplier.email,
  //     address: supplier.address,
  //   });
  //   setIsEditing(true);
  //   setShowForm(true);
  // };
  const handleRowClick = (event, supplier) => {
    setSelectedSupplierId(supplier.supplier_id);
    setSelectedSupplier(supplier);

    const rect = event.currentTarget.getBoundingClientRect();
    setActionMenuPosition({ x: rect.left + 20, y: rect.bottom });
    setShowActionMenu(true);
  };

  // Handle double click on row
  const handleRowDoubleClick = async (supplier) => {
    setSelectedSupplierId(supplier.supplier_id);
    setSelectedSupplier(supplier);
    await fetchSupplierProducts(supplier.supplier_id);
    setShowDetailsModal(true);
  };

  // Fetch supplier's products
  const fetchSupplierProducts = async (supplierId) => {
    try {
      const { data, error } = await supabase
        .from("management_inventoryitem")
        .select("*")
        .eq("supplier_id", supplierId);

      if (error) throw error;
      setSupplierProducts(data || []);
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      setSupplierProducts([]);
    }
  };

  // ✅ Fix: Use filteredSuppliers in the table
  const filteredSuppliers = suppliers.filter((supplier) =>
    Object.values(supplier).some((field) =>
      String(field).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    if (!sortBy) return 0;
    const valA = a[sortBy]?.toString().toLowerCase();
    const valB = b[sortBy]?.toString().toLowerCase();
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(sortedSuppliers.length / itemsPerPage);
  const paginatedSuppliers = sortedSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format supplier ID to SUI-XXXX format
  const formatSupplierId = (id) => {
    if (!id) return "";
    // Extract only the numeric part of the ID
    const numericId = String(id).replace(/\D/g, "");
    const paddedId = numericId.padStart(4, "0");
    return `SUI-${paddedId}`;
  };

  // Selection logic for checkboxes
  const isAllSelected =
    paginatedSuppliers.length > 0 &&
    paginatedSuppliers.every((s) =>
      selectedSupplierIds.includes(s.supplier_id)
    );
  const isIndeterminate = selectedSupplierIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSupplierIds((prev) =>
        prev.filter(
          (id) => !paginatedSuppliers.some((s) => s.supplier_id === id)
        )
      );
    } else {
      setSelectedSupplierIds((prev) => [
        ...prev,
        ...paginatedSuppliers
          .map((s) => s.supplier_id)
          .filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSelectOne = (supplierId) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  return (
    <div className="p-4">
      {/* Toast container for notifications */}
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <h1 className="text-2xl font-bold mb-4">Supplier Management</h1>

      {/* Search Bar and Buttons */}
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded px-4 py-2 w-1/3 mr-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            handleClearForm();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
        >
          Add
        </button>
        <button
          onClick={handleDeleteSupplier}
          className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mr-2 ${
            selectedSupplierIds.length > 0 ? "font-bold" : ""
          }`}
        >
          Delete
          {selectedSupplierIds.length > 0
            ? ` (${selectedSupplierIds.length})`
            : ""}
        </button>
        <button
          onClick={() => {
            if (selectedSupplier) {
              populateFormWithSupplier(selectedSupplier); // ✅ this sets the fields
              setIsEditing(true);
              setShowForm(true);
              setShowActionMenu(false);
            } else {
              toast.info("Please select a row to edit.");
            }
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Update
        </button>
      </div>

      {/* Supplier Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleClickOutside}
        >
          <div
            ref={modalRef}
            className="bg-white p-6 rounded shadow-lg w-[600px] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowForm(false);
                handleClearForm();
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4">
              {isEditing ? "Update Supplier" : "Add New Supplier"}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  placeholder="Supplier Name"
                  value={newSupplier.supplier_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    +63
                  </span>
                  <input
                    type="text"
                    name="contact_no"
                    value={newSupplier.contact_no}
                    onChange={handleContactChange}
                    className="flex-1 rounded-r-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9XXXXXXXXX"
                    maxLength={10}
                  />
                </div>
                {newSupplier.contact_no &&
                  !newSupplier.contact_no.startsWith("9") && (
                    <p className="text-red-500 text-xs mt-1">
                      Contact number must start with 9
                    </p>
                  )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={newSupplier.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  placeholder="Address"
                  value={newSupplier.address}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleClearForm}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded mr-2"
              >
                Clear
              </button>
              <button
                onClick={handleAddOrUpdateSupplier}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {isEditing ? "Update Supplier" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {showDetailsModal && selectedSupplier && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-2 sm:px-0 overflow-x-hidden"
          onClick={handleClickOutside}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[600px] max-h-[95vh] overflow-y-auto overflow-x-hidden border-2 border-pink-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X Close Button */}
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedSupplier(null);
                setSupplierProducts([]);
              }}
              className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-pink-100 text-pink-500 hover:text-pink-700 rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-pink-400 z-10"
              aria-label="Close"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 rounded-t-2xl px-6 py-5 flex items-center gap-4">
              <span className="text-3xl">🏢</span>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Supplier Details
              </h3>
            </div>

            {/* Modal Content: Name on top, then info and products */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-pink-50 to-rose-50 overflow-x-hidden">
              {/* Highlighted Supplier Name */}
              <div className="text-fuchsia-700 text-xl font-bold mb-4 leading-tight break-words text-center">
                {selectedSupplier.supplier_name}
              </div>
              {/* Info Section */}
              <div className="flex flex-col gap-2 mb-6">
                {[
                  [
                    "Supplier ID",
                    formatSupplierId(selectedSupplier.supplier_id),
                  ],
                  ["Contact Number", selectedSupplier.contact_no],
                  ["Email", selectedSupplier.email],
                  ["Address", selectedSupplier.address],
                ].map(([label, value], index) => (
                  <div key={index} className="flex items-center gap-1 min-w-0">
                    <span className="font-semibold text-pink-600 whitespace-nowrap">
                      {label}:
                    </span>
                    <span className="truncate text-gray-800 ml-1">{value}</span>
                  </div>
                ))}
              </div>

              {/* Supplier Products Section */}
              <div className="mb-2">
                <h4 className="font-semibold mb-3 text-gray-700">
                  Assigned Products
                </h4>
                {supplierProducts.length === 0 ? (
                  <p className="text-gray-500">
                    No products assigned to this supplier.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border text-sm min-w-[400px]">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 border">Product ID</th>
                          <th className="p-2 border">Item Name</th>
                          <th className="p-2 border">Category</th>
                          <th className="p-2 border">UoM</th>
                          <th className="p-2 border">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierProducts.map((product) => (
                          <tr key={product.item_id}>
                            <td className="p-2 border">{product.item_id}</td>
                            <td className="p-2 border">
                              {[
                                product.brand,
                                product.item_name,
                                product.size,
                                product.uom,
                              ]
                                .filter(Boolean)
                                .join("-")}
                            </td>
                            <td className="p-2 border">{product.category}</td>
                            <td className="p-2 border">{product.uom}</td>
                            <td className="p-2 border text-right">
                              ₱{Number(product.selling_price).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Fix: Ensure `filteredSuppliers` is used in the table */}
      <table className="table-auto border-collapse w-full text-sm border border-red-200">
        <thead className="bg-pink-200">
          <tr>
            {/* Checkbox column */}
            <th className="px-2 py-2 border border-gray-300 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAll}
                aria-label="Select all suppliers"
              />
            </th>
            {/* Table header columns */}
            <th
              className="px-4 py-2 cursor-pointer select-none text-left"
              onClick={() => {
                setSortBy("supplier_id");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Supplier ID
              {sortBy === "supplier_id" && (
                <span className="inline-block ml-1 align-middle">
                  {sortOrder === "asc" ? (
                    <FiChevronUp size={14} />
                  ) : (
                    <FiChevronDown size={14} />
                  )}
                </span>
              )}
            </th>
            <th
              className="px-4 py-2 cursor-pointer select-none text-left"
              onClick={() => {
                setSortBy("supplier_name");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Supplier Name
              {sortBy === "supplier_name" && (
                <span className="inline-block ml-1 align-middle">
                  {sortOrder === "asc" ? (
                    <FiChevronUp size={14} />
                  ) : (
                    <FiChevronDown size={14} />
                  )}
                </span>
              )}
            </th>
            <th
              className="px-4 py-2 cursor-pointer select-none text-left"
              onClick={() => {
                setSortBy("contact_no");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Contact No.
              {sortBy === "contact_no" && (
                <span className="inline-block ml-1 align-middle">
                  {sortOrder === "asc" ? (
                    <FiChevronUp size={14} />
                  ) : (
                    <FiChevronDown size={14} />
                  )}
                </span>
              )}
            </th>
            <th
              className="px-4 py-2 cursor-pointer select-none text-left"
              onClick={() => {
                setSortBy("email");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Email
              {sortBy === "email" && (
                <span className="inline-block ml-1 align-middle">
                  {sortOrder === "asc" ? (
                    <FiChevronUp size={14} />
                  ) : (
                    <FiChevronDown size={14} />
                  )}
                </span>
              )}
            </th>
            <th
              className="px-4 py-2 cursor-pointer select-none text-left"
              onClick={() => {
                setSortBy("address");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
            >
              Address
              {sortBy === "address" && (
                <span className="inline-block ml-1 align-middle">
                  {sortOrder === "asc" ? (
                    <FiChevronUp size={14} />
                  ) : (
                    <FiChevronDown size={14} />
                  )}
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedSuppliers.map((supplier) => {
            const isChecked = selectedSupplierIds.includes(
              supplier.supplier_id
            );
            return (
              <tr
                key={supplier.supplier_id}
                onClick={(e) => handleClickRowWithDelay(e, supplier)}
                className={`cursor-pointer ${
                  isChecked
                    ? "bg-pink-100"
                    : selectedSupplierId === supplier.supplier_id
                    ? "bg-pink-100"
                    : "hover:bg-pink-100"
                }`}
              >
                {/* Checkbox cell - prevent double click from propagating */}
                <td
                  className="border border-gray-300 px-2 py-2 text-center"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectOne(supplier.supplier_id);
                    }}
                    aria-label={`Select supplier ${supplier.supplier_id}`}
                  />
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {formatSupplierId(supplier.supplier_id)}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {supplier.supplier_name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {supplier.contact_no}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {supplier.email}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {supplier.address}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination UI */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, sortedSuppliers.length)} of{" "}
          {sortedSuppliers.length} entries
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className={`px-3 py-1 rounded border ${
              currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of{" "}
            {Math.ceil(sortedSuppliers.length / itemsPerPage)}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) =>
                p < Math.ceil(sortedSuppliers.length / itemsPerPage) ? p + 1 : p
              )
            }
            className={`px-3 py-1 rounded border ${
              currentPage === Math.ceil(sortedSuppliers.length / itemsPerPage)
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}
            disabled={
              currentPage === Math.ceil(sortedSuppliers.length / itemsPerPage)
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierManagement;
