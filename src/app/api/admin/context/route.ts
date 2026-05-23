import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { CustomContext } from "@/types/domain";

const contextFilePath = path.join(process.cwd(), "src/lib/custom-context.json");

// Helper to read the context safely
function readContextSafely(): CustomContext | null {
  try {
    if (fs.existsSync(contextFilePath)) {
      const data = fs.readFileSync(contextFilePath, "utf8");
      return JSON.parse(data) as CustomContext;
    }
  } catch (error) {
    console.error("Error reading custom context file:", error);
  }
  return null;
}

// Helper to write the context safely
function writeContextSafely(context: CustomContext): boolean {
  try {
    const dirPath = path.dirname(contextFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(contextFilePath, JSON.stringify(context, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing custom context file:", error);
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  const context = readContextSafely();
  if (!context) {
    return NextResponse.json({ error: "Custom context file not found or corrupted" }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json(context, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CustomContext;

    if (!body || !body.persona || !body.scenario || !body.objectionFramework) {
      return NextResponse.json({ error: "Invalid context structure provided" }, { status: 400, headers: corsHeaders });
    }

    const success = writeContextSafely(body);
    if (!success) {
      return NextResponse.json({ error: "Failed to write context file to disk" }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: "AI Knowledge context updated successfully!" }, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/admin/context error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
