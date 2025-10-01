import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token;
        // Fetch the user's profile to get their username
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${account.access_token}`,
          },
        });
        const user = await res.json();
        token.username = user.login;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      // Add username to the session user object
      if (session.user) {
        (session.user as any).username = token.username;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
