import 'react';
import PropTypes from 'prop-types';

import { Link } from 'react-router-dom';

const NavBar = () => {


  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <img src="/src/assets/logo.png" alt="BabyGlo Logo" className="w-32" />
        <div className="space-x-4">
          <Link to="/contact" className="text-gray-700 hover:text-red-500">Contact Us</Link>
          <Link to="/order-status" className="text-gray-700 hover:text-red-500">Order Status</Link>
          <Link to="/login" className="text-gray-700 hover:text-red-500">Login</Link>
        </div>
      </div>
    </nav>
  );
};

NavBar.propTypes = {
  categories: PropTypes.array.isRequired,
};

export default NavBar;
