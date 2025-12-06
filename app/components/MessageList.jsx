// components/MessageList.jsx

import MessageBubble from "./MessageBubble";

export default function MessageList({ userId, messages }) {
  return (
    <div
      style={{
        height: 350,
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: 10,
        marginBottom: 15,
        background: "#fff",
      }}
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          isOwn={msg.sender_id === userId}
        >
          {msg.content}
        </MessageBubble>
      ))}
    </div>
  );
}
