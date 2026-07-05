import { NextResponse } from "next/server";
import { getDeezerAuthUrl } from "@/lib/deezer";

export async function GET() {
  return NextResponse.redirect(getDeezerAuthUrl());
}
