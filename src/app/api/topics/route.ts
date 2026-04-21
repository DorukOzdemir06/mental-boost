import { db } from "@/db";
import * as schema from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const topics = db.select().from(schema.topics).all();
  return Response.json(topics);
}
