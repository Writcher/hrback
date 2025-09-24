"use server"

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/utils/authutils";
import { getJornadasResumen } from "@/services/jornada/service.jornada";
import { getFileName } from "@/lib/utils/excel";
import { generarExcel } from "@/services/excel/service.excel";

export async function GET(req: NextRequest) {
    const { error, payload } = await verifyAuthToken(req);
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);

        const proyecto = Number(searchParams.get('proyecto'));
        const mes = Number(searchParams.get('mes'));
        const quincena = Number(searchParams.get('quincena'));

        if (
            isNaN(proyecto) ||
            isNaN(mes) ||
            isNaN(quincena)
        ) {
            return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
        };

        const getJornadasResumenParametros = {
            proyecto: proyecto,
            mes: mes,
            quincena: quincena,
        };

        const resumenJornadas = await getJornadasResumen(getJornadasResumenParametros);

        if (resumenJornadas.length === 0) {
            return NextResponse.json({ error: 'No se encontraron datos para los parámetros especificados' }, { status: 404 });
        };

        const excelGenerado = await generarExcel(resumenJornadas);

        const getFileNameParametros = {
            proyecto: proyecto,
            mes: mes,
            quincena: quincena,
        };

        const nombreExcel = await getFileName(getFileNameParametros);

        const uint8Excel = new Uint8Array(excelGenerado);

        return new NextResponse(uint8Excel, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${nombreExcel}"`,
                'Content-Length': uint8Excel.byteLength.toString()
            }
        });
    } catch (error) {
        console.error("Error procesando Excel:", error);
        return NextResponse.json({ error: "Error procesando Excel" }, { status: 500 });
    };
};
