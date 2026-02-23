import mongoose from "mongoose";

export interface IOtpRequest {
  _id: mongoose.Types.ObjectId;
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpRequestSchema = new mongoose.Schema<IOtpRequest>(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Remove expired OTPs when finding (optional: use TTL index instead)
OtpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models?.OtpRequest as mongoose.Model<IOtpRequest>) ||
  mongoose.model<IOtpRequest>("OtpRequest", OtpRequestSchema);
