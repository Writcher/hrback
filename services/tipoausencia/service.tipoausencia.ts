"use server";

import { createTipoAusenciaParametros, deactivateTipoAusenciaParametros, editTipoAusenciaParametros, getTiposAusenciaABMParametros } from "@/lib/types/tipoausencia";
import { db } from "@vercel/postgres";
import { getEstadoParametroActivo, getEstadoParametroBaja } from "../estadoparametro/service.estadoparametro";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { createConflictError, createForbiddenError } from "@/lib/utils/error";

const client = db;

export async function getTiposAusencia() {
    return executeQuery(
        'getTiposAusencia',
        async () => {

            const id_estadoparametro = await getEstadoParametroBaja();

            const getQuery = `
                SELECT 
                id, 
                nombre
                FROM tipoausencia
                WHERE id_estadoparametro != $1
            `;

            const getResult = await client.query(getQuery, [
                id_estadoparametro
            ]);

            return getResult.rows;
        }
    );
};//

export async function getTipoAusenciaInjustificada() {
    return executeQuery(
        'getTipoAusenciaInjustificada',
        async () => {

            const getQuery = `
                SELECT id FROM tipoausencia
                WHERE nombre = 'Injustificada'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const id_estadoparametro = await getEstadoParametroActivo();

                const insertQuery = `
                    INSERT INTO tipoausencia (nombre, id_estadoparametro)
                    VALUES ($1, $2)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Injustificada', id_estadoparametro]);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getTipoAusenciaPendiente() {
    return executeQuery(
        'getTipoAusenciaPendiente',
        async () => {

            const getQuery = `
                SELECT id FROM tipoausencia
                WHERE nombre = 'Pendiente'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const id_estadoparametro = await getEstadoParametroActivo();

                const insertQuery = `
                    INSERT INTO tipoausencia (nombre, id_estadoparametro)
                    VALUES ($1, $2)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Pendiente', id_estadoparametro]);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getTiposAusenciaABM(parametros: getTiposAusenciaABMParametros) {
    return executeQuery(
        'getTiposAusenciaABM',
        async () => {

            const offset = (parametros.pagina) * parametros.filasPorPagina;

            const getQuery = `
                SELECT 
                    ta.id, 
                    ta.nombre,
                    ep.nombre AS estadoparametro
                FROM tipoausencia ta
                JOIN estadoparametro ep ON ta.id_estadoparametro = ep.id
                LIMIT $1 OFFSET $2
            `;

            const countQuery = `
                SELECT COUNT(DISTINCT id) AS total
                FROM tipoausencia
            `;

            const getResult = await client.query(getQuery, [
                parametros.filasPorPagina,
                offset
            ]);

            const countResult = await client.query(countQuery);

            return {
                tiposAusencia: getResult.rows,
                totalTiposAusencia: countResult.rows[0].total,
            };
        },

        parametros
    );
};//

export async function deactivateTipoAusencia(parametros: deactivateTipoAusenciaParametros) {
    return executeQuery(
        'deactivateTipoAusencia',
        async () => {

            const id_estadoparametro = await getEstadoParametroBaja();

            const deactivateQuery = `
                UPDATE tipoausencia
                SET id_estadoparametro = $2
                WHERE id = $1
                    AND id_estadoparametro != $2
                    AND nombre NOT IN ('Injustificada', 'Pendiente')
            `;

            const deactivateResult = await client.query(deactivateQuery, [
                parametros.id_tipoausencia,
                id_estadoparametro
            ]);

            checkRowsAffected(deactivateResult, 'TipoAusencia', { id: parametros.id_tipoausencia });
        },

        parametros
    );
};//

export async function editTipoAusencia(parametros: editTipoAusenciaParametros) {
    return executeQuery(
        'editTipoAusencia',
        async () => {

            const id_estadoparametro = await getEstadoParametroBaja();

            const nombresProtegidos = ['Injustificada', 'Pendiente'];
            if (nombresProtegidos.includes(parametros.nombre)) {
                throw createForbiddenError(`No se puede modificar el tipo de ausencia '${parametros.nombre}'`);
            };

            const checkQuery = `
                SELECT id FROM tipoausencia 
                WHERE nombre = $1 AND id != $2 AND id_estadoparametro != $3
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.nombre,
                parametros.id_tipoausencia,
                id_estadoparametro
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'TipoAusencia ya existe con ese nombre',
                    { nombre: parametros.nombre, id: parametros.id_tipoausencia }
                );
            };

            const updateQuery = `
                UPDATE tipoausencia
                SET nombre = $1
                WHERE id = $2
                    AND id_estadoparametro != $3
                    AND nombre NOT IN ('Injustificada', 'Pendiente')
            `;

            const updateResult = await client.query(updateQuery, [
                parametros.nombre,
                parametros.id_tipoausencia,
                id_estadoparametro
            ]);

            checkRowsAffected(updateResult, 'TipoAusencia', { id: parametros.id_tipoausencia });
        },

        parametros
    );
};//

export async function createTipoAusencia(parametros: createTipoAusenciaParametros) {
    return executeQuery(
        'createControl',
        async () => {

            const id_estadoparametro = await getEstadoParametroActivo();

            const checkQuery = `
                SELECT id FROM tipoausencia
                WHERE nombre = $1
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.nombre
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'TipoAusencia ya existe',
                    { nombre: parametros.nombre }
                );
            };

            const insertQuery = `
                INSERT INTO tipoausencia (nombre, id_estadoparametro)
                VALUES ($1, $2)
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.nombre,
                id_estadoparametro
            ]);

            checkRowsAffected(insertResult, 'TipoAusencia');
        },

        parametros
    );
};//