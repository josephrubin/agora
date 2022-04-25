import { gql } from "graphql-request";
import { Cast, MutationCreateCastArgs, MutationExportCastArgs, MutationReorderCastArgs, MutationTransferCastArgs } from "~/generated/graphql-schema";
import * as graphql from "./graphql.server";

export async function readCasts(accessToken: string) {
  const query = gql`
      query ReadCasts($accessToken: String!) {
        readAuthenticate(accessToken: $accessToken) {
          casts {
            id
            index
            mimeType
            uri
          }
        }
      }
  `;

  const data = await graphql.request(query, {
    accessToken: accessToken,
  });
  return data.readAuthenticate.collections;
}

export async function readCast(accessToken: string, id: string) : Promise<Cast> {
  const query = gql`
    query ReadCast($accessToken: String!, $id: ID!) {
      readAuthenticate(accessToken: $accessToken) {
        cast: readCast(id: $id) {
          id
          index
          mimeType
          uri
          history {
            epoch
            event
            target
          }
        }
      }
    }
  `;

  const response = await graphql.request(query, {
    id: id,
  });

  return response.cast;
}

export async function createCast(args: MutationCreateCastArgs) : Promise<Cast> {
  const mutation = gql`
    mutation CreateCast($accessToken: String!, $input: CastInput!) {
      cast: createCast(accessToken: $accessToken, input: $input) {
        id
        index
        mimeType
        uri
      }
    }
  `;

  const response = await graphql.request(mutation, {
    accessToken: args.accessToken,
    input: args.input,
  });

  return response.cast;
}

export async function reorderCast(args: MutationReorderCastArgs) : Promise<Cast | null> {
  const mutation = gql`
    mutation ReorderCast($accessToken: String!, $id: ID!, $index: Int!) {
      cast: reorderCast(accessToken: $accessToken, id: $id, index: $index) {
        id
        index
        mimeType
        uri
      }
    }
  `;

  const response = await graphql.request(mutation, {
    accessToken: args.accessToken,
    id: args.id,
    index: args.index,
  });

  return response.cast;
}

export async function transferCast(args: MutationTransferCastArgs) : Promise<Cast | null> {
  const mutation = gql`
    mutation TransferCast($accessToken: String!, $id: ID!, $username: String!) {
      cast: transferCast(accessToken: $accessToken, id: $id, username: $username) {
        id
        index
        mimeType
        uri
      }
    }
  `;

  const response = await graphql.request(mutation, {
    accessToken: args.accessToken,
    id: args.id,
    username: args.username,
  });

  return response.cast;
}

export async function exportCast(args: MutationExportCastArgs) : Promise<Cast | null> {
  const mutation = gql`
    mutation ExportCast($accessToken: String!, $id: ID!, $address: String!) {
      nft: exportCast(accessToken: $accessToken, id: $id, address: $address) {
        id
        index
        mimeType
        uri
      }
    }
  `;

  const response = await graphql.request(mutation, {
    accessToken: args.accessToken,
    id: args.id,
    address: args.address,
  });

  return response.nft;
}
