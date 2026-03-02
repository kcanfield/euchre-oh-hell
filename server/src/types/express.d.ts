declare global {
  namespace Express {
    interface Request {
      user?: { playerId: string; username: string };
    }
  }
}

export {};
