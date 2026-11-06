import { ChangePasswordCard } from "./ChangePasswordCard";
import { MfaCard } from "./MfaCard";
import { SessionsCard } from "./SessionsCard";

export const SecurityPage = () => (
  <div className="space-y-6">
    <MfaCard />
    <ChangePasswordCard />
    <SessionsCard />
  </div>
);
