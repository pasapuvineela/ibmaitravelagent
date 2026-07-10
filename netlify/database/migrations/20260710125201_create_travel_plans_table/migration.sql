CREATE TABLE IF NOT EXISTS "travel_plans" (
	"id" serial PRIMARY KEY,
	"user_email" text,
	"destination" text NOT NULL,
	"days" integer NOT NULL,
	"budget" text NOT NULL,
	"travel_type" text NOT NULL,
	"preferences" jsonb NOT NULL,
	"itinerary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
