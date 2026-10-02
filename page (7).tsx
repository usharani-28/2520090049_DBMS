
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (value.$oid) return String(value.$oid);
  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return (
    new Date(startA) <= new Date(endB) &&
    new Date(endA) >= new Date(startB)
  );
}

export default function AdminRoomsPage() {
  const router = useRouter();

  const [rooms, setRooms] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [hostelId, setHostelId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [floor, setFloor] = useState("");

  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      if (user.role !== "admin") {
        router.push("/student-dashboard");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      setSelectedStartDate(today);
      setSelectedEndDate(today);

      fetchAllData();
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  async function fetchAllData() {
    try {
      setLoading(true);
      setMessage("");

      const [roomsResponse, hostelsResponse, allocationsResponse] =
        await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/hostels"),
          fetch("/api/room-allocations"),
        ]);

      const roomsData = await roomsResponse.json();
      const hostelsData = await hostelsResponse.json();
      const allocationsData = await allocationsResponse.json();

      if (roomsData.success) {
        setRooms(roomsData.rooms || []);
      } else {
        setMessage(roomsData.error || "Failed to load rooms");
      }

      if (hostelsData.success) {
        setHostels(hostelsData.hostels || []);
      }

      if (allocationsData.success) {
        setAllocations(allocationsData.allocations || []);
      }
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  function getRoomOccupancy(
    roomId: string,
    startDate?: string,
    endDate?: string
  ): number {
    const roomAllocations = allocations.filter((allocation) => {
      const allocationRoomId = getId(
        allocation.roomId ?? allocation.room?.id
      );

      const status = String(allocation.status || "").toLowerCase();

      if (
        allocationRoomId !== roomId ||
        !["approved", "active"].includes(status)
      ) {
        return false;
      }

      if (!startDate || !endDate) {
        return true;
      }

      if (!allocation.startDate || !allocation.endDate) {
        return false;
      }

      return datesOverlap(
        startDate,
        endDate,
        String(allocation.startDate),
        String(allocation.endDate)
      );
    });

    return roomAllocations.length;
  }

  function getAvailableBeds(
    room: any,
    startDate?: string,
    endDate?: string
  ): number {
    const roomId = getId(room.id ?? room._id);
    const capacityValue = Number(room.capacity || 0);

    const occupied = getRoomOccupancy(roomId, startDate, endDate);

    return Math.max(capacityValue - occupied, 0);
  }

  function getRoomStatus(
    room: any,
    startDate?: string,
    endDate?: string
  ): string {
    const roomStatus = String(room.status || "").toLowerCase();

    if (
      roomStatus.includes("maintenance") ||
      roomStatus.includes("repair")
    ) {
      return "Maintenance";
    }

    const availableBeds = getAvailableBeds(room, startDate, endDate);

    if (availableBeds <= 0) {
      return "Full";
    }

    return "Available";
  }

  function getHostelName(hostelIdValue: any): string {
    const hostel = hostels.find(
      (item) => getId(item.id ?? item._id) === getId(hostelIdValue)
    );

    return hostel?.name || "Unknown Hostel";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (
      !hostelId ||
      !roomNumber.trim() ||
      !capacity ||
      !floor
    ) {
      setMessage("Please fill in all fields");
      return;
    }

    if (Number(capacity) <= 0 || Number(floor) < 0) {
      setMessage("Enter valid capacity and floor values");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostelId,
          roomNumber: roomNumber.trim(),
          capacity: Number(capacity),
          floor: Number(floor),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Room created successfully!");

        setHostelId("");
        setRoomNumber("");
        setCapacity("");
        setFloor("");

        await fetchAllData();
      } else {
        setMessage(data.error || "Failed to create room");
      }
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <button
          onClick={() => router.push("/admin-dashboard")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#475569",
            color: "white",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ color: "#1e293b", marginTop: "25px" }}>
          Manage Rooms
        </h1>

        <section
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "14px",
            marginTop: "25px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ color: "#2563eb" }}>Add New Room</h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>Select Hostel</strong>
              </label>

              <select
                value={hostelId}
                onChange={(event) => setHostelId(event.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select hostel</option>

                {hostels.map((hostel, index) => {
                  const id = getId(hostel.id ?? hostel._id);

                  return (
                    <option key={id || index} value={id}>
                      {hostel.name} - {hostel.location}
                    </option>
                  );
                })}
              </select>

              {hostels.length === 0 && (
                <small style={{ color: "#dc2626" }}>
                  No hostels available. Create a hostel first.
                </small>
              )}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>Room Number</strong>
              </label>

              <input
                type="text"
                placeholder="Example: 101"
                value={roomNumber}
                onChange={(event) => setRoomNumber(event.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>Capacity</strong>
              </label>

              <input
                type="number"
                min="1"
                placeholder="Example: 4"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label>
                <strong>Floor</strong>
              </label>

              <input
                type="number"
                min="0"
                placeholder="Example: 1"
                value={floor}
                onChange={(event) => setFloor(event.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving || hostels.length === 0}
              style={{
                padding: "12px 25px",
                backgroundColor:
                  saving || hostels.length === 0
                    ? "#94a3b8"
                    : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor:
                  saving || hostels.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving ? "Saving..." : "Add Room"}
            </button>
          </form>
        </section>

        {message && (
          <p
            style={{
              color: message.includes("successfully")
                ? "#16a34a"
                : "#dc2626",
              fontWeight: "bold",
              marginTop: "20px",
            }}
          >
            {message}
          </p>
        )}

        <section
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "14px",
            marginTop: "25px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ color: "#2563eb" }}>
            Check Date-wise Room Occupancy
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label>
                <strong>Start Date</strong>
              </label>

              <input
                type="date"
                value={selectedStartDate}
                onChange={(event) =>
                  setSelectedStartDate(event.target.value)
                }
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label>
                <strong>End Date</strong>
              </label>

              <input
                type="date"
                value={selectedEndDate}
                onChange={(event) =>
                  setSelectedEndDate(event.target.value)
                }
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginTop: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {selectedStartDate &&
            selectedEndDate &&
            new Date(selectedStartDate) > new Date(selectedEndDate) && (
              <p style={{ color: "#dc2626", fontWeight: "bold" }}>
                End date must be after or equal to start date.
              </p>
            )}
        </section>

        {loading && <p>Loading rooms...</p>}

        {!loading && rooms.length === 0 && !message && (
          <p>No rooms found.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginTop: "25px",
          }}
        >
          {rooms.map((room, index) => {
            const roomId = getId(room.id ?? room._id);
            const capacityValue = Number(room.capacity || 0);

            const occupied = getRoomOccupancy(
              roomId,
              selectedStartDate,
              selectedEndDate
            );

            const availableBeds = getAvailableBeds(
              room,
              selectedStartDate,
              selectedEndDate
            );

            const status = getRoomStatus(
              room,
              selectedStartDate,
              selectedEndDate
            );

            const isMaintenance = status === "Maintenance";
            const isFull = status === "Full";

            return (
              <div
                key={roomId || index}
                style={{
                  backgroundColor: "white",
                  padding: "25px",
                  borderRadius: "14px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  borderTop: `5px solid ${
                    isMaintenance
                      ? "#f59e0b"
                      : isFull
                      ? "#dc2626"
                      : "#16a34a"
                  }`,
                }}
              >
                <h2 style={{ color: "#2563eb" }}>
                  Room {room.roomNumber || room.number || "N/A"}
                </h2>

                <p>
                  <strong>Hostel:</strong>{" "}
                  {getHostelName(room.hostelId)}
                </p>

                <p>
                  <strong>Floor:</strong> {room.floor ?? "N/A"}
                </p>

                <p>
                  <strong>Total Capacity:</strong> {capacityValue}
                </p>

                <p>
                  <strong>Occupied Beds:</strong> {occupied}
                </p>

                <p>
                  <strong>Available Beds:</strong> {availableBeds}
                </p>

                <p>
                  <strong>Room Status:</strong>{" "}
                  <span
                    style={{
                      color: isMaintenance
                        ? "#d97706"
                        : isFull
                        ? "#dc2626"
                        : "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    {status}
                  </span>
                </p>

                <p>
                  <strong>Stored Status:</strong>{" "}
                  {room.status || "Available"}
                </p>

                <p>
                  <strong>Room ID:</strong> {`ROOM-${String(index + 1).padStart(3, "0")}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}