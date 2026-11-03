// src/components/Header.tsx
import React from "react";
import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

interface HeaderProps {
  drawerWidth: number;
}

const Header: React.FC<HeaderProps> = ({ drawerWidth }) => {
  return (
    <AppBar
      position="fixed"
      sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}
    >
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2, display: { sm: "none" } }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div">
          Stitch Admin UI
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
