import { verifyAuthToken } from "@/lib/utils/authutils";
import { getControlByProyecto } from "@/services/control/service.control";
import { getEmpleados } from "@/services/empleado/service.empleado";
import { getPresentes } from "@/services/sqlserver/service.sqlserver";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    try {
        const url = new URL(request.url);

        const busquedaNombre = url.searchParams.get("busquedaNombre");
        const filtroProyecto = Number(url.searchParams.get("filtroProyecto"));
        const pagina = Number(url.searchParams.get("pagina"));
        const filasPorPagina = Number(url.searchParams.get("filasPorPagina"));
        const ordenColumna = url.searchParams.get("ordenColumna");
        const ordenDireccion = url.searchParams.get("ordenDireccion");
        const busquedaLegajo = Number(url.searchParams.get("busquedaLegajo"));
        const filtroTipoEmpleado = Number(url.searchParams.get("filtroTipoEmpleado"));
        const filtroTipoAusencia = Number(url.searchParams.get("filtroTipoAusencia"));
        const filtroMes = Number(url.searchParams.get("filtroMes"));
        const filtroQuincena = Number(url.searchParams.get("filtroQuincena"));
        const filtroMarcaManual = url.searchParams.get("filtroMarcaManual") === "true";
        const fecha = url.searchParams.get("fecha");
        const accion = url.searchParams.get("accion");

        if (accion === "presentes") {
            if (
                fecha === null ||
                isNaN(filtroProyecto) ||
                isNaN(pagina) ||
                isNaN(filasPorPagina)
            ) {
                return new Response(
                    JSON.stringify({ error: 'Faltan parametros' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            };

            const fechaConvertida = fecha.split('-').reverse().join('-');

            const dispositivos = await getControlByProyecto({ id_proyecto: filtroProyecto });

            const getPresentesParametros = {
                fecha: fechaConvertida,
                dispositivos,
                filtroProyecto,
                pagina,
                filasPorPagina,
            };

            const respuesta = await getPresentes(getPresentesParametros)

            return NextResponse.json(respuesta, { status: 200 });
        };

        if (
            busquedaNombre === null ||
            ordenColumna === null ||
            ordenDireccion === null ||
            filtroMarcaManual === null ||
            isNaN(filtroProyecto) ||
            isNaN(pagina) ||
            isNaN(filasPorPagina) ||
            isNaN(busquedaLegajo) ||
            isNaN(filtroTipoEmpleado) ||
            isNaN(filtroTipoAusencia) ||
            isNaN(filtroMes) ||
            isNaN(filtroQuincena)
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        const getEmpleadosParametros = {
            busquedaNombre,
            filtroProyecto,
            pagina,
            filasPorPagina,
            ordenColumna,
            ordenDireccion,
            busquedaLegajo,
            filtroTipoEmpleado,
            filtroTipoAusencia,
            filtroMes,
            filtroQuincena,
            filtroMarcaManual
        };

        const respuesta = await getEmpleados(getEmpleadosParametros);

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando empleados:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};