import type { NextApiRequest, NextApiResponse } from "next";
import { getDeployment } from "@/lib/contracts";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.json({ ...getDeployment(), timestamp: new Date().toISOString() });
}
