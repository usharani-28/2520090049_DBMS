
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentIdFromUserId } from "@/lib/student-access";

function getId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value.$oid) return String(value.$oid);

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

// GET - Fetch bookings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const bookings = await prisma.orm.bookings.all();

    if (!userId) {
      return NextResponse.json({
        success: true,
        bookings,
      });
    }

    const studentId = await getStudentIdFromUserId(userId);

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student record not found",
        },
        { status: 404 }
      );
    }

    const studentBookings = bookings.filter(
      (booking: any) => getId(booking.studentId) === studentId
    );

    return NextResponse.json({
      success: true,
      bookings: studentBookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings",
      },
      { status: 500 }
    );
  }
}

// POST - Create booking
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = String(body.userId ?? "");
    const roomId = String(body.roomId ?? "");
    const amount = Number(body.amount);
    const checkIn = String(body.checkIn ?? "");
    const checkOut = String(body.checkOut ?? "");

    if (!userId || !roomId || !checkIn || !checkOut) {
      return NextResponse.json(
        {
          success: false,
          message: "All booking fields are required",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount) || amount < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount must be a valid non-negative integer",
        },
        { status: 400 }
      );
    }

    if (!/^[a-fA-F0-9]{24}$/.test(roomId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid room ID",
        },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (
      Number.isNaN(checkInDate.getTime()) ||
      Number.isNaN(checkOutDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid check-in or check-out date",
        },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Check-out date must be after check-in date",
        },
        { status: 400 }
      );
    }

    const studentId = await getStudentIdFromUserId(userId);

    if (!studentId) {
      return NextResponse.json(
        {
          success: false,
          message: "Student record not found",
        },
        { status: 404 }
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
          message: "Room not found",
        },
        { status: 404 }
      );
    }

    const roomCapacity = Number(room.capacity ?? 0);
    const occupied = Number(room.occupied ?? 0);

    if (occupied >= roomCapacity) {
      return NextResponse.json(
        {
          success: false,
          message: "This room is currently full",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.orm.bookings.create({
      studentId,
      roomId,
      amount,
      checkIn,
      checkOut,
      status: "Pending",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Booking request submitted successfully",
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create booking",
      },
      { status: 500 }
    );
  }
}

// PATCH - Approve or reject booking
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const requestId = String(body.bookingId ?? body.requestId ?? "");
    const status = String(body.status ?? "");

    if (!requestId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "bookingId and status are required",
        },
        { status: 400 }
      );
    }

    if (!["Booked", "Rejected"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be Booked or Rejected",
        },
        { status: 400 }
      );
    }

    if (!/^[a-fA-F0-9]{24}$/.test(requestId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID",
        },
        { status: 400 }
      );
    }

    const bookings = await prisma.orm.bookings.all();

    const existingBooking = bookings.find((booking: any) => {
      return getId(booking.id ?? booking._id) === requestId;
    });

    if (!existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
          receivedBookingId: requestId,
          availableIds: bookings.map((booking: any) =>
            getId(booking.id ?? booking._id)
          ),
        },
        { status: 404 }
      );
    }

    if (existingBooking.status !== "Pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Only pending bookings can be updated",
        },
        { status: 400 }
      );
    }

    const existingId = getId(
      existingBooking.id ?? existingBooking._id
    );

    const updatedBooking = await prisma.orm.bookings
      .where({ _id: existingId })
      .update({
        status,
      });

    return NextResponse.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error("Update booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update booking",
      },
      { status: 500 }
    );
  }
}