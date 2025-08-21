"use server"

import { getEmpleadoJornadasParametros } from "@/lib/types/empleado";
import { getImportacionJornadasParametros } from "@/lib/types/importacion";
import { insertJornadaParametros, updateJornadaParametros } from "@/lib/types/jornada";
import { db } from "@vercel/postgres";
import { verifyExistenciaInstancias } from "../excel/service.excel";

const client = db;

export async function getEmpleadoJornadas(params: getEmpleadoJornadasParametros) {
    try {
        const offset = (params.pagina) * params.filasPorPagina;
        const valoresBase: any = [params.id_empleado];
        
        let textoJoin = `
            JOIN "tipojornada" t ON j.id_tipojornada = t.id
            LEFT JOIN "jornadaobservacion" jo ON j.id = jo.id_jornada
            LEFT JOIN "observacion" o ON jo.id_observacion = o.id
        `;
        
        let textoFiltroBase = 'WHERE j.id_empleado = $1 ';
        
        if (params.filtroMes !== 0) {
            textoFiltroBase += `AND j.id_mes = $${valoresBase.length + 1} `;
            valoresBase.push(params.filtroMes);
        }
        
        if (params.filtroQuincena !== 0) {
            const quincenaParamIndex = valoresBase.length + 1;
            textoJoin += `JOIN "quincena" q ON j.id_quincena = q.id `;
            textoFiltroBase += `AND q.quincena = $${quincenaParamIndex} `;
            valoresBase.push(params.filtroQuincena);
        }
        
        if (params.filtroMarcasIncompletas) {
            textoFiltroBase += `AND (j.entrada IS NULL OR j.salida IS NULL) `;
        }
        
        const valoresPrincipal = [...valoresBase, params.filasPorPagina, offset];
        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;
        
        let texto = `
            SELECT
                j.id,
                j.fecha,
                j.entrada,
                j.salida,
                j.entrada_r,
                j.salida_r,
                j.total,
                t.nombre AS tipojornada,
                array_agg(DISTINCT o.texto) FILTER (WHERE o.texto IS NOT NULL) AS observaciones
            FROM "jornada" j
            ${textoJoin}
            ${textoFiltroBase}
            GROUP BY
                j.id,
                j.fecha,
                j.entrada,
                j.salida,
                j.entrada_r,
                j.salida_r,
                j.total,
                t.nombre
            ORDER BY j.fecha ASC    
            ${textoLimite}
        `;
        
        const resultado = await client.query(texto, valoresPrincipal);

        let textoConteo = `
            SELECT COUNT(DISTINCT j.id) AS total
            FROM "jornada" j
            ${textoJoin}
            ${textoFiltroBase}
        `;
        
        const resultadoConteo = await client.query(textoConteo, valoresBase);
        
        return {
            jornadas: resultado.rows,
            totalJornadas: parseInt(resultadoConteo.rows[0].total), // Ensure it's a number
        };
    } catch (error) {
        console.error("Error en getEmpleadoJornadas: ", error);
        throw error;
    }
}

export async function getImportacionJornadas(params: getImportacionJornadasParametros) {
    try {
        const offset = (params.pagina) * params.filasPorPagina;

        const valoresBase: any = [params.id_importacion];
        let textoFiltroBase = 'WHERE j.id_importacion = $1 ';

        if (params.filtroMarcasIncompletas) {
            textoFiltroBase += 'AND (j.entrada IS NULL OR j.salida IS NULL) '
        };

        const valoresPrincipal = [...valoresBase, params.filasPorPagina, offset];
        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

        const texto = `
            SELECT
                j.id,
                j.fecha,
                j.entrada,
                j.salida,
                e.nombreapellido AS nombreempleado
            FROM "jornada" j
            JOIN "empleado" e ON j.id_empleado = e.id
            ${textoFiltroBase}
            ${textoLimite}
        `;

        const resultado = await client.query(texto, valoresPrincipal);

        let textoConteo = `
            SELECT COUNT(*) AS total
            FROM "jornada" j
            ${textoFiltroBase}
        `;

        const resultadoConteo = await client.query(textoConteo, valoresBase);

        let textoConteoIncompleto = `
            SELECT COUNT(*) AS total
            FROM "jornada" j
            WHERE j.id_importacion = $1
            AND (j.entrada IS NULL OR j.salida IS NULL)
        `;

        const resultadoConteoIncompleto = await client.query(textoConteoIncompleto, valoresBase);

        return {
            jornadas: resultado.rows,
            totalJornadas: resultadoConteo.rows[0].total,
            totalIncompleto: resultadoConteoIncompleto.rows[0].total
        };
    } catch (error) {
        console.error("Error en getEmpleadoJornadas: ", error);
        throw error;
    };
};

