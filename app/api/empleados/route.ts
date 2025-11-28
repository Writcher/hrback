import { verifyAuthToken } from "@/lib/utils/authutils";
import { createValidationError, handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { getControlByProyecto } from "@/services/control/service.control";
import { getEmpleados } from "@/services/empleado/service.empleado";
import { getPresentesProyecto, syncNomina } from "@/services/sqlserver/service.sqlserver";
import { NextRequest, NextResponse } from "next/server";

type getEmpleadosURL = {
    busquedaNombre: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
    ordenColumna: string,
    ordenDireccion: string,
    busquedaLegajo: number,
    filtroTipoEmpleado: number,
    filtroTipoAusencia: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcaManual: boolean,
    fecha: string,
    accion: string,
};

type getPresentesData = {
    fecha: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
};

type getEmpleadosData = {
    busquedaNombre: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
    ordenColumna: string,
    ordenDireccion: string,
    busquedaLegajo: number,
    filtroTipoEmpleado: number,
    filtroTipoAusencia: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcaManual: boolean,
};

export async function GET(request: NextRequest) {
    try {
        const { error, payload } = await verifyAuthToken(request);
        if (error) return error;

        const url = new URL(request.url);

        const data = {
            busquedaNombre: url.searchParams.get("busquedaNombre"),//
            filtroProyecto: Number(url.searchParams.get("filtroProyecto")),//
            pagina: Number(url.searchParams.get("pagina")),
            filasPorPagina: Number(url.searchParams.get("filasPorPagina")),
            ordenColumna: url.searchParams.get("ordenColumna"),
            ordenDireccion: url.searchParams.get("ordenDireccion"),
            busquedaLegajo: Number(url.searchParams.get("busquedaLegajo")),//
            filtroTipoEmpleado: Number(url.searchParams.get("filtroTipoEmpleado")),//
            filtroTipoAusencia: Number(url.searchParams.get("filtroTipoAusencia")),//
            filtroMes: Number(url.searchParams.get("filtroMes")),//
            filtroQuincena: Number(url.searchParams.get("filtroQuincena")),//
            filtroMarcaManual: url.searchParams.get("filtroMarcaManual") === "true",
            fecha: url.searchParams.get("fecha"),
            accion: url.searchParams.get("accion"),//
        };

        const validation = await validateData<getEmpleadosURL>(data, [
            { field: 'accion', required: true, type: 'string' },
            { field: 'busquedaNombre', required: false, type: 'string' },
            { field: 'busquedaLegajo', required: false, type: 'number' },
            { field: 'filtroProyecto', required: false, type: 'number' },
            { field: 'filtroTipoEmpleado', required: false, type: 'number' },
            { field: 'filtroTipoAusencia', required: false, type: 'number' },
            { field: 'filtroMes', required: false, type: 'number' },
            { field: 'filtroQuincena', required: false, type: 'number' },
            { field: 'filtroMarcaManual', required: false, type: 'boolean' },
            { field: 'pagina', required: false, type: 'number' },
            { field: 'filasPorPagina', required: false, type: 'number' },
            { field: 'ordenColumna', required: false, type: 'string' },
            { field: 'ordenDireccion', required: false, type: 'string' },
            { field: 'fecha', required: false, type: 'string' },
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion !== 'presentes' && validation.data.accion !== 'empleados') {
            throw createValidationError(`${validation.data.accion} is not a valid action`, 'accion');
        };

        if (validation.data.accion === 'presentes') {

            const validationPresentes = await validateData<getPresentesData>({
                fecha: validation.data.fecha,
                filtroProyecto: validation.data.filtroProyecto,
                pagina: validation.data.pagina,
                filasPorPagina: validation.data.filasPorPagina,
            }, [
                { field: 'fecha', required: true, type: 'string' },
                { field: 'filtroProyecto', required: true, type: 'number' },
                { field: 'pagina', required: true, type: 'number' },
                { field: 'filasPorPagina', required: true, type: 'number' },
            ]);

            if (!validationPresentes.valid) {
                throw validationPresentes.error;
            };

            const fechaConvertida = validationPresentes.data.fecha.split('-').reverse().join('-');

            const dispositivos = await getControlByProyecto({ id_proyecto: validationPresentes.data.filtroProyecto });

            const respuesta = await getPresentesProyecto({
                ...validationPresentes.data,
                fecha: fechaConvertida,
                dispositivos: dispositivos
            });

            return NextResponse.json(respuesta, { status: 200 });

        } else if (validation.data.accion === 'empleados') {

            const validationEmpleados = await validateData<getEmpleadosData>({
                busquedaNombre: validation.data.busquedaNombre,
                filtroProyecto: validation.data.filtroProyecto,
                pagina: validation.data.pagina,
                filasPorPagina: validation.data.filasPorPagina,
                ordenColumna: validation.data.ordenColumna,
                ordenDireccion: validation.data.ordenDireccion,
                busquedaLegajo: validation.data.busquedaLegajo,
                filtroTipoEmpleado: validation.data.filtroTipoEmpleado,
                filtroTipoAusencia: validation.data.filtroTipoAusencia,
                filtroMes: validation.data.filtroMes,
                filtroQuincena: validation.data.filtroQuincena,
                filtroMarcaManual: validation.data.filtroMarcaManual,
            }, [
                { field: 'busquedaNombre', required: false, type: 'string' },
                { field: 'busquedaLegajo', required: false, type: 'number' },
                { field: 'filtroProyecto', required: false, type: 'number' },
                { field: 'filtroTipoEmpleado', required: false, type: 'number' },
                { field: 'filtroTipoAusencia', required: false, type: 'number' },
                { field: 'filtroMes', required: false, type: 'number' },
                { field: 'filtroQuincena', required: false, type: 'number' },
                { field: 'filtroMarcaManual', required: false, type: 'boolean' },
                { field: 'pagina', required: true, type: 'number' },
                { field: 'filasPorPagina', required: true, type: 'number' },
                { field: 'ordenColumna', required: true, type: 'string' },
                { field: 'ordenDireccion', required: true, type: 'string' },
            ]);

            if (!validationEmpleados.valid) {
                throw validationEmpleados.error;
            };

            const columnasValidas = ['nombreapellido', 'id_reloj', 'legajo', 'id_proyecto', 'id_estadoempleado', 'id_tipoempleado', 'id_turno'];

            if (!columnasValidas.includes(validationEmpleados.data.ordenColumna.toLowerCase())) {
                throw createValidationError(`${validationEmpleados.data.ordenColumna} is not a valid column`, 'ordenColumna');
            };

            const direccionesValidas = ['ASC', 'DESC'];

            if (!direccionesValidas.includes(validationEmpleados.data.ordenDireccion.toUpperCase())) {
                throw createValidationError(`${validationEmpleados.data.ordenDireccion} is not a valid direction`, 'ordenDireccion');
            };

            const respuesta = await getEmpleados({
                ...validationEmpleados.data,
            });

            return NextResponse.json(respuesta, { status: 200 });

        };
    } catch (error) {
        return handleApiError(error, 'GET /api/empleados');
    };
};

export async function POST(request: NextRequest) {
    try {
        let payload;

        const cron = request.headers.get('x-cron-secret');

        if (cron === process.env.CRON_SECRET) {
            payload = { id: 9 };
        } else {
            const result = await verifyAuthToken(request);
            if (result.error) return result.error;

            payload = result.payload;
        };

        await syncNomina();

        return NextResponse.json({ message: "Empleados sincronizados." }, { status: 201 });
    } catch (error) {
        return handleApiError(error, 'POST /api/empleados');
    };
};