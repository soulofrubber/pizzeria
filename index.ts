import sqlite from "sqlite3";
import fs from "fs";
import prompts from "prompts";

const db = new sqlite.Database("./data.db");

db.serialize(function () {
  db.run(`CREATE TABLE IF NOT EXISTS "products" (
  "id"	INTEGER NOT NULL,
  "name"	TEXT NOT NULL,
  "price"	INTEGER NOT NULL,
  PRIMARY KEY("id" AUTOINCREMENT)
)`);
  db.run(`CREATE TABLE IF NOT EXISTS "orders" (
  "id"	INTEGER NOT NULL,
  "product"	INTEGER NOT NULL,
  "customerName"	TEXT NOT NULL,
  "customerAddress"	TEXT NOT NULL,
  "status"	TEXT NOT NULL,
  FOREIGN KEY("product") REFERENCES "products"("id"),
  PRIMARY KEY("id" AUTOINCREMENT)
)`);
});

(async () => {
  mainloop: while (true) {
    const { command } = await prompts([
      {
        type: "select",
        name: "command",
        message: "What to do?",
        choices: [
          { title: "List Orders", value: "lsorders" },
          { title: "Place new Order", value: "mkorder" },
          { title: "Update Order Status", value: "udorder" },
          { title: "List Products", value: "lsproducts" },
          { title: "Add new Product", value: "mkproduct" },
          { title: "Exit", value: "exit" },
        ],
      },
    ]);
    if (!command) break mainloop;
    switch (command) {
      case "exit":
        db.close();
        break mainloop;

      case "lsproducts":
        await (() =>
          new Promise<void>((resolve) =>
            db.all("SELECT * FROM products", [], (err, rows) => {
              if (rows)
                rows.forEach((row) =>
                  console.log(`${row.name}: ${row.price}€`)
                );
              resolve();
            })
          ))();
        break;

      case "mkproduct":
        const { name, price } = await prompts([
          {
            type: "text",
            name: "name",
            message: "Name",
          },
          {
            type: "number",
            name: "price",
            message: "Preis (in €)",
          },
        ]);
        if (!price) break;
        db.run("INSERT INTO products (name,price) values (?,?)", [name, price]);
        break;

      case "lsorders":
        await (() =>
          new Promise<void>((resolve) =>
            db.all(
              "SELECT orders.id,customerName,name,price,customerAddress,status FROM orders,products WHERE orders.product = products.id",
              [],
              (err, rows) => {
                if (rows)
                  rows.forEach((row) =>
                    console.log(
                      `${row.id}    ${row.customerName}    ${row.name}    ${row.price}€    ${row.customerAddress}    Status: ${row.status}`
                    )
                  );
                resolve();
              }
            )
          ))();
        break;

      case "mkorder":
        let products = await (() =>
          new Promise<{ id: number; name: string; price: number }[]>(
            (resolve) =>
              db.all("SELECT * FROM products", [], (err, rows) => {
                resolve(rows);
              })
          ))();
        const { productId, customerName, customerAddress } = await prompts([
          {
            type: "select",
            name: "productId",
            message: "Select your product",
            choices: products.map((product) => ({
              title: `${product.name} (${product.price}€)`,
              value: product.id,
            })),
          },
          {
            type: "text",
            name: "customerName",
            message: "Enter your name",
          },
          {
            type: "text",
            name: "customerAddress",
            message: "Enter your adrress",
          },
        ]);
        if (!customerAddress) break;
        db.run(
          "INSERT INTO orders (product,customerName,customerAddress,status) values (?,?,?,?)",
          [productId, customerName, customerAddress, "RECEIVED"]
        );
        break;

      case "udorder":
        const orders = await (() =>
          new Promise<any>((resolve) =>
            db.all(
              "SELECT orders.id,customerName,name,price,customerAddress,status FROM orders,products WHERE orders.product = products.id",
              [],
              (err, rows) => {
                resolve(rows);
              }
            )
          ))();
        const { orderId, status } = await prompts([
          {
            type: "select",
            name: "orderId",
            message: "Select the order",
            choices: orders.map((order) => ({
              title: `${order.id} (${order.name} from ${order.customerName}): ${order.status}`,
              value: order.id,
            })),
          },
          {
            type: "select",
            name: "status",
            message: "New status",
            choices: [
              {
                title: "RECEIVED",
                value: "RECEIVED",
              },
              {
                title: "IN_PROGRESS",
                value: "IN_PROGRESS",
              },
              {
                title: "COMPLETED",
                value: "COMPLETED",
              },
            ],
          },
        ]);
        if (!status) break;
        db.run("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
        break;

      default:
        break;
    }
    console.log();
  }
})();
