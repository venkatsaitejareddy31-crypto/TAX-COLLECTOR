import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { downloadInvoicePdf } from "./pdf";

const blankItem = { description: "", quantity: 1, rate: 0 };
const initialForm = {
  invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
  clientName: "",
  clientEmail: "",
  issueDate: new Date().toISOString().slice(0, 10),
  status: "Draft",
  taxRegion: "US",
  items: [{ ...blankItem }]
};

function App() {
  const [invoices, setInvoices] = useState([]);
  const [taxRegion, setTaxRegion] = useState("US");
  const [taxEstimate, setTaxEstimate] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [dbMode, setDbMode] = useState("checking");

  const formTotal = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0),
    [form.items]
  );

  async function loadDashboard(region = taxRegion) {
    const [healthResponse, invoiceResponse, taxResponse] = await Promise.all([
      api.get("/health"),
      api.get("/invoices"),
      api.get(`/tax-estimate?region=${region}`)
    ]);

    setDbMode(healthResponse.data.database);
    setInvoices(invoiceResponse.data);
    setTaxEstimate(taxResponse.data);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...blankItem }] }));
  }

  async function createInvoice(event) {
    event.preventDefault();
    await api.post("/invoices", form);
    setForm({
      ...initialForm,
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`
    });
    await loadDashboard();
  }

  async function markPaid(invoice) {
    await api.patch(`/invoices/${invoice._id}/status`, { status: "Paid" });
    await loadDashboard();
  }

  async function changeRegion(region) {
    setTaxRegion(region);
    await loadDashboard(region);
  }

  return (
    <main>
      <section className="topbar">
        <div>
          <p className="eyebrow">Freelance Billing</p>
          <h1>Invoice Generator & Tax Estimator</h1>
        </div>
        <span className="status-pill">{dbMode === "mongodb" ? "MongoDB connected" : "Demo memory mode"}</span>
      </section>

      <section className="summary-grid">
        <article>
          <span>Paid income</span>
          <strong>${Number(taxEstimate?.income || 0).toLocaleString()}</strong>
        </article>
        <article>
          <span>Estimated tax</span>
          <strong>${Number(taxEstimate?.estimatedTax || 0).toLocaleString()}</strong>
        </article>
        <article>
          <span>Effective rate</span>
          <strong>{taxEstimate?.effectiveRate || 0}%</strong>
        </article>
      </section>

      <div className="workspace">
        <form className="panel invoice-form" onSubmit={createInvoice}>
          <div className="panel-heading">
            <h2>Create Invoice</h2>
            <strong>${formTotal.toFixed(2)}</strong>
          </div>

          <div className="form-grid">
            <label>
              Invoice number
              <input value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} />
            </label>
            <label>
              Issue date
              <input type="date" value={form.issueDate} onChange={(event) => updateField("issueDate", event.target.value)} />
            </label>
            <label>
              Client name
              <input required value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} />
            </label>
            <label>
              Client email
              <input type="email" value={form.clientEmail} onChange={(event) => updateField("clientEmail", event.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option>Draft</option>
                <option>Sent</option>
                <option>Paid</option>
              </select>
            </label>
            <label>
              Region
              <select value={form.taxRegion} onChange={(event) => updateField("taxRegion", event.target.value)}>
                <option>US</option>
                <option>India</option>
                <option>UK</option>
              </select>
            </label>
          </div>

          <div className="items">
            {form.items.map((item, index) => (
              <div className="item-row" key={index}>
                <input
                  required
                  placeholder="Service description"
                  value={item.description}
                  onChange={(event) => updateItem(index, "description", event.target.value)}
                />
                <input
                  min="1"
                  type="number"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, "quantity", event.target.value)}
                />
                <input
                  min="0"
                  type="number"
                  value={item.rate}
                  onChange={(event) => updateItem(index, "rate", event.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="secondary" onClick={addItem}>Add item</button>
            <button type="submit">Save invoice</button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Invoices</h2>
            <select value={taxRegion} onChange={(event) => changeRegion(event.target.value)}>
              <option>US</option>
              <option>India</option>
              <option>UK</option>
            </select>
          </div>

          <div className="invoice-list">
            {invoices.map((invoice) => (
              <article className="invoice-card" key={invoice._id}>
                <div>
                  <strong>{invoice.invoiceNumber}</strong>
                  <span>{invoice.clientName}</span>
                </div>
                <div className="amount">${Number(invoice.total).toFixed(2)}</div>
                <span className={`badge text-bg-${invoice.status === "Paid" ? "success" : "secondary"}`}>
                  {invoice.status}
                </span>
                <div className="card-actions">
                  {invoice.status !== "Paid" && (
                    <button className="secondary" onClick={() => markPaid(invoice)}>Mark paid</button>
                  )}
                  <button onClick={() => downloadInvoicePdf(invoice)}>PDF</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
