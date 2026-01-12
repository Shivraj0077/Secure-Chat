SecureChat — WhatsApp-Like Multi-Device Encrypted Messaging System
Table of Contents

Overview

Core Features

End-to-End Encryption Model

Multi-Device Architecture

Cryptography Design

Storage Rules

Client Workflow

Backend Architecture

System Design Concepts

Installation

Security Guarantees

Interview Highlights

Demo

Overview

SecureChat is a WhatsApp-like real-time messaging system designed with true end-to-end encryption (E2EE) and multi-device synchronization.
The system ensures that only user devices can decrypt messages, while the server acts purely as a ciphertext relay and metadata store.

The design supports:

Multiple devices per user

Secure device linking

Forward secrecy at the conversation level

Zero plaintext exposure on the server

Core Features
🔐 End-to-End Encryption

AES-GCM encryption for messages

Per-chat symmetric encryption keys

RSA / ECC public-key encryption for device key sharing

Zero server-side decryption

📱 Multi-Device Support

Independent cryptographic identity per device

Secure chat key re-sharing when a new device joins

Device revocation support

⚡ Real-Time Messaging

Supabase Realtime / WebSockets

Encrypted message fan-out

Offline message recovery

🧠 System-Design First

Append-only message model

Stateless message services

Horizontally scalable architecture

End-to-End Encryption Model

This system follows a conversation-level encryption model.

Key Principles

Each chat has exactly one symmetric ChatKey

All messages in that chat are encrypted using that ChatKey

Each device has its own public/private keypair

ChatKey is encrypted separately for every device

Server never sees plaintext messages or keys

Multi-Device Architecture
Device Identity Rules

Every device generates its own asymmetric keypair

Private key never leaves the device

Public key is uploaded to the server

Each device is treated as an independent cryptographic identity

Device Linking Flow

New device generates keypair

Uploads public key to server

Existing device encrypts ChatKey using new device’s public key

Server stores encrypted ChatKey for that device

New device decrypts ChatKey locally

Cryptography Design
Message Encryption

Algorithm: AES-GCM

Key: ChatKey (per conversation)

IV: Randomly generated per message

ciphertext = AES_GCM_Encrypt(ChatKey, plaintext, iv)

Chat Key Encryption

Algorithm: Public-key encryption (RSA/ECC)

EncryptedChatKey = Encrypt(ChatKey, DevicePublicKey)

Key Properties

Same ChatKey

Different encrypted copies per device

Only correct private key can decrypt its copy

Storage Rules
Client-Side

Private keys → Encrypted IndexedDB

Decrypted ChatKeys → Memory only

Messages → Encrypted at rest

Server-Side

Public keys

Encrypted ChatKeys (per device)

Encrypted messages (ciphertext + IV)

Metadata only (timestamps, sender ID)

🚫 No plaintext ever stored on server

Client Workflow
On Login

Load device private key from IndexedDB

Fetch encrypted ChatKeys

Decrypt ChatKeys locally

Cache ChatKeys in memory

Sending a Message

Encrypt message with ChatKey

Send ciphertext + IV

Server broadcasts ciphertext

Receiving a Message

Receive encrypted payload

Decrypt using ChatKey

Render plaintext locally

Backend Architecture
Core Services

WebSocket / Realtime Server — message delivery

Message Service — append-only message writes

Presence Service — online status, typing indicators

Media Service — S3 + CDN for encrypted media

Notification Service — push notifications

Infrastructure

Supabase Realtime / WebSockets

PostgreSQL / MongoDB

Redis (presence, typing)

Object storage for media

System Design Concepts Applied

Append-Only Logs — immutable message history

CQRS — optimized reads vs writes

Kafka-style Streams — message pipelines

RabbitMQ-style ACKs — delivery confirmations

Redis — online presence & typing indicators

Rate Limiting — spam prevention

Session-based Socket Auth

Prometheus Metrics — latency tracking

Installation
git clone https://github.com/your-username/securechat
cd securechat

npm install
npm run dev


Environment variables:

DATABASE_URL=
REDIS_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

Security Guarantees

✔ Server cannot decrypt messages
✔ Server cannot decrypt ChatKeys
✔ Each device compromise is isolated
✔ Message confidentiality preserved
✔ Secure multi-device re-sync
✔ Loss of private key = loss of access (by design)

Interview Highlights

“Each conversation uses a single symmetric key, but that key is encrypted independently for every device. This allows true multi-device support without ever exposing keys to the server.”

“Messages are immutable append-only events; reads are optimized separately using CQRS.”

“The server is cryptographically blind — it only routes ciphertext.”

License

MIT License

Built By

Shivraj Pawar
Backend / Distributed Systems / Encryption-Focused Engineer
