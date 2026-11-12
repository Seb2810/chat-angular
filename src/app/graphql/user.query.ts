import { gql } from "apollo-angular";

export const GET_USERS = gql`

query{

    users{

        id
        name
        email

    }

}

`;




export const ONE_USER = gql`
  query oneUser($id: ID!) {
    oneUser(id: $id) {
      id
      name
      email
    }
  }
`;
