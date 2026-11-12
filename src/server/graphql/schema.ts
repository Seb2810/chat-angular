// server/graphql/schema.ts

import { createSchema } from "graphql-yoga";
import { userResolvers } from "./resolvers/user.resolver";

export const schema = createSchema({

    typeDefs: /* GraphQL */`

        type User{
        id:ID!
        name:String!
        email:String!
        images: [Image!]!
        }

        type Query{
        users:[User!]!

        oneUser(id: ID!): User!
        }

        type Image {
          id: ID!
          url: String!
          userId: ID!
        }

        input CreateUserInput {
          name: String!
          email: String!
          password: String!
          imageUrl: String
        }

        input CreateImageInput {
        url: String
            }

        type Mutation {

        createUser(input: CreateUserInput!): User!
        addImageToUser(
        userId: ID!
        input: CreateImageInput!
        ): Image!

        deleteUser(id: ID!): User!

        updateUser(id: ID! , name: String , email : String): User!
      }



    `,

    resolvers:userResolvers

});
