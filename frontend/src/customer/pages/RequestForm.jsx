import { useState, useEffect } from "react";
import { fetchInventoryItems } from "../../api/inventory";
import ReactPaginate from "react-paginate";
import { FaMoneyBillWave, FaFileInvoiceDollar, FaCreditCard } from "react-icons/fa";

const RequestForm = () => {
    const [availableProducts, setAvailableProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
    const [sameShipping, setSameShipping] = useState(true);
    const [chequeDetails, setChequeDetails] = useState({ bankName: "", chequeNumber: "" });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchInventoryItems().then(data => setAvailableProducts(data));
    }, []);

    const addProduct = (product) => {
        setSelectedProducts(prevProducts => {
            const existingProduct = prevProducts.find(p => p.item_id === product.item_id);
            if (existingProduct) {
                return prevProducts.map(p => p.item_id === product.item_id ? { ...p, quantity: p.quantity + 1 } : p);
            } else {
                return [...prevProducts, { ...product, quantity: 1 }];
            }
        });
    };

    const removeProduct = (itemId) => {
        setSelectedProducts(prevProducts => prevProducts.filter(p => p.item_id !== itemId));
    };

    const updateQuantity = (itemId, quantity) => {
        setSelectedProducts(prevProducts => prevProducts.map(p => p.item_id === itemId ? { ...p, quantity: Math.max(1, quantity) } : p));
    };

    useEffect(() => {
        setTotalAmount(selectedProducts.reduce((total, product) => total + (product.selling_price * product.quantity), 0));
    }, [selectedProducts]);

    const handleSubmit = () => {
        if (selectedProducts.length === 0) {
            alert("Please add at least one product to submit the request.");
            return;
        }
        alert("Request Form Submitted Successfully!");
    };

    // Pagination Handler
    const pageCount = Math.ceil(selectedProducts.length / itemsPerPage);
    const handlePageClick = ({ selected }) => setCurrentPage(selected);

    return (
        <div className="p-5 max-w-8xl mx-auto bg-white shadow-lg rounded-lg flex">
            {/* Left Side - Request Form */}
            <div className="w-5/6 p-6">
                <h2 className="text-2xl font-semibold mb-4">Request Form</h2>
                <button onClick={() => setSelectedProducts([])} className="bg-red-500 text-white px-4 py-2 rounded mb-2">
                    Clear All Orders
                </button>
                <table className="w-full border mt-4 rounded">
                    <thead className="bg-gray-100">
                        <tr className="bg-gray-200 text-left">
                            <th className="p-2">Product ID</th>
                            <th className="p-2">Product</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">UOM</th>
                            <th className="p-2">Price</th>
                            <th className="p-2">Quantity</th>
                            <th className="p-2">Subtotal</th>
                            <th className="p-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedProducts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map(product => (
                            <tr key={product.item_id} className="border-b">
                                <td>{product.item_id}</td>
                                <td>{product.item_name}</td>
                                <td>{product.category}</td>
                                <td>{product.uom}</td>
                                <td>{product.selling_price} PHP</td>
                                <td className="flex items-center">
                                <button onClick={() => updateQuantity(product.item_id, product.quantity - 1)} className="bg-red-500 text-white px-2 rounded">-</button>
                                    <span className="px-3">{product.quantity}</span>
                                    <button onClick={() => updateQuantity(product.item_id, product.quantity + 1)} className="bg-green-500 text-white px-2 rounded">+</button>
                                </td>
                                <td>{(product.selling_price * product.quantity).toFixed(2)} PHP</td>
                                <td><button onClick={() => removeProduct(product.item_id)} className="text-red-500">Remove</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <ReactPaginate pageCount={pageCount} onPageChange={handlePageClick} containerClassName="pagination" />
                <h3 className="text-xl font-semibold mt-4">Total Amount: {totalAmount.toFixed(2)} PHP</h3>
                <label className="flex items-center mt-2">
                    <input type="checkbox" checked={sameShipping} onChange={() => setSameShipping(!sameShipping)} className="mr-2" />
                    <span className="ml-2">My shipping information is the same as my billing information.</span>
                </label>
                <h3 className="text-lg font-semibold mt-2">Payment Option</h3>
                <div className="flex justify-between p-4 border rounded">
                    <label className="flex flex-col items-center cursor-pointer">
                    <FaMoneyBillWave className="text-red-600 text-7xl" /> Cash on Delivery
                        <input type="radio" value="Cash on Delivery" checked={paymentMethod === "Cash on Delivery"} onChange={() => setPaymentMethod("Cash on Delivery")} />
                    </label>
                    <label className="flex flex-col items-center cursor-pointer">                       
                        <FaFileInvoiceDollar className="text-red-600 text-7xl" /> Cheque
                        <input type="radio" value="Cheque" checked={paymentMethod === "Cheque"} onChange={() => setPaymentMethod("Cheque")} />
                    </label>
                    <label className="flex flex-col items-center cursor-pointer">
                        <FaCreditCard className="text-red-600 text-7xl" /> Debit/Credit Card
                        <input type="radio" value="Debit/Credit Card" checked={paymentMethod === "Debit/Credit Card"} onChange={() => setPaymentMethod("Debit/Credit Card")} />

                    </label>
                </div>
                {paymentMethod === "Debit/Credit Card" && (
                    <div className="mt-4 border p-4 rounded">
                        <input type="text" placeholder="Name on Card" className="border p-2 w-full mb-2" />
                        <input type="text" placeholder="Card Number" className="border p-2 w-full mb-2" />
                        <div className="flex gap-2">
                            <input type="text" placeholder="Expiry Date" className="border p-2 w-full" />
                            <input type="text" placeholder="CVC" className="border p-2 w-full" />
                        </div>
                    </div>
                )}
                {paymentMethod === "Cheque" && (
                    <div className="mt-4 border p-4 rounded">
                        <input type="text" placeholder="Bank Name" value={chequeDetails.bankName} onChange={(e) => setChequeDetails({...chequeDetails, bankName: e.target.value})} className="border p-2 w-full mb-2" />
                        <input type="text" placeholder="Cheque Number" value={chequeDetails.chequeNumber} onChange={(e) => setChequeDetails({...chequeDetails, chequeNumber: e.target.value})} className="border p-2 w-full mb-2" />
                    </div>
                )}
                <button onClick={handleSubmit} className="mt-4 bg-pink-500 text-white p-3 w-full rounded">Send Request Form</button>
            </div>
            {/* Right Side - Available Products */}
            <div className="w-1/3 p-4 border-l">
                <h2 className="text-xl font-semibold mb-2">Available Products</h2>
                {availableProducts.map(product => (
                    <button key={product.item_id} onClick={() => addProduct(product)} className="bg-green-500 text-white px-4 py-2 rounded m-2">
                        {product.item_name} - {product.selling_price} PHP
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RequestForm;
