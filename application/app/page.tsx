import { HomeView, loadHome } from "@/components/HomeView";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <HomeView {...await loadHome()} />;
}
