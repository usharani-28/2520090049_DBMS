
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Stats = {
  hostels: number;
  rooms: number;
  students: number;
  bookings: number;
  payments: number;
  complaints: number;
  maintenance: number;
  leaveRequests: number;
  roomAllocations: number;
};

const modules = [
  {
    title: "Hostels",
    description: "Manage hostel details",
    path: "/admin/hostels",
    icon: "🏢",
  },
  {
    title: "Rooms",
    description: "Manage rooms and availability",
    path: "/admin/rooms",
    icon: "🛏️",
  },
  {
    title: "Students",
    description: "View and manage students",
    path: "/admin/students",
    icon: "👨‍🎓",
  },
  {
    title: "Bookings",
    description: "Approve and manage bookings",
    path: "/admin/bookings",
    icon: "📋",
  },
  {
    title: "Payments",
    description: "View and manage payment records",
    path: "/admin/payments",
    icon: "💳",
  },
  {
    title: "Complaints",
    description: "Manage student complaints",
    path: "/admin/complaints",
    icon: "📢",
  },
  {
    title: "Maintenance",
    description: "Manage maintenance requests",
    path: "/admin/maintenance",
    icon: "🔧",
  },
  {
    title: "Leave Requests",
    description: "Approve or reject leave requests",
    path: "/admin/leave-requests",
    icon: "📝",
  },
  {
    title: "Room Allocations",
    description: "Manage room allocations",
    path: "/admin/room-allocations",
    icon: "🔑",
  },
];

