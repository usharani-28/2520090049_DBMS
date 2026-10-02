
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value.$oid) return String(value.$oid);

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

async function getStudentFromUserId(userId: string) {
  const users = await prisma.orm.users.all();

  const user = users.find(
    (item: any) => getId(item.id ?? item._id) === userId
  );

  if (!user || user.role !== "student") {
    return null;
  }

  const students = await prisma.orm.students.all();

  const student = students.find(
    (item: any) => getId(item.userId) === userId
  );

  if (!student) {
    return null;
  }

  return student;
}

// GET - Fetch maintenance records
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    let records = await prisma.orm.maintenance.all();

    if (userId) {
      const student = await getStudentFromUserId(userId);

      if (!student) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid student user",
          },
          { status: 403 }
        );
      }

      const studentId = getId(student.id ?? student._id);

      const bookings = await prisma.orm.bookings.all();
      const allocations = await prisma.orm.room_allocations.all();

      const studentRoomIds = new Set<string>();

      bookings
        .filter(
          (booking: any) =>
            getId(booking.studentId) === studentId
        )
        .forEach((booking: any) => {
          studentRoomIds.add(getId(booking.roomId));
        });

      allocations
        .filter(
          (allocation: any) =>
            getId(allocation.studentId) === studentId
        )
        .forEach((allocation: any) => {
          studentRoomIds.add(getId(allocation.roomId));
        });

      records = records.filter((record: any) =>
        studentRoomIds.has(getId(record.roomId))
      );
    }

    const formattedRecords = records.map((record: any) => ({
      id: getId(record.id ?? record._id),
      hostelId: getId(record.hostelId),
      roomId: getId(record.roomId),
      title: record.title,
      message: record.message,
      status: record.status,
      createdAt: record.createdAt,
    }));

    return NextResponse.json({
      success: true,
      maintenance: formattedRecords,
    });
  } catch (error) {
    console.error("Get maintenance error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Create maintenance request
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = String(body.userId ?? "").trim();
    const roomId = String(body.roomId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!userId || !roomId || !title || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID, room ID, title and message are required",
        },
        { status: 400 }
      );
    }

    if (!isValidObjectId(userId) || !isValidObjectId(roomId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID or room ID",
        },
        { status: 400 }
      );
    }

    const student = await getStudentFromUserId(userId);

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "Student account not found",
        },
        { status: 403 }
      );
    }

    const studentId = getId(student.id ?? student._id);

    const bookings = await prisma.orm.bookings.all();
    const allocations = await prisma.orm.room_allocations.all();

    const studentRoomIds = new Set<string>();

    bookings
      .filter(
        (booking: any) =>
          getId(booking.studentId) === studentId
      )
      .forEach((booking: any) => {
        studentRoomIds.add(getId(booking.roomId));
      });

    allocations
      .filter(
        (allocation: any) =>
          getId(allocation.studentId) === studentId
      )
      .forEach((allocation: any) => {
        studentRoomIds.add(getId(allocation.roomId));
      });

    if (!studentRoomIds.has(roomId)) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only submit maintenance for your own room",
        },
        { status: 403 }
      );
    }

    const rooms = await prisma.orm.rooms.all();

    const room = rooms.find(
      (item: any) => getId(item.id ?? item._id) === roomId
    );

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: "Room not found",
        },
        { status: 404 }
      );
    }

    const hostelId = getId(room.hostelId);

    if (!isValidObjectId(hostelId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid hostel ID for selected room",
        },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();

    const record = await prisma.orm.maintenance.create({
      hostelId,
      roomId,
      title,
      message,
      status: "Pending",
      createdAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Maintenance request created successfully",
        maintenance: record,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create maintenance error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const requestId = body.requestId;
    const status = body.status;

    const validStatuses = [
      "Pending",
      "In Progress",
      "Resolved",
      "Rejected",
    ];

    if (!requestId || !validStatuses.includes(status)) {
      return Response.json(
        {
          success: false,
          error: "Valid request ID and status are required",
        },
        { status: 400 }
      );
    }

    const requests = await prisma.orm.maintenance.all();

    const existingRequest = requests.find(
      (item: any) =>
        getId(item.id ?? item._id) === String(requestId)
    );

    if (!existingRequest) {
      return Response.json(
        {
          success: false,
          error: "Maintenance request not found",
        },
        { status: 404 }
      );
    }

    const existingId = getId(
      existingRequest.id ?? existingRequest._id
    );

    const updatedRequest = await prisma.orm.maintenance
      .where({ _id: existingId })
      .update({
        status: String(status),
      });

    return Response.json({
      success: true,
      message: "Maintenance status updated successfully",
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error("Update maintenance error:", error);

    return Response.json(
      {
        success: false,
        error:
          error.message || "Failed to update maintenance request",
      },
      { status: 500 }
    );
  }
}