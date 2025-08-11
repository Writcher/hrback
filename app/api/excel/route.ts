"use server"

import { NextRequest, NextResponse } from "next/server";
import { insertJornada, processExcel } from "@/services/excel/service.excel";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Obtener parámetros y parsear a entero
    const id_proyecto = Number(formData.get("id_proyecto"));
    const id_tipojornada = Number(formData.get("id_tipojornada"));
    const file = formData.get("file");

    // Validación simple de parámetros
    if (
      !id_proyecto || isNaN(id_proyecto) ||
      !id_tipojornada || isNaN(id_tipojornada)
    ) {
      return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
    };
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    };
  
    // Procesar archivo
    const processExcelParams = await file.arrayBuffer();
    const empleadosMap = await processExcel(processExcelParams);

    // Cargar jornadas
    const insertJornadaParams = {map: empleadosMap, id_proyecto, id_tipojornada}
    const importacion = await insertJornada(insertJornadaParams);

    return NextResponse.json({ message: "Archivo procesado correctamente.", importacion: importacion.idImportacion, completa: importacion.estaCompleta }, { status: 200 });
  } catch (error) {
    console.error("Error procesando Excel:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  };
};
