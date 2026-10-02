
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentIdFromUserId } from "@/lib/student-access";

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value.$oid) {
    return String(value.$oid);
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (value._id) {
    return getId(value._id);
  }

  return String(value);
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

// GET - Fetch complaints
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const complaints = await prisma.orm.complaints.all();

    let filteredComplaints = complaints;

    if (userId) {
      const studentId = await getStudentIdFromUserId(userId);

      if (!studentId) {
        return NextResponse.json(
          {
            success: false,
            error: "Student record not found",
          },
          { status: 404 }
        );
      }

      filteredComplaints = complaints.filter(
        (complaint: any) =>
          getId(complaint.studentId) === studentId
      );
    }

    const formattedComplaints = filteredComplaints.map(
      (complaint: any) => ({
        id: getId(complaint.id ?? complaint._id),
        studentId: getId(complaint.studentId),
        hostelId: getId(complaint.hostelId),
        title: complaint.title,
        message: complaint.message,
        status: complaint.status,
        createdAt: complaint.createdAt,
      })
    );

    return NextResponse.json({
      success: true,
      complaints: formattedComplaints,
    });
  } catch (error) {
    console.error("Get complaints error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Create complaint
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = getId(body.userId);
    const hostelId = getId(body.hostelId);
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!userId || !hostelId || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User ID, hostel ID, title and message are required",
        },
        { status: 400 }
      );
    }

    if (
      !isValidObjectId(userId) ||
      !isValidObjectId(hostelId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Invalid user ID or hostel ID. ` +
            `User ID: ${userId}, Hostel ID: ${hostelId}`,
        },
        { status: 400 }
      );
    }

    const studentId = await getStudentIdFromUserId(userId);

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Student record not found",
        },
        { status: 404 }
      );
    }

    const complaint = await prisma.orm.complaints.create({
      studentId,
      hostelId,
      title,
      message,
      status: "Pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Complaint created successfully",
        complaint,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create complaint error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const complaintId = body.complaintId;
    const status = body.status;

    const validStatuses = [
      "Pending",
      "In Progress",
      "Resolved",
      "Rejected",
    ];

    if (!complaintId || !validStatuses.includes(status)) {
      return Response.json(
        {
          success: false,
          error: "Valid complaint ID and status are required",
        },
        { status: 400 }
      );
    }

    const complaints = await prisma.orm.complaints.all();

    const existingComplaint = complaints.find(
      (item: any) =>
        getId(item.id ?? item._id) === String(complaintId)
    );

    if (!existingComplaint) {
      return Response.json(
        {
          success: false,
          error: "Complaint not found",
        },
        { status: 404 }
      );
    }

    const existingId = getId(
      existingComplaint.id ?? existingComplaint._id
    );

    const updatedComplaint = await prisma.orm.complaints
      .where({ _id: existingId })
      .update({
        status: String(status),
      });

    return Response.json({
      success: true,
      message: "Complaint status updated successfully",
      complaint: updatedComplaint,
    });
  } catch (error: any) {
    console.error("Update complaint error:", error);

    return Response.json(
      {
        success: false,
        error: error.message || "Failed to update complaint",
      },
      { status: 500 }
    );
  }
}