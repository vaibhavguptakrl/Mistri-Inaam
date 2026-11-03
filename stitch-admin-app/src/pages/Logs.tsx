// src/pages/Logs.tsx
import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, IconButton, Paper } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { callFunction } from "../realm";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");

  const fetchLogs = async () => {
    const result = await callFunction("fetchLogs"); // expects array of LogEntry
    setLogs(result);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) =>
    l.message.toLowerCase().includes(filter.toLowerCase()) || l.level.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Logs
      </Typography>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{
            endAdornment: (
              <IconButton>
                <SearchIcon />
              </IconButton>
            ),
          }}
        />
      </Box>
      <Paper sx={{ maxHeight: 500, overflow: "auto" }}>
        {filtered.map((log, idx) => (
          <Box key={idx} sx={{ p: 1, borderBottom: "1px solid #eee" }}>
            <Typography variant="caption" color="text.secondary">
              [{log.timestamp}] {log.level}
            </Typography>
            <Typography variant="body2">{log.message}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default Logs;
