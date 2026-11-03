// src/pages/Triggers.tsx
import React, { useEffect, useState } from "react";
import { Box, List, ListItem, ListItemText, ListItemSecondaryAction, Switch, Divider, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from "@mui/material";
import { callFunction } from "../realm";

interface Trigger {
  _id: string;
  name: string;
  schedule?: string; // cron expression for scheduled triggers
  enabled: boolean;
}

const Triggers: React.FC = () => {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSchedule, setNewSchedule] = useState("");

  const fetchTriggers = async () => {
    const result = await callFunction("listTriggers");
    setTriggers(result);
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await callFunction("setTriggerEnabled", id, !enabled);
    fetchTriggers();
  };

  const handleCreate = async () => {
    await callFunction("createTrigger", newName, newSchedule);
    setOpen(false);
    setNewName("");
    setNewSchedule("");
    fetchTriggers();
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          New Trigger
        </Button>
      </Box>
      <List>
        {triggers.map((t) => (
          <React.Fragment key={t._id}>
            <ListItem>
              <ListItemText primary={t.name} secondary={t.schedule ?? "One‑off"} />
              <ListItemSecondaryAction>
                <Switch checked={t.enabled} onChange={() => toggleEnabled(t._id, t.enabled)} />
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Trigger</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Trigger Name"
            fullWidth
            variant="standard"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Cron Schedule (optional)"
            placeholder="e.g., */5 * * * *"
            fullWidth
            variant="standard"
            value={newSchedule}
            onChange={(e) => setNewSchedule(e.target.value)}
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

export default Triggers;
