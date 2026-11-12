import { PrismaClient } from '@prisma/client';
import express from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt"
//require('dotenv').config();

const prisma = new PrismaClient();
// ⚠️ En prod → variables d’environnement
const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

export const login = async (req: any, res: any) => {

   console.log("→server received login request");

    const credentials = req.body as {
        email: string;
        password: string;
    };
  console.log("server received:", req.body);
 console.log("credentials.email", credentials.email);

    const consumer = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!consumer) {
      return res.status(401).json({ message: "Invalid credentials" });
    }


 try {
  const client = await prisma.user.findFirst({
   where: {
    email: credentials.email,

  }
 });
  console.log("→client : ", client );
 //res.json(client);

     // 2️⃣ Comparaison bcrypt
    const isMatch = await bcrypt.compare(credentials.password, client?.password as string);
    console.log("→isMatch : ", isMatch);
/*
 if (!bcrypt.compareSync(credentials.password, client?.password as string)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }*/


       if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

  const payload = {
      id: consumer.id,
      email: consumer.email,
      role: consumer.role
    };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, {expiresIn: "15m"});

  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "2d"});

  res
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true en prod HTTPS
    })
    .json({ accessToken ,
      user: { id: consumer.id, email: consumer.email, role: consumer.role }
     });



  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error... ' });
  }
}




export const refreshToken = (req: any, res: any) => {

  console.log("→server received refresh request");

  const token = req.cookies.refreshToken as string | undefined;

    console.log("→server received token:", token);

    if (!token) return res.sendStatus(401);

    try {
      const payload = jwt.verify(token, REFRESH_SECRET) as JwtPayload;

      const accessToken = jwt.sign(
        {
    id: payload['id'],
    email: payload['email'],
    role:payload['role'],
      },
        ACCESS_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken ,
        user: { id: payload['id'], email: payload['email'], role: payload['role'] }
      });
    } catch (err) {
      console.error(err);
      res.sendStatus(403);
    }
}

export const logout = (_: any, res: any) => {

    console.log("→server received logout request");
 // res.clearCookie("refreshToken").sendStatus(204);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true en prod HTTPS
  }).sendStatus(204);
}


