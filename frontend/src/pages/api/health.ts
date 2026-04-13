import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.json({ status: "ok", network: "hashkey-testnet", timestamp: Date.now() });
}
