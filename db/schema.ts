import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const travelPlans = pgTable("travel_plans", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email"),
  destination: text("destination").notNull(),
  days: integer("days").notNull(),
  budget: text("budget").notNull(),
  travelType: text("travel_type").notNull(),
  preferences: jsonb("preferences").notNull(),
  itinerary: jsonb("itinerary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
