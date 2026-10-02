import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.orm.users.all();

    const formattedUsers = users.map((user: any) => ({
      id: String(user.id ?? user._id),
      name: user.name,
      email: user.email,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}