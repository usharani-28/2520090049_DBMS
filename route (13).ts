
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

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  return String(value);
}

// GET - Fetch all hostels
export async function GET() {
  try {
    const hostels = await prisma.orm.hostels.all();

    const formattedHostels = hostels.map((hostel: any) => ({
      id: getId(hostel.id ?? hostel._id),
      name: hostel.name,
      location: hostel.location,
      type: hostel.type,
    }));

    console.log("Formatted hostels:", formattedHostels);

    return NextResponse.json({
      success: true,
      hostels: formattedHostels,
    });
  } catch (error) {
    console.error("Get hostels error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Create a hostel
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const location = String(body.location ?? "").trim();
    const type = String(body.type ?? "").trim();

    if (!name || !location || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, location and type are required",
        },
        { status: 400 }
      );
    }

    const hostel = await prisma.orm.hostels.create({
      name,
      location,
      type,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Hostel created successfully",
        hostel,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create hostel error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}