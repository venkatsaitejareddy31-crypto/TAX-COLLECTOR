import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    issueDate: { type: String, required: true },
    status: { type: String, enum: ["Draft", "Sent", "Paid"], default: "Draft" },
    taxRegion: { type: String, enum: ["US", "India", "UK"], default: "US" },
    items: [itemSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
