import "next-auth";

declare module "next-auth" {
  interface User {
    username?: string | null;
    role?: string;
    status?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      username?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      status?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    username?: string | null;
    role?: string;
    status?: string;
  }
}
