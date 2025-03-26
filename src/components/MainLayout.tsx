import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const location = window.location;

  return (
    <div>
      {/* Inside the navigation menu items */}
      <Link
        to="/companies"
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 ${
          location.pathname === '/companies' ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50' : ''
        }`}
      >
        <Building2 className="h-4 w-4" />
        Companies
      </Link>
    </div>
  );
};

export default MainLayout; 