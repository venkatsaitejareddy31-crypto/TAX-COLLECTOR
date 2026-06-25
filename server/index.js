import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Invoice from "./models/Invoice.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "";

app.use(cors());
app.use(express.json());

let mongoReady = false;
let memoryInvoices = [
  {
    _id: "demo-1",
    invoiceNumber: "INV-1001",
    clientName: "Acme Studio",
    clientEmail: "billing@acme.example",
    issueDate: new Date().toISOString().slice(0, 10),
    status: "Paid",
    taxRegion: "US",
    items: [
      { description: "Brand identity sprint", quantity: 1, rate: 1200 },
      { description: "Landing page copy", quantity: 2, rate: 250 }
    ],
    createdAt: new Date().toISOString()
  }
];

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      mongoReady = true;
      console.log("MongoDB connected");
    })
    .catch((error) => {
      console.log(`MongoDB unavailable, using demo memory store: ${error.message}`);
    });
}

const subtotal = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);

const normalizeInvoice = (invoice) => {
  const plain = invoice.toObject ? invoice.toObject() : invoice;
  return {
    ...plain,
    total: subtotal(plain.items),
    paidTotal: plain.status === "Paid" ? subtotal(plain.items) : 0
  };
};

const taxRates = {
  US: [
    { upTo: 11000, rate: 0.1 },
    { upTo: 44725, rate: 0.12 },
    { upTo: 95375, rate: 0.22 },
    { upTo: Infinity, rate: 0.24 }
  ],
  India: [
    { upTo: 300000, rate: 0 },
    { upTo: 600000, rate: 0.05 },
    { upTo: 900000, rate: 0.1 },
    { upTo: Infinity, rate: 0.15 }
  ],
  UK: [
    { upTo: 12570, rate: 0 },
    { upTo: 50270, rate: 0.2 },
    { upTo: 125140, rate: 0.4 },
    { upTo: Infinity, rate: 0.45 }
  ]
};

function estimateTax(income, region = "US") {
  const brackets = taxRates[region] || taxRates.US;
  let tax = 0;
  let lower = 0;

  for (const bracket of brackets) {
    const taxable = Math.max(Math.min(income, bracket.upTo) - lower, 0);
    tax += taxable * bracket.rate;
    lower = bracket.upTo;
    if (income <= bracket.upTo) break;
  }

  return Math.round(tax);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: mongoReady ? "mongodb" : "memory" });
});

app.get("/api/invoices", async (req, res) => {
  const invoices = mongoReady
    ? await Invoice.find().sort({ createdAt: -1 })
    : [...memoryInvoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(invoices.map(normalizeInvoice));
});

app.post("/api/invoices", async (req, res) => {
  const payload = {
    ...req.body,
    items: (req.body.items || []).filter((item) => item.description)
  };

  if (mongoReady) {
    const created = await Invoice.create(payload);
    return res.status(201).json(normalizeInvoice(created));
  }

  const created = {
    ...payload,
    _id: `demo-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  memoryInvoices.unshift(created);
  res.status(201).json(normalizeInvoice(created));
});

app.patch("/api/invoices/:id/status", async (req, res) => {
  const { status } = req.body;

  if (mongoReady) {
    const updated = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
    return res.json(normalizeInvoice(updated));
  }

  memoryInvoices = memoryInvoices.map((invoice) =>
    invoice._id === req.params.id ? { ...invoice, status } : invoice
  );
  res.json(normalizeInvoice(memoryInvoices.find((invoice) => invoice._id === req.params.id)));
});

app.get("/api/tax-estimate", async (req, res) => {
  const region = req.query.region || "US";
  const invoices = mongoReady ? await Invoice.find({ status: "Paid" }) : memoryInvoices;
  const income = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + subtotal(invoice.items), 0);

  res.json({
    region,
    income,
    estimatedTax: estimateTax(income, region),
    effectiveRate: income ? Math.round((estimateTax(income, region) / income) * 1000) / 10 : 0
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
