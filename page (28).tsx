
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id?: string;
  _id?: string | { $oid?: string };
  userId?: string | { $oid?: string };
};

type Booking = {
  id?: string;
  _id?: string | { $oid?: string };
  studentId?: string | { $oid?: string };
  roomId?: string | { $oid?: string };
};

type Room = {
  id?: string;
  _id?: string | { $oid?: string };
  roomNumber?: string | number;
  number?: string | number;
  name?: string;
};

type Payment = {
  id?: string;
  _id?: string | { $oid?: string };
  bookingId?: string | { $oid?: string };
  amount?: number;
  method?: string;
  paidAt?: string;
  status?: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value.$oid) return String(value.$oid);

  if (value.id) return String(value.id);

  if (value._id) return getId(value._id);

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

function formatDate(value?: string): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status?: string): React.CSSProperties {
  const value = (status || "").toLowerCase();

  if (
    value === "paid" ||
    value === "completed" ||
    value === "success"
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
    value === "failed" ||
    value === "cancelled" ||
    value === "rejected"
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

export default function StudentPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchPayments() {
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
        paymentsResponse,
        roomsResponse,
      ] = await Promise.all([
        fetch("/api/students", {
          cache: "no-store",
        }),
        fetch("/api/bookings", {
          cache: "no-store",
        }),
        fetch("/api/payments", {
          cache: "no-store",
        }),
        fetch("/api/rooms", {
          cache: "no-store",
        }),
      ]);

      const studentsData = await studentsResponse.json();
      const bookingsData = await bookingsResponse.json();
      const paymentsData = await paymentsResponse.json();
      const roomsData = await roomsResponse.json();

      if (
        !studentsResponse.ok ||
        !bookingsResponse.ok ||
        !paymentsResponse.ok ||
        !roomsResponse.ok ||
        !studentsData.success ||
        !bookingsData.success ||
        !paymentsData.success ||
        !roomsData.success
      ) {
        throw new Error(
          "Failed to load payment information"
        );
      }

      const students: Student[] =
        studentsData.students || [];

      const allBookings: Booking[] =
        bookingsData.bookings || [];

      const allPayments: Payment[] =
        paymentsData.payments || [];

      const allRooms: Room[] =
        roomsData.rooms || [];

      const loggedInUserId = getId(
        user.id ?? user._id
      );

      const student = students.find(
        (item) =>
          getId(item.userId) === loggedInUserId
      );

      if (!student) {
        setPayments([]);
        setBookings([]);
        setRooms([]);

        setError(
          "Student profile not found for this account."
        );

        return;
      }

      const studentId = getId(
        student.id ?? student._id
      );

      const studentBookings = allBookings.filter(
        (booking) =>
          getId(booking.studentId) === studentId
      );

      const bookingIds = new Set(
        studentBookings.map((booking) =>
          getId(booking.id ?? booking._id)
        )
      );

      const studentPayments = allPayments.filter(
        (payment) =>
          bookingIds.has(getId(payment.bookingId))
      );

      setBookings(studentBookings);
      setRooms(allRooms);
      setPayments(studentPayments);
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
    fetchPayments();
  }, []);

  function getRoomName(
    bookingId?: string | { $oid?: string }
  ): string {
    const booking = bookings.find(
      (item) =>
        getId(item.id ?? item._id) ===
        getId(bookingId)
    );

    if (!booking) {
      return "Room not available";
    }

    const room = rooms.find(
      (item) =>
        getId(item.id ?? item._id) ===
        getId(booking.roomId)
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
          onClick={fetchPayments}
          disabled={loading}
          style={styles.refreshButton}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <h1 style={styles.heading}>My Payments</h1>

      <p style={styles.subtitle}>
        View your payment history and payment status.
      </p>

      {loading && (
        <div style={styles.messageCard}>
          Loading your payments...
        </div>
      )}

      {error && (
        <div style={styles.errorCard}>
          {error}
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <div style={styles.messageCard}>
          No payments found for your account.
        </div>
      )}

      <section style={styles.paymentList}>
        {!loading &&
          !error &&
          payments.map((payment, index) => {
            const paymentId = getId(
              payment.id ?? payment._id
            );

            const paymentStatusStyle =
              getStatusStyle(payment.status);

            return (
              <article
                key={paymentId || index}
                style={styles.paymentCard}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <p style={styles.smallLabel}>
                      PAYMENT
                    </p>

                    <h2 style={styles.paymentTitle}>
                      #{paymentId || "N/A"}
                    </h2>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      ...paymentStatusStyle,
                    }}
                  >
                    {payment.status || "Unknown"}
                  </span>
                </div>

                <div style={styles.divider} />

                <div style={styles.amountSection}>
                  <span style={styles.amountLabel}>
                    Paid Amount
                  </span>

                  <strong style={styles.amount}>
                    ₹{payment.amount ?? 0}
                  </strong>
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Room
                    </span>

                    <strong style={styles.detailValue}>
                      {getRoomName(payment.bookingId)}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Booking Reference
                    </span>

                    <strong style={styles.detailValue}>
                      #{getId(payment.bookingId) || "N/A"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Payment Method
                    </span>

                    <strong style={styles.detailValue}>
                      {payment.method || "Not available"}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Payment Date
                    </span>

                    <strong style={styles.detailValue}>
                      {formatDate(payment.paidAt)}
                    </strong>
                  </div>

                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>
                      Status
                    </span>

                    <strong style={styles.detailValue}>
                      {payment.status || "Unknown"}
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
    margin: "0",
    color: "#0f172a",
    fontSize: "32px",
  },

  subtitle: {
    color: "#64748b",
    marginTop: "10px",
    marginBottom: "25px",
  },

  paymentList: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },

  paymentCard: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "22px",
    boxShadow: "0 4px 15px rgba(15, 23, 42, 0.08)",
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

  paymentTitle: {
    margin: "0",
    color: "#1e293b",
    fontSize: "18px",
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

  amountLabel: {
    color: "#64748b",
    fontSize: "13px",
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