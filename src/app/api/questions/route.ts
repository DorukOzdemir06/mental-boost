import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicSlug = searchParams.get("topic");
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!topicSlug) {
    return Response.json({ error: "topic is required" }, { status: 400 });
  }

  const questions = db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.topicSlug, topicSlug))
    .orderBy(sql`RANDOM()`)
    .limit(limit)
    .all();

  // Parse options JSON
  const parsed = questions.map((q) => ({
    ...q,
    options: JSON.parse(q.options as string),
  }));

  return Response.json(parsed);
}
