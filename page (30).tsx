
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id?: string;
  _id?: string;
  roomNo?: number | string;
  capacity?: number;
  floor?: number;
  occupied?: number;
  status?: string;
};

type Booking = {
  id?: string;
  _id?: string;
  roomId?: string;
  status?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function StudentRoomsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [amount, setAmount] = useState("0");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getId(item: Room | Booking): string {
    return String(item.id ?? item._id ?? "");
  }

  async function loadRooms(currentUser: User) {
    try {
      setLoading(true);
      setError("");

      const [roomsResponse, bookingsResponse] = await Promise.all([
        fetch("/api/rooms"),
        fetch(`/api/bookings?userId=${encodeURIComponent(currentUser.id)}`),
      ]);

      const roomsData = await roomsResponse.json();
      const bookingsData = await bookingsResponse.json();

      if (!roomsResponse.ok || !roomsData.success) {
        throw new Error(roomsData.message ?? "Failed to load rooms");
      }

      if (!bookingsResponse.ok || !bookingsData.success) {
        throw new Error(
          bookingsData.message ?? "Failed to load bookings"
        );
      }

      setRooms(roomsData.rooms ?? []);
      setBookings(bookingsData.bookings ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load room information");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User = JSON.parse(storedUser);

      if (parsedUser.role !== "student") {
        router.push("/login");
        return;
      }

      setUser(parsedUser);
      loadRooms(parsedUser);
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  function openBookingForm(room: Room) {
    setSelectedRoom(room);
    setCheckIn("");
    setCheckOut("");
    setAmount("0");
    setMessage("");
    setError("");
  }

  function closeBookingForm() {
    setSelectedRoom(null);
    setCheckIn("");
    setCheckOut("");
    setAmount("0");
  }

  async function submitBooking() {
    if (!user || !selectedRoom) return;

    const roomId = getId(selectedRoom);

    if (!roomId || !checkIn || !checkOut) {
      setError("Please select the room and both dates.");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          roomId,
          amount: Number(amount),
          checkIn,
          checkOut,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Booking request failed");
      }

      setMessage("Booking request submitted successfully.");
      closeBookingForm();

      await loadRooms(user);
    } catch (err: any) {
      setError(err.message ?? "Failed to submit booking request");
    } finally {
      setSubmitting(false);
    }
  }

  const availableRooms = rooms.filter((room) => {
    const capacity = Number(room.capacity ?? 0);
    const occupied = Number(room.occupied ?? 0);

    return (
      capacity > occupied &&
      String(room.status ?? "Available").toLowerCase() !==
        "maintenance"
    );
  });

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Student Room Management</h1>
          <p style={styles.subtitle}>
            View available rooms and submit booking requests.
          </p>
        </div>

        <button
          style={styles.backButton}
          onClick={() => router.push("/student-dashboard")}
        >
          Back to Dashboard
        </button>
      </header>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.info}>Loading rooms...</div>
      ) : availableRooms.length === 0 ? (
        <div style={styles.info}>No available rooms found.</div>
      ) : (
        <section style={styles.grid}>
          {availableRooms.map((room) => {
            const roomId = getId(room);
            const capacity = Number(room.capacity ?? 0);
            const occupied = Number(room.occupied ?? 0);
            const remaining = Math.max(capacity - occupied, 0);

            const existingBooking = bookings.some(
              (booking) =>
                String(booking.roomId ?? "") === roomId &&
                ["pending", "booked"].includes(
                  String(booking.status ?? "").toLowerCase()
                )
            );

            return (
              <article key={roomId} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.roomTitle}>
                    Room {room.roomNo ?? "N/A"}
                  </h2>

                  <span style={styles.availableBadge}>
                    Available
                  </span>
                </div>

                <div style={styles.details}>
                  <p>
                    <strong>Floor:</strong> {room.floor ?? "N/A"}
                  </p>

                  <p>
                    <strong>Capacity:</strong> {capacity}
                  </p>

                  <p>
                    <strong>Occupied:</strong> {occupied}
                  </p>

                  <p>
                    <strong>Available Beds:</strong> {remaining}
                  </p>
                </div>

                <button
                  style={{
                    ...styles.bookButton,
                    ...(existingBooking
                      ? styles.disabledButton
                      : {}),
                  }}
                  disabled={existingBooking}
                  onClick={() => openBookingForm(room)}
                >
                  {existingBooking
                    ? "Request Already Submitted"
                    : "Request Room"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {selectedRoom && (
        <div style={styles.overlay}>
          <section style={styles.modal}>
            <h2 style={styles.modalTitle}>
              Request Room {selectedRoom.roomNo ?? "N/A"}
            </h2>

            <label style={styles.label}>Check-in Date</label>
            <input
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Check-out Date</label>
            <input
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              style={styles.input}
            />

            <label style={styles.label}>Booking Amount</label>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              style={styles.input}
            />

            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={closeBookingForm}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                style={styles.bookButton}
                onClick={submitBooking}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f4f7fb",
    color: "#172033",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "28px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 700,
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b",
  },

  backButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    background: "#334155",
    color: "white",
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "white",
    borderRadius: "14px",
    padding: "22px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  roomTitle: {
    margin: 0,
    fontSize: "22px",
  },

  availableBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
  },

  details: {
    margin: "18px 0",
    lineHeight: 1.8,
    color: "#475569",
  },

  bookButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },

  disabledButton: {
    background: "#94a3b8",
    cursor: "not-allowed",
  },

  info: {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "18px",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: "460px",
    background: "white",
    borderRadius: "14px",
    padding: "26px",
  },

  modalTitle: {
    marginTop: 0,
    marginBottom: "22px",
  },

  label: {
    display: "block",
    marginTop: "14px",
    marginBottom: "6px",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
  },

  cancelButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    background: "#e2e8f0",
    color: "#334155",
    cursor: "pointer",
  },
};