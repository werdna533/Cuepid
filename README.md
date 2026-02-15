# Cuepid - AI-Powered Conversation Practice Platform

An intelligent conversation practice application that helps users improve their communication skills through AI-powered voice and text interactions. Features adaptive difficulty scaling, real-time voice analysis, and RAG-enhanced responses based on relationship research.

## 🌟 Features

### Core Functionality
- **6 Conversation Scenarios**: Practice different social situations including difficult conversations, first dates, conflict resolution, networking, small talk, and personalized weakness training
- **Voice Mode**: Real-time voice conversations with natural-sounding AI using ElevenLabs TTS/STT
- **Text Mode**: Traditional text-based chat for flexible practice
- **Adaptive Difficulty**: Dynamic scaling (Levels 1-10) based on performance metrics
- **Performance Analytics**: Track engagement, empathy, initiative, clarity, confidence, and filler word usage

### Advanced Features
- **RAG Integration**: Context-aware responses powered by relationship psychology knowledge from "Intimate Relationships" textbook
- **18 Emotional Tones**: AI responds with contextually appropriate emotions (warm, encouraging, nervous, defensive, etc.)
- **XP & Leveling System**: Progress through 10 levels by completing conversations
- **Strengths & Weaknesses Analysis**: AI identifies communication patterns and provides personalized practice scenarios
- **Voice Metrics Dashboard**: Visualize performance trends with interactive charts

## 🛠 Tech Stack

### Frontend
- **Next.js 16.1.6** (App Router with Turbopack)
- **React 19** with TypeScript
- **Tailwind CSS 4.0** with custom styling
- **Recharts** for data visualization

### Backend & AI
- **Google Gemini 2.5 Flash** - LLM for conversation generation
- **ElevenLabs API** - Text-to-Speech and Speech-to-Text
- **OpenAI API** - Text embeddings for RAG (text-embedding-3-small)
- **Vectra** - Local vector database for semantic search

### Database & Storage
- **MongoDB** with Mongoose ORM
- User profiles with conversation history
- Performance metrics tracking

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or Atlas)
- API Keys:
  - Google Gemini API key
  - ElevenLabs API key
  - OpenAI API key (for RAG)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CtrlHackDel2.0/web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the `web` directory:

```env
# Gemini LLM
GEMINI_API_KEY=your_gemini_api_key

# ElevenLabs Voice
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# MongoDB Atlas:
# MONGODB_URI=key

# OpenAI (for RAG)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start practicing.

## 📁 Project Structure

```
web/
├── app/
│   ├── api/
│   │   ├── analyze/         # Voice metrics analysis
│   │   ├── chat/            # Text chat endpoint
│   │   ├── conversations/   # Conversation CRUD
│   │   ├── user/            # User management
│   │   └── voice/           # Voice chat & TTS/STT
│   ├── chat/
│   │   └── [scenarioId]/    # Text and voice chat pages
│   ├── dashboard/           # Analytics dashboard
│   │   └── voice/           # Voice-specific analytics
│   ├── profile/             # User profile & stats
│   └── page.tsx             # Home/scenario selection
├── lib/
│   ├── gemini.ts            # Gemini LLM client
│   ├── mongodb.ts           # Database connection
│   ├── scenarios.ts         # Scenario definitions
│   ├── levels.ts            # XP/leveling system
│   ├── rate-limit.ts        # API rate limiting
│   ├── toneToVoiceSettings.ts # ElevenLabs voice configs
│   ├── bookRAG.ts           # RAG query logic
│   ├── vectorstore.ts       # Vectra vector DB operations
│   ├── openai.ts            # OpenAI embeddings
│   └── models/
│       ├── User.ts          # User schema
│       └── Conversation.ts  # Conversation schema
└── public/
    └── scenarios/           # Scenario images
```

## 🎯 Usage

### Starting a Conversation

1. **Select a Scenario** from the home page
2. Choose **Text Mode** or **Voice Mode**
3. The AI will initiate with a contextually appropriate starter message
4. Practice your responses naturally

### Voice Mode Features

- **Real-time Speech-to-Text**: Speak naturally and see your words transcribed
- **Natural Voice Responses**: Hear AI responses with 18 different emotional tones
- **Live Performance Metrics**: Track WPM, confidence, and filler word usage
- **Adaptive Difficulty**: AI adjusts complexity based on your performance

### Viewing Progress

- **Profile Page**: View overall stats, XP, level, strengths, and weaknesses
- **Voice Dashboard**: Analyze performance trends across conversations
- **Conversation History**: Review past interactions and metrics

