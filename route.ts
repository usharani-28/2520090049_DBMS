
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scryptSync, timingSafeEqual } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // Get all users from MongoDB
    const users = await prisma.orm.users.all();

    // Find user by email
    const user = users.find((item: any) => {
      const userEmail = String(item.email ?? "")
        .trim()
        .toLowerCase();

      return userEmail === email;
    }) as any;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Read the stored password
    // Expected format: salt:hashedPassword
    const passwordValue = String(user.password ?? "");

    const passwordParts = passwordValue.split(":");

    if (passwordParts.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid stored password format",
        },
        { status: 500 }
      );
    }

    const [salt, storedHash] = passwordParts;

    if (!salt || !storedHash) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid stored password",
        },
        { status: 500 }
      );
    }

    // Hash the entered password using the stored salt
    const derivedKey = scryptSync(password, salt, 64);

    const storedHashBuffer = Buffer.from(storedHash, "hex");

    // Check whether the hash lengths match
    if (derivedKey.length !== storedHashBuffer.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Compare password hashes safely
    const passwordMatches = timingSafeEqual(
      derivedKey,
      storedHashBuffer
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Get the user's ID
    const userId = String(user.id ?? user._id ?? "");

    // Return only required user information
    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: userId,
        name: String(user.name ?? ""),
        email: String(user.email ?? ""),
        role: String(user.role ?? ""),
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}