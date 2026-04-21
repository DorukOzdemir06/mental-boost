import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Fisher-Yates shuffle — returns a new array
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

  // Parse options JSON and shuffle option order
  const parsed = questions.map((q) => ({
    ...q,
    options: shuffle(JSON.parse(q.options as string) as string[]),
  }));

  return Response.json(parsed);
}
