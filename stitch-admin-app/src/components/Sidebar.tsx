// src/components/Sidebar.tsx
import React from "react";
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import CodeIcon from "@mui/icons-material/Code";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StorageIcon from "@mui/icons-material/Storage";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  drawerWidth: number;
}

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, to: "/dashboard" },
  { text: "Users", icon: <PeopleIcon />, to: "/users" },
  { text: "Functions", icon: <CodeIcon />, to: "/functions" },
  { text: "Triggers", icon: <ScheduleIcon />, to: "/triggers" },
  { text: "Collections", icon: <StorageIcon />, to: "/collections" },
  { text: "Logs", icon: <ListAltIcon />, to: "/logs" },
  { text: "Settings", icon: <SettingsIcon />, to: "/settings" },
];

const Sidebar: React.FC<SidebarProps> = ({ drawerWidth }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem button component={NavLink} to={item.to} key={item.text} activeClassName="Mui-selected" exact>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
