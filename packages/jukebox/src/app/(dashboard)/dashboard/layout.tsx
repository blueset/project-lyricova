"use client";

import DashboardLayout from "./DashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout title="Dashboard">{children}</DashboardLayout>;
}
