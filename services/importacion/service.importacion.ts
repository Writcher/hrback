"use server"

import { getImportacionesParametros } from "@/lib/types/importacion";
import { db } from "@vercel/postgres";

const client = db;

export async function getImportaciones(parametros: getImportacionesParametros) {
    try {
        const textoEstadosImportacion = `
            SELECT *
            FROM "estadoimportacion"
            WHERE nombre ILIKE 'Completa'
                OR nombre ILIKE 'Incompleta'
        `;

        const { rows: estados } = await client.query(textoEstadosImportacion);

        const importacionIncompleta = estados.find(e => e.nombre.toLowerCase() === 'incompleta');
        const idEstadoIncompleta = importacionIncompleta.id;

        const offset = (parametros.pagina) * parametros.filasPorPagina;

        const valores: any = [parametros.filasPorPagina, offset];
        const valoresConteo: any = [];

        let textoFiltro = '';
        let textoFiltroConteo = '';

        let conteoWhere = 0;

        if (parametros.filtroIncompletas) {
            if (conteoWhere === 0) {
                textoFiltro += `
                    WHERE id_estadoimportacion = $${valores.length + 1}::int
                `;
                textoFiltroConteo += `
                    WHERE id_estadoimportacion = $${valoresConteo.length + 1}::int
                `;
            } else {
                textoFiltro += `
                    AND id_estadoimportacion = $${valores.length + 1}::int
                `;
                textoFiltroConteo += `
                    AND id_estadoimportacion = $${valoresConteo.length + 1}::int
                `;
            };
            valores.push(idEstadoIncompleta);
            valoresConteo.push(idEstadoIncompleta);
            conteoWhere++
        };

        if (parametros.filtroProyecto !== 0) {
            if (conteoWhere === 0) {
                textoFiltro += `
                    WHERE id_proyecto = $${valores.length + 1}::int
                `;
                textoFiltroConteo += `
                    WHERE id_proyecto = $${valoresConteo.length + 1}::int
                `;
            } else {
                textoFiltro += `
                    AND id_proyecto = $${valores.length + 1}::int
                `;
                textoFiltroConteo += `
                    AND id_proyecto = $${valoresConteo.length + 1}::int
                `;
            };
            valores.push(parametros.filtroProyecto);
            valoresConteo.push(parametros.filtroProyecto);
            conteoWhere++
        };

        const texto = `
            SELECT
                i.id,
                i.fecha,
                e.nombre AS nombreestado
            FROM "importacion" i
            JOIN "estadoimportacion" e ON i.id_estadoimportacion = e.id
            ${textoFiltro}
            LIMIT $1 OFFSET $2
        `;

        const resultado = await client.query(texto, valores);

        const textoConteo = `
            SELECT COUNT(*) AS total
            FROM "importacion"
            ${textoFiltroConteo}
        `;

        const resultadoConteo = await client.query(textoConteo, valoresConteo);

        return {
            importaciones: resultado.rows,
            totalImportaciones: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getImportaciones: ", error);
        throw error;
    };
};

export async function setImportacionCompleta(id: number) {
    try {
        const textoEstadoImportacion = `
            SELECT id
            FROM "estadoimportacion"
            WHERE nombre ILIKE 'Completa'
        `;

        const estadoRaw = await client.query(textoEstadoImportacion);
        const estado = estadoRaw.rows[0].id;

        const texto = `
            UPDATE importacion
            SET id_estadoimportacion = $1
            WHERE id = $2
        `;
        const valores = [estado, id];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en setImportacionCompleta: ", error);
        throw error;
    };
};

export async function deleteImportacion(id: number) {
    try {
        const texto = `
            DELETE FROM "importacion"
            WHERE id = $1
        `;
        const valores = [id];

        await client.query(texto, valores);
        return;
    } catch (error) {
        console.error("Error en deleteImportacion: ", error);
        throw error;
    };
};

export async function insertImportacion(id_estadoimportacion: number, id_proyecto: number) {
    try {
        const texto = `
            INSERT INTO "importacion" (id_estadoimportacion, id_proyecto)
            VALUES ($1, $2)
            RETURNING id
        `;
        const valores = [id_estadoimportacion, id_proyecto];

        const importacion = await client.query(texto, valores);

        return importacion.rows[0].id;
    } catch (error) {
        console.error("Error en insertEmpleado: ", error);
        throw error;
    };
};