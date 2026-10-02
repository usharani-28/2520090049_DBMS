"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Booking = {
  id?: string;
  _id?: string | { $oid?: string };
  studentId?: string | { $oid?: string };
  roomId?: string | { $oid?: string };
  amount?: number;
  checkIn?: string;
  checkOut?: string;
  status?: string;
};

type Student = {
  id?: string;
  _id?: string | { $oid?: string };
  userId?: string | { $oid?: string };
  rollNo?: string;
  name?: string;
  email?: string;
};

type Room = {
  id?: string;
  _id?: string | { $oid?: string };
  roomNumber?: string | number;
  number?: string | number;
  name?: string;
};

type User = {
  id?: string;
  _id?: string | { $oid?: string };
  name?: string;
  email?: string;
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
    return String(value.id);
  }

  if (value._id) {
    return getId(value._id);
  }

  return String(value);
}

function formatDate(value?: string): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortId(id: string): string {
  if (!id) {
    return "N/A";
  }

  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 6)}...${id.slice(-6)}`;
}

function statusStyle(status?: string): React.CSSProperties {
  const value = (status || "").toLowerCase();

  if (value === "booked" || value === "approved") {
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

  if (value === "rejected" || value === "cancelled") {
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

export default function StudentBookingsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchBookings() {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        router.push("/login");
        return;
      }

      const user = JSON.parse(storedUser);

      if (user.role?.toLowerCase() !== "student") {
        router.push("/admin-dashboard");
        return;
      }

      const [
        studentsResponse,
        bookingsResponse,
        roomsResponse,
        usersResponse,
      ] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/rooms", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);

      const studentsData = await studentsResponse.json();
      const bookingsData = await bookingsResponse.json();
      const roomsData = await roomsResponse.json();
      const usersData = await usersResponse.json();

      if (
        !studentsResponse.ok ||
        !bookingsResponse.ok ||
        !roomsResponse.ok ||
        !usersResponse.ok ||
        !studentsData.success ||
        !bookingsData.success ||
        !roomsData.success ||
        !usersData.success
      ) {
        throw new Error("Failed to load booking information");
      }

      const allStudents: Student[] = studentsData.students || [];
      const allBookings: Booking[] = bookingsData.bookings || [];
      const allRooms: Room[] = roomsData.rooms || [];
      const allUsers: User[] = usersData.users || [];

      const currentStudent = allStudents.find(
        (student) =>
          getId(student.userId) === getId(user.id ?? user._id)
      );

      if (!currentStudent) {
        setBookings([]);
        setError("Student profile not found.");
        return;
      }

      const currentStudentId = getId(
        currentStudent.id ?? currentStudent._id
      );

      const studentBookings = allBookings.filter(
        (booking) =>
          getId(booking.studentId) === currentStudentId
      );

      setStudents(allStudents);
      setRooms(allRooms);
      setUsers(allUsers);
      setBookings(studentBookings);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  function getRoomName(
    roomId?: string | { $oid?: string }
  ) {
    const room = rooms.find(
      (item) =>
        getId(item.id ?? item._id) === getId(roomId)
    );

    if (!room) {
      return "Room not available";
    }

    return String(
      room.roomNumber ??
        room.number ??
        room.name ??
        "Room number unavailable"
    );
  }

  function getStudentName(
    studentId?: string | { $oid?: string }
  ) {
    const student = students.find(
      (item) =>
        getId(item.id ?? item._id) === getId(studentId)
    );

    if (!student) {
      return "Student not available";
    }

    if (student.name) {
      return student.name;
    }

    const user = users.find(
      (item) =>
        getId(item.id ?? item._id) ===
        getId(student.userId)
    );

    return user?.name || user?.email || "Student";
  }

  return (
    <main style={styles.container}>
      <div style={styles.topBar}>
        <button
          onClick={() => router.push("/student-dashboard")}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>

        <button
          onClick={fetchBookings}
          disabled={loading}
          style={{
            ...styles.refreshButton,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <h1 style={styles.heading}>My Bookings</h1>

      <p style={styles.subtitle}>
        View your room bookings and booking status.
      </p>

      {loading && (
        <div style={styles.messageCard}>
          Loading your bookings...
        </div>
      )}

      {error && (
        <div style={styles.errorCard}>
          {error}
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div style={styles.messageCard}>
          No bookings found for your account.
        </div>
      )}

      <section style={styles.bookingList}>
        {!loading &&
          !error &&
          bookings.map((booking, index) => {
            const bookingId = getId(
              booking.id ?? booking._id
            );

            return (
              <article
                key={bookingId || index}
                style={styles.bookingCard}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <p style={styles.smallLabel}>
                      BOOKING ID
                    </p>

                    <h2 style={styles.bookingTitle}>
                      {shortId(bookingId)}
                    </h2>

                    {bookingId && (
                      <p style={styles.fullId}>
                        {bookingId}
                      </p>
                    )}
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      ...statusStyle(booking.status),
                    }}
                  >
                    {booking.status || "Unknown"}
                  </span>
                </div>

                <div style={styles.divider} />

                <div style={styles.amountSection}>
                  <span style={styles.detailLabel}>
                    Booking Amount
                  </span>

                  <strong style={styles.amount}>
                    ₹{booking.amount ?? 0}
                  </strong>
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Room
                    </span>

                    <strong style={styles.detailValue}>
                      {getRoomName(booking.roomId)}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Student
                    </span>

                    <strong style={styles.detailValue}>
                      {getStudentName(booking.studentId)}
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
                </div>
              </article>
            );
          })}
      </section>
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
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "25px",
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

  heading: {
    margin: 0,
    color: "#0f172a",
    fontSize: "32px",
  },

  subtitle: {
    color: "#64748b",
    marginTop: "10px",
    marginBottom: "25px",
  },

  bookingList: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },

  bookingCard: {
    backgroundColor: "white",
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
    margin: 0,
    color: "#1e293b",
    fontSize: "18px",
    overflowWrap: "anywhere",
  },

  fullId: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
    overflowWrap: "anywhere",
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

  amountSection: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "15px",
    marginBottom: "18px",
    borderRadius: "10px",
    backgroundColor: "#eff6ff",
  },

  amount: {
    color: "#1d4ed8",
    fontSize: "28px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "15px",
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

  messageCard: {
    padding: "18px",
    backgroundColor: "white",
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