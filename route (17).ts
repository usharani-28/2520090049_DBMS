
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  return String(value);
}

function datesOverlap(
  startDate1: string,
  endDate1: string,
  startDate2: string,
  endDate2: string
): boolean {
  return startDate1 <= endDate2 && startDate2 <= endDate1;
}

// GET: Fetch all room allocations
export async function GET() {
  try {
    const allocations = await prisma.orm.room_allocations.all();

    return NextResponse.json({
      success: true,
      allocations,
    });
  } catch (error) {
    console.error("GET room allocations error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch room allocations",
      },
      { status: 500 }
    );
  }
}

// POST: Create a room allocation
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      studentId,
      roomId,
      startDate,
      endDate,
      status = "Pending",
    } = body;

    if (!studentId || !roomId || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Student ID, Room ID, start date and end date are required",
        },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Start date cannot be after end date",
        },
        { status: 400 }
      );
    }

    const students = await prisma.orm.students.all();

    const studentExists = students.some(
      (student: any) =>
        getId(student.id ?? student._id) === String(studentId)
    );

    if (!studentExists) {
      return NextResponse.json(
        {
          success: false,
          error: "Student not found",
        },
        { status: 404 }
      );
    }

    const rooms = await prisma.orm.rooms.all();

    const room = rooms.find(
      (item: any) =>
        getId(item.id ?? item._id) === String(roomId)
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

    if (String(room.status).toLowerCase() === "maintenance") {
      return NextResponse.json(
        {
          success: false,
          error: "This room is under maintenance",
        },
        { status: 400 }
      );
    }

    const allocations = await prisma.orm.room_allocations.all();

    const studentHasOverlappingAllocation = allocations.some(
      (allocation: any) =>
        getId(allocation.studentId) === String(studentId) &&
        ["Pending", "Approved", "Active"].includes(
          String(allocation.status)
        ) &&
        datesOverlap(
          String(startDate),
          String(endDate),
          String(allocation.startDate),
          String(allocation.endDate)
        )
    );

    if (studentHasOverlappingAllocation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This student already has an overlapping room allocation",
        },
        { status: 400 }
      );
    }

    const activeRoomAllocations = allocations.filter(
      (allocation: any) =>
        getId(allocation.roomId) === String(roomId) &&
        ["Approved", "Active"].includes(
          String(allocation.status)
        ) &&
        datesOverlap(
          String(startDate),
          String(endDate),
          String(allocation.startDate),
          String(allocation.endDate)
        )
    );

    const roomCapacity = Number(room.capacity ?? 0);

    if (activeRoomAllocations.length >= roomCapacity) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Room capacity is full for the selected date range",
        },
        { status: 400 }
      );
    }

    const newAllocation =
      await prisma.orm.room_allocations.create({
        studentId: String(studentId),
        roomId: String(roomId),
        startDate: String(startDate),
        endDate: String(endDate),
        status: String(status),
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json(
      {
        success: true,
        message: "Room allocation created successfully",
        allocation: newAllocation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST room allocation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create room allocation",
      },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a room allocation
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const { allocationId, status } = body;

    const validStatuses = [
      "Pending",
      "Approved",
      "Rejected",
      "Active",
    ];

    if (!allocationId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Allocation ID and status are required",
        },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(String(status))) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid allocation status",
        },
        { status: 400 }
      );
    }

    const allocations = await prisma.orm.room_allocations.all();

    const existingAllocation = allocations.find(
      (allocation: any) =>
        getId(allocation.id ?? allocation._id) ===
        String(allocationId)
    );

    if (!existingAllocation) {
      return NextResponse.json(
        {
          success: false,
          error: "Room allocation not found",
        },
        { status: 404 }
      );
    }

    const existingId = getId(
      existingAllocation.id ?? existingAllocation._id
    );

    if (["Approved", "Active"].includes(String(status))) {
      const rooms = await prisma.orm.rooms.all();

      const room = rooms.find(
        (item: any) =>
          getId(item.id ?? item._id) ===
          getId(existingAllocation.roomId)
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

      const overlappingAllocations = allocations.filter(
        (allocation: any) =>
          getId(allocation.id ?? allocation._id) !== existingId &&
          getId(allocation.roomId) ===
            getId(existingAllocation.roomId) &&
          ["Approved", "Active"].includes(
            String(allocation.status)
          ) &&
          datesOverlap(
            String(existingAllocation.startDate),
            String(existingAllocation.endDate),
            String(allocation.startDate),
            String(allocation.endDate)
          )
      );

      if (
        overlappingAllocations.length >=
        Number(room.capacity ?? 0)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot approve allocation. Room capacity is full.",
          },
          { status: 400 }
        );
      }
    }

    const updatedAllocation =
      await prisma.orm.room_allocations
        .where({ _id: existingId })
        .update({
          status: String(status),
        });

    return NextResponse.json({
      success: true,
      message: "Room allocation status updated successfully",
      allocation: updatedAllocation,
    });
  } catch (error) {
    console.error("PATCH room allocation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update room allocation",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a room allocation
export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const { allocationId } = body;

    if (!allocationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Allocation ID is required",
        },
        { status: 400 }
      );
    }

    const allocations = await prisma.orm.room_allocations.all();

    const existingAllocation = allocations.find(
      (allocation: any) =>
        getId(allocation.id ?? allocation._id) ===
        String(allocationId)
    );

    if (!existingAllocation) {
      return NextResponse.json(
        {
          success: false,
          error: "Room allocation not found",
        },
        { status: 404 }
      );
    }

    const existingId = getId(
      existingAllocation.id ?? existingAllocation._id
    );

    await prisma.orm.room_allocations
      .where({ _id: existingId })
      .delete();

    return NextResponse.json({
      success: true,
      message: "Room allocation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE room allocation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete room allocation",
      },
      { status: 500 }
    );
  }
}