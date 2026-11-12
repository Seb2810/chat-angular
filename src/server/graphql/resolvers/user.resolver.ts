// server/graphql/resolvers/user.resolver.ts

import { prisma } from "../../prisma";
import bcrypt from 'bcryptjs';

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  imageUrl?: string | null;
};

type CreateUserArgs = {
  input: CreateUserInput;
};

type DeleteUserArgs = {
  id: string | number;
};

export const userResolvers={

    Query:{

        users:async()=>{

            return prisma.user.findMany();

        },

       oneUser: async (_parent: unknown, args: any) => {

  console.log("args complet reçu : ", args);

  // Récupérez l'id soit directement, soit s'il est imbriqué (ex: args.id ou args.input.id)
  const targetId = args.id;

  console.log("id extrait one user : ", targetId);

  const user = await prisma.user.findFirst({
    where: {
      id: Number(targetId),
    },
  });
console.log("one User data ---> " , user);

  return user;
}

    },


  Mutation: {

  createUser: async (_parent: unknown, { input }: CreateUserArgs) => {

        console.log("name : " ,input.name);
      console.log("email : " ,input.email);
        console.log("password : " ,input.password);

      const hashedPassword = await bcrypt.hash(input.password, 10);

      if(input.imageUrl){

      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          ...(input.imageUrl && {
            images: {
              create: {
                url: input.imageUrl,
              },
            },
          }),
        },
      });
   return user;

    }else{

  const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword

        }
      })
   return user;
    }

    },

// Affichez args en entier pour voir comment le serveur l'emballe
deleteUser: async (_parent: unknown, args: any) => {
  console.log("args complet reçu : ", args);

  // Récupérez l'id soit directement, soit s'il est imbriqué (ex: args.id ou args.input.id)
  const targetId = args.id;

  console.log("id extrait : ", targetId);

  const user = await prisma.user.delete({
    where: {
      id: Number(targetId),
    },
  });

  return user;
},
// filepath: user.resolver.ts
updateUser: async (_parent: unknown, args: any) => {
  console.log("args complet reçu :", args);

  const input = args.input ?? args;
  const targetId = input.id;

  console.log("id extrait :", targetId);

  const user = await prisma.user.update({
    where: {
      id: Number(targetId),
    },
    data: {
      name: input.name,
      email: input.email,
    },
  });

  return user;
},

  }
};


