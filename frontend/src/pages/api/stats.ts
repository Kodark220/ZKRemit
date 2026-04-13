import type { NextApiRequest, NextApiResponse } from "next";
import { getHSP, getZKRemit } from "@/lib/contracts";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const hsp = getHSP();
    const zkRemit = getZKRemit();
    const [volume, count, orders] = await Promise.all([
      hsp.totalSettledVolume(),
      hsp.totalRemittances(),
      zkRemit.totalOrders(),
    ]);
    res.json({
      totalVolume: volume.toString(),
      totalTransactions: Number(count),
      activeCorridors: 10,
      averageFee: "0.3%",
    });
  } catch {
    res.json({
      totalVolume: "$0",
      totalTransactions: 0,
      activeCorridors: 10,
      averageFee: "0.3%",
    });
  }
}
