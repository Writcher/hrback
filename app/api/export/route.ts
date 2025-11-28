import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/utils/authutils";
import { getJornadasResumen } from "@/services/jornada/service.jornada";
import { getFileName } from "@/lib/utils/excel";
import { generarExcel } from "@/services/excel/service.excel";
import { generarExcelPresentes, getPresentesProyecto } from "@/services/sqlserver/service.sqlserver";
import { getControlByProyecto } from "@/services/control/service.control";
import { getProyectos } from "@/services/proyecto/service.proyecto";
import { validateData } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/error";

type exportURL = {
    accion: string,
};

type validationPresentes = {
    fecha: string,
    proyecto: number,
};

type validationResumen = {
    proyecto: number,
    mes: number,
    quincena: number
};

export async function GET(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const url = new URL(request.url);

        const data = {
            proyecto: Number(url.searchParams.get('proyecto')),
            mes: Number(url.searchParams.get('mes')),
            quincena: Number(url.searchParams.get('quincena')),
            fecha: url.searchParams.get('fecha'),
            accion: url.searchParams.get('accion'),
        };

        const validation = validateData<exportURL>({
            accion: data.accion
        }, [
            { field: 'accion', required: true, type: 'string' }
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === 'presentes') {

            const validationPresentes = validateData<validationPresentes>({
                fecha: data.fecha,
                proyecto: data.proyecto
            }, [
                { field: 'fecha', required: true, type: 'string' },
                { field: 'proyecto', required: true, type: 'number' }
            ]);

            if (!validationPresentes.valid) {
                throw validationPresentes.error;
            };

            const fechaConvertida = validationPresentes.data.fecha.split('-').reverse().join('-');

            const dispositivos = await getControlByProyecto({
                id_proyecto: validationPresentes.data.proyecto
            });

            const datos = await getPresentesProyecto({
                fecha: fechaConvertida,
                dispositivos,
                filtroProyecto: validationPresentes.data.proyecto,
            });

            const presentes = datos.presentes.map(p => ({
                id_empleado: p.id_reloj,
                nombre: p.nombre
            }));

            const ausentes = datos.ausentes.map(a => ({
                id_empleado: a.id_reloj,
                nombre: a.nombre
            }));

            const excel = await generarExcelPresentes(presentes, ausentes);

            const proyectos = await getProyectos();

            const nombreProyecto = proyectos.find(
                (p: { id: number; nombre: string }) => p.id === validationPresentes.data.proyecto
            )?.nombre;

            const nombreExcel = `Listado de Presentes y Ausentes - ${nombreProyecto} - ${validationPresentes.data.fecha}.xlsx`;

            const uint8Excel = new Uint8Array(excel);

            return new NextResponse(uint8Excel, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${nombreExcel}"`,
                    'Content-Length': uint8Excel.byteLength.toString()
                }
            });
        } else if (validation.data.accion === 'resumen') {

            const validationResumen = validateData<validationResumen>({
                proyecto: data.proyecto,
                mes: data.mes,
                quincena: data.quincena,
            }, [
                { field: 'proyecto', required: true, type: 'number' },
                { field: 'mes', required: true, type: 'number' },
                { field: 'quincena', required: true, type: 'number' }
            ]);

            if (!validationResumen.valid) {
                throw validationResumen.error;
            };

            const resumen = await getJornadasResumen({
                proyecto: validationResumen.data.proyecto,
                mes: validationResumen.data.mes,
                quincena: validationResumen.data.quincena,
            });

            const excel = await generarExcel(resumen); //no toque esta funcion

            const nombre = await getFileName({
                proyecto: validationResumen.data.proyecto,
                mes: validationResumen.data.mes,
                quincena: validationResumen.data.quincena,
            });

            const uint8Excel = new Uint8Array(excel);

            return new NextResponse(uint8Excel, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${nombre}"`,
                    'Content-Length': uint8Excel.byteLength.toString()
                }
            });
        };

    } catch (error) {
        return handleApiError(error, 'GET /api/export');
    };
};//
