import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Convert MongoDB ObjectId into a string
function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value.$oid) {
    return String(value.$oid);
  }

  if (value.toHexString) {
    return value.toHexString();
  }

  return String(value);
}

// GET - Fetch all students
export async function GET() {
  try {
    const students = await prisma.orm.students.all();

    const formattedStudents = students.map((student: any) => ({
      id: getId(student.id ?? student._id),
      userId: getId(student.userId),
      rollNo: student.rollNo,
      department: student.department,
      year: student.year,
      phone: student.phone,
      gender: student.gender,
    }));

    console.log("Formatted students:", formattedStudents);

    return NextResponse.json({
      success: true,
      students: formattedStudents,
    });
  } catch (error) {
    console.error("Get students error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Add a new student
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Student data received:", body);

    const userId = String(body.userId ?? "").trim();
    const rollNo = String(body.rollNo ?? "").trim();
    const department = String(body.department ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const gender = String(body.gender ?? "").trim();

    if (
      !userId ||
      !rollNo ||
      !department ||
      body.year === undefined ||
      !phone ||
      !gender
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "All student fields are required",
        },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId
    if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid user ID: ${userId}`,
        },
        { status: 400 }
      );
    }

    const year = Number(body.year);

    if (!Number.isInteger(year) || year < 1 || year > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Year must be between 1 and 5",
        },
        { status: 400 }
      );
    }

    const student = await prisma.orm.students.create({
      userId: userId,
      rollNo: rollNo,
      department: department,
      year: year,
      phone: phone,
      gender: gender,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Student created successfully",
        student,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create student error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}