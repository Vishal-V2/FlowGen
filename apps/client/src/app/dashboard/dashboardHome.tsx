"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function DashboardHome({
  localAuthBypass,
}: {
  localAuthBypass: boolean;
}) {
  return (
    <div className="space-y-8">
      <div>
        {localAuthBypass ? (
          <h1 className="mb-2 text-3xl font-bold text-foreground">Welcome to FlowGen!</h1>
        ) : (
          <AuthenticatedWelcome />
        )}
        <p className="text-muted-foreground">Ready to create your next automation?</p>
      </div>

      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Home</h2>
          <Button className="bg-primary hover:bg-primary/90">Create an Automation</Button>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedWelcome() {
  const { user } = useUser();

  return (
    <h1 className="mb-2 text-3xl font-bold text-foreground">
      Welcome back, {user?.firstName} {user?.lastName}!
    </h1>
  );
}
