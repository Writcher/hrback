"use server";

import { createControlParametros, deleteControlParametros, editControlParametros, getControlByProyectoParametros, getControlesParametros } from "@/lib/types/control";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { createConflictError } from "@/lib/utils/error";
import { db } from "@vercel/postgres";

const client = db;

export async function getControlByProyecto(parametros: getControlByProyectoParametros) {
    return executeQuery(
        'getControlByProyecto',
        async () => {

            const getQuery = `
                SELECT serie FROM control 
                WHERE id_proyecto = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.id_proyecto
            ]);

            return getResult.rows.map(control => control.serie);
        },

        parametros
    );
};//

export async function getProyectosConHikVision() {
    return executeQuery(
        'getProyectosConHikVision',
        async () => {

            const getQuery = `
                SELECT DISTINCT id_proyecto
                FROM control
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows.map(proyecto => proyecto.id_proyecto);
        }
    );
};//

export async function deleteControl(parametros: deleteControlParametros) {
    return executeQuery(
        'deleteControl',
        async () => {

            const deleteQuery = `
                DELETE FROM control
                WHERE id = $1
            `;

            const deleteResult = await client.query(deleteQuery, [
                parametros.id_control
            ]);

            checkRowsAffected(deleteResult, 'Control', { id: parametros.id_control });
        },

        parametros
    );
};//

export async function editControl(parametros: editControlParametros) {
    return executeQuery(
        'editControl',
        async () => {

            const checkQuery = `
                SELECT id FROM control 
                WHERE serie = $1 AND id_proyecto = $2 AND id != $3
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.serie,
                parametros.id_proyecto,
                parametros.id_control
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'Control ya existe en proyecto',
                    { serie: parametros.serie, id_proyecto: parametros.id_proyecto }
                );
            };

            const updateQuery = `
                UPDATE control
                SET serie = $1, id_proyecto = $2
                WHERE id = $3
            `;

            const updateResult = await client.query(updateQuery, [
                parametros.serie,
                parametros.id_proyecto,
                parametros.id_control
            ]);

            checkRowsAffected(updateResult, 'Control', { id: parametros.id_control });
        },

        parametros
    );
};//

export async function createControl(parametros: createControlParametros) {
    return executeQuery(
        'createControl',
        async () => {

            const checkQuery = `
                SELECT id FROM control
                WHERE serie = $1 AND id_proyecto = $2
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.serie,
                parametros.id_proyecto
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'Control ya existe',
                    { serie: parametros.serie, id_proyecto: parametros.id_proyecto }
                );
            };

            const insertQuery = `
                INSERT INTO "control" (serie, id_proyecto)
                VALUES ($1, $2)
            `;

            const createResult = await client.query(insertQuery, [
                parametros.serie,
                parametros.id_proyecto
            ]);

            checkRowsAffected(createResult, 'Control no creado');
        },

        parametros
    );
};//

export async function getControles(parametros: getControlesParametros) {
    return executeQuery(
        'getControles',
        async () => {

            const offset = (parametros.pagina) * parametros.filasPorPagina;

            const getQuery = `
                SELECT 
                    c.id,
                    c.serie,
                    c.id_proyecto,
                    p.nombre AS proyectonombre
                FROM control c
                JOIN proyecto p ON c.id_proyecto = p.id
                LIMIT $1 OFFSET $2
            `;

            const countQuery = `
                SELECT COUNT(DISTINCT id) AS total
                FROM "control"
            `;

            const getResult = await client.query(getQuery, [
                parametros.filasPorPagina,
                offset
            ]);

            const countResult = await client.query(countQuery);

            return {
                controles: getResult.rows,
                totalControles: countResult.rows[0].total,
            };
        },

        parametros
    );
};//