"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.push("/chat");
      }
    }
    handleCallback();
  }, [router]);

  return <div>Logging you in…</div>;
}
