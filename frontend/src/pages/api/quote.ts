import type { NextApiRequest, NextApiResponse } from "next";
import { getZKRemit } from "@/lib/contracts";
import { ethers } from "ethers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { amount, corridor } = req.query;
    if (!amount || !corridor) {
      return res.status(400).json({ error: "amount and corridor required" });
    }

    try {
      const zkRemit = getZKRemit();
      const [recipientAmount, fee, rate] = await zkRemit.getQuote(amount, corridor);
      return res.json({
        amount: amount.toString(),
        corridor,
        recipientAmount: recipientAmount.toString(),
        fee: fee.toString(),
        exchangeRate: rate.toString(),
      });
    } catch {
      // Demo mode fallback
      const rates: Record<string, bigint> = {
        "HK-PH": 7200000n, "HK-ID": 2020000000n, "HK-TH": 4400000n,
        "HK-VN": 3200000000n, "HK-IN": 10800000n, "HK-PK": 35600000n,
        "HK-BD": 14000000n, "HK-NP": 17200000n, "HK-LK": 38000000n,
        "HK-NG": 200000000n,
      };
      const rate = rates[corridor as string] || 1000000n;
      const amountBN = BigInt(amount as string);
      const fee = (amountBN * 30n) / 10000n;
      const recipientAmount = ((amountBN - fee) * rate) / 1000000n;

      res.json({
        amount: amount.toString(),
        corridor,
        recipientAmount: recipientAmount.toString(),
        fee: fee.toString(),
        exchangeRate: rate.toString(),
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
