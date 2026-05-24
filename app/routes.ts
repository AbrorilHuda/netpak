import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx", { id: "home-login" }),
  route("login", "routes/login.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("transactions", "routes/transactions.tsx"),
  route("transactions/new", "routes/transactions.new.tsx"),
  route("transactions/:id", "routes/transactions.$id.tsx"),
  route("customers", "routes/customers.tsx"),
  route("customers/new", "routes/customers.new.tsx"),
  route("customers/:id", "routes/customers.$id.tsx"),
  route("products", "routes/products.tsx"),
  route("products/new", "routes/products.new.tsx"),
  route("products/:id", "routes/products.$id.tsx"),
  route("debts", "routes/debts.tsx"),
  route("reports", "routes/reports.tsx"),
  route("more", "routes/more.tsx"),
] satisfies RouteConfig;
