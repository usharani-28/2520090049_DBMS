import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      hostels,
      rooms,
      students,
      bookings,
      payments,
    ] = await Promise.all([
      prisma.orm.hostels.all(),
      prisma.orm.rooms.all(),
      prisma.orm.students.all(),
      prisma.orm.bookings.all(),
      prisma.orm.payments.all(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalHostels: hostels.length,
        totalRooms: rooms.length,
        totalStudents: students.length,
        totalBookings: bookings.length,
        totalPayments: payments.length,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}