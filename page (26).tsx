"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id?: string;
  _id?: string;
  userId?: string;
  role?: string;
};

type Student = {
  id?: string;
  _id?: string;
  userId?: string;
  rollNo?: string;
  name?: string;
};

type Room = {
  id?: string;
  _id?: string;
  roomNo?: string | number;
  roomNumber?: string | number;
};

type Maintenance = {
  id?: string;
  _id?: string;
  roomId?: string | object;
  hostelId?: string | object;
  title: string;
  message: string;
  status: string;
  createdAt?: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (value.$oid) {
    return String(value.$oid);
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (value.id) {
    return getId(value.id);
  }

  if (value._id) {
    return getId(value._id);
  }

  return "";
}

function normalize(value: any): string {
  return getId(value).trim().toLowerCase();
}

function getArray(data: any, key: string): any[] {
  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

function formatDate(dateValue?: string): string {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleString();
}

function getStatusStyle(
  status: string
): React.CSSProperties {
  const normalized = status.toLowerCase();

  if (
    normalized === "resolved" ||
    normalized === "completed"
  ) {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled"
  ) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (
    normalized === "in progress" ||
    normalized === "processing"
  ) {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  return {
    background: "#dbeafe",
    color: "#1d4ed8",
  };
}

export default function StudentMaintenancePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenance, setMaintenance] =
    useState<Maintenance[]>([]);

  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      loadData(parsedUser);
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  async function loadData(currentUser: User) {
    try {
      setLoading(true);
      setError("");

      const loggedInUserId = normalize(
        currentUser.id ??
          currentUser._id ??
          currentUser.userId
      );

      if (!loggedInUserId) {
        throw new Error("Logged-in user ID not found");
      }

      /*
       * IMPORTANT:
       *
       * The maintenance API supports:
       *
       * /api/maintenance?userId=USER_ID
       *
       * It uses the user's bookings and room allocations
       * to determine which room belongs to the student.
       *
       * The old page called /api/maintenance without userId
       * and then tried to filter using studentId/userId fields
       * that are not stored in maintenance documents.
       */
      const maintenanceUrl =
        `/api/maintenance?userId=${encodeURIComponent(
          loggedInUserId
        )}`;

      const [
        studentsResponse,
        roomsResponse,
        maintenanceResponse,
      ] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/rooms"),
        fetch(maintenanceUrl),
      ]);

      const studentsData =
        await studentsResponse.json();

      const roomsData =
        await roomsResponse.json();

      const maintenanceData =
        await maintenanceResponse.json();

      if (
        !studentsResponse.ok ||
        !studentsData.success
      ) {
        throw new Error(
          "Failed to load student details"
        );
      }

      if (
        !roomsResponse.ok ||
        !roomsData.success
      ) {
        throw new Error("Failed to load rooms");
      }

      if (
        !maintenanceResponse.ok ||
        !maintenanceData.success
      ) {
        throw new Error(
          maintenanceData.error ||
            "Failed to load maintenance requests"
        );
      }

      const students: Student[] = getArray(
        studentsData,
        "students"
      );

      const matchedStudent = students.find(
        (item) => {
          const recordId = normalize(
            item.id ?? item._id
          );

          const studentUserId = normalize(
            item.userId
          );

          return (
            recordId === loggedInUserId ||
            studentUserId === loggedInUserId
          );
        }
      );

      if (!matchedStudent) {
        throw new Error(
          "Student record not found"
        );
      }

      setStudent(matchedStudent);

      setRooms(
        getArray(roomsData, "rooms")
      );

      /*
       * The API has already filtered the maintenance
       * records for this student's room.
       *
       * Therefore we must NOT filter again using
       * studentId/userId because those fields are not
       * part of the maintenance collection.
       */
      const maintenanceRecords: Maintenance[] =
        getArray(
          maintenanceData,
          "maintenance"
        );

      setMaintenance(maintenanceRecords);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load maintenance information"
      );
    } finally {
      setLoading(false);
    }
  }

  function getRoomName(roomIdValue: any): string {
    const selectedRoomId =
      normalize(roomIdValue);

    const room = rooms.find(
      (item) =>
        normalize(item.id ?? item._id) ===
        selectedRoomId
    );

    if (!room) {
      return "Room not available";
    }

    return `Room ${
      room.roomNumber ??
      room.roomNo ??
      "Not available"
    }`;
  }

  async function submitMaintenance(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user || !student) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      !roomId ||
      !title.trim() ||
      !message.trim()
    ) {
      setError(
        "Please fill in all fields."
      );
      return;
    }

    if (title.trim().length < 3) {
      setError(
        "Title must contain at least 3 characters."
      );
      return;
    }

    if (message.trim().length < 5) {
      setError(
        "Description must contain at least 5 characters."
      );
      return;
    }

    try {
      setSubmitting(true);

      const currentUserId = getId(
        user.id ??
          user._id ??
          user.userId
      );

      const currentStudentId = getId(
        student.id ?? student._id
      );

      if (!currentUserId) {
        throw new Error(
          "User ID not found"
        );
      }

      if (!currentStudentId) {
        throw new Error(
          "Student ID not found"
        );
      }

      const response = await fetch(
        "/api/maintenance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUserId,
            studentId: currentStudentId,
            roomId,
            title: title.trim(),
            message: message.trim(),
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to submit maintenance request"
        );
      }

      setSuccess(
        "Maintenance request submitted successfully."
      );

      setRoomId("");
      setTitle("");
      setMessage("");

      /*
       * Reload using the userId-filtered GET API.
       * This makes the newly created request appear
       * immediately in My Maintenance Requests.
       */
      await loadData(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Server connection failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button
          onClick={() =>
            router.push("/student-dashboard")
          }
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>

        <h1 style={styles.heading}>
          Maintenance Requests
        </h1>

        <p style={styles.subtitle}>
          Report maintenance problems in your
          assigned room.
        </p>

        {student && (
          <div style={styles.studentInfo}>
            <strong>Student:</strong>{" "}
            {student.rollNo ||
              student.name ||
              "Current Student"}
          </div>
        )}

        {error && (
          <p style={styles.error}>
            {error}
          </p>
        )}

        {success && (
          <p style={styles.success}>
            {success}
          </p>
        )}

        <section style={styles.card}>
          <h2 style={styles.cardHeading}>
            Submit Maintenance Request
          </h2>

          <form
            onSubmit={submitMaintenance}
          >
            <label style={styles.label}>
              Room
            </label>

            <select
              value={roomId}
              onChange={(event) =>
                setRoomId(event.target.value)
              }
              style={styles.input}
              required
            >
              <option value="">
                Select Room
              </option>

              {rooms.map((room) => {
                const currentRoomId =
                  getId(
                    room.id ?? room._id
                  );

                return (
                  <option
                    key={currentRoomId}
                    value={currentRoomId}
                  >
                    {`Room ${
                      room.roomNumber ??
                      room.roomNo ??
                      "Not available"
                    }`}
                  </option>
                );
              })}
            </select>

            <label style={styles.label}>
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Example: Fan not working"
              style={styles.input}
              maxLength={100}
              required
            />

            <label style={styles.label}>
              Description
            </label>

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Describe the maintenance problem"
              style={styles.textarea}
              rows={5}
              maxLength={500}
              required
            />

            <button
              type="submit"
              disabled={
                submitting || loading
              }
              style={{
                ...styles.submitButton,
                opacity:
                  submitting || loading
                    ? 0.7
                    : 1,
              }}
            >
              {submitting
                ? "Submitting..."
                : "Submit Request"}
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <div style={styles.historyHeader}>
            <h2 style={styles.cardHeading}>
              My Maintenance Requests
            </h2>

            <button
              onClick={() =>
                user && loadData(user)
              }
              disabled={loading}
              style={styles.refreshButton}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <p style={styles.infoText}>
              Loading requests...
            </p>
          ) : maintenance.length === 0 ? (
            <div style={styles.emptyBox}>
              <p>
                No maintenance requests found.
              </p>

              <p style={styles.smallText}>
                Your submitted requests will
                appear here.
              </p>
            </div>
          ) : (
            maintenance.map(
              (request, index) => {
                const requestId =
                  getId(
                    request.id ??
                      request._id
                  ) ||
                  `request-${index}`;

                return (
                  <div
                    key={requestId}
                    style={styles.request}
                  >
                    <div
                      style={
                        styles.requestHeader
                      }
                    >
                      <h3
                        style={
                          styles.requestTitle
                        }
                      >
                        {request.title}
                      </h3>

                      <span
                        style={{
                          ...styles.status,
                          ...getStatusStyle(
                            request.status ||
                              "Pending"
                          ),
                        }}
                      >
                        {request.status ||
                          "Pending"}
                      </span>
                    </div>

                    <p
                      style={styles.detail}
                    >
                      <strong>
                        Room:
                      </strong>{" "}
                      {getRoomName(
                        request.roomId
                      )}
                    </p>

                    <p
                      style={styles.detail}
                    >
                      <strong>
                        Description:
                      </strong>{" "}
                      {request.message}
                    </p>

                    {request.createdAt && (
                      <p
                        style={styles.detail}
                      >
                        <strong>
                          Created:
                        </strong>{" "}
                        {formatDate(
                          request.createdAt
                        )}
                      </p>
                    )}
                  </div>
                );
              }
            )
          )}
        </section>
      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    padding: "30px 16px",
  },

  container: {
    maxWidth: "850px",
    margin: "0 auto",
  },

  backButton: {
    border: "none",
    background: "#374151",
    color: "white",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    marginBottom: "20px",
  },

  heading: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "8px",
  },

  subtitle: {
    color: "#6b7280",
    marginBottom: "20px",
  },

  studentInfo: {
    background: "#e0f2fe",
    color: "#075985",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "10px",
    marginBottom: "25px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.08)",
  },

  cardHeading: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#1f2937",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  label: {
    display: "block",
    fontWeight: "600",
    marginTop: "15px",
    marginBottom: "6px",
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "white",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "15px",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  submitButton: {
    marginTop: "20px",
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  refreshButton: {
    background: "#0f766e",
    color: "white",
    border: "none",
    padding: "9px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  request: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "15px",
  },

  requestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },

  requestTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
  },

  detail: {
    color: "#4b5563",
    lineHeight: 1.5,
    marginTop: "10px",
  },

  status: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  infoText: {
    color: "#6b7280",
  },

  emptyBox: {
    padding: "20px",
    textAlign: "center",
    background: "#f8fafc",
    borderRadius: "8px",
    color: "#475569",
  },

  smallText: {
    fontSize: "14px",
    color: "#64748b",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "15px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "15px",
  },
};