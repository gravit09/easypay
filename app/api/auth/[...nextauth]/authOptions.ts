import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "PayU Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password)
          throw new Error("Email and password are required");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (
          !user ||
          !(await bcrypt.compare(credentials.password, user.password))
        )
          throw new Error("Invalid email or password");

        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "payu_secret",
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token-payu",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user)
        Object.assign(token, {
          id: user.id,
          email: user.email,
          username: user.name,
          app: "payu",
        });
      return token;
    },
    session: async ({ session, token }) => {
      session.user = {
        id: token.id as string,
        email: token.email,
        username: token.name,
        app: token.app as string,
      };
      return session;
    },
  },
};
