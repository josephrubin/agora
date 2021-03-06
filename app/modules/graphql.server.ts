/**
 * Client module for interacting with our graphql backend.
 * We use graphql-request https://github.com/prisma-labs/graphql-request
 * at the moment. It is a fairly light library that is React-unaware
 * and our module provides a wrapper around it.
*/

import { GraphQLClient } from "graphql-request";

/* The location of our GraphQL server. TODO: This should come in as an environment
 * variable which depends on our target environment. */
const GRAPHQL_ENDPOINT = "https://qf4wyoqdyfe2jhrxs4uopzh4re.appsync-api.us-east-1.amazonaws.com/graphql";

const graphQlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    Authorization: "nothing",
  },
});

/* We'll let other modules handle the specific graph requests.
 * Here we will reveal the general method for making requests
 * which does allow settings to be set on a single-request basis.
 *
 * Direct assignment saves us from having to type the exported functions,
 * but this means we gotta do a context binding hack so the functions
 * aren't executed with this module's `this` context. */
const request = graphQlClient.request.bind(graphQlClient);
const rawRequest = graphQlClient.rawRequest.bind(graphQlClient);
const batchRequests = graphQlClient.batchRequests.bind(graphQlClient);

export { request, rawRequest, batchRequests };
