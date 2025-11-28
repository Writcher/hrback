"use server"

import { getObservacionesResumenParametros, insertObservacionParametros } from "@/lib/types/observacion";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function insertObservacion(parametros: insertObservacionParametros) {
    return executeQuery(
        'insertObservacion',
        async () => {

            const insertQuery = `
                INSERT INTO observacion (texto)
                VALUES ($1)
                RETURNING id
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.observacion
            ]);

            checkRowsAffected(insertResult, 'Observacion no creada')

            return insertResult.rows[0].id;
        },

        parametros
    );
};//

export async function getObservacionesResumen(parametros: getObservacionesResumenParametros) {
    return executeQuery(
        'getObservacionesResumen',
        async () => {

            const offset = (parametros.pagina) * parametros.filasPorPagina;

            const valoresBase: any = [parametros.id_empleado];

            let join = `
                JOIN jornadaobservacion jo ON jo.id_observacion = o.id
                JOIN jornada j ON jo.id_jornada = j.id
            `;

            let filtro = `
                WHERE j.id_empleado = $1 
            `;

            if (parametros.filtroMes !== 0) {
                filtro += `
                    AND j.id_mes = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroMes);
            };

            if (parametros.filtroQuincena !== 0) {
                join += `
                    JOIN "quincena" q ON j.id_quincena = q.id`;
                filtro += `
                    AND q.quincena = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroQuincena);
            };

            const valoresPrincipal = [...valoresBase, parametros.filasPorPagina, offset];

            const limite = `
                LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}
            `;

            const getQuery = `
                SELECT
                    o.id,
                    o.texto,
                    j.fecha
                FROM observacion o
                ${join}
                ${filtro}
                ${limite}
            `;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM observacion o
                ${join}
                ${filtro}
            `;

            const getResult = await client.query(getQuery, valoresPrincipal);

            const countResult = await client.query(countQuery, valoresBase);

            return {
                observaciones: getResult.rows,
                totalObservaciones: countResult.rows[0].total
            };

        },

        parametros
    );
};//