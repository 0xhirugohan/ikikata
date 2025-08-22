import { createFileRoute } from "@tanstack/react-router";
import SleepTrackingDashboard from "../components/SleepTrackingDashboard";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return <SleepTrackingDashboard />;
}

export default Index;
