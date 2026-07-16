import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@/lib/types";
import type { NavFlags } from "@/lib/nav-flags";
import { parseNavFlags } from "@/lib/nav-flags";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      navFlags: NavFlags;
    };
  }

  interface User {
    id: string;
    role: Role;
    navFlags: NavFlags;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    navFlags?: NavFlags;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        const role = user.role as Role;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          navFlags: parseNavFlags(user.navFlags, role),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.navFlags = user.navFlags;
      }

      const email = typeof token.email === "string" ? token.email.toLowerCase() : null;
      if (email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, name: true, email: true, navFlags: true },
          });
          if (dbUser) {
            const role = dbUser.role as Role;
            token.id = dbUser.id;
            token.role = role;
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.navFlags = parseNavFlags(dbUser.navFlags, role);
          } else {
            token.id = "";
          }
        } catch {
          // Mantém token se o banco estiver indisponível
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const role = token.role as Role;
        session.user.id = token.id as string;
        session.user.role = role;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        session.user.navFlags =
          token.navFlags || parseNavFlags("{}", role);
      }
      return session;
    },
  },
};
