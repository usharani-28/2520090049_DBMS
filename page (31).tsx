
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type Student = {
  id?: string;
  _id?: string;
  userId?: string | { $oid?: string };
  rollNo?: string;
  department?: string;
  year?: number;
};

type Summary = {
  bookings: number;
  payments: number;
  complaints: number;
  leaveRequests: number;
  maintenance: number;
};

const initialSummary: Summary = {
  bookings: 0,
  payments: 0,
  complaints: 0,
  leaveRequests: 0,
  maintenance: 0,
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value.$oid) {
    return String(value.$oid);
  }

  if (value.id) {
    return getId(value.id);
  }

  if (value._id) {
    return getId(value._id);
  }

  return String(value);
}

function getRecords(data: any, endpoint: string): any[] {
  const possibleKeys = [
    endpoint,
    endpoint.replace("-", ""),
    "data",
    "records",
    "items",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

export default function StudentDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "student") {
        router.push("/admin-dashboard");
        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    } finally {
      setCheckingUser(false);
    }
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;

    const currentUserId = String(user.id);

    async function loadStudentAndSummary() {
      try {
        setLoadingSummary(true);
        setError("");

        const studentsResponse = await fetch("/api/students");

        if (!studentsResponse.ok) {
          throw new Error("Failed to load students");
        }

        const studentsData = await studentsResponse.json();

        const students: Student[] = getRecords(
          studentsData,
          "students"
        );

        const loggedInStudent =
          students.find(
            (item) => getId(item.userId) === currentUserId
          ) ??
          students.find(
            (item) =>
              getId(item.id ?? item._id) === currentUserId
          );

        setStudent(loggedInStudent ?? null);

        const studentId = getId(
          loggedInStudent?.id ?? loggedInStudent?._id
        );

        const endpoints = [
          "bookings",
          "payments",
          "complaints",
          "leave-requests",
          "maintenance",
        ];

        const results = await Promise.all(
          endpoints.map(async (endpoint) => {
            try {
              const response = await fetch(`/api/${endpoint}`);

              if (!response.ok) {
                return [];
              }

              const data = await response.json();
              const records = getRecords(data, endpoint);

              return records.filter((item: any) => {
                const recordUserId = getId(item.userId);
                const recordStudentId = getId(item.studentId);

                return (
                  recordUserId === currentUserId ||
                  recordStudentId === currentUserId ||
                  (studentId !== "" &&
                    recordStudentId === studentId)
                );
              });
            } catch {
              return [];
            }
          })
        );

        setSummary({
          bookings: results[0].length,
          payments: results[1].length,
          complaints: results[2].length,
          leaveRequests: results[3].length,
          maintenance: results[4].length,
        });
      } catch {
        setError("Failed to load dashboard summary");
      } finally {
        setLoadingSummary(false);
      }
    }

    loadStudentAndSummary();
  }, [user]);

  function logout() {
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (checkingUser || !user) {
    return (
      <main style={styles.loadingContainer}>
        <h2>Loading dashboard...</h2>
      </main>
    );
  }

  const modules = [
    {
      title: "My Bookings",
      description: "View your room bookings and booking details.",
      icon: "🏨",
      path: "/student/bookings",
    },
    {
      title: "My Payments",
      description: "View payment history and payment status.",
      icon: "💳",
      path: "/student/payments",
    },
    {
      title: "Complaints",
      description: "Submit and track your complaints.",
      icon: "📝",
      path: "/student/complaints",
    },
    {
      title: "Leave Requests",
      description: "Apply for leave and check request status.",
      icon: "📅",
      path: "/student/leave-requests",
    },
    {
      title: "Maintenance",
      description: "Report and track maintenance issues.",
      icon: "🔧",
      path: "/student/maintenance",
    },
    {
      title: "My Room",
      description: "View your allocated room details.",
      icon: "🛏️",
      path: "/student/my-room",
    },
    {
      title: "My Profile",
      description: "View your profile information.",
      icon: "👤",
      path: "/student/profile",
    },
  ];

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>Student Dashboard</h1>

          <p style={styles.welcome}>
            Welcome, {user.name || user.email || "Student"}
          </p>

          {student?.rollNo && (
            <p style={styles.studentInfo}>
              Roll Number: {student.rollNo}
            </p>
          )}

          {student?.department && (
            <p style={styles.studentInfo}>
              Department: {student.department}
            </p>
          )}
        </div>

        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </header>

      <section style={styles.summarySection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Overview</h2>

          <button
            onClick={() => window.location.reload()}
            style={styles.refreshButton}
          >
            Refresh
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.summaryGrid}>
          <SummaryCard
            title="Bookings"
            value={loadingSummary ? "..." : summary.bookings}
            icon="🏨"
          />

          <SummaryCard
            title="Payments"
            value={loadingSummary ? "..." : summary.payments}
            icon="💳"
          />

          <SummaryCard
            title="Complaints"
            value={loadingSummary ? "..." : summary.complaints}
            icon="📝"
          />

          <SummaryCard
            title="Leave Requests"
            value={loadingSummary ? "..." : summary.leaveRequests}
            icon="📅"
          />

          <SummaryCard
            title="Maintenance"
            value={loadingSummary ? "..." : summary.maintenance}
            icon="🔧"
          />
        </div>
      </section>

      <section>
        <h2 style={styles.sectionTitle}>Student Services</h2>

        <div style={styles.moduleGrid}>
          {modules.map((module) => (
            <div key={module.title} style={styles.moduleCard}>
              <div style={styles.moduleIcon}>{module.icon}</div>

              <h3 style={styles.moduleTitle}>{module.title}</h3>

              <p style={styles.moduleDescription}>
                {module.description}
              </p>

              <button
                onClick={() => router.push(module.path)}
                style={styles.openButton}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryIcon}>{icon}</span>

      <div>
        <p style={styles.summaryTitle}>{title}</p>
        <h2 style={styles.summaryValue}>{value}</h2>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    padding: "30px",
    backgroundColor: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },

  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "35px",
  },

  heading: {
    margin: "0",
    color: "#0f172a",
    fontSize: "32px",
  },

  welcome: {
    marginTop: "8px",
    marginBottom: "6px",
    color: "#64748b",
    fontSize: "16px",
  },

  studentInfo: {
    margin: "4px 0",
    color: "#475569",
    fontSize: "14px",
  },

  logoutButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#dc2626",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  summarySection: {
    marginBottom: "35px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
  },

  sectionTitle: {
    color: "#1e293b",
    fontSize: "23px",
    marginBottom: "18px",
  },

  refreshButton: {
    padding: "9px 16px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "white",
    cursor: "pointer",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
  },

  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "14px",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
  },

  summaryIcon: {
    fontSize: "28px",
  },

  summaryTitle: {
    margin: "0 0 5px",
    color: "#64748b",
    fontSize: "13px",
  },

  summaryValue: {
    margin: "0",
    color: "#1e293b",
    fontSize: "26px",
  },

  moduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },

  moduleCard: {
    padding: "24px",
    backgroundColor: "white",
    borderRadius: "14px",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
  },

  moduleIcon: {
    fontSize: "32px",
    marginBottom: "12px",
  },

  moduleTitle: {
    margin: "0 0 10px",
    color: "#1e293b",
    fontSize: "18px",
  },

  moduleDescription: {
    minHeight: "42px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  openButton: {
    marginTop: "15px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  error: {
    padding: "12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
  },
};