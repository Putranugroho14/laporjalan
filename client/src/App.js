import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import FormLapor from "./components/FormLapor";
import Dashboard from "./components/Dashboard";
import Auth from "./components/Auth";
import AdminReport from "./components/AdminReport";
import LandingPage from "./components/LandingPage";
import { colors } from "./designSystem";
import { AlertProvider } from "./components/AlertContext";

function AppContent() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const appContainerStyle = {
    minHeight: "100vh",
    background: (isLandingPage || isAuthPage) ? 'transparent' : colors.gradientDarkAnimated,
    backgroundSize: "400% 400%",
    animation: (isLandingPage || isAuthPage) ? 'none' : "gradientShift 15s ease infinite",
    position: "relative",
    paddingTop: (isLandingPage || isAuthPage) ? "0" : "140px",
    paddingBottom: (isLandingPage || isAuthPage) ? "0" : "50px",
  };

  return (
    <>
      {!isLandingPage && !isAuthPage && <Navbar />}
      <div style={appContainerStyle}>
        <Routes>
          <Route path="/login" element={!token ? <Auth /> : <Navigate to="/lapor" />} />
          <Route path="/register" element={!token ? <Auth /> : <Navigate to="/lapor" />} />

          {/* Landing Page as default */}
          <Route path="/" element={<LandingPage />} />

          {/* Protected Routes */}
          <Route path="/lapor" element={token && role !== 'admin' ? <FormLapor /> : <Navigate to={role === 'admin' ? "/admin" : "/login"} />} />
          <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />

          {/* Admin Route */}
          <Route path="/admin" element={token && role === 'admin' ? <AdminReport /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <>
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow-x: hidden;
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 10px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 122, 255, 0.3);
            border-radius: 5px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 122, 255, 0.5);
          }
        `}
      </style>

      <BrowserRouter>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </BrowserRouter>
    </>
  );
}

export default App;