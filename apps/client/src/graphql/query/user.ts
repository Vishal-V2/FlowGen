import { gql } from "@apollo/client";
import { graphql } from "@/gql";

export const CURRENT_USER = gql`
  query CurrentUser {
    getCurrentUser {
      id
      userBalance {
        credits
      }
    }
  }
`;

export const GET_CREDENTIALS = graphql(`
  query GetCredentials {
    getCredentials {
      id
      name
      value
    }
  }
`);

export const GET_CREDENTIAL = graphql(`
  query GetCredential($id: ID!) {
    getCredential(id: $id) {
      id
      name
      value
    }
  }
`);
