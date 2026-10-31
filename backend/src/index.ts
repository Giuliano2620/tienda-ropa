import "dotenv/config";
import express from "express";
import cors from "cors";
import { productsRouter } from "./routes/products";
import { categoriesRouter } from "./routes/categories";
import { authRouter } from "./routes/auth";
import { adminProductsRouter } from "./routes/admin-products";
import { ordersRouter } from "./routes/orders";


const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/orders", ordersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});