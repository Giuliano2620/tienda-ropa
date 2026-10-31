import "dotenv/config";
import express from "express";
import cors from "cors";
import { productsRouter } from "./routes/products";
import { categoriesRouter } from "./routes/categories";
import { authRouter } from "./routes/auth";
import { adminProductsRouter } from "./routes/admin-products";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
ap  p.use("/api/admin/products", adminProductsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});