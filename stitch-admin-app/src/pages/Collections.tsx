// src/pages/Collections.tsx
import React from "react";
import { Box, Typography } from "@mui/material";

const Collections: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Collections
      </Typography>
      <Typography>
        This page would contain a schema designer UI (e.g., drag‑and‑drop fields) and a preview of sample documents.
        Implement it using a form library like react‑hook‑form or a custom component.
      </Typography>
    </Box>
  );
};

export default Collections;