const defaultStats: Stats = {
  hostels: 0,
  rooms: 0,
  students: 0,
  bookings: 0,
  payments: 0,
  complaints: 0,
  maintenance: 0,
  leaveRequests: 0,
  roomAllocations: 0,
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User = JSON.parse(storedUser);

      if (parsedUser.role !== "admin") {
        router.push("/login");
        return;
      }

      setUser(parsedUser);
      fetchStats();
    } catch (error) {
      console.error("Invalid user data:", error);
      localStorage.removeItem("user");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function fetchStats() {
    try {
      setStatsLoading(true);
      setStatsError("");

      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatsError(data.error || "Failed to load statistics");
        return;
      }

      const values = data.stats || data;

      setStats({
        hostels: Number(
          values.hostels ?? values.totalHostels ?? 0
        ),
        rooms: Number(
          values.rooms ?? values.totalRooms ?? 0
        ),
        students: Number(
          values.students ?? values.totalStudents ?? 0
        ),
        bookings: Number(
          values.bookings ?? values.totalBookings ?? 0
        ),
        payments: Number(
          values.payments ?? values.totalPayments ?? 0
        ),
        complaints: Number(
          values.complaints ?? values.totalComplaints ?? 0
        ),
        maintenance: Number(
          values.maintenance ?? values.totalMaintenance ?? 0
        ),
        leaveRequests: Number(
          values.leaveRequests ??
            values.totalLeaveRequests ??
            0
        ),
        roomAllocations: Number(
          values.roomAllocations ??
            values.totalRoomAllocations ??
            0
        ),
      });
    } catch (error) {
      console.error("Statistics error:", error);
      setStatsError("Unable to connect to the statistics API");
    } finally {
      setStatsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/login");
  }

  function openModule(path: string) {
    router.push(path);
  }

  if (loading) {
    return (
      <main style={styles.loadingContainer}>
        <h2>Loading dashboard...</h2>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const statCards = [
    {
      title: "Total Hostels",
      value: stats.hostels,
      icon: "🏢",
      color: "#2563eb",
    },
    {
      title: "Total Rooms",
      value: stats.rooms,
      icon: "🛏️",
      color: "#7c3aed",
    },
    {
      title: "Total Students",
      value: stats.students,
      icon: "👨‍🎓",
      color: "#0891b2",
    },
    {
      title: "Total Bookings",
      value: stats.bookings,
      icon: "📋",
      color: "#16a34a",
    },
    {
      title: "Total Payments",
      value: stats.payments,
      icon: "💳",
      color: "#ca8a04",
    },
    {
      title: "Complaints",
      value: stats.complaints,
      icon: "📢",
      color: "#dc2626",
    },
    {
      title: "Maintenance",
      value: stats.maintenance,
      icon: "🔧",
      color: "#ea580c",
    },
    {
      title: "Leave Requests",
      value: stats.leaveRequests,
      icon: "📝",
      color: "#4f46e5",
    },
    {
      title: "Room Allocations",
      value: stats.roomAllocations,
      icon: "🔑",
      color: "#0f766e",
    },
  ];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>Admin Dashboard</h1>

          <p style={styles.subtitle}>
            Welcome, {user.name || "Administrator"}
          </p>

          <p style={styles.email}>{user.email}</p>
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </header>

      <section style={styles.welcomeCard}>
        <h2 style={styles.welcomeTitle}>
          Hostel Management System
        </h2>

        <p style={styles.welcomeText}>
          Manage hostels, rooms, students, bookings, payments,
          complaints, maintenance, and leave requests from one place.
        </p>
      </section>

      <section>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Dashboard Statistics</h2>

          <button onClick={fetchStats} style={styles.refreshButton}>
            ↻ Refresh
          </button>
        </div>

        {statsLoading && (
          <p style={styles.infoText}>Loading statistics...</p>
        )}

        {statsError && (
          <p style={styles.errorText}>{statsError}</p>
        )}

        <div style={styles.statsGrid}>
          {statCards.map((card) => (
            <div
              key={card.title}
              style={{
                ...styles.statCard,
                borderLeft: `5px solid ${card.color}`,
              }}
            >
              <div
                style={{
                  ...styles.statIcon,
                  backgroundColor: `${card.color}18`,
                }}
              >
                {card.icon}
              </div>

              <div>
                <p style={styles.statTitle}>{card.title}</p>

                <h3 style={styles.statValue}>
                  {statsLoading ? "..." : card.value}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={styles.sectionTitle}>Management Modules</h2>

        <div style={styles.grid}>
          {modules.map((module) => (
            <button
              key={module.path}
              onClick={() => openModule(module.path)}
              style={styles.moduleCard}
            >
              <div style={styles.icon}>{module.icon}</div>

              <div style={styles.moduleContent}>
                <h3 style={styles.moduleTitle}>
                  {module.title}
                </h3>

                <p style={styles.moduleDescription}>
                  {module.description}
                </p>
              </div>

              <span style={styles.arrow}>→</span>
            </button>
          ))}
        </div>
      </section>

      <footer style={styles.footer}>
        <p>Hostel Management System | Admin Panel</p>
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    backgroundColor: "#f4f6f9",
    fontFamily: "Arial, sans-serif",
  },

  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    padding: "25px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },

  heading: {
    margin: "0 0 10px",
    color: "#1f2937",
    fontSize: "30px",
  },

  subtitle: {
    margin: "0 0 5px",
    color: "#374151",
    fontSize: "18px",
  },

  email: {
    margin: "0",
    color: "#6b7280",
    fontSize: "14px",
  },

  logoutButton: {
    padding: "12px 22px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "bold",
  },

  welcomeCard: {
    marginTop: "25px",
    padding: "25px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderRadius: "12px",
  },

  welcomeTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
  },

  welcomeText: {
    margin: "0",
    lineHeight: "1.6",
    fontSize: "15px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap" as const,
  },

  sectionTitle: {
    marginTop: "30px",
    marginBottom: "18px",
    color: "#1f2937",
    fontSize: "24px",
  },

  refreshButton: {
    padding: "9px 16px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  infoText: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  errorText: {
    color: "#dc2626",
    fontWeight: "bold",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "20px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
  },

  statIcon: {
    width: "52px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    fontSize: "27px",
  },

  statTitle: {
    margin: "0 0 8px",
    color: "#6b7280",
    fontSize: "13px",
  },

  statValue: {
    margin: "0",
    color: "#111827",
    fontSize: "28px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },

  moduleCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "22px",
    minHeight: "130px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left" as const,
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
  },

  icon: {
    fontSize: "34px",
    minWidth: "42px",
  },

  moduleContent: {
    flex: 1,
  },

  moduleTitle: {
    margin: "0 0 8px",
    color: "#111827",
    fontSize: "18px",
  },

  moduleDescription: {
    margin: "0",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "1.4",
  },

  arrow: {
    color: "#2563eb",
    fontSize: "24px",
    fontWeight: "bold",
  },

  footer: {
    marginTop: "40px",
    padding: "20px",
    textAlign: "center" as const,
    color: "#6b7280",
    fontSize: "14px",
  },
};