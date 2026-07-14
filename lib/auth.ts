import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from './mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ userId: credentials.userId, isActive: true });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
        return {
          id: user._id.toString(),
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePhotoUrl: user.profilePhotoUrl,
          designation: user.designation,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionUpdate }: any) {
      if (user) {
        token.userId = (user as any).userId;
        token.role = (user as any).role;
        token.profilePhotoUrl = (user as any).profilePhotoUrl;
        token.designation = (user as any).designation;
      }
      if (trigger === 'update' && sessionUpdate) {
        if (sessionUpdate.profilePhotoUrl !== undefined) token.profilePhotoUrl = sessionUpdate.profilePhotoUrl;
        if (sessionUpdate.name !== undefined) token.name = sessionUpdate.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).userId = token.userId;
        (session.user as any).role = token.role;
        (session.user as any).profilePhotoUrl = token.profilePhotoUrl;
        (session.user as any).designation = token.designation;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
