import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { travelPlans } from "../../db/schema.js";

export default async (request: Request) => {
  if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405 });
  try {
    const user = await getUser();
    if (!user?.email) return Response.json({ plans: [] });
    const rows = await db.select().from(travelPlans).where(eq(travelPlans.userEmail, user.email)).orderBy(desc(travelPlans.createdAt)).limit(6);
    return Response.json({ plans: rows });
  } catch {
    return Response.json({ plans: [] });
  }
};

export const config: Config = { path: "/api/recent-plans" };
