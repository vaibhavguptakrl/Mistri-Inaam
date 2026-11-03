// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Functions from "./pages/Functions";
import Triggers from "./pages/Triggers";
import Collections from "./pages/Collections";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";

const drawerWidth = 240;

const App: React.FC = () => {
  return (
    <Box sx={{ display: "flex" }}>
      <Header drawerWidth={drawerWidth} />
      <Sidebar drawerWidth={drawerWidth} />
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, marginLeft: `${drawerWidth}px`, mt: 8 }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/functions" element={<Functions />} />
          <Route path="/triggers" element={<Triggers />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default App;
