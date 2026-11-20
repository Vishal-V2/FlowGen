import DashboardHome from "./dashboardHome";

export default function HomePage() {
  const localAuthBypass =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_AUTH_BYPASS === "true";

  return <DashboardHome localAuthBypass={localAuthBypass} />;
}
