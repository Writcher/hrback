import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/utils/authutils";
import { getJornadasResumen } from "@/services/jornada/service.jornada";
import { getFileName } from "@/lib/utils/excel";
import { generarExcel } from "@/services/excel/service.excel";
import { generarExcelPresentes, getPresentesExportar } from "@/services/sqlserver/service.sqlserver";
import { getControlByProyecto } from "@/services/control/service.control";
import { getProyectos } from "@/services/proyecto/service.proyecto";

export async function GET(req: NextRequest) {
    const { error, payload } = await verifyAuthToken(req);
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);

        const proyecto = Number(searchParams.get('proyecto'));
        const mes = Number(searchParams.get('mes'));
        const quincena = Number(searchParams.get('quincena'));
        const fecha = searchParams.get('fecha');
        const accion = searchParams.get('accion');

        if (accion === 'presentes') {
            if (fecha === null) {
                return NextResponse.json({ error: "Faltan parámetros o son inválidos" }, { status: 400 });
            };

            const fechaConvertida = fecha.split('-').reverse().join('-');

            const dispositivos = await getControlByProyecto({ id_proyecto: proyecto });

            const getPresentesParametros = {
                fecha: fechaConvertida,
                dispositivos,
                filtroProyecto: proyecto,
            };

            const presentes = await getPresentesExportar(getPresentesParametros);

            const excelGenerado = await generarExcelPresentes(presentes);

            const proyectos = await getProyectos();

            const nombreProyecto = proyectos.find(
                (p: { id: number; nombre: string }) => p.id === proyecto
            )?.nombre;

            const nombreExcel = `Listado de Presentes - ${nombreProyecto} - ${fecha}`

            const uint8Excel = new Uint8Array(excelGenerado);

            return new NextResponse(uint8Excel, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${nombreExcel}"`,
                    'Content-Length': uint8Excel.byteLength.toString()
                }
            });
        };

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
