import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// HTTP connection to the API
const httpLink = new HttpLink({
  uri: "http://localhost:8000/graphql",
});

// Middleware to add headers (X-Org-Slug)
const authLink = setContext((_, { headers }) => {
  const orgSlug = localStorage.getItem("orgSlug") || "demo-org"; // fallback for testing
  return {
    headers: {
      ...headers,
      "X-Org-Slug": orgSlug,
    },
  };
});

// Apollo Client setup
export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
