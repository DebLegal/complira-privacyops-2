import { notFound } from "next/navigation";
import Workspace from "../../workspace";
export function generateStaticParams() {
  return [
    "overview",
    "processing",
    "vendors",
    "notices",
    "changes",
    "findings",
    "reports",
  ].map((module) => ({ module }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (
    ![
      "overview",
      "processing",
      "vendors",
      "notices",
      "changes",
      "findings",
      "reports",
    ].includes(module)
  )
    notFound();
  return <Workspace module={module} />;
}
