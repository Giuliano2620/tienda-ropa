import { Router } from "express";
import { prisma } from "../lib/prisma";

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(products);
});