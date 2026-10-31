import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const adminProductsRouter = Router();

adminProductsRouter.use(requireAuth, requireAdmin);

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const variantSchema = z.object({
  size: z.string().trim().min(1, "El talle es obligatorio"),
  color: z.string().trim().min(1, "El color es obligatorio"),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
});

const createProductSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo admite minúsculas, números y guiones"),
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  price: z.number().positive("El precio debe ser mayor a 0"),
  imageUrl: z.string().trim().url("La URL de la imagen no es válida").nullable().optional(),
  active: z.boolean().optional(),
  categoryId: z.number().int().positive(),
  variants: z.array(variantSchema).min(1, "Agregá al menos una variante"),
});

const updateProductSchema = createProductSchema
  .omit({ variants: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay campos para actualizar",
  });

adminProductsRouter.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(products);
});

adminProductsRouter.post("/", async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message) });
    return;
  }

  const { variants, ...productData } = parsed.data;

  const combos = new Set(variants.map((v) => `${v.size.toLowerCase()}|${v.color.toLowerCase()}`));
  if (combos.size !== variants.length) {
    res.status(400).json({ error: "Hay variantes repetidas (mismo talle y color)" });
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: productData.categoryId } });
  if (!category) {
    res.status(400).json({ error: "La categoría no existe" });
    return;
  }

  const slugTaken = await prisma.product.findUnique({ where: { slug: productData.slug } });
  if (slugTaken) {
    res.status(409).json({ error: "Ya existe un producto con ese slug" });
    return;
  }

  const product = await prisma.product.create({
    data: { ...productData, variants: { create: variants } },
    include: { category: true, variants: true },
  });

  res.status(201).json(product);
});

adminProductsRouter.patch("/:id", async (req, res) => {
  const params = idParamSchema.safeParse(req.params);
  const parsed = updateProductSchema.safeParse(req.body);

  if (!params.success) {
    res.status(400).json({ error: "Id inválido" });
    return;
  }

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message) });
    return;
  }

  const { id } = params.data;
  const data = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  if (data.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      res.status(400).json({ error: "La categoría no existe" });
      return;
    }
  }

  if (data.slug !== undefined && data.slug !== existing.slug) {
    const slugTaken = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (slugTaken) {
      res.status(409).json({ error: "Ya existe un producto con ese slug" });
      return;
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, variants: true },
  });

  res.json(product);
});

adminProductsRouter.delete("/:id", async (req, res) => {
  const params = idParamSchema.safeParse(req.params);

  if (!params.success) {
    res.status(400).json({ error: "Id inválido" });
    return;
  }

  const { id } = params.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  await prisma.product.update({ where: { id }, data: { active: false } });

  res.status(204).send();
});