"use client";

import { useEffect, useState } from "react";

type Complaint = {
  id?: string;
  _id?: string;
  studentId?: any;
  hostelId?: any;
  title?: string;
  message?: string;
  status?: string;
  createdAt?: string;
};

type Student = {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  email?: string;
  rollNo?: string;
};

type Hostel = {
  id?: string;
  _id?: string;
  name?: string;
  location?: string;
};

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  function getId(value: any): string {
    if (!value) return "";

    if (typeof value === "string") return value;

    if (value.$oid) return String(value.$oid);

    if (value.id) return getId(value.id);

    if (value._id) return getId(value._id);

    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }

    return String(value);
  }

  async function fetchComplaints() {
    try {
      setLoading(true);
      setError("");

      const [
        complaintsResponse,
        studentsResponse,
        hostelsResponse,
      ] = await Promise.all([
        fetch("/api/complaints"),
        fetch("/api/students"),
        fetch("/api/hostels"),
      ]);

      const complaintsData = await complaintsResponse.json();
      const studentsData = await studentsResponse.json();
      const hostelsData = await hostelsResponse.json();

      if (!complaintsResponse.ok || !complaintsData.success) {
        throw new Error(
          complaintsData.error || "Failed to load complaints"
        );
      }

      setComplaints(complaintsData.complaints || []);

      if (studentsResponse.ok && studentsData.success) {
        setStudents(studentsData.students || []);
      }

      if (hostelsResponse.ok && hostelsData.success) {
        setHostels(hostelsData.hostels || []);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComplaints();
  }, []);

  function getStudentName(studentId: any): string {
    const id = getId(studentId);

    const student = students.find(
      (item) => getId(item.id ?? item._id) === id
    );

    if (!student) return id || "N/A";

    return (
      student.name ||
      student.email ||
      student.rollNo ||
      "Student"
    );
  }

  function getHostelName(hostelId: any): string {
    const id = getId(hostelId);

    const hostel = hostels.find(
      (item) => getId(item.id ?? item._id) === id
    );

    if (!hostel) return id || "N/A";

    return hostel.name || hostel.location || "Hostel";
  }

  async function updateStatus(
    complaint: Complaint,
    status: string
  ) {
    const complaintId = getId(
      complaint.id ?? complaint._id
    );

    if (!complaintId) {
      alert("Complaint ID not found");
      return;
    }

    try {
      setUpdatingId(complaintId);

      const response = await fetch("/api/complaints", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          complaintId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update complaint"
        );
      }

      alert(`Complaint marked as ${status}`);

      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setUpdatingId("");
    }
  }

  function statusColor(status?: string) {
    if (status === "Resolved") return "#16a34a";
    if (status === "Rejected") return "#dc2626";
    if (status === "In Progress") return "#2563eb";

    return "#b45309";
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.heading}>
            Admin Complaints
          </h1>

          <p style={styles.subtitle}>
            View and manage student complaints.
          </p>
        </div>

        <button
          onClick={fetchComplaints}
          style={styles.refreshButton}
        >
          ↻ Refresh
        </button>
      </div>

      <section style={styles.summaryCard}>
        <h2 style={styles.summaryTitle}>
          Total Complaints: {complaints.length}
        </h2>

        <p style={styles.summaryText}>
          Review complaints and update their status.
        </p>
      </section>

      <section style={styles.card}>
        {loading && (
          <p style={styles.infoText}>
            Loading complaints...
          </p>
        )}

        {error && (
          <p style={styles.errorText}>
            {error}
          </p>
        )}

        {!loading && !error && complaints.length === 0 && (
          <p style={styles.infoText}>
            No complaints found.
          </p>
        )}

        {!loading && !error && complaints.length > 0 && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.cell}>
                    Complaint ID
                  </th>

                  <th style={styles.cell}>
                    Student
                  </th>

                  <th style={styles.cell}>
                    Hostel
                  </th>

                  <th style={styles.cell}>
                    Title
                  </th>

                  <th style={styles.cell}>
                    Message
                  </th>

                  <th style={styles.cell}>
                    Status
                  </th>

                  <th style={styles.cell}>
                    Created At
                  </th>

                  <th style={styles.cell}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {complaints.map((complaint, index) => {
                  const complaintId = getId(
                    complaint.id ?? complaint._id
                  );

                  const isUpdating =
                    updatingId === complaintId;

                  return (
                    <tr
                      key={complaintId || index}
                      style={styles.bodyRow}
                    >
                      <td style={styles.cell}>
                        {`COMPLAINT-${String(index + 1).padStart(
                          3,
                          "0"
                        )}`}
                      </td>

                      <td style={styles.cell}>
                        {getStudentName(
                          complaint.studentId
                        )}
                      </td>

                      <td style={styles.cell}>
                        {getHostelName(
                          complaint.hostelId
                        )}
                      </td>

                      <td style={styles.cell}>
                        {complaint.title || "N/A"}
                      </td>

                      <td style={styles.messageCell}>
                        {complaint.message || "N/A"}
                      </td>

                      <td
                        style={{
                          ...styles.cell,
                          color: statusColor(
                            complaint.status
                          ),
                          fontWeight: "bold",
                        }}
                      >
                        {complaint.status || "Pending"}
                      </td>

                      <td style={styles.cell}>
                        {complaint.createdAt
                          ? new Date(
                              complaint.createdAt
                            ).toLocaleString()
                          : "N/A"}
                      </td>

                      <td style={styles.cell}>
                        <div style={styles.actions}>
                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(
                                complaint,
                                "In Progress"
                              )
                            }
                            style={styles.progressButton}
                          >
                            {isUpdating
                              ? "Updating..."
                              : "In Progress"}
                          </button>

                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(
                                complaint,
                                "Resolved"
                              )
                            }
                            style={styles.resolveButton}
                          >
                            Resolve
                          </button>

                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(
                                complaint,
                                "Rejected"
                              )
                            }
                            style={styles.rejectButton}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    padding: "30px",
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap" as const,
  },

  heading: {
    margin: "0 0 8px",
    color: "#1f2937",
    fontSize: "30px",
  },

  subtitle: {
    margin: "0",
    color: "#6b7280",
  },

  refreshButton: {
    padding: "10px 18px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  summaryCard: {
    marginTop: "25px",
    padding: "22px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderRadius: "12px",
  },

  summaryTitle: {
    margin: "0 0 8px",
    fontSize: "22px",
  },

  summaryText: {
    margin: "0",
    fontSize: "14px",
  },

  card: {
    marginTop: "25px",
    padding: "24px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  tableWrapper: {
    overflowX: "auto" as const,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: "1100px",
  },

  headerRow: {
    backgroundColor: "#e5e7eb",
  },

  bodyRow: {
    backgroundColor: "#ffffff",
  },

  cell: {
    padding: "12px",
    border: "1px solid #d1d5db",
    textAlign: "left" as const,
    fontSize: "13px",
    verticalAlign: "top" as const,
  },

  messageCell: {
    padding: "12px",
    border: "1px solid #d1d5db",
    textAlign: "left" as const,
    fontSize: "13px",
    verticalAlign: "top" as const,
    maxWidth: "250px",
    whiteSpace: "normal" as const,
  },

  actions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    minWidth: "110px",
  },

  progressButton: {
    padding: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },

  resolveButton: {
    padding: "8px",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },

  rejectButton: {
    padding: "8px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },

  infoText: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  errorText: {
    color: "#dc2626",
    fontWeight: "bold",
  },
};