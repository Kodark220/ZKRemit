import type { NextApiRequest, NextApiResponse } from "next";
import { getHSP } from "@/lib/contracts";
import { ethers } from "ethers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { address } = req.query;
    if (!address || !ethers.isAddress(address as string)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    try {
      const hsp = getHSP();
      const requestIds = await hsp.getUserRequests(address);
      const requests = await Promise.all(
        requestIds.map(async (id: string) => {
          const r = await hsp.getPaymentRequest(id);
          return {
            requestId: r[0],
            sender: r[1],
            recipient: r[2],
            token: r[3],
            amount: r[4].toString(),
            fee: r[5].toString(),
            sourceCurrency: r[6],
            targetCurrency: r[7],
            corridor: r[8],
            createdAt: r[9].toString(),
            expiresAt: r[10].toString(),
            status: Number(r[11]),
          };
        })
      );
      res.json({ transactions: requests });
    } catch {
      res.json({ transactions: [] });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
