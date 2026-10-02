
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id?: string | { $oid?: string };
  _id?: string | { $oid?: string };
  name?: string;
  email?: string;
  role?: string;
};

type Student = {
  id?: string | { $oid?: string };
  _id?: string | { $oid?: string };
  userId?: string | { $oid?: string };
  rollNo?: string | number;
  department?: string;
  year?: string | number;
  phone?: string;
  gender?: string;
  name?: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    if (value.$oid) {
      return String(value.$oid);
    }

    if (value.id) {
      return getId(value.id);
    }

    if (value._id) {
      return getId(value._id);
    }
  }

  return "";
}

export default function StudentProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User = JSON.parse(savedUser);

      if (parsedUser.role !== "student") {
        router.push("/login");
        return;
      }

      setUser(parsedUser);

      const userId = getId(parsedUser.id ?? parsedUser._id);

      if (userId) {
        loadStudentProfile(userId);
      } else {
        setError("User ID not found");
        setLoading(false);
      }
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  async function loadStudentProfile(userId: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/students", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to load student details");
        return;
      }

      const students: Student[] = Array.isArray(data.students)
        ? data.students
        : [];

      const foundStudent = students.find((item) => {
        const studentUserId = getId(item.userId);
        const studentRecordId = getId(item.id ?? item._id);

        return (
          studentUserId === String(userId) ||
          studentRecordId === String(userId)
        );
      });

      if (!foundStudent) {
        setError("Student profile not found");
        return;
      }

      setStudent(foundStudent);
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  function getValue(value: any): string {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return "Not available";
    }

    if (typeof value === "object") {
      return getId(value) || "Not available";
    }

    return String(value);
  }

  function getInitial(): string {
    const name = user?.name || user?.email || "S";
    return name.charAt(0).toUpperCase();
  }

  function getReadableStudentId(): string {
    return "STUDENT-001";
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button
          style={styles.backButton}
          onClick={() => router.push("/student-dashboard")}
        >
          ← Back to Dashboard
        </button>

        <section style={styles.headerCard}>
          <div style={styles.avatar}>{getInitial()}</div>

          <div>
            <h1 style={styles.heading}>
              {getValue(user.name)}
            </h1>

            <p style={styles.email}>
              {getValue(user.email)}
            </p>

            <span style={styles.badge}>Student</span>
          </div>
        </section>

        {error && <p style={styles.error}>{error}</p>}

        {student && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>
              Personal Information
            </h2>

            <div style={styles.grid}>
              <InfoItem
                label="Full Name"
                value={getValue(user.name || student.name)}
              />

              <InfoItem
                label="Email"
                value={getValue(user.email)}
              />

              <InfoItem
                label="Roll Number"
                value={getValue(student.rollNo)}
              />

              <InfoItem
                label="Department"
                value={getValue(student.department)}
              />

              <InfoItem
                label="Year"
                value={getValue(student.year)}
              />

              <InfoItem
                label="Phone Number"
                value={getValue(student.phone)}
              />

              <InfoItem
                label="Gender"
                value={getValue(student.gender)}
              />

              <InfoItem
                label="Student ID"
                value={getReadableStudentId()}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.infoItem}>
      <p style={styles.label}>{label}</p>
      <p style={styles.value}>{value}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "30px 16px",
  },

  container: {
    maxWidth: "950px",
    margin: "0 auto",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
  },

  backButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#334155",
    color: "white",
    cursor: "pointer",
    marginBottom: "20px",
  },

  headerCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    marginBottom: "25px",
  },

  avatar: {
    width: "75px",
    height: "75px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "bold",
  },

  heading: {
    fontSize: "30px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: 0,
  },

  email: {
    color: "#64748b",
    margin: "8px 0",
  },

  badge: {
    display: "inline-block",
    padding: "5px 12px",
    borderRadius: "20px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: "bold",
  },

  card: {
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  },

  cardTitle: {
    fontSize: "23px",
    color: "#1e293b",
    marginBottom: "22px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },

  infoItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
  },

  label: {
    color: "#64748b",
    fontSize: "13px",
    margin: "0 0 8px",
  },

  value: {
    color: "#1e293b",
    fontWeight: "bold",
    margin: 0,
    overflowWrap: "anywhere",
  },

  error: {
    color: "#dc2626",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
};