import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { OrganizerDashboard } from "./organizer-dashboard";
import { CoordinatorDashboard } from "./coordinator-dashboard";
import { ProfessionalDashboard } from "./professional-dashboard";

export default async function PainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Painel</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Bem-vindo, {session.user.name}
        </p>
      </div>

      {role === "ORGANIZADOR" && <OrganizerDashboard />}
      {role === "COORDENADOR" && <CoordinatorDashboard />}
      {role === "PROFISSIONAL" && <ProfessionalDashboard />}
    </div>
  );
}
