import React from 'react';
import {
  FaChartBar,
  FaCalendarAlt,
  FaTrashAlt,
  FaTruck,
  FaUsers,
  FaBell,
  FaCogs,
  FaUserCircle,
  FaRecycle,
  FaExclamationCircle,
  FaShareAlt,
  FaClipboardList,
  FaLeaf,
  FaSeedling,
  FaChevronDown,
  FaChevronRight,
  FaSignOutAlt,
} from 'react-icons/fa';

export default function Sidebar({ navCategories, expandedCategory, toggleCategory, setSelectedView, logout, userData }) {
  return (
    <aside
      className="fixed lg:relative inset-y-0 left-0 z-10 w-80 transition-transform duration-300 ease-in-out bg-white/90 backdrop-blur-lg shadow-2xl lg:translate-x-0 overflow-y-auto flex flex-col"
    >
      {/* Logo area */}
      <div className="relative h-24 px-8 flex items-center justify-between bg-gradient-to-r from-green-600 to-green-500 text-white overflow-hidden">
        <div className="flex items-center">
          <div className="p-3 bg-white rounded-full shadow-md">
            <FaLeaf className="text-2xl text-green-600" />
          </div>
          <span className="ml-3 text-2xl font-bold tracking-wide">Clearo Sync</span>
        </div>
        <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-white/10 rounded-full"></div>
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
      </div>

      {/* Name Card */}
      {userData && (
        <div className="px-8 py-6 border-b border-green-100 bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-medium text-xl shadow-md">
                {userData.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-green-500">
                <FaLeaf className="text-green-500 text-xs" />
              </div>
            </div>
            <div className="ml-4">
              <p className="font-bold text-gray-800 text-lg">{userData.name}</p>
              <p className="text-sm text-green-700">{userData.position}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation - Collapsible */}
      <nav className="p-4 flex-grow bg-gradient-to-b from-green-50 to-white">
        <ul className="space-y-2">
          {navCategories.map((category, idx) => (
            <li key={idx} className="mb-1">
              {/* Main category button */}
              <button
                onClick={() => toggleCategory(idx)}
                className={`flex items-center justify-between w-full px-5 py-4 text-sm rounded-xl transition-all duration-200 ${
                  expandedCategory === idx
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-md'
                    : 'hover:bg-green-100 text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                      expandedCategory === idx ? 'bg-white/20' : 'bg-green-100'
                    }`}
                  >
                    <span
                      className={`text-xl ${
                        expandedCategory === idx ? 'text-white' : 'text-green-600'
                      }`}
                    >
                      {category.icon}
                    </span>
                  </div>
                  <span className="ml-4 font-semibold">{category.title}</span>
                </div>
                {category.items.length > 1 && (
                  <span className="text-sm">
                    {expandedCategory === idx ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                )}
              </button>

              {/* Submenu */}
              {expandedCategory === idx && (
                <ul className="mt-2 ml-6 pl-6 border-l-2 border-green-200 space-y-2">
                  {category.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <button
                        onClick={() => item.view && setSelectedView(item.view)}
                        className="flex items-center px-4 py-3 text-sm rounded-xl hover:bg-green-50 text-gray-600 transition-colors w-full text-left"
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-100 mr-3">
                          <span className="text-green-600">{item.icon}</span>
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-6 border-t border-green-100">
        <button
          onClick={logout}
          className="flex items-center justify-center w-full px-5 py-4 text-sm bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors font-medium"
        >
          <FaSignOutAlt className="mr-2" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}