"use server";

import { createProyectoParametros, deactivateProyectoParametros, editProyectoParametros, getProyectoByNominaParametros, getProyectoModalidadTrabajoParametros, getProyectoNominaParametros, getProyectosABMParametros } from "@/lib/types/proyecto";
import { db } from "@vercel/postgres";
import { getEstadoParametroActivo, getEstadoParametroBaja } from "../estadoparametro/service.estadoparametro";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { createConflictError } from "@/lib/utils/error";

const client = db;

export async function getProyectos() {
    return executeQuery(
        'getProyectos',
        async () => {

            const id_estadoparametro = await getEstadoParametroBaja();

            const getQuery = `
                SELECT * FROM proyecto
                WHERE id_estadoparametro != $1
            `;

            const getResult = await client.query(getQuery, [
                id_estadoparametro
            ]);

            return getResult.rows
        }
    );
};//

export async function getProyectosABM(parametros: getProyectosABMParametros) {
    return executeQuery(
        'getProyectosABM',
        async () => {

            const offset = (parametros.pagina) * parametros.filasPorPagina;

            const getQuery = `
                SELECT 
                    p.id, 
                    p.nombre,
                    mt.nombre AS modalidadtrabajo,
                    ep.nombre AS estadoparametro,
                    p.id_modalidadtrabajo
                FROM proyecto p
                JOIN modalidadtrabajo mt ON p.id_modalidadtrabajo = mt.id
                JOIN estadoparametro ep ON p.id_estadoparametro = ep.id
                LIMIT $1 OFFSET $2
            `;

            const countQuery = `
                SELECT COUNT(DISTINCT id) AS total
                FROM proyecto
            `;

            const getResult = await client.query(getQuery, [
                parametros.filasPorPagina,
                offset
            ]);

            const countResult = await client.query(countQuery);

            return {
                proyectos: getResult.rows,
                totalProyectos: countResult.rows[0].total,
            };
        },

        parametros
    );
};//

export async function getProyectoModalidadTrabajo(parametros: getProyectoModalidadTrabajoParametros) {
    return executeQuery(
        'getProyectosABM',
        async () => {

            const getQuery = `
                SELECT id_modalidadtrabajo AS id
                FROM proyecto
                WHERE id = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.id_proyecto
            ]);

            return getResult.rows[0].id;
        },

        parametros
    );
};//

export async function deactivateProyecto(parametros: deactivateProyectoParametros) {
    return executeQuery(
        'deactivateProyecto',
        async () => {

            const id_estadoparametro = await getEstadoParametroBaja();

            const deactivateQuery = `
                UPDATE proyecto
                SET id_estadoparametro = $2
                WHERE id = $1
                    AND id_estadoparametro != $2
            `;

            const deactivateResult = await client.query(deactivateQuery, [
                parametros.id_proyecto,
                id_estadoparametro
            ]);

            checkRowsAffected(deactivateResult, 'Proyecto', { id: parametros.id_proyecto });
        },

        parametros
    );
};//

export async function editProyecto(parametros: editProyectoParametros) {
    return executeQuery(
        'editProyecto',
        async () => {

            const id_estadoparametro = await getEstadoParametroBaja();

            const checkQuery = `
                SELECT id FROM proyecto 
                WHERE nombre = $1 AND id != $2 AND id_estadoparametro != $3
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.nombre,
                parametros.id_proyecto,
                id_estadoparametro
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'Proyecto ya existe con ese nombre',
                    { nombre: parametros.nombre, id: parametros.id_proyecto }
                );
            };

            const updateQuery = `
                UPDATE "proyecto"
                SET nombre = $1, id_modalidadtrabajo = $2
                WHERE id = $3
                    AND id_estadoparametro != $4
            `;

            const updateResult = await client.query(updateQuery, [
                parametros.nombre,
                parametros.id_modalidadtrabajo,
                parametros.id_proyecto,
                id_estadoparametro
            ]);

            checkRowsAffected(updateResult, 'Proyecto', { id: parametros.id_proyecto });
        },

        parametros
    );
};//

export async function createProyecto(parametros: createProyectoParametros) {
    return executeQuery(
        'createProyecto',
        async () => {

            const id_estadoparametro = await getEstadoParametroActivo();

            const checkQuery = `
                SELECT id FROM proyecto
                WHERE nombre = $1
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.nombre
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'Proyecto ya existe',
                    { nombre: parametros.nombre }
                );
            };

            const insertQuery = `
                INSERT INTO proyecto (nombre, id_modalidadtrabajo, id_estadoparametro)
                VALUES ($1, $2, $3)
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.nombre,
                parametros.id_modalidadtrabajo,
                id_estadoparametro
            ]);

            checkRowsAffected(insertResult, 'Proyecto');
        },

        parametros
    );
};//

export async function getProyectoNomina(parametros: getProyectoNominaParametros) {
    return executeQuery(
        'getProyectoNomina',
        async () => {

            const getQuery = `
                SELECT nomina FROM proyecto
                WHERE id = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.id_proyecto
            ]);

            return getResult.rows[0].nomina;
        },

        parametros
    );
};//

export async function getProyectoByNomina(parametros: getProyectoByNominaParametros) {
    return executeQuery(
        'getProyectoByNomina',
        async () => {

            const getQuery = `
                SELECT id
                FROM proyecto
                WHERE nomina = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.nomina
            ]);

            if (!getResult || !getResult.rows || getResult.rows.length === 0) {
                return null;
            };

            return getResult.rows[0].id;
        },

        parametros
    );
};//