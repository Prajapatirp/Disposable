import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdmin {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new mongoose.Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

AdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

AdminSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, (this as IAdmin).password);
};

export default (mongoose.models?.Admin as mongoose.Model<IAdmin>) || mongoose.model<IAdmin>("Admin", AdminSchema);
