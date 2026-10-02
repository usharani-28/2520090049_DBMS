"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LeaveRequest = {
  id?: string;
  _id?: string | { $oid?: string };
  studentId: string | { $oid?: string };
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
};

type Student = {
  id?: string;
  _id?: string | { $oid?: string };
  rollNo?: string;
  name?: string;
  userId?: string | { $oid?: string };
  department?: string;
  year?: number;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value.$oid) return String(value.$oid);

  if (value.id) return String(value.id);

  if (value._id) return getId(value._id);

  return String(value);
}

function getRequestId(request: LeaveRequest): string {
  return getId(request.id ?? request._id);
}

function formatDate(value: string): string {
  if (!value) return "Not available";

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

function statusStyle(status: string): React.CSSProperties {
  if (status === "Approved") {
    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "Rejected") {
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  };
}

function findStudent(
  studentId: string | { $oid?: string },
  students: Student[]
): Student | undefined {
  const id = getId(studentId);

  return students.find((student) => {
    const studentRecordId = getId(student.id ?? student._id);
    const studentUserId = getId(student.userId);

    return studentRecordId === id || studentUserId === id;
  });
}

function getStudentDisplay(
  studentId: string | { $oid?: string },
  students: Student[]
): string {
  const student = findStudent(studentId, students);

  if (!student) {
    return getId(studentId) || "Unknown Student";
  }

  if (student.name && student.rollNo) {
    return `${student.name} (${student.rollNo})`;
  }

  if (student.rollNo) {
    return student.rollNo;
  }

  if (student.name) {
    return student.name;
  }

  return getId(student.id ?? student._id) || "Unknown Student";
}

export default function AdminLeaveRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  async function fetchRequests() {
    try {
      setLoading(true);
      setError("");

      const [requestsResponse, studentsResponse] =
        await Promise.all([
          fetch("/api/leave-requests", {
            cache: "no-store",
          }),
          fetch("/api/students", {
            cache: "no-store",
          }),
        ]);

      const requestsData = await requestsResponse.json();
      const studentsData = await studentsResponse.json();

      if (!requestsResponse.ok || !requestsData.success) {
        throw new Error(
          requestsData.error || "Failed to fetch leave requests"
        );
      }

      if (!studentsResponse.ok || !studentsData.success) {
        throw new Error(
          studentsData.error || "Failed to fetch students"
        );
      }

      setRequests(requestsData.requests || []);
      setStudents(studentsData.students || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch leave requests"
      );
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
      const user = JSON.parse(storedUser);

      if (user.role !== "admin") {
        router.push("/student-dashboard");
        return;
      }

      fetchRequests();
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  async function updateStatus(
    request: LeaveRequest,
    status: "Approved" | "Rejected"
  ) {
    const requestId = getRequestId(request);

    if (!requestId) {
      setError("Request ID is missing");
      return;
    }

    const actionText = status === "Approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} this leave request?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(requestId);
      setError("");

      const response = await fetch("/api/leave-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update leave request"
        );
      }

      await fetchRequests();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update leave request"
      );
    } finally {
      setUpdatingId("");
    }
  }

  const pendingCount = requests.filter(
    (request) => request.status === "Pending"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "Approved"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "Rejected"
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        backgroundColor: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.push("/admin-dashboard")}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#374151",
            color: "white",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#111827",
              }}
            >
              Leave Requests
            </h1>

            <p style={{ color: "#6b7280" }}>
              Review and manage student leave requests
            </p>
          </div>

          <button
            onClick={fetchRequests}
            disabled={loading}
            style={{
              padding: "11px 18px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px",
            marginTop: "25px",
            marginBottom: "25px",
          }}
        >
          <div style={cardStyle}>
            <p style={cardLabelStyle}>Total Requests</p>
            <h2 style={cardNumberStyle}>{requests.length}</h2>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Pending</p>
            <h2 style={{ ...cardNumberStyle, color: "#d97706" }}>
              {pendingCount}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Approved</p>
            <h2 style={{ ...cardNumberStyle, color: "#16a34a" }}>
              {approvedCount}
            </h2>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Rejected</p>
            <h2 style={{ ...cardNumberStyle, color: "#dc2626" }}>
              {rejectedCount}
            </h2>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "8px",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        {loading && <p>Loading leave requests...</p>}

        {!loading && requests.length === 0 && (
          <div style={emptyStyle}>
            No leave requests found.
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div
            style={{
              overflowX: "auto",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "1200px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#1f2937",
                    color: "white",
                  }}
                >
                  <th style={cellStyle}>Request ID</th>
                  <th style={cellStyle}>Student</th>
                  <th style={cellStyle}>Start Date</th>
                  <th style={cellStyle}>End Date</th>
                  <th style={cellStyle}>Reason</th>
                  <th style={cellStyle}>Status</th>
                  <th style={cellStyle}>Created At</th>
                  <th style={cellStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request, index) => {
                  const requestId = getRequestId(request);
                  const isUpdating = updatingId === requestId;

                  return (
                    <tr
                      key={requestId || index}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <td style={cellStyle}>
                        {requestId || "Missing ID"}
                      </td>

                      <td style={cellStyle}>
                        {getStudentDisplay(
                          request.studentId,
                          students
                        )}
                      </td>

                      <td style={cellStyle}>
                        {formatDate(request.startDate)}
                      </td>

                      <td style={cellStyle}>
                        {formatDate(request.endDate)}
                      </td>

                      <td style={cellStyle}>
                        {request.reason || "No reason"}
                      </td>

                      <td style={cellStyle}>
                        <span
                          style={{
                            ...statusStyle(request.status),
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontWeight: "bold",
                            fontSize: "13px",
                          }}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td style={cellStyle}>
                        {formatDate(request.createdAt)}
                      </td>

                      <td style={cellStyle}>
                        {request.status === "Pending" ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                            }}
                          >
                            <button
                              disabled={isUpdating || !requestId}
                              onClick={() =>
                                updateStatus(request, "Approved")
                              }
                              style={{
                                ...actionButtonStyle,
                                backgroundColor: "#16a34a",
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                            >
                              {isUpdating ? "Updating..." : "Approve"}
                            </button>

                            <button
                              disabled={isUpdating || !requestId}
                              onClick={() =>
                                updateStatus(request, "Rejected")
                              }
                              style={{
                                ...actionButtonStyle,
                                backgroundColor: "#dc2626",
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                            >
                              {isUpdating ? "Updating..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              color: "#6b7280",
                              fontWeight: "bold",
                            }}
                          >
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  verticalAlign: "top",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const cardLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const cardNumberStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: "30px",
  color: "#111827",
};

const actionButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  padding: "30px",
  backgroundColor: "white",
  borderRadius: "10px",
  textAlign: "center",
  color: "#6b7280",
};