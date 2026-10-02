"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  userId: string;
  rollNo?: string;
  department?: string;
  year?: number | string;
  phone?: string;
  gender?: string;
  name?: string;
  email?: string;
};

type User = {
  id: string;
  name?: string;
  email?: string;
};

export default function AdminStudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const userText = localStorage.getItem("user");

    if (!userText) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userText);

      if (user.role?.toLowerCase() !== "admin") {
        router.push("/student-dashboard");
        return;
      }

      fetchStudents();
    } catch (error) {
      console.error("User validation error:", error);
      router.push("/login");
    }
  }, [router]);

  async function fetchStudents() {
    try {
      setLoading(true);
      setMessage("");

      /*
       * Get students
       */
      const studentsResponse = await fetch(
        "/api/students",
        {
          cache: "no-store",
        }
      );

      const studentsData =
        await studentsResponse.json();

      if (
        !studentsResponse.ok ||
        !studentsData.success
      ) {
        setMessage(
          studentsData.error ||
            "Unable to load students"
        );
        return;
      }

      /*
       * Get users
       */
      const usersResponse = await fetch(
        "/api/users",
        {
          cache: "no-store",
        }
      );

      const usersData =
        await usersResponse.json();

      if (
        !usersResponse.ok ||
        !usersData.success
      ) {
        setMessage(
          usersData.error ||
            "Unable to load users"
        );
        return;
      }

      const studentRecords: Student[] =
        studentsData.students || [];

      const userRecords: User[] =
        usersData.users || [];

      /*
       * Create a map:
       *
       * user.id -> user
       *
       * Example:
       *
       * 6aaa85ea0af8f8d1fc88bdb9
       *              ->
       * {
       *   name: "Usha Rani",
       *   email: "usha@example.com"
       * }
       */
      const userMap = new Map<string, User>();

      userRecords.forEach((user) => {
        if (user.id) {
          userMap.set(String(user.id), user);
        }
      });

      /*
       * Combine student + user information
       */
      const combinedStudents =
        studentRecords.map((student) => {
          const user = userMap.get(
            String(student.userId)
          );

          return {
            ...student,
            name: user?.name || "",
            email: user?.email || "",
          };
        });

      setStudents(combinedStudents);
    } catch (error) {
      console.error(
        "Fetch students error:",
        error
      );

      setMessage(
        "Unable to connect to the server"
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents =
    students.filter((student) => {
      const searchText =
        search.toLowerCase().trim();

      return (
        String(student.name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.email || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.rollNo || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.department || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.phone || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.gender || "")
          .toLowerCase()
          .includes(searchText)
      );
    });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        padding: "30px",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              Students
            </h1>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              View all registered hostel
              students
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/admin-dashboard"
              )
            }
            style={{
              background: "#374151",
              color: "white",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>

        {/* SUMMARY */}

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "14px",
                  marginBottom: "5px",
                }}
              >
                Total Students
              </p>

              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                {students.length}
              </h2>
            </div>

            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={{
                border:
                  "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "11px 14px",
                width: "280px",
                maxWidth: "100%",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* LOADING */}

        {loading && (
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            Loading students...
          </div>
        )}

        {/* ERROR */}

        {message && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {/* TABLE */}

        {!loading && !message && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              overflowX: "auto",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "1000px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#1f2937",
                    color: "white",
                  }}
                >
                  <th style={cellStyle}>
                    S.No
                  </th>

                  <th style={cellStyle}>
                    Roll Number
                  </th>

                  <th style={cellStyle}>
                    Student Name
                  </th>

                  <th style={cellStyle}>
                    Email
                  </th>

                  <th style={cellStyle}>
                    Department
                  </th>

                  <th style={cellStyle}>
                    Year
                  </th>

                  <th style={cellStyle}>
                    Phone
                  </th>

                  <th style={cellStyle}>
                    Gender
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map(
                  (student, index) => (
                    <tr
                      key={
                        student.id ||
                        index
                      }
                      style={{
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      <td style={cellStyle}>
                        {index + 1}
                      </td>

                      <td style={cellStyle}>
                        {student.rollNo ||
                          "Not available"}
                      </td>

                      <td style={cellStyle}>
                        <strong>
                          {student.name ||
                            "Not available"}
                        </strong>
                      </td>

                      <td style={cellStyle}>
                        {student.email ||
                          "Not available"}
                      </td>

                      <td style={cellStyle}>
                        {student.department ||
                          "Not available"}
                      </td>

                      <td style={cellStyle}>
                        {student.year ??
                          "Not available"}
                      </td>

                      <td style={cellStyle}>
                        {student.phone ||
                          "Not available"}
                      </td>

                      <td style={cellStyle}>
                        {student.gender ||
                          "Not available"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {filteredStudents.length ===
              0 && (
              <p
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#6b7280",
                }}
              >
                No students found.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "14px",
};