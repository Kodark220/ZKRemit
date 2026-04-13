import type { NextApiRequest, NextApiResponse } from "next";
import { getZKRemit } from "@/lib/contracts";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const zkRemit = getZKRemit();
    const codes = await zkRemit.getAllCorridors();
    const corridors = await Promise.all(
      codes.map(async (code: string) => {
        const c = await zkRemit.getCorridor(code);
        return {
          code: c[0],
          sourceCurrency: c[1],
          targetCurrency: c[2],
          minAmount: c[3].toString(),
          maxAmount: c[4].toString(),
          exchangeRate: c[5].toString(),
          active: c[6],
        };
      })
    );
    res.json({ corridors });
  } catch (error: any) {
    // Fallback demo data
    res.json({
      corridors: [
        { code: "HK-PH", sourceCurrency: "HKD", targetCurrency: "PHP", exchangeRate: "7200000", active: true },
        { code: "HK-ID", sourceCurrency: "HKD", targetCurrency: "IDR", exchangeRate: "2020000000", active: true },
        { code: "HK-TH", sourceCurrency: "HKD", targetCurrency: "THB", exchangeRate: "4400000", active: true },
        { code: "HK-VN", sourceCurrency: "HKD", targetCurrency: "VND", exchangeRate: "3200000000", active: true },
        { code: "HK-IN", sourceCurrency: "HKD", targetCurrency: "INR", exchangeRate: "10800000", active: true },
        { code: "HK-PK", sourceCurrency: "HKD", targetCurrency: "PKR", exchangeRate: "35600000", active: true },
        { code: "HK-BD", sourceCurrency: "HKD", targetCurrency: "BDT", exchangeRate: "14000000", active: true },
        { code: "HK-NP", sourceCurrency: "HKD", targetCurrency: "NPR", exchangeRate: "17200000", active: true },
        { code: "HK-LK", sourceCurrency: "HKD", targetCurrency: "LKR", exchangeRate: "38000000", active: true },
        { code: "HK-NG", sourceCurrency: "HKD", targetCurrency: "NGN", exchangeRate: "200000000", active: true },
      ],
    });
  }
}
