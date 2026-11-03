// src/pages/Users.tsx
import React, { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Box, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from "@mui/material";
import { callFunction } from "../realm";

interface User {
  _id: string;
  email: string;
  role: string;
}

const columns: GridColDef[] = [
  { field: "_id", headerName: "ID", width: 250 },
  { field: "email", headerName: "Email", width: 250 },
  { field: "role", headerName: "Role", width: 150 },
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

  const fetchUsers = async () => {
    // Assuming a Realm Function "listUsers" returns the array
    const result = await callFunction("listUsers");
    setUsers(result);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async () => {
    await callFunction("inviteUser", newEmail, newRole);
    setOpen(false);
    setNewEmail("");
    setNewRole("");
    fetchUsers();
  };

  return (
    <Box sx={{ height: 600, width: "100%" }}>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          Invite User
        </Button>
      </Box>
      <DataGrid rows={users} columns={columns} getRowId={(r) => r._id} pageSize={10} rowsPerPageOptions={[10, 20, 50]} />

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="standard"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Role"
            type="text"
            fullWidth
            variant="standard"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} variant="contained">Invite</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
