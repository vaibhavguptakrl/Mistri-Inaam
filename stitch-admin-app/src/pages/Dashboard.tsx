// src/pages/Dashboard.tsx
import React from "react";
import { Grid, Card, CardContent, Typography } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Sample data – replace with real API calls
const userStats = [
  { day: "Mon", signups: 12 },
  { day: "Tue", signups: 19 },
  { day: "Wed", signups: 7 },
  { day: "Thu", signups: 14 },
  { day: "Fri", signups: 23 },
  { day: "Sat", signups: 5 },
  { day: "Sun", signups: 9 },
];

const Dashboard: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Active Users</Typography>
            <Typography variant="h4">1,243</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Function Errors (last 24h)</Typography>
            <Typography variant="h4">27</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">API Calls (last hour)</Typography>
            <Typography variant="h4">3,862</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sign‑ups per day (last week)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userStats}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="signups" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Dashboard;
