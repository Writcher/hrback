"use server";

import { createProyectoParametros, deactivateProyectoParametros, editProyectoParametros, getProyectoModalidadTrabajoParametros, getProyectosABMParametros } from "@/lib/types/proyecto";
import { db } from "@vercel/postgres";
import { getEstadoParametroActivo, getEstadoParametroBaja } from "../estadoparametro/service.estadoparametro";

const client = db;

export async function getProyectos() {
    try {
        const id_parametrobaja = await getEstadoParametroBaja();

        const texto = `
            SELECT 
                id, 
                nombre
            FROM proyecto
            WHERE id_estadoparametro != $1
        `;

        const valores = [id_parametrobaja];

        const resultado = await client.query(texto, valores);

        return resultado.rows;
    } catch (error) {
        console.error("Error en getProyectos: ", error);
        throw error;
    };
};

export async function getProyectosABM(parametros: getProyectosABMParametros) {
    try {
        const offset = (parametros.pagina) * parametros.filasPorPagina;

        const texto = `
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

        const valores = [parametros.filasPorPagina, offset];

        const resultado = await client.query(texto, valores);

        let textoConteo = `
            SELECT COUNT(DISTINCT id) AS total
            FROM "proyecto"
        `;

        const resultadoConteo = await client.query(textoConteo);

        return {
            proyectos: resultado.rows,
            totalProyectos: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getProyectos: ", error);
        throw error;
    };
};

export async function getProyectoModalidadTrabajo(parametros: getProyectoModalidadTrabajoParametros) {
    try {
        const texto = `
            SELECT id_modalidadtrabajo AS id
            FROM proyecto
            WHERE id = $1
        `;

        const valores = [parametros.id_proyecto];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getProyectoModalidadTrabajo: ", error);
        throw error;
    };
};

export async function deactivateProyecto(parametros: deactivateProyectoParametros) {
    try {
        const id_baja = await getEstadoParametroBaja();

        const texto = `
            UPDATE "proyecto"
            SET id_estadoparametro = $2
            WHERE id = $1
                AND id_estadoparametro != $2
        `;

        const valores = [parametros.id_proyecto, id_baja];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en deactivateProyecto: ", error);
        throw error;
    };
};

export async function editProyecto(parametros: editProyectoParametros) {
    try {
        const id_baja = await getEstadoParametroBaja();

        const texto = `
            UPDATE "proyecto"
            SET nombre = $1, id_modalidadtrabajo = $2
            WHERE id = $3
                AND id_estadoparametro != $4
        `;
        const valores = [parametros.nombre, parametros.id_modalidadtrabajo, parametros.id_proyecto, id_baja];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en editProyecto: ", error);
        throw error;
    };
};

export async function createProyecto(parametros: createProyectoParametros) {
    try {

        const id_estadoparametro = await getEstadoParametroActivo();

        const texto = `
                INSERT INTO "proyecto" (nombre, id_modalidadtrabajo, id_estadoparametro)
                VALUES ($1, $2, $3)
            `;

        const valores = [parametros.nombre, parametros.id_modalidadtrabajo, id_estadoparametro];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en createProyecto: ", error);
        throw error;
    };
};