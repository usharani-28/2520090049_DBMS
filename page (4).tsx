"use client";

import { useEffect, useState } from "react";

type Maintenance = {
  id?: string;
  _id?: string;
  roomId?: any;
  hostelId?: any;
  title?: string;
  message?: string;
  status?: string;
  createdAt?: string;
};

type Room = {
  id?: string;
  _id?: string;
  roomNumber?: string | number;
  number?: string | number;
  hostelId?: any;
};

type Hostel = {
  id?: string;
  _id?: string;
  name?: string;
  location?: string;
};

export default function AdminMaintenancePage() {
  const [requests, setRequests] = useState<Maintenance[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  function getId(value: any): string {
    if (!value) return "";

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    if (value.$oid) return String(value.$oid);

    if (value.id) return getId(value.id);

    if (value._id) return getId(value._id);

    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }

    return String(value);
  }

  async function fetchRequests() {
    try {
      setLoading(true);
      setError("");

      const [
        maintenanceResponse,
        roomsResponse,
        hostelsResponse,
      ] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/rooms"),
        fetch("/api/hostels"),
      ]);

      const maintenanceData = await maintenanceResponse.json();
      const roomsData = await roomsResponse.json();
      const hostelsData = await hostelsResponse.json();

      if (!maintenanceResponse.ok || !maintenanceData.success) {
        throw new Error(
          maintenanceData.error ||
            "Failed to load maintenance requests"
        );
      }

      setRequests(
        maintenanceData.maintenance ||
          maintenanceData.requests ||
          []
      );

      if (roomsResponse.ok && roomsData.success) {
        setRooms(roomsData.rooms || []);
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
    fetchRequests();
  }, []);

  function getRoomName(roomId: any): string {
    const id = getId(roomId);

    const room = rooms.find(
      (item) => getId(item.id ?? item._id) === id
    );

    if (!room) return id || "N/A";

    return String(
      room.roomNumber ?? room.number ?? id
    );
  }

  function getHostelName(hostelId: any): string {
    const id = getId(hostelId);

    const hostel = hostels.find(
      (item) => getId(item.id ?? item._id) === id
    );

    if (!hostel) return id || "N/A";

    return hostel.name || hostel.location || id;
  }

  async function updateStatus(
    request: Maintenance,
    status: string
  ) {
    const requestId = getId(request.id ?? request._id);

    if (!requestId) {
      alert("Maintenance request ID not found");
      return;
    }

    try {
      setUpdatingId(requestId);

      const response = await fetch("/api/maintenance", {
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
          data.error || "Failed to update request"
        );
      }

      alert(`Maintenance request marked as ${status}`);

      await fetchRequests();
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
            Admin Maintenance
          </h1>

          <p style={styles.subtitle}>
            View and manage student maintenance requests.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          style={styles.refreshButton}
        >
          ↻ Refresh
        </button>
      </div>

      <section style={styles.summaryCard}>
        <h2 style={styles.summaryTitle}>
          Total Requests: {requests.length}
        </h2>

        <p style={styles.summaryText}>
          Review maintenance requests and update their status.
        </p>
      </section>

      <section style={styles.card}>
        {loading && (
          <p style={styles.infoText}>
            Loading maintenance requests...
          </p>
        )}

        {error && (
          <p style={styles.errorText}>
            {error}
          </p>
        )}

        {!loading && !error && requests.length === 0 && (
          <p style={styles.infoText}>
            No maintenance requests found.
          </p>
        )}

        {!loading && !error && requests.length > 0 && (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.cell}>Request ID</th>
                  <th style={styles.cell}>Room</th>
                  <th style={styles.cell}>Hostel</th>
                  <th style={styles.cell}>Title</th>
                  <th style={styles.cell}>Message</th>
                  <th style={styles.cell}>Status</th>
                  <th style={styles.cell}>Created At</th>
                  <th style={styles.cell}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request, index) => {
                  const requestId = getId(
                    request.id ?? request._id
                  );

                  const displayId = `MAINTENANCE-${String(
                    index + 1
                  ).padStart(3, "0")}`;

                  const isUpdating =
                    updatingId === requestId;

                  return (
                    <tr
                      key={requestId || index}
                      style={styles.bodyRow}
                    >
                      <td style={styles.cell}>
                        {displayId}
                      </td>

                      <td style={styles.cell}>
                        {getRoomName(request.roomId)}
                      </td>

                      <td style={styles.cell}>
                        {getHostelName(request.hostelId)}
                      </td>

                      <td style={styles.cell}>
                        {request.title || "N/A"}
                      </td>

                      <td style={styles.messageCell}>
                        {request.message || "N/A"}
                      </td>

                      <td
                        style={{
                          ...styles.cell,
                          color: statusColor(request.status),
                          fontWeight: "bold",
                        }}
                      >
                        {request.status || "Pending"}
                      </td>

                      <td style={styles.cell}>
                        {request.createdAt
                          ? new Date(
                              request.createdAt
                            ).toLocaleString()
                          : "N/A"}
                      </td>

                      <td style={styles.cell}>
                        <div style={styles.actions}>
                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(
                                request,
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
                                request,
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
                                request,
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
    minWidth: "1100px",
    borderCollapse: "collapse" as const,
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