"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Invalid email or password");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "admin") {
        router.push("/admin-dashboard");
      } else {
        router.push("/student-dashboard");
      }
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f4f6",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          padding: "35px",
          borderRadius: "14px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "8px",
            color: "#111827",
            fontSize: "30px",
          }}
        >
          Hostel Management System
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          Login to your account
        </p>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}