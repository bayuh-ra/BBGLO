import axios from "axios";
import { supabase } from "./supabaseClient";

const API_BASE_URL = "http://127.0.0.1:8000/api"; // Your Django API base URL

export const fetchPurchaseOrders = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/purchase-orders/`); // Assuming your ViewSet uses this endpoint
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return [];
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/purchase-orders/`, poData);
    return response.data; // The response should contain the newly created PO data, including po_id
  } catch (error) {
    console.error("Error creating purchase order:", error);
    throw error;
  }
};

export const fetchPurchaseOrder = async (poId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/purchase-orders/${poId}/`); // For retrieving a specific PO
    return response.data;
  } catch (error) {
    console.error(`Error fetching purchase order with ID ${poId}:`, error);
    throw error;
  }
};

export const updatePurchaseOrder = async (poId, poData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/purchase-orders/${poId}/`, poData);
    return response.data;
  } catch (error) {
    console.error(`Error updating purchase order with ID ${poId}:`, error);
    throw error;
  }
};

// ✅ NEW: Update Purchase Order Status (e.g. Approve, Complete, Cancel)
export const updatePurchaseOrderStatus = async (poId, status) => {
  // Fetch the original PO to get required fields
  const { data: existing, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("total_cost")
    .eq("po_id", poId)
    .single();

  if (fetchError || !existing) {
    console.error("❌ Fetch Error or missing PO:", fetchError);
    throw fetchError || new Error("PO not found");
  }

  const updateData = {
    status,
    total_cost: existing.total_cost,
  };

  if (status === "Completed") {
    updateData.date_delivered = new Date().toISOString().split("T")[0];
  }

  console.log("🔄 Update Payload:", updateData); // 🧪 Log full payload
  console.log("📌 Target PO ID:", poId);         // 🧪 Log target row

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updateData)
    .eq("po_id", poId);

  if (error) {
    console.error("❌ Supabase Update Error:", error); // 🧪 Key line!
    throw error;
  }

  return data;
};



export const deletePurchaseOrder = async (poId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/purchase-orders/${poId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting purchase order with ID ${poId}:`, error);
    throw error;
  }
};

// In your ../../api/purchaseOrder.js

export const fetchPurchaseOrderDetails = async (po_id) => {
  try {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, supplier:supplier_id(supplier_name), items:purchaseorder_item(*, item:item_id(item_name))")
      .eq("po_id", po_id)
      .single();

    if (error) {
      console.error("Error fetching purchase order details:", error);
      throw error;
    }

    console.log("Detailed Order Data from API:", data); // <--- ADD THIS LINE

    return data;
  } catch (error) {
    console.error("Error in fetchPurchaseOrderDetails:", error);
    throw error;
  }
};