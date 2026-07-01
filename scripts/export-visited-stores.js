const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
if (!process.env.DATABASE_URL) {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}

const { PrismaClient } = require("@prisma/client");
const { PrismaNeonHttp } = require("@prisma/adapter-neon");
const XLSX = require("xlsx");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const databaseUrl = process.env.DATABASE_URL.replace(/^postgres:\/\//, "postgresql://");
const adapter = new PrismaNeonHttp(databaseUrl, { arrayMode: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  const visits = await prisma.visit.findMany({
    orderBy: { visitDate: "desc" },
    distinct: ["storeId"],
    select: {
      storeId: true,
      storeName: true,
      storeAddress: true,
      storeZipcode: true,
      storeCity: true,
      assortment: true,
      visitType: true,
      remarks: true,
      salesRep: true,
      materialType: true,
      visitDate: true,
    },
  });

  const rows = visits.map((visit) => ({
    Assortiment: visit.assortment || "",
    "Store ID": visit.storeId,
    "Store Name": visit.storeName,
    "Store Address": visit.storeAddress,
    "Store Zipcode": visit.storeZipcode,
    "Store City": visit.storeCity,
    "Visit Type": visit.visitType,
    Remarques: visit.remarks || "",
    "Matériel installé": visit.materialType || "",
    "Sales Rep": visit.salesRep || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const headerLength = key.length;
    const maxDataLength = rows.reduce((max, row) => {
      const value = String(row[key] || "");
      return Math.max(max, value.length);
    }, headerLength);
    return { wch: Math.min(Math.max(maxDataLength + 2, 10), 60) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Magasins visités");

  const outPath = path.join(
    process.cwd(),
    `magasins-visites-${new Date().toISOString().split("T")[0]}.xlsx`
  );
  XLSX.writeFile(workbook, outPath);

  console.log(`✅ Exporté ${rows.length} magasins vers ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
