"use server"

import { deleteUsuarioParametros, editUsuarioParametros, getUsuarioPorCorreoParametros, getUsuariosParametros, insertUsuarioParametros } from "@/lib/types/usuario";
import { db } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { getEstadoUsuarioActivo, getEstadoUsuarioBaja } from "../estadousuario/service.estadousuario";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";

const client = db;

export async function getUsuarioPorCorreo(parametros: getUsuarioPorCorreoParametros) {
    return executeQuery(
        'getUsuarioPorCorreo',
        async () => {

            const id_estadousuario = await getEstadoUsuarioBaja();
            const correoMinuscula = parametros.correo.toLowerCase();

            const getQuery = `
                SELECT * FROM usuario
                WHERE correo ILIKE $1
                    AND id_estadousuario != $2
            `;

            const getResult = await client.query(getQuery, [
                correoMinuscula,
                id_estadousuario
            ]);

            return getResult.rows[0];
        },

        parametros
    );
};//

export async function getUsuarios(parametros: getUsuariosParametros) {
    return executeQuery(
        'getUsuarios',
        async () => {

            const offset = (parametros.pagina) * parametros.filas;
            const valoresBase: any = [];

            const columna = parametros.columna;
            const direccion = parametros.direccion.toUpperCase();

            let filtro = `
                WHERE 1=1
            `;

            if (parametros.filtroTipoUsuario !== 0) {
                filtro += `
                    AND u.id_tipousuario = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroTipoUsuario);
            };

            if (parametros.busquedaNombre !== "") {
                filtro += `
                    AND unaccent(u.nombre) ILIKE unaccent($${valoresBase.length + 1}) `;
                valoresBase.push(`%${parametros.busquedaNombre}%`);
            };

            const orden = `
                ORDER BY ${columna} ${direccion}
            `;

            const valoresPrincipal = [...valoresBase, parametros.filas, offset];

            const limite = `
                LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}
            `;

            let getQuery = `
                SELECT
                    u.id,
                    u.nombre,
                    u.correo,
                    u.id_tipousuario,
                    tu.nombre AS tipousuario,
                    eu.nombre AS estadousuario
                FROM "usuario" u
                JOIN "tipousuario" tu ON u.id_tipousuario = tu.id
                JOIN "estadousuario" eu ON u.id_estadousuario = eu.id
                ${filtro}
                ${orden}
                ${limite}
            `;

            let countQuery = `
                SELECT COUNT(*) AS total
                FROM "usuario" u
                ${filtro}
            `;

            const getResult = await client.query(getQuery, valoresPrincipal);

            const countResult = await client.query(countQuery, valoresBase);

            return {
                usuarios: getResult.rows,
                totalUsuarios: countResult.rows[0].total,
            };
        },

        parametros
    );
};

export async function insertUsuario(parametros: insertUsuarioParametros) {
    return executeQuery(
        'insertUsuario',
        async () => {

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(parametros.contraseña, salt);

            const id_estadousuario = await getEstadoUsuarioActivo();

            const getQuery = `
                INSERT INTO usuario (correo, nombre, contraseña, id_tipousuario, id_estadousuario)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;

            const getResult = await client.query(getQuery, [
                parametros.correo,
                parametros.nombre,
                hash,
                parametros.id_tipousuario,
                id_estadousuario
            ]);

            return getResult.rows[0].id;
        },

        parametros
    );
};//

export async function editUsuario(parametros: editUsuarioParametros) {
    return executeQuery(
        'editUsuario',
        async () => {

            const id_estadousuario = await getEstadoUsuarioBaja();

            const getQuery = `
                UPDATE usuario
                SET nombre = $1, correo = $2, id_tipousuario = $3
                WHERE id = $4
                    AND id_estadousuario != $5
            `;

            const getResult = await client.query(getQuery, [
                parametros.nombre,
                parametros.correo,
                parametros.id_tipousuario,
                parametros.id,
                id_estadousuario
            ]);

            checkRowsAffected(getResult, 'TipoUsuario', { id: parametros.id_tipousuario });
        },

        parametros
    );
};//

export async function deleteUsuario(parametros: deleteUsuarioParametros) {
    return executeQuery(
        'deleteUsuario',
        async () => {

            const id_estadousuario = await getEstadoUsuarioBaja();

            const getQuery = `
                UPDATE usuario
                SET id_estadousuario = $2
                WHERE id = $1
                    AND id_estadousuario != $2
            `;

            const getResult = await client.query(getQuery, [
                parametros.id,
                id_estadousuario
            ]);

            checkRowsAffected(getResult, 'TipoUsuario', { id: parametros.id });
        },

        parametros
    );
};//