export async function updateJornada(params: updateJornadaParametros) {
    try {
        const texto = `
            UPDATE jornada
            SET entrada = $1,
                salida = $2
            WHERE id = $3
            RETURNING id, entrada, salida
        `;
        const valores = [params.entrada, params.salida, params.id_jornada];

        const respuestaRaw = await client.query(texto, valores);
        const respuesta = respuestaRaw.rows[0]

        return respuesta;
    } catch (error) {
        console.error("Error en updateJornada: ", error);
        throw error;
    };
};

export async function insertJornada(parametros: insertJornadaParametros) {
    try {
        await client.query("BEGIN");

        const {
            entrada,
            entradaTarde,
            salida,
            salidaTarde,
            fecha,
            id_tipojornada,
            id_tipoausencia,
            observacion,
            id_empleado,
        } = parametros;

        const [dia, mes, año] = fecha.split("-").map(Number);
        const fechaIso = `${año}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const quincena = dia <= 15 ? 1 : 2;

        const id_foraneas = await verifyExistenciaInstancias({ año, mes, quincena });

        const textoProyecto = `SELECT id_proyecto FROM "empleado" WHERE id = $1`;
        const valoresProyecto = [id_empleado];
        const respuestaProyecto = await client.query(textoProyecto, valoresProyecto);
        const id_proyecto = respuestaProyecto.rows[0].id_proyecto;

        let id_jornadaCreada;
        let id_jornadaTardeCreada;

        if (id_tipoausencia === '') {
            const textoNoAusente = `
                INSERT INTO "jornada" (entrada, salida, fecha, id_empleado, id_proyecto, id_tipojornada, id_quincena, id_mes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;
            const valoresNoAusente = [entrada, salida, fechaIso, id_empleado, id_proyecto, id_tipojornada, id_foraneas.id_quincena, id_foraneas.id_mes];
            const respuestaNoAusente = await client.query(textoNoAusente, valoresNoAusente);
            id_jornadaCreada = respuestaNoAusente.rows[0].id;
        } else {
            const textoAusente = `
                INSERT INTO "jornada" (entrada, salida, fecha, id_empleado, id_proyecto, id_tipojornada, id_quincena, id_mes, id_tipoausencia)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `;
            const valoresAusente = [entrada, salida, fechaIso, id_empleado, id_proyecto, id_tipojornada, id_foraneas.id_quincena, id_foraneas.id_mes, id_tipoausencia];
            const respuestaAusente = await client.query(textoAusente, valoresAusente);
            id_jornadaCreada = respuestaAusente.rows[0].id;
        };

        if (entradaTarde !== '' || salidaTarde !== '') {
            const textoNoAusente = `
                INSERT INTO "jornada" (entrada, salida, fecha, id_empleado, id_proyecto, id_tipojornada, id_quincena, id_mes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;
            const valoresNoAusente = [entradaTarde, salidaTarde, fechaIso, id_empleado, id_proyecto, id_tipojornada, id_foraneas.id_quincena, id_foraneas.id_mes];
            const respuestaNoAusente = await client.query(textoNoAusente, valoresNoAusente);
            id_jornadaTardeCreada = respuestaNoAusente.rows[0].id;
        };

        if (observacion !== '') {
            const textoObservacion = `
                INSERT INTO "observacion" (texto)
                VALUES ($1)
                RETURNING id
            `;
            const valoresObservacion = [observacion];
            const respuestaObs = await client.query(textoObservacion, valoresObservacion);
            const id_observacion = respuestaObs.rows[0].id;

            const textoJornadaObservacion = `
                INSERT INTO "jornadaobservacion" (id_jornada, id_observacion)
                VALUES ($1, $2)
            `;
            await client.query(textoJornadaObservacion, [id_jornadaCreada, id_observacion]);

            if (entradaTarde !== '' || salidaTarde !== '') {
                await client.query(textoJornadaObservacion, [id_jornadaTardeCreada, id_observacion]);
            };
        };

        await client.query("COMMIT");
        return;
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error en insertJornada: ", error);
        throw error;
    };
};