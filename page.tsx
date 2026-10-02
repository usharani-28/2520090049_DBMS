"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Booking = {
  id?: string;
  _id?: string;
  studentId?: string;
  userId?: string;
  roomId?: string;
  amount?: number;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};

type Student = {
  id?: string;
  _id?: string;
  userId?: string;
  rollNo?: string;
  department?: string;
  year?: number;
  phone?: string;
  gender?: string;
};

type User = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Room = {
  id?: string;
  _id?: string;
  roomNo?: string | number;
  floor?: string | number;
  capacity?: number;
  occupied?: number;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value.$oid) {
    return String(value.$oid);
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

function formatDate(date?: string): string {
  if (!date) {
    return "Not available";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status?: string) {
  const value = (status || "").toLowerCase();

  if (
    value === "approved" ||
    value === "confirmed" ||
    value === "booked" ||
    value === "paid"
  ) {
    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (value === "pending") {
    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  }

  if (
    value === "rejected" ||
    value === "cancelled" ||
    value === "failed"
  ) {
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    backgroundColor: "#e2e8f0",
    color: "#334155",
  };
}

export default function AdminBookingsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        router.push("/login");
        return;
      }

      const loggedInUser = JSON.parse(storedUser);

      if (loggedInUser.role !== "admin") {
        router.push("/student-dashboard");
        return;
      }

      const [
        bookingsResponse,
        studentsResponse,
        usersResponse,
        roomsResponse,
      ] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/students"),
        fetch("/api/users"),
        fetch("/api/rooms"),
      ]);

      const bookingsData = await bookingsResponse.json();
      const studentsData = await studentsResponse.json();
      const usersData = await usersResponse.json();
      const roomsData = await roomsResponse.json();

      if (!bookingsResponse.ok || !bookingsData.success) {
        throw new Error(
          bookingsData.error || "Failed to fetch bookings"
        );
      }

      setBookings(bookingsData.bookings || []);

      if (studentsResponse.ok && studentsData.success) {
        setStudents(studentsData.students || []);
      }

      if (usersResponse.ok && usersData.success) {
        setUsers(usersData.users || []);
      }

      if (roomsResponse.ok && roomsData.success) {
        setRooms(roomsData.rooms || []);
      }
    } catch (err) {
      console.error("Admin bookings error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function getStudent(studentId?: string) {
    return students.find(
      (student) =>
        getId(student.id ?? student._id) === getId(studentId)
    );
  }

  function getUserForStudent(student?: Student) {
    if (!student?.userId) {
      return undefined;
    }

    return users.find(
      (user) =>
        getId(user.id ?? user._id) === getId(student.userId)
    );
  }

  function getRoom(roomId?: string) {
    return rooms.find(
      (room) =>
        getId(room.id ?? room._id) === getId(roomId)
    );
  }

  return (
    <main style={styles.container}>
      <div style={styles.topBar}>
        <button
          onClick={() => router.push("/admin-dashboard")}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>

        <button
          onClick={fetchData}
          style={styles.refreshButton}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={styles.headerSection}>
        <div>
          <h1 style={styles.heading}>Manage Bookings</h1>

          <p style={styles.subtitle}>
            View and manage all student room bookings.
          </p>
        </div>

        <div style={styles.countCard}>
          <span style={styles.countLabel}>
            Total Bookings
          </span>

          <strong style={styles.countValue}>
            {bookings.length}
          </strong>
        </div>
      </div>

      {loading && (
        <div style={styles.messageCard}>
          Loading bookings...
        </div>
      )}

      {error && (
        <div style={styles.errorCard}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div style={styles.messageCard}>
          No bookings found.
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <section style={styles.bookingList}>
          {bookings.map((booking, index) => {
            const student = getStudent(booking.studentId);
            const user = getUserForStudent(student);
            const room = getRoom(booking.roomId);

            const bookingId =
              getId(booking.id ?? booking._id) || `Booking ${index + 1}`;

            const statusStyle = getStatusStyle(booking.status);

            return (
              <article
                key={bookingId}
                style={styles.bookingCard}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <p style={styles.smallLabel}>
                      BOOKING ID
                    </p>

                    <h2 style={styles.bookingTitle}>
                      {bookingId}
                    </h2>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      ...statusStyle,
                    }}
                  >
                    {booking.status || "Unknown"}
                  </span>
                </div>

                <div style={styles.divider} />

                <div style={styles.sectionTitle}>
                  Student Details
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Name
                    </span>

                    <strong style={styles.detailValue}>
                      {user?.name || "Not available"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Email
                    </span>

                    <strong style={styles.detailValue}>
                      {user?.email || "Not available"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Roll Number
                    </span>

                    <strong style={styles.detailValue}>
                      {student?.rollNo || "Not available"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Department
                    </span>

                    <strong style={styles.detailValue}>
                      {student?.department || "Not available"}
                    </strong>
                  </div>
                </div>

                <div style={styles.sectionTitle}>
                  Booking Details
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Room Number
                    </span>

                    <strong style={styles.detailValue}>
                      {room?.roomNo ??
                        booking.roomId ??
                        "Not available"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Amount
                    </span>

                    <strong style={styles.detailValue}>
                      ₹{booking.amount ?? 0}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Check-in
                    </span>

                    <strong style={styles.detailValue}>
                      {formatDate(booking.checkIn)}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Check-out
                    </span>

                    <strong style={styles.detailValue}>
                      {formatDate(booking.checkOut)}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Payment Status
                    </span>

                    <strong style={styles.detailValue}>
                      {booking.paymentStatus || "Not available"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Room Capacity
                    </span>

                    <strong style={styles.detailValue}>
                      {room?.capacity ?? "Not available"}
                    </strong>
                  </div>
                </div>

                <div style={styles.footer}>
                  <span style={styles.footerLabel}>
                    Student ID
                  </span>

                  <span style={styles.footerValue}>
                    {booking.studentId || "Not available"}
                  </span>

                  <span style={styles.footerLabel}>
                    Room ID
                  </span>

                  <span style={styles.footerValue}>
                    {booking.roomId || "Not available"}
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    padding: "30px",
    backgroundColor: "#f1f5f9",
    fontFamily: "Arial, sans-serif",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    gap: "12px",
    flexWrap: "wrap",
  },

  backButton: {
    padding: "11px 17px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#334155",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
  },

  refreshButton: {
    padding: "11px 17px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
  },

  headerSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  },

  heading: {
    margin: "0",
    color: "#0f172a",
    fontSize: "32px",
  },

  subtitle: {
    color: "#64748b",
    marginTop: "10px",
    marginBottom: "0",
  },

  countCard: {
    minWidth: "150px",
    padding: "18px 22px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
    textAlign: "center",
  },

  countLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    marginBottom: "6px",
  },

  countValue: {
    color: "#1e293b",
    fontSize: "28px",
  },

  bookingList: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(380px, 1fr))",
    gap: "20px",
  },

  bookingCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    boxShadow:
      "0 4px 15px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  smallLabel: {
    margin: "0 0 6px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },

  bookingTitle: {
    margin: "0",
    color: "#1e293b",
    fontSize: "16px",
    wordBreak: "break-word",
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  divider: {
    height: "1px",
    backgroundColor: "#e2e8f0",
    margin: "18px 0",
  },

  sectionTitle: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "bold",
    marginBottom: "12px",
    marginTop: "18px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  detailBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "12px",
  },

  detailValue: {
    color: "#1e293b",
    fontSize: "14px",
    overflowWrap: "anywhere",
  },

  footer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "20px",
    paddingTop: "15px",
    borderTop: "1px solid #e2e8f0",
  },

  footerLabel: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "4px",
  },

  footerValue: {
    color: "#475569",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },

  messageCard: {
    padding: "18px",
    backgroundColor: "#ffffff",
    color: "#475569",
    borderRadius: "10px",
    marginTop: "20px",
  },

  errorCard: {
    padding: "18px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "10px",
    marginTop: "20px",
  },
};