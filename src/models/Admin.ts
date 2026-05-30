import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  salt: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  setPassword: (password: string) => void;
  validPassword: (password: string) => boolean;
}

const AdminSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
    name: { type: String },
  },
  { timestamps: true }
);

AdminSchema.methods.setPassword = function(password: string) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, "sha512")
    .toString("hex");
};

AdminSchema.methods.validPassword = function(password: string) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, "sha512")
    .toString("hex");
  return this.passwordHash === hash;
};

export default mongoose.model<IAdmin>("Admin", AdminSchema);
