import AlertsDashboard from "./AlertsDashboard";

export default function ProductionDelayAlerts() {
  return (
    <AlertsDashboard
      title="Production Delay Alerts"
      subtitle="Work orders falling behind schedule."
      initialAlertType="production_delay"
    />
  );
}
