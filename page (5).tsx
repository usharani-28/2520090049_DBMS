"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Payment = {
  id?: string;
  _id?: string;
  bookingId?: string;
  amount?: number;
  method?: string;
  status?: string;
  paidAt?: string;
};

type Booking = {
  id?: string;
  _id?: string;
  studentId?: string;
  roomId?: string;
  amount?: number;
  checkIn?: string;
  checkOut?: string;
  status?: string;
};

type Student = {
  id?: string;
  _id?: string;
  userId?: string;
  rollNo?: string;
  department?: string;
};

type User = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
};

type Room = {
  id?: string;
  _id?: string;
  roomNo?: string | number;
};

function getId(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const item = value as {
      $oid?: string;
      toHexString?: () => string;
    };

    if (item.$oid) {
      return String(item.$oid);
    }

    if (typeof item.toHexString === "function") {
      return item.toHexString();
    }
  }

  return String(value);
}

function formatDate(date?: string): string {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-IN");
}

function getStatusStyle(status?: string) {
  const value = (status || "").toLowerCase();

  if (value === "paid" || value === "completed") {
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

  if (value === "failed") {
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

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    bookingId: "",
    amount: "",
    method: "Cash",
    status: "Paid",
  });

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
        paymentsResponse,
        bookingsResponse,
        studentsResponse,
        usersResponse,
        roomsResponse,
      ] = await Promise.all([
        fetch("/api/payments", {
          cache: "no-store",
        }),
        fetch("/api/bookings", {
          cache: "no-store",
        }),
        fetch("/api/students", {
          cache: "no-store",
        }),
        fetch("/api/users", {
          cache: "no-store",
        }),
        fetch("/api/rooms", {
          cache: "no-store",
        }),
      ]);

      const paymentsData = await paymentsResponse.json();
      const bookingsData = await bookingsResponse.json();
      const studentsData = await studentsResponse.json();
      const usersData = await usersResponse.json();
      const roomsData = await roomsResponse.json();

      if (!paymentsResponse.ok || !paymentsData.success) {
        throw new Error(
          paymentsData.error || "Failed to load payments"
        );
      }

      if (!bookingsResponse.ok || !bookingsData.success) {
        throw new Error(
          bookingsData.error || "Failed to load bookings"
        );
      }

      setPayments(paymentsData.payments || []);
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
      console.error("Admin payments error:", err);

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

  function getBooking(bookingId?: string) {
    return bookings.find(
      (booking) =>
        getId(booking.id ?? booking._id) ===
        getId(bookingId)
    );
  }

  function getStudent(studentId?: string) {
    return students.find(
      (student) =>
        getId(student.id ?? student._id) ===
        getId(studentId)
    );
  }

  function getUser(student?: Student) {
    if (!student?.userId) {
      return undefined;
    }

    return users.find(
      (user) =>
        getId(user.id ?? user._id) ===
        getId(student.userId)
    );
  }

  function getRoom(roomId?: string) {
    return rooms.find(
      (room) =>
        getId(room.id ?? room._id) ===
        getId(roomId)
    );
  }

  function handleBookingChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const bookingId = event.target.value;

    const selectedBooking = getBooking(bookingId);

    setForm({
      ...form,
      bookingId,
      amount:
        selectedBooking?.amount !== undefined
          ? String(selectedBooking.amount)
          : "",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.bookingId) {
      alert("Please select a booking");
      return;
    }

    if (!form.amount) {
      alert("Please enter the payment amount");
      return;
    }

    if (!form.method) {
      alert("Please select a payment method");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: form.bookingId,
          amount: Number(form.amount),
          method: form.method,
          status: form.status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Payment creation failed"
        );
      }

      alert("Payment added successfully");

      setForm({
        bookingId: "",
        amount: "",
        method: "Cash",
        status: "Paid",
      });

      await fetchData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
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

      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>
            Admin Payments
          </h1>

          <p style={styles.subtitle}>
            View and add hostel payment records.
          </p>
        </div>

        <div style={styles.countCard}>
          <span style={styles.countLabel}>
            Total Payments
          </span>

          <strong style={styles.countValue}>
            {payments.length}
          </strong>
        </div>
      </div>

      {error && (
        <div style={styles.errorCard}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Add Payment
        </h2>

        <form
          onSubmit={handleSubmit}
          style={styles.form}
        >
          <div style={styles.field}>
            <label style={styles.label}>
              Select Booking
            </label>

            <select
              value={form.bookingId}
              onChange={handleBookingChange}
              style={styles.input}
              disabled={loading || submitting}
            >
              <option value="">
                -- Select a booking --
              </option>

              {bookings.map((booking) => {
                const bookingId = getId(
                  booking.id ?? booking._id
                );

                const student = getStudent(
                  booking.studentId
                );

                const user = getUser(student);

                const room = getRoom(
                  booking.roomId
                );

                return (
                  <option
                    key={bookingId}
                    value={bookingId}
                  >
                    {user?.name || "Student"} | Room{" "}
                    {room?.roomNo ??
                      booking.roomId ??
                      "N/A"} | ₹
                    {booking.amount ?? 0} |{" "}
                    {booking.status || "Unknown"}
                  </option>
                );
              })}
            </select>

            {form.bookingId && (
              <small style={styles.helpText}>
                Booking ID: {form.bookingId}
              </small>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Amount
            </label>

            <input
              type="number"
              min="0"
              placeholder="Payment amount"
              value={form.amount}
              onChange={(event) =>
                setForm({
                  ...form,
                  amount: event.target.value,
                })
              }
              style={styles.input}
              disabled={submitting}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Payment Method
            </label>

            <select
              value={form.method}
              onChange={(event) =>
                setForm({
                  ...form,
                  method: event.target.value,
                })
              }
              style={styles.input}
              disabled={submitting}
            >
              <option value="Cash">
                Cash
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Bank Transfer">
                Bank Transfer
              </option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Payment Status
            </label>

            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value,
                })
              }
              style={styles.input}
              disabled={submitting}
            >
              <option value="Paid">
                Paid
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Failed">
                Failed
              </option>
            </select>
          </div>

          <button
            type="submit"
            style={styles.submitButton}
            disabled={submitting || loading}
          >
            {submitting
              ? "Adding Payment..."
              : "Add Payment"}
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          All Payments
        </h2>

        {loading && (
          <p style={styles.loadingText}>
            Loading payments...
          </p>
        )}

        {!loading &&
          !error &&
          payments.length === 0 && (
            <p style={styles.loadingText}>
              No payments found.
            </p>
          )}

        {!loading &&
          !error &&
          payments.length > 0 && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.cell}>
                      Payment ID
                    </th>

                    <th style={styles.cell}>
                      Booking ID
                    </th>

                    <th style={styles.cell}>
                      Student
                    </th>

                    <th style={styles.cell}>
                      Room
                    </th>

                    <th style={styles.cell}>
                      Amount
                    </th>

                    <th style={styles.cell}>
                      Method
                    </th>

                    <th style={styles.cell}>
                      Status
                    </th>

                    <th style={styles.cell}>
                      Paid At
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map(
                    (payment, index) => {
                      const paymentId = getId(
                        payment.id ??
                          payment._id
                      );

                      const booking =
                        getBooking(
                          payment.bookingId
                        );

                      const student =
                        getStudent(
                          booking?.studentId
                        );

                      const user =
                        getUser(student);

                      const room =
                        getRoom(
                          booking?.roomId
                        );

                      return (
                        <tr
                          key={
                            paymentId ||
                            index
                          }
                        >
                          <td style={styles.cell}>
                            <span
                              style={
                                styles.idText
                              }
                            >
                              {paymentId ||
                                "N/A"}
                            </span>
                          </td>

                          <td style={styles.cell}>
                            <span
                              style={
                                styles.idText
                              }
                            >
                              {payment.bookingId ||
                                "N/A"}
                            </span>
                          </td>

                          <td style={styles.cell}>
                            {user?.name ||
                              student?.rollNo ||
                              "Not available"}
                          </td>

                          <td style={styles.cell}>
                            {room?.roomNo ??
                              booking?.roomId ??
                              "N/A"}
                          </td>

                          <td style={styles.cell}>
                            ₹
                            {payment.amount ??
                              0}
                          </td>

                          <td style={styles.cell}>
                            {payment.method ||
                              "N/A"}
                          </td>

                          <td style={styles.cell}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                ...getStatusStyle(
                                  payment.status
                                ),
                              }}
                            >
                              {payment.status ||
                                "N/A"}
                            </span>
                          </td>

                          <td style={styles.cell}>
                            {formatDate(
                              payment.paidAt
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
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

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "25px",
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
    textAlign: "center",
    boxShadow:
      "0 4px 12px rgba(15, 23, 42, 0.06)",
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

  section: {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "14px",
    marginTop: "25px",
    boxShadow:
      "0 4px 12px rgba(15, 23, 42, 0.06)",
  },

  sectionTitle: {
    marginTop: "0",
    marginBottom: "20px",
    color: "#1e293b",
    fontSize: "21px",
  },

  form: {
    display: "grid",
    gap: "16px",
    maxWidth: "600px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#374151",
  },

  input: {
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "#ffffff",
  },

  helpText: {
    color: "#64748b",
    fontSize: "12px",
    wordBreak: "break-all",
  },

  submitButton: {
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "bold",
  },

  tableContainer: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1000px",
  },

  cell: {
    padding: "12px",
    border: "1px solid #e2e8f0",
    textAlign: "left",
    fontSize: "13px",
    verticalAlign: "top",
  },

  idText: {
    fontSize: "11px",
    color: "#475569",
    wordBreak: "break-all",
  },

  statusBadge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "bold",
  },

  loadingText: {
    color: "#64748b",
  },

  errorCard: {
    padding: "15px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    marginBottom: "20px",
  },
};