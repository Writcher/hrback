"use server"

import { deleteImportacionParametros, getImportacionesParametros, insertImportacionParametros, setImportacionCompletaParametros } from "@/lib/types/importacion";
import { db } from "@vercel/postgres";
import { getEstadoImportacionCompleta } from "../estadoimportacion/service.estadoimportacion";

const client = db;

export async function getImportaciones(parametros: getImportacionesParametros) {
    try {

        const importacion_completa = await getEstadoImportacionCompleta();

        const offset = (parametros.pagina) * parametros.filasPorPagina;

        const valoresBase: any = [];

        let textoFiltroBase = 'WHERE 1=1';

        if (parametros.filtroIncompletas) {
            textoFiltroBase += `
                AND id_estadoimportacion != $${valoresBase.length + 1}::int
            `;
            valoresBase.push(importacion_completa);
        };

        if (parametros.filtroProyecto !== 0) {

            textoFiltroBase += `
                AND id_proyecto = $${valoresBase.length + 1}::int
            `;

            valoresBase.push(parametros.filtroProyecto);
        };

        const valoresPrincipal = [...valoresBase, parametros.filasPorPagina, offset];
        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

        const texto = `
            SELECT
                i.id,
                i.fecha,
                i.nombrearchivo AS nombre,
                e.nombre AS nombreestado
            FROM "importacion" i
            JOIN "estadoimportacion" e ON i.id_estadoimportacion = e.id
            ${textoFiltroBase}
            ${textoLimite}
        `;

        const resultado = await client.query(texto, valoresPrincipal);

        const textoConteo = `
            SELECT COUNT(*) AS total
            FROM "importacion"
            ${textoFiltroBase}
        `;

        const resultadoConteo = await client.query(textoConteo, valoresBase);

        return {
            importaciones: resultado.rows,
            totalImportaciones: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getImportaciones: ", error);
        throw error;
    };
};//

export async function setImportacionCompleta(parametros: setImportacionCompletaParametros) {
    try {
        const importacion_completa = await getEstadoImportacionCompleta();

        const texto = `
            UPDATE importacion
            SET id_estadoimportacion = $1
            WHERE id = $2
        `;

        const valores = [importacion_completa, parametros.id];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en setImportacionCompleta: ", error);
        throw error;
    };
};//

export async function deleteImportacion(parametros: deleteImportacionParametros) {
    try {
        const texto = `
            DELETE FROM "importacion"
            WHERE id = $1
        `;

        const valores = [parametros.id];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en deleteImportacion: ", error);
        throw error;
    };
};//

export async function insertImportacion(parametros: insertImportacionParametros) {
    try {
        const texto = `
            INSERT INTO "importacion" (id_estadoimportacion, id_proyecto, nombrearchivo)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        const valores = [parametros.id_estadoimportacion, parametros.id_proyecto, parametros.nombreArchivo];

        const respuesta = await client.query(texto, valores);

        return respuesta.rows[0].id;
    } catch (error) {
        console.error("Error en insertImportacion: ", error);
        throw error;
    };
};//