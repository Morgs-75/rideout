# 🏍️⚡ RideOut

A social media platform for electric motorbike riders. Share photos, short videos, and connect with the crew.

## Features

### Core Social Features
- **Photo & Video Sharing** — One photo or one 10-second video per post
- **Captions & Hashtags** — Describe your ride, tag it for discovery
- **Likes & Voting** — Instagram-style likes + Reddit-style upvote/downvote
- **Comments** — Engage with the community
- **Follow System** — Build your crew

### Unique Features
- **Street Names** — Choose your unique rider identity
- **Snap Map-style Location** — Share where you're riding (optional)
- **Push to Social** — Share directly to Snapchat & TikTok
- **Rider Map** — See where other riders are posting from
- **Content Moderation** — Report & flag inappropriate content

### Messaging
- **Direct Messages** — Chat one-on-one
- **Group Chats** — Up to 5 riders per group

### Coming Soon
- **RideOut Merch** — Rep the crew with branded shirts

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase account

### Installation

1. Clone and install:
   ```bash
   git clone https://github.com/yourusername/rideout.git
   cd rideout
   npm install
   ```

2. Set up Firebase:
   - Create project at [Firebase Console](https://console.firebase.google.com)
   - Enable Auth (Email/Password), Firestore, Storage
   
3. Configure environment:
   ```bash
   cp .env.example .env
   # Fill in Firebase credentials
   ```

4. Run:
   ```bash
   npm run dev
   ```

## Deployment

```bash
npm run build
firebase deploy
```

---

**Ride together. Share the volt. ⚡**
