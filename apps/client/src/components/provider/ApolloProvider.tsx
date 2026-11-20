"use client";

import { createApolloClient } from "@/clients/api";
import { ApolloProvider } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import LoaderIc from "../loader";

export default function ProviderApollo({
  children,
  localAuthBypass = false,
}: {
  children: React.ReactNode;
  localAuthBypass?: boolean;
}) {
  if (localAuthBypass) {
    return (
      <ApolloProvider client={createApolloClient(async () => null)}>
        {children}
      </ApolloProvider>
    );
  }

  return <AuthenticatedApolloProvider>{children}</AuthenticatedApolloProvider>;
}

function AuthenticatedApolloProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoaderIc />;
  }

  const client = createApolloClient(getToken);

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
