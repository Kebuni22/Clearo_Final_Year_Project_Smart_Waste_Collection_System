// src/pages/Landing.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaLeaf } from 'react-icons/fa';

export default function Landing() {
  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center">
      <div className="text-center bg-white shadow-lg rounded-lg p-8 max-w-md border border-green-200">
        <div className="flex justify-center items-center mb-4">
          <FaLeaf className="text-green-500 text-4xl" />
        </div>
        <h1 className="text-3xl font-bold text-green-700 mb-4">Hello, Clearo Sync Admin 👋</h1>
        <p className="text-green-600 mb-6">
          Welcome to the smart waste management dashboard. Manage your operations efficiently and contribute to a greener planet.
        </p>
        <Link
          to="/login"
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition duration-300"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
