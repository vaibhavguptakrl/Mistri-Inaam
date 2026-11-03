// src/pages/Functions.tsx
import React, { useEffect, useState } from "react";
import { Box, List, ListItem, ListItemText, Divider, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from "@mui/material";
import { callFunction } from "../realm";

interface FunctionInfo {
  name: string;
  description?: string;
}

const Functions: React.FC = () => {
  const [functions, setFunctions] = useState<FunctionInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchFunctions = async () => {
    // Expect a Realm Function "listFunctions" that returns array of {name, description}
    const result = await callFunction("listFunctions");
    setFunctions(result);
  };

  useEffect(() => {
    fetchFunctions();
  }, []);

  const handleCreate = async () => {
    await callFunction("createFunction", newName, newDesc);
    setOpen(false);
    setNewName("");
    setNewDesc("");
    fetchFunctions();
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          New Function
        </Button>
      </Box>
      <List>
        {functions.map((fn) => (
          <React.Fragment key={fn.name}>
            <ListItem>
              <ListItemText primary={fn.name} secondary={fn.description} />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Function</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Function Name"
            fullWidth
            variant="standard"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="standard"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Functions;
