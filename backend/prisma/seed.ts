import { prisma } from "../src/lib/prisma";

async function main() {
  const remeras = await prisma.category.upsert({
    where: { slug: "remeras" },
    update: {},
    create: { name: "Remeras", slug: "remeras" },
  });

  const pantalones = await prisma.category.upsert({
    where: { slug: "pantalones" },
    update: {},
    create: { name: "Pantalones", slug: "pantalones" },
  });

  await prisma.product.upsert({
    where: { slug: "remera-basica-blanca" },
    update: {},
    create: {
      name: "Remera básica blanca",
      slug: "remera-basica-blanca",
      description: "Remera de algodón con corte clásico, ideal para todos los días.",
      price: "12999.00",
      categoryId: remeras.id,
      variants: {
        create: [
          { size: "M", color: "Blanco", stock: 10 },
          { size: "L", color: "Blanco", stock: 6 },
          { size: "L", color: "Negro", stock: 4 },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { slug: "jean-recto-azul" },
    update: {},
    create: {
      name: "Jean recto azul",
      slug: "jean-recto-azul",
      description: "Jean de corte recto, tela resistente y cómoda.",
      price: "34999.00",
      categoryId: pantalones.id,
      variants: {
        create: [
          { size: "38", color: "Azul", stock: 5 },
          { size: "40", color: "Azul", stock: 8 },
        ],
      },
    },
  });
}

try {
  await main();
  console.log("Seed completado");
} finally {
  await prisma.$disconnect();
}