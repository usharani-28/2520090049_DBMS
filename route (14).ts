import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentIdFromUserId } from "@/lib/student-access";

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value.$oid) {
    return String(value.$oid);
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (value.id) {
    return getId(value.id);
  }

  if (value._id) {
    return getId(value._id);
  }

  return "";
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

// GET - Fetch leave requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const requests = await prisma.orm.leave_requests.all();

    if (!userId) {
      return NextResponse.json({
        success: true,
        leaveRequests: requests,
      });
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

    const normalizedStudentId = getId(studentId);

    const filteredRequests = requests.filter(
      (item: any) =>
        getId(item.studentId) === normalizedStudentId
    );

    return NextResponse.json({
      success: true,
      leaveRequests: filteredRequests,
    });
  } catch (error: any) {
    console.error("GET leave requests error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Failed to fetch leave requests",
      },
      { status: 500 }
    );
  }
}

// POST - Create a leave request
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      userId: providedUserId,
      studentId: providedStudentId,
      startDate,
      endDate,
      reason,
    } = body;

    const userId = getId(providedUserId);

    let studentId = getId(providedStudentId);

    /*
     * Always resolve the student ID from the logged-in
     * user's ID when possible.
     *
     * MongoDB requires studentId to be the actual
     * Student document ID.
     */
    if (userId) {
      const resolvedStudentId =
        await getStudentIdFromUserId(userId);

      if (resolvedStudentId) {
        studentId = getId(resolvedStudentId);
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Student ID is required",
        },
        { status: 400 }
      );
    }

    if (!startDate || !endDate || !reason?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Start date, end date and reason are required",
        },
        { status: 400 }
      );
    }

    if (!isValidObjectId(studentId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid student ID",
        },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid date format",
        },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        {
          success: false,
          error: "End date cannot be before start date",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     *
     * Do NOT include userId here.
     *
     * The MongoDB leave_requests validator allows:
     * studentId
     * startDate
     * endDate
     * reason
     * status
     * createdAt
     *
     * additionalProperties is false.
     */
    const newRequest =
      await prisma.orm.leave_requests.create({
        studentId: String(studentId),
        startDate: String(startDate),
        endDate: String(endDate),
        reason: String(reason).trim(),
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json(
      {
        success: true,
        message: "Leave request submitted successfully",
        request: newRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST leave request error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Failed to create leave request",
      },
      { status: 500 }
    );
  }
}

// PATCH - Approve or reject a leave request
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const { requestId, status } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "requestId and status are required",
        },
        { status: 400 }
      );
    }

    if (!["Approved", "Rejected"].includes(String(status))) {
      return NextResponse.json(
        {
          success: false,
          error: "Status must be Approved or Rejected",
        },
        { status: 400 }
      );
    }

    const normalizedRequestId = getId(requestId);

    if (!isValidObjectId(normalizedRequestId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request ID",
        },
        { status: 400 }
      );
    }

    const requests =
      await prisma.orm.leave_requests.all();

    const existingRequest = requests.find(
      (item: any) => {
        const itemId = getId(
          item.id ?? item._id
        );

        return itemId === normalizedRequestId;
      }
    );

    if (!existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Leave request not found",
          receivedRequestId: requestId,
          availableIds: requests.map(
            (item: any) =>
              getId(item.id ?? item._id)
          ),
        },
        { status: 404 }
      );
    }

    if (existingRequest.status !== "Pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Only pending requests can be updated",
        },
        { status: 400 }
      );
    }

    const existingId = getId(
      existingRequest.id ?? existingRequest._id
    );

    const updatedRequest =
      await prisma.orm.leave_requests
        .where({ _id: existingId })
        .update({
          status: String(status),
        });

    return NextResponse.json({
      success: true,
      message:
        `Leave request ${String(status).toLowerCase()} successfully`,
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error("PATCH leave request error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Failed to update leave request",
      },
      { status: 500 }
    );
  }
}