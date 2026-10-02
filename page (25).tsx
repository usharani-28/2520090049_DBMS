"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Student = {
  id?: string;
  _id?: string;
  userId?: string;
  rollNo?: string;
  name?: string;
  department?: string;
};

type LeaveRequest = {
  id?: string;
  _id?: string;
  studentId?: string | object;
  userId?: string | object;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value.$oid) return String(value.$oid);

  if (value.id) return getId(value.id);
  if (value._id) return getId(value._id);

  return "";
}

function normalize(value: any): string {
  return getId(value).trim().toLowerCase();
}

function getStatusStyle(status: string): React.CSSProperties {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === "approved" ||
    normalizedStatus === "completed"
  ) {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "cancelled"
  ) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  if (
    normalizedStatus === "processing" ||
    normalizedStatus === "in progress"
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

function formatDate(dateValue: string): string {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString();
}

function formatDateTime(dateValue: string): string {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleString();
}

function getArray(data: any, key: string): any[] {
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data)) return data;
  return [];
}

export default function StudentLeaveRequestsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User = JSON.parse(savedUser);

      if (parsedUser.role !== "student") {
        router.push("/admin-dashboard");
        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    loadStudentAndRequests(user);
  }, [user]);

  async function loadStudentAndRequests(currentUser: User) {
    try {
      setLoading(true);
      setError("");

      const loggedInUserId = normalize(
        currentUser.id ?? currentUser._id ?? currentUser.userId
      );

      if (!loggedInUserId) {
        throw new Error("Logged-in user ID is missing");
      }

      const studentsResponse = await fetch("/api/students");
      const studentsData = await studentsResponse.json();

      if (!studentsResponse.ok || !studentsData.success) {
        throw new Error("Failed to load student details");
      }

      const students: Student[] = getArray(
        studentsData,
        "students"
      );

      const matchedStudent = students.find((item) => {
        const studentUserId = normalize(item.userId);
        const recordId = normalize(item.id ?? item._id);

        return (
          studentUserId === loggedInUserId ||
          recordId === loggedInUserId
        );
      });

      if (!matchedStudent) {
        throw new Error("Student record not found");
      }

      setStudent(matchedStudent);

      await loadLeaveRequests(
        loggedInUserId,
        normalize(matchedStudent.id ?? matchedStudent._id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load leave requests"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaveRequests(
    loggedInUserId: string,
    currentStudentId: string
  ) {
    const response = await fetch("/api/leave-requests");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Failed to load leave requests"
      );
    }

    const allRequests: LeaveRequest[] = getArray(
      data,
      "leaveRequests"
    );

    const filteredRequests = allRequests.filter((request) => {
      const requestStudentId = normalize(request.studentId);
      const requestUserId = normalize(request.userId);

      return (
        requestStudentId === currentStudentId ||
        requestStudentId === loggedInUserId ||
        requestUserId === loggedInUserId
      );
    });

    setLeaveRequests(filteredRequests);
  }

  async function refreshRequests() {
    if (!user || !student) return;

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const loggedInUserId = normalize(
        user.id ?? user._id ?? user.userId
      );

      const currentStudentId = normalize(
        student.id ?? student._id
      );

      await loadLeaveRequests(
        loggedInUserId,
        currentStudentId
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh requests"
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitLeaveRequest(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!student) {
      setError("Student details are not available");
      return;
    }

    if (!startDate || !endDate || !reason.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("End date must be after or equal to start date");
      return;
    }

    if (reason.trim().length < 5) {
      setError("Please enter a detailed reason");
      return;
    }

    try {
      setSubmitting(true);

      const currentStudentId = getId(
        student.id ?? student._id
      );

      const currentUserId = getId(
        user?.id ?? user?._id ?? user?.userId
      );

      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: currentStudentId,
          userId: currentUserId,
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to submit leave request"
        );
      }

      setSuccess("Leave request submitted successfully!");

      setStartDate("");
      setEndDate("");
      setReason("");

      await loadLeaveRequests(
        normalize(currentUserId),
        normalize(currentStudentId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit leave request"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div style={styles.center}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button
          onClick={() => router.push("/student-dashboard")}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.heading}>My Leave Requests</h1>

            <p style={styles.subtitle}>
              Submit and track your leave applications
            </p>
          </div>

          <button
            onClick={refreshRequests}
            disabled={loading}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </div>

        {student && (
          <section style={styles.studentInfo}>
            <strong>Student:</strong>{" "}
            {student.rollNo || student.name || "Student"}

            {student.department && (
              <>
                {" | "}
                <strong>Department:</strong>{" "}
                {student.department}
              </>
            )}
          </section>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {success && <p style={styles.success}>{success}</p>}

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Submit Leave Request
          </h2>

          <form onSubmit={submitLeaveRequest}>
            <label style={styles.label}>Start Date</label>

            <input
              type="date"
              value={startDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              required
              style={styles.input}
            />

            <label style={styles.label}>End Date</label>

            <input
              type="date"
              value={endDate}
              min={
                startDate ||
                new Date().toISOString().split("T")[0]
              }
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              required
              style={styles.input}
            />

            <label style={styles.label}>Reason</label>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Enter your leave reason"
              required
              rows={5}
              maxLength={500}
              style={styles.textarea}
            />

            <button
              type="submit"
              disabled={submitting || loading}
              style={{
                ...styles.submitButton,
                opacity: submitting || loading ? 0.7 : 1,
              }}
            >
              {submitting
                ? "Submitting..."
                : "Submit Leave Request"}
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Leave Request History
          </h2>

          {loading ? (
            <p style={styles.infoText}>
              Loading leave requests...
            </p>
          ) : leaveRequests.length === 0 ? (
            <div style={styles.emptyBox}>
              <p>No leave requests found.</p>

              <p style={styles.smallText}>
                Your submitted requests will appear here.
              </p>
            </div>
          ) : (
            <div>
              {leaveRequests.map((request, index) => {
                const requestId =
                  getId(request.id ?? request._id) ||
                  `leave-${index}`;

                const displayId = `LEAVE-${String(
                  index + 1
                ).padStart(3, "0")}`;

                return (
                  <div
                    key={requestId}
                    style={styles.request}
                  >
                    <div style={styles.requestHeader}>
                      <div>
                        <h3 style={styles.requestTitle}>
                          Leave Request
                        </h3>

                        <p style={styles.requestId}>
                          <strong>Request ID:</strong>{" "}
                          {displayId}
                        </p>
                      </div>

                      <span
                        style={{
                          ...styles.status,
                          ...getStatusStyle(
                            request.status || "Pending"
                          ),
                        }}
                      >
                        {request.status || "Pending"}
                      </span>
                    </div>

                    <p style={styles.detail}>
                      <strong>Student:</strong>{" "}
                      {student?.rollNo ||
                        student?.name ||
                        "Current Student"}
                    </p>

                    <p style={styles.detail}>
                      <strong>Start Date:</strong>{" "}
                      {formatDate(request.startDate)}
                    </p>

                    <p style={styles.detail}>
                      <strong>End Date:</strong>{" "}
                      {formatDate(request.endDate)}
                    </p>

                    <p style={styles.detail}>
                      <strong>Reason:</strong>{" "}
                      {request.reason}
                    </p>

                    <small style={styles.date}>
                      Created:{" "}
                      {formatDateTime(request.createdAt)}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "30px 16px",
    background: "#f4f7fb",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  backButton: {
    padding: "10px 16px",
    marginBottom: "20px",
    border: "none",
    borderRadius: "8px",
    background: "#334155",
    color: "white",
    cursor: "pointer",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  heading: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: 0,
  },

  subtitle: {
    color: "#64748b",
    marginTop: "8px",
  },

  studentInfo: {
    background: "#e0f2fe",
    color: "#075985",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  refreshButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#0f766e",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "14px",
    marginBottom: "25px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  },

  cardTitle: {
    fontSize: "22px",
    color: "#1e293b",
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginTop: "15px",
    marginBottom: "7px",
    fontWeight: "bold",
    color: "#334155",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "white",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  submitButton: {
    marginTop: "20px",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  error: {
    color: "#991b1b",
    background: "#fee2e2",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  success: {
    color: "#166534",
    background: "#dcfce7",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  request: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "18px",
    marginBottom: "15px",
  },

  requestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  requestTitle: {
    color: "#1e293b",
    fontSize: "18px",
    margin: 0,
  },

  requestId: {
    color: "#2563eb",
    fontSize: "13px",
    marginTop: "8px",
    marginBottom: 0,
  },

  status: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  detail: {
    color: "#475569",
    marginTop: "10px",
    lineHeight: 1.5,
  },

  date: {
    display: "block",
    color: "#64748b",
    marginTop: "12px",
  },

  infoText: {
    color: "#64748b",
  },

  emptyBox: {
    padding: "20px",
    textAlign: "center",
    background: "#f8fafc",
    borderRadius: "10px",
    color: "#475569",
  },

  smallText: {
    fontSize: "14px",
    color: "#64748b",
  },
};