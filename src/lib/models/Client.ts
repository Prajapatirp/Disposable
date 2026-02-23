import mongoose from "mongoose";

export interface IClient {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  /** @deprecated Use addressLine1, city, state, etc. Kept for legacy records. */
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  businessName?: string;
  gstNumber?: string;
  companyAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new mongoose.Schema<IClient>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: false },
    addressLine1: { type: String },
    addressLine2: { type: String },
    pincode: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: "India" },
    businessName: { type: String },
    gstNumber: { type: String },
    companyAddress: { type: String },
  },
  { timestamps: true }
);

export default (mongoose.models?.Client as mongoose.Model<IClient>) || mongoose.model<IClient>("Client", ClientSchema);
