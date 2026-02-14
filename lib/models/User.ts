import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  visitorId: string;
  level: number;
  xp: number;
  strengths: string[];
  weaknesses: string[];
  conversationCount: number;
  voiceConversationCount: number;
  avgVoiceMetrics: {
    wpm: number;
    fillerFrequency: number;
    confidenceScore: number;
    empathyScore: number;
    initiativeScore: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    visitorId: { type: String, required: true, unique: true },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    conversationCount: { type: Number, default: 0 },
    voiceConversationCount: { type: Number, default: 0 },
    avgVoiceMetrics: {
      type: {
        wpm: Number,
        fillerFrequency: Number,
        confidenceScore: Number,
        empathyScore: Number,
        initiativeScore: Number,
      },
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
