import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { travelPlans } from "../../db/schema.js";
import { db } from "../../db/client.js";

interface PlannerInput {
  destination: string;
  days: number;
  budget: string;
  travelType: string;
  activities: string[];
  food: string;
  transport: string;
  email?: string;
}

const createPrompt = (input: PlannerInput) => `You are an expert travel planner. Return JSON only for this request: ${JSON.stringify(input)}.
Use this schema: {"trip_title":"string","summary":"string","best_time":"string","estimated_budget":{"total":"string","breakdown":[{"label":"string","amount":"string"}]},"days":[{"day":1,"title":"string","morning":"string","afternoon":"string","evening":"string","food":"string","estimated_cost":"string"}],"attractions":[{"name":"string","description":"string"}],"hotels":[{"name":"string","area":"string","price_range":"string","why":"string"}],"foods":[{"name":"string","description":"string"}],"packing":["string"],"safety":["string"],"transport":["string"],"advice":["string"]}`;

const demoPlan = (input: PlannerInput) => ({
  trip_title: `${input.days}-Day ${input.destination} Discovery`,
  summary: `A thoughtful ${input.travelType.toLowerCase()} itinerary balancing ${input.activities.slice(0, 3).join(", ") || "sightseeing and local culture"} with time to recharge.`,
  best_time: "Choose the shoulder season for comfortable weather, better value, and lighter crowds.",
  estimated_budget: {
    total: input.budget,
    breakdown: [
      { label: "Stay", amount: "40%" }, { label: "Food", amount: "22%" },
      { label: "Local travel", amount: "18%" }, { label: "Experiences", amount: "20%" }
    ]
  },
  days: Array.from({ length: input.days }, (_, index) => ({
    day: index + 1,
    title: ["First impressions", "Culture & craft", "Nature & neighborhoods", "Hidden gems"][index % 4],
    morning: `Begin with breakfast and an early visit to a signature ${input.destination} landmark.`,
    afternoon: "Explore a nearby museum, market, scenic area, or artisan neighborhood at an easy pace.",
    evening: "Catch golden hour, take a relaxed walk, and enjoy a well-reviewed local dinner.",
    food: `Select a trusted restaurant with ${input.food.toLowerCase()} choices.`,
    estimated_cost: "₹2,500–₹5,500 per person"
  })),
  attractions: [
    { name: "Historic core", description: "Architecture, stories, and lively street scenes in the heart of the destination." },
    { name: "Local market", description: "Crafts, regional snacks, and a window into everyday culture." },
    { name: "Scenic viewpoint", description: "A memorable panorama, especially near sunset." }
  ],
  hotels: [
    { name: "Central boutique stay", area: "City center", price_range: "Mid-range", why: "Walkable access and convenient dining." },
    { name: "Quiet neighborhood hotel", area: "Residential district", price_range: "Value", why: "Restful nights and a local atmosphere." },
    { name: "Heritage or design hotel", area: "Historic quarter", price_range: "Premium", why: "A distinctive setting for a special trip." }
  ],
  foods: [
    { name: "Regional breakfast", description: "Try a popular morning specialty from a busy, trusted vendor." },
    { name: "Traditional tasting plate", description: "Sample several regional dishes in a single meal." },
    { name: "Local dessert", description: "End an evening with a destination-specific sweet." }
  ],
  packing: ["Comfortable walking shoes", "Reusable water bottle", "Light layers", "Power bank", "Sun protection", "Personal medicines"],
  safety: ["Keep digital copies of documents.", "Use licensed transport or trusted ride apps.", "Check opening hours and local advisories.", "Carry only the cash needed for the day."],
  transport: [`Primary preference: ${input.transport}`, "Group nearby attractions together.", "Allow extra time during rush hours."],
  advice: ["Reserve popular experiences early.", "Keep one flexible block in the schedule.", "Ask before photographing people or sacred spaces.", "Consider suitable travel insurance."],
  demo_mode: true
});

const parseGeneratedJson = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("watsonx.ai returned an unexpected response.");
  return JSON.parse(text.slice(start, end + 1));
};

async function generateWithWatsonx(input: PlannerInput) {
  const apiKey = Netlify.env.get("WATSONX_API_KEY");
  const projectId = Netlify.env.get("WATSONX_PROJECT_ID");
  const baseUrl = (Netlify.env.get("WATSONX_URL") || "https://us-south.ml.cloud.ibm.com").replace(/\/$/, "");
  const modelId = Netlify.env.get("WATSONX_MODEL_ID") || "ibm/granite-3-8b-instruct";
  if (!apiKey || !projectId) return demoPlan(input);

  const tokenResponse = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey })
  });
  if (!tokenResponse.ok) throw new Error("Unable to authenticate with IBM Cloud.");
  const { access_token: accessToken } = await tokenResponse.json() as { access_token: string };

  const modelResponse = await fetch(`${baseUrl}/ml/v1/text/generation?version=2024-05-31`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: modelId,
      project_id: projectId,
      input: createPrompt(input),
      parameters: { decoding_method: "greedy", max_new_tokens: 2400, repetition_penalty: 1.08 }
    })
  });
  if (!modelResponse.ok) throw new Error("IBM watsonx.ai could not generate the itinerary.");
  const payload = await modelResponse.json() as { results: Array<{ generated_text: string }> };
  return parseGeneratedJson(payload.results[0].generated_text);
}

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  try {
    const user = await getUser();
    const input = await request.json() as PlannerInput;
    if (!input.destination || !input.days || !input.budget) {
      return Response.json({ error: "Destination, days, and budget are required." }, { status: 400 });
    }
    const plan = await generateWithWatsonx({ ...input, days: Math.max(1, Math.min(Number(input.days), 14)) });
    try {
      await db.insert(travelPlans).values({
        userEmail: user?.email || null,
        destination: input.destination,
        days: Number(input.days),
        budget: input.budget,
        travelType: input.travelType,
        preferences: input,
        itinerary: plan
      });
    } catch (databaseError) {
      console.error("Plan persistence failed", databaseError);
    }
    return Response.json({ plan });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create the plan." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/generate-plan" };
