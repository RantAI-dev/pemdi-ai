import { getAplikasi, getDataStatistik } from "@/lib/data";
import { DataTampilan } from "./data-tampilan";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [app, stat] = await Promise.all([getAplikasi(), getDataStatistik()]);
  return <DataTampilan app={app} stat={stat} />;
}
