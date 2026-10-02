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

  return String(value);
}

// GET - Fetch payments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const payments = await prisma.orm.payments.all();

    let filteredPayments = payments;

    // Student-specific filtering
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

      const bookings = await prisma.orm.bookings.all();

      const studentBookingIds = bookings
        .filter(
          (booking: any) =>
            getId(booking.studentId) === studentId
        )
        .map((booking: any) =>
          getId(booking.id ?? booking._id)
        );

      filteredPayments = payments.filter((payment: any) =>
        studentBookingIds.includes(getId(payment.bookingId))
      );
    }

    const formattedPayments = filteredPayments.map(
      (payment: any) => ({
        id: getId(payment.id ?? payment._id),
        bookingId: getId(payment.bookingId),
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        status: payment.status,
      })
    );

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
    });
  } catch (error) {
    console.error("Get payments error:", error);

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

// POST - Create a payment
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const bookingId = String(body.bookingId ?? "").trim();
    const method = String(body.method ?? "").trim();
    const status = String(body.status ?? "Pending").trim();

    if (!bookingId || body.amount === undefined || !method) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking ID, amount and payment method are required",
        },
        { status: 400 }
      );
    }

    if (!/^[a-fA-F0-9]{24}$/.test(bookingId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid booking ID: ${bookingId}`,
        },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a non-negative integer",
        },
        { status: 400 }
      );
    }

    const paidAt = new Date().toISOString();

    const payment = await prisma.orm.payments.create({
      bookingId,
      amount,
      method,
      paidAt,
      status,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Payment created successfully",
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create payment error:", error);

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