import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const AuthCard = ({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) => (
  <>
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
    {footer ? <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p> : null}
  </>
);
