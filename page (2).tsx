
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminHostelsPage() {
  const router = useRouter();

  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");

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

      fetchHostels();
    } catch {
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, [router]);

  async function fetchHostels() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/hostels");
      const data = await response.json();

      if (data.success) {
        setHostels(data.hostels || []);
      } else {
        setMessage(data.error || "Failed to load hostels");
      }
    } catch {
      setMessage("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim() || !location.trim() || !type.trim()) {
      setMessage("Please fill in all fields");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/hostels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          location,
          type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Hostel created successfully!");

        setName("");
        setLocation("");
        setType("");

        await fetchHostels();
      } else {
        setMessage(data.error || "Failed to create hostel");
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
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
          Manage Hostels
        </h1>

        {/* Add Hostel Form */}
        <section
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "14px",
            marginTop: "25px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ color: "#2563eb" }}>Add New Hostel</h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>Hostel Name</strong>
              </label>

              <input
                type="text"
                placeholder="Enter hostel name"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                <strong>Location</strong>
              </label>

              <input
                type="text"
                placeholder="Enter hostel location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
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
                <strong>Hostel Type</strong>
              </label>

              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
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
                <option value="">Select hostel type</option>
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Co-Ed">Co-Ed</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 25px",
                backgroundColor: saving ? "#94a3b8" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Add Hostel"}
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

        {loading && <p>Loading hostels...</p>}

        {!loading && hostels.length === 0 && !message && (
          <p>No hostels found.</p>
        )}

        {/* Hostel List */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginTop: "25px",
          }}
        >
          {hostels.map((hostel, index) => (
            <div
              key={hostel.id || hostel._id || index}
              style={{
                backgroundColor: "white",
                padding: "25px",
                borderRadius: "14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <h2 style={{ color: "#2563eb" }}>{hostel.name}</h2>

              <p>
                <strong>Location:</strong>{" "}
                {hostel.location || "Not available"}
              </p>

              <p>
                <strong>Type:</strong>{" "}
                {hostel.type || hostel.gender || "Not available"}
              </p>

              <p>
                <strong>ID:</strong>{" "}
                {`HOSTEL-${String(index + 1).padStart(3, "0")}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}