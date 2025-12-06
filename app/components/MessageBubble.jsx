// components/MessageBubble.jsx

export default function MessageBubble({ isOwn, children }) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: isOwn ? "flex-end" : "flex-start",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: isOwn ? "#0070f3" : "#e5e5e5",
            color: isOwn ? "white" : "black",
            maxWidth: "70%",
            fontSize: 14,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
  