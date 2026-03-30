import { PageHeader } from "@/components/shared/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral da sua fábrica" />
      <div className="p-6">
        <p className="text-muted-foreground">Em construção</p>
      </div>
    </div>
  );
}
