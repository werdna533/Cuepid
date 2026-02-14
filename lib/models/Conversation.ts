import mongoose, { Schema, Document } from "mongoose";

export interface IMessage {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export interface IAnalytics {
  tone: string;
  engagement: number;
  initiative: number;
  empathy: number;
  clarity: number;
  confidence: number;
  avgResponseLength: number;
  avgResponseTimeMs: number;
  suggestions: string[];
  xpEarned: number;
  summary: string;
}

export interface IConversation extends Document {
  userId: string;
  scenario: string;
  difficulty: string;
  messages: IMessage[];
  analytics: IAnalytics | null;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, required: true, index: true },
    scenario: { type: String, required: true },
    difficulty: { type: String, required: true },
    messages: [
      {
        role: { type: String, enum: ["user", "model"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Number, required: true },
      },
    ],
    analytics: {
      type: {
        tone: String,
        engagement: Number,
        initiative: Number,
        empathy: Number,
        clarity: Number,
        confidence: Number,
        avgResponseLength: Number,
        avgResponseTimeMs: Number,
        suggestions: [String],
        xpEarned: Number,
        summary: String,
      },
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);
