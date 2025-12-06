import { supabase } from "./supabase";

export async function ensureProfileExists(user) {
  if (!user) return;

  const email = user.email;

  // Try to insert or update
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username: email,  // store Gmail here
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Profile upsert failed:", error);
  }
}
