import { createValidationError, handleApiError } from "@/lib/utils/error";
import { validateData } from "@/lib/utils/validation";
import { getUsuarioPorCorreo, getUsuarios } from "@/services/usuario/service.usuario";
import { NextRequest, NextResponse } from "next/server";

type getusuariosURL = {
    accion: string,
};

type loginData = {
    correo: string,
};

type listaData = {
    filtroTipoUsuario: number,
    busquedaNombre: string,
    direccionParam: string,
    columnaParam: string,
    paginaParam: number,
    filasParam: number,
};

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);

        const data = {
            accion: url.searchParams.get("accion"),
        };

        const validation = await validateData<getusuariosURL>(data, [
            { field: 'accion', required: true, type: 'string' },
        ]);

        if (!validation.valid) {
            throw validation.error;
        };

        if (validation.data.accion === 'login') {

            const loginValidation = validateData<loginData>({
                correo: url.searchParams.get("correo"),
            }, [
                { field: 'correo', required: true, type: 'string' }
            ]);

            if (!loginValidation.valid) {
                throw loginValidation.error;
            };

            const usuario = await getUsuarioPorCorreo({
                correo: loginValidation.data.correo
            });

            if (!usuario) {
                return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
            } else {
                return NextResponse.json(usuario, { status: 200 });
            };
        } else if (validation.data.accion === 'lista') {

            const listaValidation = validateData<listaData>({
                filtroTipoUsuario: Number(url.searchParams.get("filtroTipoUsuario")),
                busquedaNombre: url.searchParams.get("busquedaNombre"),
                direccionParam: url.searchParams.get("direccion"),
                columnaParam: url.searchParams.get("columna"),
                paginaParam: Number(url.searchParams.get("pagina")),
                filasParam: Number(url.searchParams.get("filasPorPagina")),
            }, [
                { field: 'filtroTipoUsuario', required: false, type: 'number' },
                { field: 'busquedaNombre', required: false, type: 'string' },
                { field: 'direccionParam', required: true, type: 'string' },
                { field: 'columnaParam', required: true, type: 'string' },
                { field: 'paginaParam', required: true, type: 'number' },
                { field: 'filasParam', required: true, type: 'number' },
            ]);

            if (!listaValidation.valid) {
                throw listaValidation.error;
            };

            const columnasValidas = ['nombre', 'correo', 'id_tipousuario', 'id_estadousuario'];

            if (!columnasValidas.includes(listaValidation.data.columnaParam.toLowerCase())) {
                throw createValidationError(`${listaValidation.data.columnaParam} is not a valid column`, 'ordenColumna');
            };

            const direccionesValidas = ['ASC', 'DESC'];

            if (!direccionesValidas.includes(listaValidation.data.direccionParam.toUpperCase())) {
                throw createValidationError(`${listaValidation.data.direccionParam} is not a valid direction`, 'ordenDireccion');
            };

            const respuesta = await getUsuarios({
                busquedaNombre: listaValidation.data.busquedaNombre,
                filtroTipoUsuario: listaValidation.data.filtroTipoUsuario,
                pagina: listaValidation.data.paginaParam,
                filas: listaValidation.data.filasParam,
                columna: listaValidation.data.columnaParam,
                direccion: listaValidation.data.direccionParam,
            });

            return NextResponse.json(respuesta, { status: 200 });
        };
    } catch (error) {
        return handleApiError(error, 'GET /api/usuarios');
    };
};//