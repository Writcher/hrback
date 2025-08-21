"use server"

import { NextRequest, NextResponse } from "next/server";
import { insertJornada, processExcel } from "@/services/excel/service.excel";
import { verifyAuthToken } from "@/lib/utils/authutils";

export async function POST(req: NextRequest) {
  const { error, payload } = await verifyAuthToken(req);
  if (error) return error;

  try {
    const formData = await req.formData();

    const id_proyecto = Number(formData.get("id_proyecto"));
    const id_tipojornada = Number(formData.get("id_tipojornada"));
    const file = formData.get("file");
    if (
      !id_proyecto || isNaN(id_proyecto) ||
      !id_tipojornada || isNaN(id_tipojornada)
    ) {
      return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
    };

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    };

    const processExcelParametros = await file.arrayBuffer();
    const empleadosMapa = await processExcel(processExcelParametros);

    const insertJornadaParametros = { empleadosJornadas: empleadosMapa, id_proyecto, id_tipojornada }
    const importacion = await insertJornada(insertJornadaParametros);

    return NextResponse.json({ message: "Archivo procesado correctamente.", importacion: importacion.id_importacion, completa: importacion.estaCompleta }, { status: 200 });
  } catch (error) {
    console.error("Error procesando Excel:", error);
    return NextResponse.json({ error: "Error procesando Excel" }, { status: 500 });
  };
};
