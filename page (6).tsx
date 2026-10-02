"use client";

import { useEffect, useState } from "react";

type Student = {
  id?: string;
  _id?: string | { $oid?: string };
  rollNo?: string;
  name?: string;
  userId?: string | { $oid?: string };
};

type Room = {
  id?: string;
  _id?: string | { $oid?: string };
  roomNo?: string;
  roomNumber?: string;
  capacity?: number;
  status?: string;
};

type Allocation = {
  id?: string;
  _id?: string | { $oid?: string };
  studentId: string | { $oid?: string };
  roomId: string | { $oid?: string };
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
};

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
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

function datesOverlap(
  startDate1: string,
  endDate1: string,
  startDate2: string,
  endDate2: string
): boolean {
  return startDate1 <= endDate2 && startDate2 <= endDate1;
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "Approved" || status === "Active") {
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

export default function RoomAllocationsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const [form, setForm] = useState({
    studentId: "",
    roomId: "",
    startDate: "",
    endDate: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const [
        allocationResponse,
        studentResponse,
        roomResponse,
      ] = await Promise.all([
        fetch("/api/room-allocations", {
          cache: "no-store",
        }),
        fetch("/api/students", {
          cache: "no-store",
        }),
        fetch("/api/rooms", {
          cache: "no-store",
        }),
      ]);

      const allocationData = await allocationResponse.json();
      const studentData = await studentResponse.json();
      const roomData = await roomResponse.json();

      if (!allocationResponse.ok || !allocationData.success) {
        throw new Error(
          allocationData.error || "Failed to load allocations"
        );
      }

      if (!studentResponse.ok || !studentData.success) {
        throw new Error(
          studentData.error || "Failed to load students"
        );
      }

      if (!roomResponse.ok || !roomData.success) {
        throw new Error(
          roomData.error || "Failed to load rooms"
        );
      }

      setAllocations(allocationData.allocations || []);
      setStudents(studentData.students || []);
      setRooms(roomData.rooms || []);
    } catch (error) {
      console.error("Loading error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getStudent(studentId: string): Student | undefined {
    return students.find((student) => {
      const recordId = getId(student.id ?? student._id);
      const userId = getId(student.userId);

      return recordId === studentId || userId === studentId;
    });
  }

  function getStudentName(studentId: string): string {
    const student = getStudent(studentId);

    if (!student) {
      return studentId || "Unknown Student";
    }

    if (student.name && student.rollNo) {
      return `${student.name} (${student.rollNo})`;
    }

    return (
      student.rollNo ||
      student.name ||
      studentId ||
      "Unknown Student"
    );
  }

  function getRoom(roomId: string): Room | undefined {
    return rooms.find((room) => {
      return getId(room.id ?? room._id) === roomId;
    });
  }

  function getRoomName(roomId: string): string {
    const room = getRoom(roomId);

    return (
      room?.roomNo ||
      room?.roomNumber ||
      roomId ||
      "Unknown Room"
    );
  }

  function getRoomCapacity(roomId: string): number {
    const room = getRoom(roomId);

    return Number(room?.capacity || 0);
  }

  function getRoomOccupancy(
    roomId: string,
    selectedStartDate?: string,
    selectedEndDate?: string
  ): number {
    return allocations.filter((allocation) => {
      const sameRoom =
        getId(allocation.roomId) === roomId;

      const activeAllocation = [
        "Approved",
        "Active",
      ].includes(allocation.status);

      if (!sameRoom || !activeAllocation) {
        return false;
      }

      if (!selectedStartDate || !selectedEndDate) {
        return true;
      }

      return datesOverlap(
        selectedStartDate,
        selectedEndDate,
        allocation.startDate,
        allocation.endDate
      );
    }).length;
  }

  async function createAllocation(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    if (
      !form.studentId ||
      !form.roomId ||
      !form.startDate ||
      !form.endDate
    ) {
      setMessage("Please fill all fields");
      return;
    }

    if (form.startDate > form.endDate) {
      setMessage("Start date cannot be after end date");
      return;
    }

    const capacity = getRoomCapacity(form.roomId);

    const occupancy = getRoomOccupancy(
      form.roomId,
      form.startDate,
      form.endDate
    );

    if (capacity > 0 && occupancy >= capacity) {
      setMessage(
        "This room is full for the selected dates"
      );
      return;
    }

    try {
      const response = await fetch(
        "/api/room-allocations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.error || "Failed to create allocation"
        );
        return;
      }

      setMessage("Allocation created successfully");

      setForm({
        studentId: "",
        roomId: "",
        startDate: "",
        endDate: "",
      });

      await loadData();
    } catch (error) {
      console.error("Create allocation error:", error);
      setMessage("Something went wrong");
    }
  }

  async function updateStatus(
    allocationId: string,
    status: "Approved" | "Rejected"
  ) {
    if (!allocationId) {
      setMessage("Allocation ID is missing");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${status.toLowerCase()} this allocation?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(allocationId);
      setMessage("");

      const response = await fetch(
        "/api/room-allocations",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            allocationId,
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.error || "Failed to update status"
        );
        return;
      }

      setMessage(
        `Allocation ${status.toLowerCase()} successfully`
      );

      await loadData();
    } catch (error) {
      console.error("Update status error:", error);
      setMessage("Failed to update allocation");
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteAllocation(
    allocationId: string
  ) {
    if (!allocationId) {
      setMessage("Allocation ID is missing");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this allocation?"
    );

    if (!confirmed) return;

    try {
      setUpdatingId(allocationId);
      setMessage("");

      const response = await fetch(
        "/api/room-allocations",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            allocationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.error || "Failed to delete allocation"
        );
        return;
      }

      setMessage("Allocation deleted successfully");

      await loadData();
    } catch (error) {
      console.error("Delete allocation error:", error);
      setMessage("Failed to delete allocation");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        maxWidth: "1500px",
        margin: "auto",
        backgroundColor: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "#111827" }}>
        Room Allocation Management
      </h1>

      <button
        onClick={loadData}
        disabled={loading}
        style={buttonStyle}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>

      {message && (
        <p
          style={{
            padding: "12px",
            backgroundColor: "#f1f5f9",
            borderRadius: "8px",
            marginTop: "15px",
          }}
        >
          {message}
        </p>
      )}

      <section style={sectionStyle}>
        <h2>Create Room Allocation</h2>

        <form
          onSubmit={createAllocation}
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginTop: "15px",
          }}
        >
          <select
            required
            value={form.studentId}
            onChange={(event) =>
              setForm({
                ...form,
                studentId: event.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">Select Student</option>

            {students.map((student, index) => {
              const studentId = getId(
                student.id ?? student._id
              );

              return (
                <option
                  key={`${studentId}-${index}`}
                  value={studentId}
                >
                  {student.rollNo ||
                    student.name ||
                    studentId}
                </option>
              );
            })}
          </select>

          <select
            required
            value={form.roomId}
            onChange={(event) =>
              setForm({
                ...form,
                roomId: event.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">Select Room</option>

            {rooms.map((room, index) => {
              const roomId = getId(
                room.id ?? room._id
              );

              const occupancy = getRoomOccupancy(
                roomId,
                form.startDate,
                form.endDate
              );

              const capacity = Number(room.capacity || 0);

              return (
                <option
                  key={`${roomId}-${index}`}
                  value={roomId}
                >
                  Room{" "}
                  {room.roomNo || room.roomNumber}{" "}
                  ({occupancy}/{capacity})
                </option>
              );
            })}
          </select>

          <input
            type="date"
            required
            value={form.startDate}
            onChange={(event) =>
              setForm({
                ...form,
                startDate: event.target.value,
              })
            }
            style={inputStyle}
          />

          <input
            type="date"
            required
            value={form.endDate}
            onChange={(event) =>
              setForm({
                ...form,
                endDate: event.target.value,
              })
            }
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              ...buttonStyle,
              backgroundColor: "#16a34a",
            }}
          >
            Create Allocation
          </button>
        </form>
      </section>

      <section style={sectionStyle}>
        <h2>Room Occupancy</h2>

        <p style={{ color: "#6b7280" }}>
          Occupancy is calculated using the selected date range.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginTop: "15px",
          }}
        >
          {rooms.map((room, index) => {
            const roomId = getId(
              room.id ?? room._id
            );

            const occupancy = getRoomOccupancy(
              roomId,
              form.startDate,
              form.endDate
            );

            const capacity = Number(room.capacity || 0);

            const isFull =
              capacity > 0 && occupancy >= capacity;

            return (
              <div
                key={`${roomId}-${index}`}
                style={{
                  padding: "18px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "white",
                }}
              >
                <h3>
                  Room{" "}
                  {room.roomNo || room.roomNumber}
                </h3>

                <p>
                  Occupancy:{" "}
                  <strong>{occupancy}</strong> / {capacity}
                </p>

                <span
                  style={{
                    ...statusStyle(
                      isFull ? "Rejected" : "Approved"
                    ),
                    padding: "5px 10px",
                    borderRadius: "15px",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  {isFull
                    ? "Room Full"
                    : "Space Available"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>All Allocations</h2>

        {loading ? (
          <p>Loading allocations...</p>
        ) : allocations.length === 0 ? (
          <p>No allocations found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
                marginTop: "15px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#1f2937",
                    color: "white",
                  }}
                >
                  {[
                    "Allocation ID",
                    "Student",
                    "Room",
                    "Occupancy",
                    "Start Date",
                    "End Date",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} style={tableCellStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {allocations.map((allocation, index) => {
                  const allocationId = getId(
                    allocation.id ?? allocation._id
                  );

                  const displayId = `ALLOCATION-${String(
                    index + 1
                  ).padStart(3, "0")}`;

                  const studentId = getId(
                    allocation.studentId
                  );

                  const roomId = getId(
                    allocation.roomId
                  );

                  const occupancy = getRoomOccupancy(
                    roomId,
                    allocation.startDate,
                    allocation.endDate
                  );

                  const capacity = getRoomCapacity(roomId);

                  const isUpdating =
                    updatingId === allocationId;

                  return (
                    <tr
                      key={allocationId || index}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <td style={tableCellStyle}>
                        {displayId}
                      </td>

                      <td style={tableCellStyle}>
                        {getStudentName(studentId)}
                      </td>

                      <td style={tableCellStyle}>
                        {getRoomName(roomId)}
                      </td>

                      <td style={tableCellStyle}>
                        {occupancy} / {capacity}
                      </td>

                      <td style={tableCellStyle}>
                        {formatDate(allocation.startDate)}
                      </td>

                      <td style={tableCellStyle}>
                        {formatDate(allocation.endDate)}
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            ...statusStyle(allocation.status),
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontWeight: "bold",
                            fontSize: "13px",
                          }}
                        >
                          {allocation.status}
                        </span>
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {allocation.status === "Pending" && (
                          <>
                            <button
                              disabled={isUpdating}
                              onClick={() =>
                                updateStatus(
                                  allocationId,
                                  "Approved"
                                )
                              }
                              style={{
                                ...smallButtonStyle,
                                backgroundColor: "#16a34a",
                              }}
                            >
                              {isUpdating
                                ? "Updating..."
                                : "Approve"}
                            </button>

                            <button
                              disabled={isUpdating}
                              onClick={() =>
                                updateStatus(
                                  allocationId,
                                  "Rejected"
                                )
                              }
                              style={{
                                ...smallButtonStyle,
                                backgroundColor: "#dc2626",
                              }}
                            >
                              {isUpdating
                                ? "Updating..."
                                : "Reject"}
                            </button>
                          </>
                        )}

                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            deleteAllocation(allocationId)
                          }
                          style={{
                            ...smallButtonStyle,
                            backgroundColor: "#374151",
                          }}
                        >
                          Delete
                        </button>
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

const sectionStyle: React.CSSProperties = {
  marginTop: "25px",
  padding: "20px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  backgroundColor: "white",
};

const inputStyle: React.CSSProperties = {
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "7px",
  backgroundColor: "#2563eb",
  color: "white",
  cursor: "pointer",
  marginTop: "10px",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "none",
  borderRadius: "6px",
  color: "white",
  cursor: "pointer",
  marginRight: "6px",
  marginBottom: "6px",
};

const tableCellStyle: React.CSSProperties = {
  padding: "12px",
  textAlign: "left",
  verticalAlign: "top",
  border: "1px solid #e5e7eb",
};