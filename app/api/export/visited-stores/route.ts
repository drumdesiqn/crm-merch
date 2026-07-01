import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
      "Sales Rep": visit.salesRep || "",
      "Matériel installé": visit.materialType || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Magasins visités");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `magasins-visites-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}
