import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

class OrderError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        quantity: z.number().int().min(1, "La cantidad mínima es 1").max(20, "La cantidad máxima por producto es 20"),
      }),
    )
    .min(1, "El pedido no tiene productos")
    .max(50, "El pedido tiene demasiados productos"),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const orderInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true, slug: true, imageUrl: true } },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

function currentUserId(req: Request): number | null {
  return req.user?.userId ?? null;
}

ordersRouter.post("/", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message) });
    return;
  }

  const userId = currentUserId(req);

  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const quantities = new Map<number, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: [...quantities.keys()] } },
        include: { product: true },
      });

      if (variants.length !== quantities.size) {
        throw new OrderError("Alguna de las variantes no existe", 400);
      }

      let total = new Prisma.Decimal(0);
      const itemsData: { variantId: number; quantity: number; unitPrice: Prisma.Decimal }[] = [];

      for (const variant of variants) {
        const quantity = quantities.get(variant.id) as number;

        if (!variant.product.active) {
          throw new OrderError(`"${variant.product.name}" ya no está disponible`, 409);
        }

        const updated = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });

        if (updated.count === 0) {
          throw new OrderError(
            `No hay stock suficiente de "${variant.product.name}" (${variant.size}, ${variant.color})`,
            409,
          );
        }

        total = total.add(variant.product.price.mul(quantity));
        itemsData.push({ variantId: variant.id, quantity, unitPrice: variant.product.price });
      }

      return tx.order.create({
        data: { userId, total, items: { create: itemsData } },
        include: orderInclude,
      });
    });

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof OrderError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

ordersRouter.get("/", async (req, res) => {
  const userId = currentUserId(req);

  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const orders = await prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json(orders);
});

ordersRouter.get("/:id", async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const userId = currentUserId(req);

  if (!params.success) {
    res.status(400).json({ error: "Id inválido" });
    return;
  }

  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const order = await prisma.order.findFirst({
    where: { id: params.data.id, userId },
    include: orderInclude,
  });

  if (!order) {
    res.status(404).json({ error: "Pedido no encontrado" });
    return;
  }

  res.json(order);
});