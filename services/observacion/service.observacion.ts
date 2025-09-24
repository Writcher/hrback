"use server"

import { getObservacionesResumenParametros, insertObservacionParametros } from "@/lib/types/observacion";
import { db } from "@vercel/postgres";

const client = db;

export async function insertObservacion(parametros: insertObservacionParametros) {
    try {
        const texto = `
            INSERT INTO "observacion" (texto)
            VALUES ($1)
            RETURNING id
        `;
        const valores = [parametros.observacion];

        const observacion = await client.query(texto, valores);

        return observacion.rows[0].id;
    } catch (error) {
        console.error("Error en insertObservacion: ", error);
        throw error;
    };
};

export async function getObservacionesResumen(parametros: getObservacionesResumenParametros) {
    try {
        const valoresBase: any = [parametros.id_empleado];

        const offset = (parametros.pagina) * parametros.filasPorPagina;

        let textoJoin = `
            JOIN jornadaobservacion jo ON jo.id_observacion = o.id
            JOIN jornada j ON jo.id_jornada = j.id
        `;

        let textoFiltroBase = `
            WHERE j.id_empleado = $1 
            AND o.texto != 'Entrada Manual'
        `;

        if (parametros.filtroMes !== 0) {
            textoFiltroBase += `AND j.id_mes = $${valoresBase.length + 1} `;
            valoresBase.push(parametros.filtroMes);
        };

        if (parametros.filtroQuincena !== 0) {
            const quincenaParamIndex = valoresBase.length + 1;
            textoJoin += `JOIN "quincena" q ON j.id_quincena = q.id `;
            textoFiltroBase += `AND q.quincena = $${quincenaParamIndex} `;
            valoresBase.push(parametros.filtroQuincena);
        };

        const valoresPrincipal = [...valoresBase, parametros.filasPorPagina, offset];
        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

        const texto = `
            SELECT 
                o.id,
                o.texto,
                j.fecha
            FROM observacion o
            ${textoJoin}
            ${textoFiltroBase}
            ${textoLimite}
        `;

        const resultado = await client.query(texto, valoresPrincipal);

        const textoConteo = `
            SELECT COUNT(*) AS total
            FROM observacion o
            ${textoJoin}
            ${textoFiltroBase}
        `;

        const resultadoConteo = await client.query(textoConteo, valoresBase);

        return {
            observaciones: resultado.rows,
            totalObservaciones: resultadoConteo.rows[0].total
        };
    } catch (error) {
        console.error("Error en getObservacionesResumen: ", error);
        throw error;
    };
};