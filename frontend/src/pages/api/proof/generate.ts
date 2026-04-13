import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { kycLevel, amount, corridor, timestamp } = req.body;
    if (!kycLevel || !amount || !corridor) {
      return res.status(400).json({ error: "kycLevel, amount, corridor required" });
    }

    const corridorIds: Record<string, number> = {
      "HK-PH": 1, "HK-ID": 2, "HK-TH": 3, "HK-VN": 4, "HK-IN": 5,
      "HK-PK": 6, "HK-BD": 7, "HK-NP": 8, "HK-LK": 9, "HK-NG": 10,
    };

    const ts = timestamp || Math.floor(Date.now() / 1000);
    const corridorId = corridorIds[corridor] || 1;

    const kycLevelHash = ethers.keccak256(
      ethers.solidityPacked(["uint256", "uint256"], [kycLevel, ts])
    );
    const corridorHash = ethers.keccak256(
      ethers.solidityPacked(["uint256"], [corridorId])
    );
    const nullifier = ethers.keccak256(
      ethers.solidityPacked(["uint256", "uint256", "uint256"], [ts, amount, corridorId])
    );

    const FIELD =
      BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
    const toUint = (hex: string) => (BigInt(hex) % FIELD).toString();

    res.json({
      proof: {
        pA: ["1", "2"],
        pB: [["1", "2"], ["3", "4"]],
        pC: ["1", "2"],
      },
      publicSignals: [
        toUint(kycLevelHash),
        "1",
        "1",
        toUint(corridorHash),
        ts.toString(),
        toUint(nullifier),
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
