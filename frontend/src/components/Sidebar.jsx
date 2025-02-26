import PropTypes from "prop-types";

const Sidebar = ({ categories, selectedCategory, onCategorySelect, searchTerm, onSearchChange }) => {
  return (
    <aside className="w-64 bg-gray-100 p-4 shadow-lg">
      <h2 className="font-bold text-lg mb-2">Product Categories</h2>
      
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search products..."
        value={searchTerm}
        onChange={onSearchChange}
        className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
      />

      <ul>
        {categories.map((category, index) => (
          <li key={index}>
            <button
              onClick={() => onCategorySelect(category)}
              className={`block w-full text-left text-gray-700 hover:text-red-500 p-2 rounded-md ${
                selectedCategory === category ? "bg-red-400 text-white" : ""
              }`}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

// Prop validation
Sidebar.propTypes = {
  categories: PropTypes.array.isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onCategorySelect: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

export default Sidebar;
