import { getUsuarioPorCorreo, getUsuarios } from "@/services/usuario/service.usuario";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);

        const correo = url.searchParams.get("correo");

        const filtroTipoUsuario = Number(url.searchParams.get("filtroTipoUsuario"));
        const busquedaNombre = url.searchParams.get("busquedaNombre");
        const direccionParam = url.searchParams.get("direccion")
        const columnaParam = url.searchParams.get("columna")
        const paginaParam = Number(url.searchParams.get("pagina"));
        const filasParam = Number(url.searchParams.get("filasPorPagina"));

        const accion = url.searchParams.get("accion");

        if (
            accion === null
        ) {
            return new Response(
                JSON.stringify({ error: 'Faltan parametros' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        };

        let respuesta;

        if (accion === "login") {

            if (
                correo === null
            ) {
                return new Response(
                    JSON.stringify({ error: 'Faltan parametros' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            };

            const getUsuarioParametros = {
                correo
            };

            const usuario = await getUsuarioPorCorreo(getUsuarioParametros);

            if (!usuario) {
                return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
            } else {
                respuesta = await getUsuarioPorCorreo(getUsuarioParametros);
            };

        } else if (accion === "lista") {

            if (
                busquedaNombre === null ||
                columnaParam === null ||
                direccionParam === null ||
                isNaN(paginaParam) ||
                isNaN(filasParam) ||
                isNaN(filtroTipoUsuario)
            ) {
                return new Response(
                    JSON.stringify({ error: 'Faltan parametros' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            };

            const getUsuariosParametros = {
                busquedaNombre,
                filtroTipoUsuario,
                pagina: paginaParam,
                filas: filasParam,
                columna: columnaParam,
                direccion: direccionParam,
            };

            respuesta = await getUsuarios(getUsuariosParametros);
        };

        return NextResponse.json(respuesta, { status: 200 });
    } catch (error) {
        console.error("Error buscando usuario:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    };
};