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

// GET - Fetch all rooms
export async function GET() {
  try {
    const rooms = await prisma.orm.rooms.all();

    const formattedRooms = rooms.map((room: any) => ({
      id: getId(room.id ?? room._id),
      hostelId: getId(room.hostelId),
      roomNo: room.roomNo,
      roomNumber: room.roomNo,
      capacity: room.capacity,
      floor: room.floor,
      occupied: room.occupied,
      status: room.status,
    }));

    console.log("Formatted rooms:", formattedRooms);

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
    });
  } catch (error) {
    console.error("Get rooms error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Add a new room
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Room data received:", body);

    const hostelId = String(body.hostelId ?? "").trim();

    const roomNumber = String(
      body.roomNumber ?? body.roomNo ?? ""
    ).trim();

    if (
      !hostelId ||
      !roomNumber ||
      body.capacity === undefined ||
      body.floor === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Hostel ID, room number, capacity and floor are required",
        },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId
    if (!/^[a-fA-F0-9]{24}$/.test(hostelId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid hostel ID: ${hostelId}`,
        },
        { status: 400 }
      );
    }

    const capacity = Number(body.capacity);
    const floor = Number(body.floor);

    if (!Number.isInteger(capacity) || capacity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Capacity must be a positive integer",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(floor) || floor < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Floor must be a valid integer",
        },
        { status: 400 }
      );
    }

    const room = await prisma.orm.rooms.create({
      hostelId: hostelId,
      roomNo: roomNumber,
      capacity: capacity,
      floor: floor,
      occupied: 0,
      status: "Available",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Room created successfully",
        room,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create room error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}