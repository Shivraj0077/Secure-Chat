"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import {
  importChatKeyFromBase64,
  generateChatKey,
  cacheChatKey,
  getCachedChatKey,
  encryptWithChatKey,
  decryptWithChatKey,
} from "@/lib/crypto";

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [chat, setChat] = useState(null);         // { id, chat_key, ... }
  const [chatKey, setChatKey] = useState(null);   // CryptoKey
  const [messages, setMessages] = useState([]);   // decrypted messages
  const [text, setText] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const router = useRouter();

  // 1) Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("getUser error:", error);
        return;
      }
      if (!data.user) router.push("/login");
      else setUser(data.user);
    });
  }, [router]);

  // Helper: find or create partner profile by email (username)
  const getPartnerProfile = async (email) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", email)
      .single();

    if (error) {
      console.error("Partner not found:", error);
      throw new Error("No user with that email/username");
    }
    return data;
  };

  // Helper: find or create chat row
  const getOrCreateChat = async (partnerProfile) => {
    const myId = user.id;
    const otherId = partnerProfile.id;

    if (user.id === partnerProfile.id) {
      throw new Error("You cannot chat with yourself");
    }
    // 1) Try existing chat
    const { data: existingChats, error: existingErr } = await supabase
      .from("chats")
      .select("*")
      .or(
        `and(participant1.eq.${myId},participant2.eq.${otherId}),and(participant1.eq.${otherId},participant2.eq.${myId})`
      )
      .limit(1);

    if (existingErr && existingErr.code !== "PGRST116") {
      console.error("Error checking existing chat:", existingErr);
    }

    const existing = existingChats?.[0];

    if (existing) return existing;

    // 2) No chat: create new chat with fresh key
    const { key, b64 } = await generateChatKey();

    const { data: created, error: insertErr } = await supabase
      .from("chats")
      .insert({
        participant1: myId,
        participant2: otherId,
        chat_key: b64,
      })
      .select("id, participant1, participant2, chat_key")
      .single();

    if (insertErr) {
      console.error("Error creating chat:", insertErr);
      throw insertErr;
    }

    // We know the key here, so store it in local state & cache
    cacheChatKey(created.id, b64);
    setChatKey(key);

    return created;
  };

  // Helper: ensure we have CryptoKey for this chat
  const ensureChatKey = async (chatRow) => {
    if (chatKey) return chatKey;

    // Try localStorage cache first
    const cached = getCachedChatKey(chatRow.id);
    const b64 = cached || chatRow.chat_key;

    const key = await importChatKeyFromBase64(b64);

    if (!cached) cacheChatKey(chatRow.id, b64);
    setChatKey(key);
    return key;
  };

  // Called when user enters partner's Gmail and hits "Start chat"
  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!user || !partnerEmail.trim()) return;

    setLoadingChat(true);
    try {
      const partner = await getPartnerProfile(partnerEmail.trim());
      const chatRow = await getOrCreateChat(partner);
      setChat(chatRow);
      await ensureChatKey(chatRow);
    } catch (err) {
      console.error("Start chat error:", err);
      alert(err.message || "Could not start chat");
    } finally {
      setLoadingChat(false);
    }
  };

  // 2) Load + subscribe messages when chat + key ready
  useEffect(() => {
    if (!user || !chat || !chatKey) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, chat_id, sender_id, ciphertext, iv, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
        return;
      }

      const decrypted = [];
      for (const row of data || []) {
        const content = await decryptWithChatKey(
          chatKey,
          row.ciphertext,
          row.iv
        );
        decrypted.push({ ...row, content });
      }
      setMessages(decrypted);
    };

    load();

    const channel = supabase
  .channel(`chat-${chat.id}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `chat_id=eq.${chat.id}`,
    },
    (payload) => {
      console.log("Realtime payload:", payload);

      const row = payload.new;
      decryptWithChatKey(chatKey, row.ciphertext, row.iv).then((content) => {
        setMessages((prev) => [...prev, { ...row, content }]);
      });
    }
  )
  .subscribe((status) => {
    console.log("Realtime status:", status);
  });

      
    return () => {
      supabase.removeChannel(channel);
    };

  }, [user, chat, chatKey]);


  // 3) Send encrypted message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user || !chat || !chatKey) return;

    try {
      const { ciphertext, iv } = await encryptWithChatKey(
        chatKey,
        text.trim()
      );

      const { error } = await supabase.from("messages").insert({
        chat_id: chat.id,
        sender_id: user.id,
        ciphertext,
        iv,
      });

      if (error) console.error("Send error:", error);
      setText("");
    } catch (err) {
      console.error("Encrypt/Send error:", err);
    }
  };

  if (!user) return <p>Loading…</p>;

  

  return (
    <div style={{ background: "#202021", minHeight: "100vh", color: "#fff" }}>
      <div style={{ maxWidth: 700, margin: "20px auto", padding: 20 }}>
        {/* Partner email input */}
        <form
          onSubmit={handleStartChat}
          style={{ display: "flex", gap: 8, marginBottom: 16 }}
        >
          <input
            style={{ flex: 1, padding: 10, color: "#000" }}
            placeholder="Enter partner's Gmail (same as username)"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
          />
          <button
            type="submit"
            style={{
              padding: "10px 15px",
              background: "#0070f3",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
            disabled={loadingChat}
          >
            {loadingChat ? "Starting..." : "Start chat"}
          </button>
        </form>

        {/* Only show chat UI once a chat is selected/created */}
        {chat && chatKey ? (
          <>
            <div style={{ marginBottom: 8, fontSize: 14, opacity: 0.8 }}>
              Chat ID: {chat.id}
            </div>
            <MessageList userId={user.id} messages={messages} />
            <MessageInput
              value={text}
              onChange={setText}
              onSend={handleSend}
            />
          </>
        ) : (
          <p style={{ marginTop: 20, opacity: 0.8 }}>
            Start by entering someone&apos;s Gmail to chat.
          </p>
        )}
      </div>
    </div>
  );
}
