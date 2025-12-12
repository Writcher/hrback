"use server"

import { deleteImportacionParametros, getImportacionesParametros, insertImportacionParametros, setImportacionCompletaParametros } from "@/lib/types/importacion";
import { db } from "@vercel/postgres";
import { getEstadoImportacionCompleta } from "../estadoimportacion/service.estadoimportacion";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";

const client = db;

export async function getImportaciones(parametros: getImportacionesParametros) {
    return executeQuery(
        'getImportaciones',
        async () => {

            const offset = (parametros.pagina) * parametros.filasPorPagina;

            const id_estadoimportacion = await getEstadoImportacionCompleta();

            const valoresBase: any = [];

            let filtro = `
                WHERE 1=1
            `;

            if (parametros.filtroIncompletas) {
                filtro += `
                    AND id_estadoimportacion != $${valoresBase.length + 1}::int`;
                valoresBase.push(id_estadoimportacion);
            };

            if (parametros.filtroProyecto !== 0) {
                filtro += `
                    AND id_proyecto = $${valoresBase.length + 1}::int`;
                valoresBase.push(parametros.filtroProyecto);
            };

            const valoresPrincipal = [...valoresBase, parametros.filasPorPagina, offset];
            const limite = `
                LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

            const getQuery = `
                SELECT
                    i.id,
                    i.fecha,
                    i.nombrearchivo AS nombre,
                    e.nombre AS nombreestado,
                    u.nombre AS nombreusuario,
                    p.nombre AS nombreproyecto
                FROM importacion i
                JOIN estadoimportacion e ON i.id_estadoimportacion = e.id
                JOIN usuario u ON i.id_usuariocreacion = u.id
                JOIN proyecto p ON i.id_proyecto = p.id
                ${filtro}
                ORDER BY i.id DESC
                ${limite}
            `;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM importacion
                ${filtro}
            `;

            const getResult = await client.query(getQuery, valoresPrincipal);

            const countResult = await client.query(countQuery, valoresBase);

            return {
                importaciones: getResult.rows,
                totalImportaciones: countResult.rows[0].total
            };
        },

        parametros
    );
};//

export async function setImportacionCompleta(parametros: setImportacionCompletaParametros) {
    return executeQuery(
        'setImportacionCompleta',
        async () => {

            const id_estadoimportacion = await getEstadoImportacionCompleta();

            const updateQuery = `
                UPDATE importacion
                SET id_estadoimportacion = $1
                WHERE id = $2
            `;

            const updateResult = await client.query(updateQuery, [
                id_estadoimportacion, 
                parametros.id
            ]);

            checkRowsAffected(updateResult, 'Importacion', { id: parametros.id });
        },

        parametros
    );
};//

export async function deleteImportacion(parametros: deleteImportacionParametros) {
    return executeQuery(
        'deleteImportacion',
        async () => {

            const deleteQuery = `
                DELETE FROM importacion
                WHERE id = $1
            `;

            const deleteResult = await client.query(deleteQuery, [
                parametros.id
            ]);

            checkRowsAffected(deleteResult, 'Importacion', { id: parametros.id });
        },

        parametros
    );
};//

export async function insertImportacion(parametros: insertImportacionParametros) {
    return executeQuery(
        'insertImportacion',
        async () => {

            const insertQuery = `
                INSERT INTO importacion (id_estadoimportacion, id_proyecto, nombrearchivo, id_tipoimportacion, id_usuariocreacion)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.id_estadoimportacion, 
                parametros.id_proyecto, 
                parametros.nombreArchivo, 
                parametros.id_tipoimportacion, 
                parametros.id_usuariocreacion
            ]);

            checkRowsAffected(insertResult, 'Importacion');

            return insertResult.rows[0].id;
        },

        parametros
    );
};//