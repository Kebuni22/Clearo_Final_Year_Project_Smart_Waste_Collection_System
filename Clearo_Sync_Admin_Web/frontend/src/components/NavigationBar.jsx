import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  FaChartBar,
  FaUsers,
  FaCogs,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaLeaf,
} from 'react-icons/fa';

export default function NavigationBar({ selectedView, setSelectedView }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navCategories = [
    { title: 'Dashboard', icon: <FaChartBar />, view: 'dashboard', path: '/' },
    { title: 'Residents', icon: <FaUsers />, view: 'residents', path: '/residents' },
    { title: 'Settings', icon: <FaCogs />, view: 'settings', path: '/settings' },
  ];

  return (
    <div>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed z-20 top-4 left-4 p-3 rounded-full bg-green-600 text-white shadow-lg"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:relative inset-y-0 left-0 z-10 w-72 transition-transform duration-300 ease-in-out bg-white shadow-lg lg:translate-x-0 overflow-y-auto flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center h-20 px-6 bg-green-600 text-white">
          <FaLeaf className="text-3xl" />
          <span className="ml-4 text-2xl font-bold">Clearo Sync</span>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-grow">
          <ul className="space-y-2">
            {navCategories.map((category, idx) => (
              <li key={idx}>
                <button
                  onClick={() => navigate(category.path)}
                  className={`flex items-center px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                    selectedView === category.view
                      ? 'bg-green-600 text-white'
                      : 'hover:bg-green-100 text-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                    {category.icon}
                  </div>
                  <span className="ml-3 font-medium">{category.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-3 text-sm bg-red-50 text-red-500 hover:bg-red-100 rounded-lg"
          >
            <FaSignOutAlt className="mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
