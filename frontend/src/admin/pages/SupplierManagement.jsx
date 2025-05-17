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

  const modalRef = useRef(null);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowForm(false);
        handleClearForm();
      }
    };

    if (showForm) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showForm]);

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
      alert("Please fill in all fields.");
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
        alert("Supplier updated successfully.");
      } else {
        await addSupplier(formattedSupplier);
        alert("Supplier added successfully.");
      }

      loadSuppliers();
      handleClearForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to add/update supplier:", error);
      alert("Failed to add/update supplier.");
    }
  };

  // Handle deleting a supplier
  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) {
      alert("Please select a supplier to delete.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedSupplier.supplier_name}?`
      )
    ) {
      try {
        await deleteSupplier(selectedSupplier.supplier_id);
        alert("Supplier deleted successfully.");
        loadSuppliers();
        setSelectedSupplier(null);
      } catch (error) {
        console.error("Failed to delete supplier:", error);
        alert("Failed to delete supplier.");
      }
    }
  };

  // Select a supplier when clicking a row
  const handleRowClick = (supplier) => {
    setSelectedSupplier(supplier);
    // Remove all non-digits and keep only the last 10 digits
    let contactNo = supplier.contact_no || "";
    contactNo = contactNo.replace(/\D/g, "");
    if (contactNo.length > 10) {
      contactNo = contactNo.slice(-10);
    }
    setNewSupplier({
      supplier_name: supplier.supplier_name,
      contact_no: contactNo,
      email: supplier.email,
      address: supplier.address,
    });
    setIsEditing(true);
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

  // Handle double click on row
  const handleRowDoubleClick = async (supplier) => {
    setSelectedSupplier(supplier);
    await fetchSupplierProducts(supplier.supplier_id);
    setShowDetailsModal(true);
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

  return (
    <div className="p-4">
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
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mr-2"
        >
          Delete
        </button>
        <button
          onClick={() => {
            if (selectedSupplier) setShowForm(true);
            else alert("Please select a row to edit.");
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Update
        </button>
      </div>

      {/* Supplier Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white p-6 rounded shadow-lg w-[600px] relative"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-[850px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Supplier Details</h3>

            {/* Supplier Info Section */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <p>
                <strong>Supplier ID:</strong>{" "}
                {formatSupplierId(selectedSupplier.supplier_id)}
              </p>
              <p>
                <strong>Supplier Name:</strong> {selectedSupplier.supplier_name}
              </p>
              <p>
                <strong>Contact Number:</strong> {selectedSupplier.contact_no}
              </p>
              <p>
                <strong>Email:</strong> {selectedSupplier.email}
              </p>
              <p className="col-span-2">
                <strong>Address:</strong> {selectedSupplier.address}
              </p>
            </div>

            {/* Supplier Products Section */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-gray-700">
                Assigned Products
              </h4>
              {supplierProducts.length === 0 ? (
                <p className="text-gray-500">
                  No products assigned to this supplier.
                </p>
              ) : (
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Product ID</th>
                      <th className="p-2 border">Name</th>
                      <th className="p-2 border">Category</th>
                      <th className="p-2 border">UoM</th>
                      <th className="p-2 border">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierProducts.map((product) => (
                      <tr key={product.item_id}>
                        <td className="p-2 border">{product.item_id}</td>
                        <td className="p-2 border">{product.item_name}</td>
                        <td className="p-2 border">{product.category}</td>
                        <td className="p-2 border">{product.uom}</td>
                        <td className="p-2 border text-right">
                          ₱{Number(product.selling_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSupplier(null);
                  setSupplierProducts([]);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Fix: Ensure `filteredSuppliers` is used in the table */}
      <table className="table-auto border-collapse w-full text-sm border border-red-200">
        <thead className="bg-pink-200">
          <tr>
            {[
              { key: "supplier_id", label: "Supplier ID" },
              { key: "supplier_name", label: "Supplier Name" },
              { key: "contact_no", label: "Contact No." },
              { key: "email", label: "Email" },
              { key: "address", label: "Address" },
            ].map(({ key, label, align }) => (
              <th
                key={key}
                className={`px-4 py-2 cursor-pointer select-none ${
                  align === "right" ? "text-right" : "text-left"
                }`}
                onClick={() => {
                  setSortBy(key);
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
              >
                {label}
                {sortBy === key && (
                  <span className="inline-block ml-1 align-middle">
                    {sortOrder === "asc" ? (
                      <FiChevronUp size={14} />
                    ) : (
                      <FiChevronDown size={14} />
                    )}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedSuppliers.map((supplier) => (
            <tr
              key={supplier.supplier_id}
              onClick={() => setSelectedSupplierId(supplier.supplier_id)}
              onDoubleClick={() => handleRowDoubleClick(supplier)}
              className={`cursor-pointer ${
                selectedSupplierId === supplier.supplier_id
                  ? "bg-pink-100"
                  : "hover:bg-pink-100"
              }`}
            >
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
          ))}
        </tbody>
      </table>

      {/* Pagination UI */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing{" "}
          {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, sortedSuppliers.length)} of{" "}
          {sortedSuppliers.length} entries
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
    </div>
  );
};

export default SupplierManagement;
