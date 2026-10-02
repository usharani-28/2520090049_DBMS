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
  userId?: any;
  rollNo?: string;
  department?: string;
};

type Complaint = {
  id?: string;
  _id?: string;
  studentId?: any;
  hostelId?: any;
  title: string;
  message: string;
  status: string;
  createdAt: string;
};

type Hostel = {
  id?: string;
  _id?: string;
  name: string;
  location?: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
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

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

function getArray(data: any, keys: string[]): any[] {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

function getStatusStyle(
  status: string
): React.CSSProperties {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === "resolved" ||
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
    normalizedStatus === "in progress" ||
    normalizedStatus === "processing"
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

function formatDate(date?: string): string {
  if (!date) {
    return "Not available";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("en-IN");
}

export default function StudentComplaintsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] =
    useState<Student | null>(null);

  const [complaints, setComplaints] =
    useState<Complaint[]>([]);

  const [hostels, setHostels] =
    useState<Hostel[]>([]);

  const [hostelId, setHostelId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser: User =
        JSON.parse(savedUser);

      if (parsedUser.role !== "student") {
        router.push("/login");
        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadData(user);
  }, [user]);

  async function loadData(
    currentUser: User
  ) {
    try {
      setLoading(true);
      setError("");

      const currentUserId = getId(
        currentUser.id ??
          currentUser._id ??
          currentUser.userId
      );

      if (!currentUserId) {
        throw new Error(
          "Invalid user information"
        );
      }

      /*
       * IMPORTANT:
       * The complaints API already filters
       * complaints using the logged-in user's ID.
       */
      const responses = await Promise.all([
        fetch("/api/students"),
        fetch(
          `/api/complaints?userId=${encodeURIComponent(
            currentUserId
          )}`
        ),
        fetch("/api/hostels"),
      ]);

      if (
        responses.some(
          (response) => !response.ok
        )
      ) {
        throw new Error(
          "Failed to load complaint information"
        );
      }

      const [
        studentsData,
        complaintsData,
        hostelsData,
      ] = await Promise.all(
        responses.map(
          (response) => response.json()
        )
      );

      const students: Student[] =
        getArray(studentsData, [
          "students",
          "data",
          "records",
        ]);

      const myComplaints: Complaint[] =
        getArray(complaintsData, [
          "complaints",
          "data",
          "records",
        ]);

      const allHostels: Hostel[] =
        getArray(hostelsData, [
          "hostels",
          "data",
          "records",
        ]);

      const loggedInStudent =
        students.find(
          (item) =>
            getId(item.userId) ===
            currentUserId
        );

      if (!loggedInStudent) {
        setStudent(null);
        setHostels(allHostels);
        setComplaints([]);
        setError(
          "Student profile not found"
        );
        return;
      }

      setStudent(loggedInStudent);
      setHostels(allHostels);

      /*
       * No additional complaint filtering is
       * required here because the API already
       * returned only this student's complaints.
       */
      setComplaints(myComplaints);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load complaints"
      );
    } finally {
      setLoading(false);
    }
  }

  function getHostelName(
    hostelIdValue: any
  ): string {
    if (!hostelIdValue) {
      return "Not specified";
    }

    const selectedHostelId =
      getId(hostelIdValue);

    const hostel = hostels.find(
      (item) =>
        getId(item.id ?? item._id) ===
        selectedHostelId
    );

    return (
      hostel?.name ||
      "Hostel information unavailable"
    );
  }

  async function submitComplaint(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!user) {
      setError(
        "User information not found"
      );
      return;
    }

    const currentUserId = getId(
      user.id ??
        user._id ??
        user.userId
    );

    if (!currentUserId) {
      setError("Invalid user ID");
      return;
    }

    if (
      !hostelId ||
      !title.trim() ||
      !message.trim()
    ) {
      setError(
        "Please fill in all fields"
      );
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      /*
       * The API only needs the logged-in user,
       * hostel, title and message.
       *
       * The API itself:
       * - finds the student record
       * - gets studentId
       * - sets status = Pending
       * - creates createdAt
       */
      const response = await fetch(
        "/api/complaints",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: currentUserId,
            hostelId,
            title: title.trim(),
            message: message.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to submit complaint"
        );
      }

      setSuccess(
        "Complaint submitted successfully."
      );

      setHostelId("");
      setTitle("");
      setMessage("");

      /*
       * Reload using the logged-in user.
       * This calls:
       * /api/complaints?userId=...
       */
      await loadData(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit complaint"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshComplaints() {
    if (!user) {
      return;
    }

    setSuccess("");
    await loadData(user);
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
          style={styles.backButton}
          onClick={() =>
            router.push(
              "/student-dashboard"
            )
          }
        >
          ← Back to Dashboard
        </button>

        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.heading}>
              Student Complaints
            </h1>

            <p style={styles.subtitle}>
              Submit and track your hostel
              complaints
            </p>

            {student?.rollNo && (
              <p
                style={
                  styles.studentInfo
                }
              >
                Roll Number:{" "}
                {student.rollNo}
              </p>
            )}
          </div>

          <button
            style={styles.refreshButton}
            onClick={refreshComplaints}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Submit New Complaint
          </h2>

          <form
            onSubmit={submitComplaint}
          >
            <label style={styles.label}>
              Select Hostel
            </label>

            <select
              value={hostelId}
              onChange={(e) =>
                setHostelId(
                  e.target.value
                )
              }
              style={styles.input}
            >
              <option value="">
                Select hostel
              </option>

              {hostels.map(
                (hostel) => {
                  const id =
                    getId(hostel);

                  return (
                    <option
                      key={id}
                      value={id}
                    >
                      {hostel.name}
                    </option>
                  );
                }
              )}
            </select>

            <label style={styles.label}>
              Complaint Title
            </label>

            <input
              type="text"
              placeholder="Example: Fan not working"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              style={styles.input}
              maxLength={100}
            />

            <label style={styles.label}>
              Description
            </label>

            <textarea
              placeholder="Describe your complaint"
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              style={styles.textarea}
              rows={5}
              maxLength={1000}
            />

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitButton,
                opacity:
                  submitting
                    ? 0.7
                    : 1,
              }}
            >
              {submitting
                ? "Submitting..."
                : "Submit Complaint"}
            </button>
          </form>

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
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            My Complaints
          </h2>

          {loading ? (
            <p
              style={
                styles.infoText
              }
            >
              Loading complaints...
            </p>
          ) : complaints.length ===
            0 ? (
            <div
              style={
                styles.emptyBox
              }
            >
              <p>
                No complaints found.
              </p>

              <p
                style={
                  styles.smallText
                }
              >
                Your submitted
                complaints will
                appear here.
              </p>
            </div>
          ) : (
            <div>
              {complaints.map(
                (
                  complaint,
                  index
                ) => {
                  const complaintId =
                    getId(
                      complaint
                    ) ||
                    `complaint-${index}`;

                  return (
                    <div
                      key={
                        complaintId
                      }
                      style={
                        styles.complaint
                      }
                    >
                      <div
                        style={
                          styles.complaintHeader
                        }
                      >
                        <h3
                          style={
                            styles.complaintTitle
                          }
                        >
                          {
                            complaint.title
                          }
                        </h3>

                        <span
                          style={{
                            ...styles.status,
                            ...getStatusStyle(
                              complaint.status ||
                                "Pending"
                            ),
                          }}
                        >
                          {complaint.status ||
                            "Pending"}
                        </span>
                      </div>

                      <p
                        style={
                          styles.messageText
                        }
                      >
                        {
                          complaint.message
                        }
                      </p>

                      <p
                        style={
                          styles.detail
                        }
                      >
                        <strong>
                          Hostel:
                        </strong>{" "}
                        {getHostelName(
                          complaint.hostelId
                        )}
                      </p>

                      <p
                        style={
                          styles.detail
                        }
                      >
                        <strong>
                          Complaint ID:
                        </strong>{" "}
                        {complaintId}
                      </p>

                      <small
                        style={
                          styles.date
                        }
                      >
                        Created:{" "}
                        {formatDate(
                          complaint.createdAt
                        )}
                      </small>
                    </div>
                  );
                }
              )}
            </div>
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
    background: "#f4f7fb",
    padding: "30px 16px",
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
    border: "none",
    borderRadius: "8px",
    background: "#334155",
    color: "white",
    cursor: "pointer",
    marginBottom: "20px",
  },

  headerRow: {
    display: "flex",
    justifyContent:
      "space-between",
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
    color: "#2563eb",
    fontWeight: "bold",
    marginTop: "8px",
  },

  refreshButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#0f766e",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "14px",
    marginBottom: "25px",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.08)",
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
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "white",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    border:
      "1px solid #cbd5e1",
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
    color: "#dc2626",
    marginTop: "15px",
    background: "#fee2e2",
    padding: "10px",
    borderRadius: "8px",
  },

  success: {
    color: "#166534",
    marginTop: "15px",
    background: "#dcfce7",
    padding: "10px",
    borderRadius: "8px",
  },

  complaint: {
    border:
      "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "15px",
  },

  complaintHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },

  complaintTitle: {
    color: "#1e293b",
    margin: 0,
    fontSize: "18px",
  },

  messageText: {
    color: "#475569",
    lineHeight: 1.6,
    marginTop: "12px",
  },

  detail: {
    color: "#475569",
    marginTop: "8px",
    fontSize: "14px",
  },

  status: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
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