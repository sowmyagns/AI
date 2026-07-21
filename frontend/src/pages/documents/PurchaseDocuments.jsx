import DocumentsDashboard from "./DocumentsDashboard";

export default function PurchaseDocuments() {
  return (
    <DocumentsDashboard
      title="Purchase Documents"
      subtitle="Purchase orders, invoices, and supplier paperwork."
      initialDocType="purchase"
    />
  );
}
