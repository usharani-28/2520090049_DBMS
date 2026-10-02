"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id?: string;
  _id?: string;
  userId?: any;
  rollNo?: string;
  department?: string;
  year?: string | number;
};

type Allocation = {
  id?: string;
  _id?: string;
  studentId?: any;
  roomId?: any;
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
};

type Room = {
  id?: string;
  _id?: string;
  hostelId?: any;
  roomNo?: string | number;
  floor?: string | number;
  capacity?: number;
  occupied?: number;
  status?: string;
};

type Hostel = {
  id?: string;
  _id?: string;
  name?: string;
  location?: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "number") return String(value);

  if (value.$oid) return String(value.$oid);

  if (value.id) return getId(value.id);

  if (value._id) return getId(value._id);

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

function normalize(value: any): string {
  return getId(value).trim().toLowerCase();
}

function getArray(data: any, keys: string[]): any[] {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data)) return data;

  return [];
}

function formatDate(date?: string): string {
  if (!date) return "Not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MyRoomPage() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [hostel, setHostel] = useState<Hostel | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadMyRoom() {
      try {
        setLoading(true);
        setMessage("");

        const savedUser = localStorage.getItem("user");

        if (!savedUser) {
          setMessage("Please login first");
          return;
        }

        const user = JSON.parse(savedUser);

        // Support different login object formats
        const loggedInUserId = normalize(
          user.id ?? user._id ?? user.userId
        );

        if (!loggedInUserId) {
          setMessage("Invalid login details");
          return;
        }

        const responses = await Promise.all([
          fetch("/api/students"),
          fetch("/api/room-allocations"),
          fetch("/api/rooms"),
          fetch("/api/hostels"),
        ]);

        if (responses.some((response) => !response.ok)) {
          setMessage("Failed to load room information");
          return;
        }

        const [
          studentsData,
          allocationsData,
          roomsData,
          hostelsData,
        ] = await Promise.all(
          responses.map((response) => response.json())
        );

        const students: Student[] = getArray(studentsData, [
          "students",
          "data",
          "records",
        ]);

        const allocations: Allocation[] = getArray(
          allocationsData,
          [
            "allocations",
            "roomAllocations",
            "data",
            "records",
          ]
        );

        const rooms: Room[] = getArray(roomsData, [
          "rooms",
          "data",
          "records",
        ]);

        const hostels: Hostel[] = getArray(hostelsData, [
          "hostels",
          "data",
          "records",
        ]);

        // Find the logged-in student's profile
        const loggedInStudent = students.find(
          (item) =>
            normalize(item.userId) === loggedInUserId
        );

        if (!loggedInStudent) {
          setMessage("Student profile not found");
          return;
        }

        setStudent(loggedInStudent);

        const studentRecordId = normalize(
          loggedInStudent.id ?? loggedInStudent._id
        );

        const studentUserId = normalize(
          loggedInStudent.userId
        );

        // Find approved or active allocations
        const matchingAllocations = allocations.filter(
          (item) => {
            const allocationStudentId = normalize(
              item.studentId
            );

            const status = String(
              item.status ?? ""
            ).toLowerCase();

            const isStudentMatch =
              allocationStudentId === studentRecordId ||
              allocationStudentId === studentUserId ||
              allocationStudentId === loggedInUserId;

            const isActive =
              status === "approved" ||
              status === "active";

            return isStudentMatch && isActive;
          }
        );

        if (matchingAllocations.length === 0) {
          setMessage(
            "No active room allocation found for your account"
          );
          return;
        }

        // Select the latest allocation
        const selectedAllocation = [
          ...matchingAllocations,
        ].sort((a, b) => {
          const dateA = new Date(
            a.createdAt ?? a.startDate ?? ""
          ).getTime();

          const dateB = new Date(
            b.createdAt ?? b.startDate ?? ""
          ).getTime();

          return dateB - dateA;
        })[0];

        // Find assigned room
        const assignedRoom = rooms.find(
          (item) =>
            normalize(item.id ?? item._id) ===
            normalize(selectedAllocation.roomId)
        );

        if (!assignedRoom) {
          setMessage("Assigned room details were not found");
          return;
        }

        // Find assigned hostel
        const assignedHostel = hostels.find(
          (item) =>
            normalize(item.id ?? item._id) ===
            normalize(assignedRoom.hostelId)
        );

        setAllocation(selectedAllocation);
        setRoom(assignedRoom);
        setHostel(assignedHostel ?? null);
      } catch (error) {
        console.error("My Room Error:", error);
        setMessage("Failed to load room details");
      } finally {
        setLoading(false);
      }
    }

    loadMyRoom();
  }, []);

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>🛏️</div>
          <h2>Loading My Room</h2>
          <p>Please wait...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <p style={styles.label}>STUDENT PORTAL</p>

          <h1 style={styles.heading}>My Room</h1>

          <p style={styles.subtitle}>
            View your current hostel room allocation.
          </p>
        </div>

        <button
          style={styles.backButton}
          onClick={() =>
            router.push("/student-dashboard")
          }
        >
          ← Dashboard
        </button>
      </header>

      {message && !allocation && (
        <div style={styles.message}>⚠️ {message}</div>
      )}

      {allocation && room && (
        <>
          <section style={styles.heroCard}>
            <div style={styles.heroIcon}>🛏️</div>

            <div style={styles.heroContent}>
              <p style={styles.heroLabel}>
                ALLOCATED ROOM
              </p>

              <h2 style={styles.roomNumber}>
                Room {room.roomNo ?? "N/A"}
              </h2>

              <p style={styles.hostelName}>
                🏠{" "}
                {hostel?.name ??
                  "Hostel information unavailable"}
              </p>

              {hostel?.location && (
                <p style={styles.location}>
                  📍 {hostel.location}
                </p>
              )}
            </div>

            <span style={styles.statusBadge}>
              {allocation.status ?? "Active"}
            </span>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>
              Student Information
            </h2>

            <Detail
              label="Roll Number"
              value={student?.rollNo ?? "N/A"}
            />

            <Detail
              label="Department"
              value={student?.department ?? "N/A"}
            />

            <Detail
              label="Year"
              value={String(student?.year ?? "N/A")}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>
              Room Details
            </h2>

            <Detail
              label="Room Number"
              value={String(room.roomNo ?? "N/A")}
            />

            <Detail
              label="Floor"
              value={String(room.floor ?? "N/A")}
            />

            <Detail
              label="Capacity"
              value={
                room.capacity !== undefined
                  ? `${room.capacity} students`
                  : "N/A"
              }
            />

            <Detail
              label="Occupied"
              value={
                room.occupied !== undefined
                  ? `${room.occupied} students`
                  : "N/A"
              }
            />

            <Detail
              label="Start Date"
              value={formatDate(allocation.startDate)}
            />

            <Detail
              label="End Date"
              value={formatDate(allocation.endDate)}
            />

            <Detail
              label="Room Status"
              value={room.status ?? "N/A"}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>
              Allocation Information
            </h2>

            <Detail
              label="Allocation Status"
              value={allocation.status ?? "N/A"}
            />

            <Detail
              label="Allocation Date"
              value={formatDate(allocation.createdAt)}
            />
          </section>

          <section style={styles.noticeCard}>
            <h3 style={styles.noticeTitle}>
              Room Information
            </h3>

            <p style={styles.noticeText}>
              Your room details are based on your approved
              or active room allocation.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.detailRow}>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f4f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f7fb",
  },

  loadingCard: {
    background: "white",
    padding: "35px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
  },

  loadingIcon: {
    fontSize: "42px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "30px",
  },

  label: {
    margin: 0,
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "1px",
  },

  heading: {
    margin: "8px 0",
    fontSize: "32px",
    color: "#1e293b",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
  },

  backButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },

  heroCard: {
    maxWidth: "950px",
    display: "flex",
    alignItems: "center",
    gap: "22px",
    flexWrap: "wrap",
    background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
    color: "white",
    padding: "30px",
    borderRadius: "18px",
    marginBottom: "24px",
  },

  heroIcon: {
    fontSize: "42px",
    padding: "15px",
    borderRadius: "15px",
    background: "rgba(255,255,255,0.18)",
  },

  heroContent: {
    flex: 1,
    minWidth: "180px",
  },

  heroLabel: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.8,
  },

  roomNumber: {
    margin: "6px 0",
    fontSize: "30px",
  },

  hostelName: {
    margin: "6px 0",
  },

  location: {
    margin: 0,
    opacity: 0.85,
  },

  statusBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "9px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },

  card: {
    maxWidth: "950px",
    background: "white",
    padding: "28px",
    borderRadius: "16px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)",
    marginBottom: "24px",
  },

  cardTitle: {
    margin: "0 0 20px",
    fontSize: "22px",
    color: "#1e293b",
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    padding: "15px 0",
    borderBottom: "1px solid #e2e8f0",
    color: "#334155",
    wordBreak: "break-word",
  },

  message: {
    maxWidth: "950px",
    padding: "18px",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "10px",
  },

  noticeCard: {
    maxWidth: "950px",
    padding: "24px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
  },

  noticeTitle: {
    margin: "0 0 10px",
    color: "#1e40af",
  },

  noticeText: {
    margin: 0,
    color: "#1e3a8a",
    lineHeight: 1.6,
  },
};