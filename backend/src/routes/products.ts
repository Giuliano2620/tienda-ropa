import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../../generated/prisma/client";

export const productsRouter = Router();

const listQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

productsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "Parámetros de búsqueda inválidos" });
    return;
  }

  const { category, search } = parsed.data;

  const where: Prisma.ProductWhereInput = { active: true };

  if (category) {
    where.category = { slug: category };
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(products);
});

productsRouter.get("/:slug", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { category: true, variants: true },
  });

  if (!product || !product.active) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  res.json(product);
});