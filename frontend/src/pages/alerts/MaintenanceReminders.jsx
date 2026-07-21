import AlertsDashboard from "./AlertsDashboard";

export default function MaintenanceReminders() {
  return (
    <AlertsDashboard
      title="Maintenance Reminders"
      subtitle="Upcoming and overdue maintenance tasks."
      initialAlertType="maintenance"
    />
  );
}
