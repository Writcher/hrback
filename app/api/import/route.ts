"use server"

import { NextRequest, NextResponse } from "next/server";
import { createJornadas, processExcel } from "@/services/excel/service.excel";
import { verifyAuthToken } from "@/lib/utils/authutils";

export async function POST(req: NextRequest) {
  const { error, payload } = await verifyAuthToken(req);
  if (error) return error;

  try {
    const formData = await req.formData();

    const id_proyecto = Number(formData.get("id_proyecto"));
    const id_tipojornada = Number(formData.get("id_tipojornada"));
    const file = formData.get("file");
    const id_tipoimportacion = Number(formData.get("id_tipoimportacion"));

    if (
      !id_proyecto || isNaN(id_proyecto) ||
      !id_tipojornada || isNaN(id_tipojornada) ||
      !id_tipoimportacion || isNaN(id_tipoimportacion)
    ) {
      return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
    };

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    };

    const fileName = file.name;

    const importadores: Record<number, (file: File) => Promise<any>> = {
      1: async (file) => {
        const buffer = await file.arrayBuffer();
        return processExcel(buffer);
      },
      // 2: async (file) => { ... otro parser ... },
    };

    const importador = importadores[id_tipoimportacion];

    if (!importador) {
      return NextResponse.json({ error: "Tipo de importación no soportado" }, { status: 400 });
    };

    /**
     * Resultado esperado de un importador de jornadas.
     *
     * Cada importador debe devolver un objeto con esta forma:
     *
     * {
     *   empleadosJornada: Map<string, {
     *     nombre: string;
     *     registros: {
     *       fecha: string;   // formato ISO: YYYY-MM-DD
     *       hora: string;    // formato HH:mm
     *       tipo: string;    // entrada | salida | etc.
     *     }[];
     *     requiresManualReview: boolean; // true si esta jornada requiere revisión manual
     *   }>;
     *
     *   importacionCompleta: boolean; // false si alguna jornada requiere revisión manual
     * }
     *
     * ⚠️ IMPORTANTE:
     * El endpoint depende de que el importador cumpla con este contrato
     * para poder guardar correctamente las jornadas.
     */
    const empleadosMapa = await importador(file);

    const insertJornadaParametros = {
      empleadosJornadas: empleadosMapa!,
      id_proyecto,
      id_tipojornada,
      nombreArchivo: fileName,
      id_tipoimportacion: id_tipoimportacion,
    };

    const importacion = await createJornadas(insertJornadaParametros);

    return NextResponse.json({
      message: "Archivo procesado correctamente.",
      importacion: importacion.id_importacion,
      completa: importacion.completa,
    }, { status: 200 });

  } catch (error) {
    console.error("Error procesando archivo:", error);
    return NextResponse.json({ error: "Error procesando archivo" }, { status: 500 });
  };
};