"use server"

import { getEmpleadoJornadasParametros, getEmpleadoJornadasResumenParametros, getJornadasResumenParametros } from "@/lib/types/empleado";
import { getJornadasByImportacionParametros } from "@/lib/types/importacion";
import { deleteJornadaParametros, createJornadaParametros, updateJornadaParametros, validateJornadaParametros, insertJornadaParametros, getJornadaAusenciaParametros, createAbsencesParametros, recalculateJornadasEmpleadoParametros } from "@/lib/types/jornada";
import { db } from "@vercel/postgres";
import { getMesQuincena } from "../excel/service.excel";
import { getEstadoJornadaSinValidar, getEstadoJornadaValida } from "../estadojornada/service.estadojornada";
import { getEmpleadoByRelojProyecto, getEmpleadoProyecto } from "../empleado/service.empleado";
import { insertObservacion } from "../observacion/service.observacion";
import { insertJornadaObservacion } from "../jornadaobservacion/service.jornadaobservacion";
import { insertAusencia } from "../ausencia/service.ausencia";
import { getTipoAusenciaInjustificada, getTipoAusenciaPendiente } from "../tipoausencia/service.tipoausencia";
import { getTipoJornadaAusencia } from "../tipojornada/service.tipojornada";
import { getFuenteMarcaControl, getFuenteMarcaManual } from "../fuentemarca/service.fuentemarca";
import { getTipoImportacionAusentes } from "../tipoimportacion/service.tipoimportacion";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";


const client = db;

export async function getEmpleadoJornadas(parametros: getEmpleadoJornadasParametros) {
    return executeQuery(
        'getEmpleadoJornadas',
        async () => {
            const offset = (parametros.pagina) * parametros.filasPorPagina;

            const valoresBase: any = [parametros.id_empleado];

            let join = `
                JOIN tipojornada t ON j.id_tipojornada = t.id
                JOIN fuentemarca fm ON j.id_fuentemarca = fm.id
                LEFT JOIN ausencia a ON j.id_ausencia = a.id
                LEFT JOIN tipoausencia ta ON a.id_tipoausencia = ta.id
                LEFT JOIN jornadaobservacion jo ON j.id = jo.id_jornada
                LEFT JOIN observacion o ON jo.id_observacion = o.id
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
                    JOIN quincena q ON j.id_quincena = q.id`;
                filtro += `
                    AND q.quincena = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroQuincena);
            };

            if (parametros.filtroMarcasIncompletas) {
                filtro += `
                    AND (j.entrada IS NULL OR j.salida IS NULL)`;
            };

            if (parametros.ausencias) {
                filtro += `
                    AND j.id_ausencia IS NOT NULL`;
            };

            if (parametros.filtroTipoAusencia !== 0) {
                filtro += `
                    AND a.id_tipoausencia = $${valoresBase.length + 1}`
                valoresBase.push(parametros.filtroTipoAusencia);
            };

            const valoresPrincipal = [...valoresBase, parametros.filasPorPagina, offset];

            const limite = `
                LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}
            `;

            const getQuery = `
                SELECT
                    j.id,
                    j.fecha,
                    j.entrada,
                    j.salida,
                    j.entrada_r,
                    j.salida_r,
                    j.total,
                    t.nombre AS tipojornada,
                    ta.nombre AS tipoausencia,
                    COALESCE((fm.nombre = 'Manual'), false) AS es_manual,
                    array_agg(DISTINCT o.texto) FILTER (WHERE o.texto IS NOT NULL) AS observaciones
                FROM "jornada" j
                ${join}
                ${filtro}
                GROUP BY
                    j.id,
                    j.fecha,
                    j.entrada,
                    j.salida,
                    j.entrada_r,
                    j.salida_r,
                    j.total,
                    t.nombre,
                    ta.nombre,
                    fm.nombre
                ORDER BY j.fecha ASC    
                ${limite}
            `;

            const countQuery = `
                SELECT COUNT(DISTINCT j.id) AS total
                FROM "jornada" j
                ${join}
                ${filtro}
            `;

            const getResult = await client.query(getQuery, valoresPrincipal);

            const countResult = await client.query(countQuery, valoresBase);

            return {
                jornadas: getResult.rows,
                totalJornadas: countResult.rows[0].total,
            };

        },

        parametros
    );
};//

export async function getEmpleadoJornadasResumen(parametros: getEmpleadoJornadasResumenParametros) {
    return executeQuery(
        'getEmpleadoJornadas',
        async () => {

            const id_tipoausencia = await getTipoAusenciaInjustificada();
            const id_tipojornada = await getTipoJornadaAusencia();

            const valoresBase: any = [parametros.id_empleado];

            let join = `
                LEFT JOIN ausencia a ON j.id_ausencia = a.id 
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
                    JOIN quincena q ON j.id_quincena = q.id`;
                filtro += `
                    AND q.quincena = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroQuincena);
            };

            const asistencias = `
                COUNT(j.id) FILTER (WHERE j.id_tipojornada != $${valoresBase.length + 1}) AS total_asistencias,
            `;
            valoresBase.push(id_tipojornada);

            const ausencias = `
                COUNT(a.id) FILTER (WHERE a.id_tipoausencia = $${valoresBase.length + 1}) AS total_ausencias_injustificadas,
                COUNT(a.id) FILTER (WHERE a.id_tipoausencia != $${valoresBase.length + 1}) AS total_ausencias_justificadas
            `;
            valoresBase.push(id_tipoausencia);

            const getQuery = `
                SELECT
                    SUM(CAST(j.total AS DECIMAL)) AS suma_total,
                    SUM(CAST(j.total_normal AS DECIMAL)) AS suma_total_normal,
                    SUM(CAST(j.total_50 AS DECIMAL)) AS suma_total_50,
                    SUM(CAST(j.total_100 AS DECIMAL)) AS suma_total_100,
                    SUM(CAST(j.total_feriado AS DECIMAL)) AS suma_total_feriado,
                    SUM(CAST(j.total_nocturno AS DECIMAL)) AS suma_total_nocturno,
                    ${asistencias}
                    ${ausencias}
                FROM "jornada" j
                ${join}
                ${filtro}
            `;

            const getResult = await client.query(getQuery, valoresBase);

            return {
                resumen: getResult.rows[0],
            };
        },

        parametros
    );
};//

export async function getJornadasResumen(parametros: getJornadasResumenParametros) {
    return executeQuery(
        'getJornadasResumen',
        async () => {

            const valoresBase: any = [];

            let join = `
                JOIN empleado e ON j.id_empleado = e.id
            `;

            let joinSon = '';

            let filtro = `
                WHERE 1=1
            `;

            if (parametros.mes !== 0) {
                filtro += `
                    AND j.id_mes = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.mes);
            };

            if (parametros.quincena !== 0) {
                join += `
                    JOIN quincena q ON j.id_quincena = q.id`;
                joinSon += `
                    JOIN quincena q2 ON j2.id_quincena = q2.id`;
                filtro += `
                    AND q.quincena = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.quincena);
            };

            const getQuery = `
                WITH jornadas_sumadas AS (
                    SELECT
                        j.id_empleado,
                        e.legajo,
                        e.nombreapellido as empleado,
                        SUM(CAST(j.total AS DECIMAL)) as suma_total,
                        SUM(CAST(j.total_normal AS DECIMAL)) as suma_total_normal,
                        SUM(CAST(j.total_50 AS DECIMAL)) as suma_total_50,
                        SUM(CAST(j.total_100 AS DECIMAL)) as suma_total_100,
                        SUM(CAST(j.total_feriado AS DECIMAL)) as suma_total_feriado,
                        SUM(CAST(j.total_nocturno AS DECIMAL)) as suma_total_nocturno
                    FROM "jornada" j
                    ${join}
                    ${filtro}
                    GROUP BY j.id_empleado, e.legajo, e.nombreapellido
                ),
                ausencias_conteo AS (
                    SELECT
                        j2.id_empleado,
                        ta.id as id_tipoausencia,
                        ta.nombre as nombre_tipoausencia,
                        COUNT(*) as cantidad
                    FROM "jornada" j2
                    ${joinSon}
                    LEFT JOIN "ausencia" a ON j2.id_ausencia = a.id
                    LEFT JOIN "tipoausencia" ta ON a.id_tipoausencia = ta.id
                    ${filtro.replace(/\bj\./g, 'j2.').replace(/\bq\./g, 'q2.')}
                    AND j2.id_ausencia IS NOT NULL
                    GROUP BY j2.id_empleado, ta.id, ta.nombre
                )
                SELECT
                    js.legajo,
                    js.empleado,
                    js.suma_total,
                    js.suma_total_normal,
                    js.suma_total_50,
                    js.suma_total_100,
                    js.suma_total_feriado,
                    js.suma_total_nocturno,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', ac.id_tipoausencia,
                                'nombre', ac.nombre_tipoausencia,
                                'cantidad', ac.cantidad
                            )
                        ) FILTER (WHERE ac.id_tipoausencia IS NOT NULL),
                        '[]'::json
                    ) as ausencias
                FROM jornadas_sumadas js
                LEFT JOIN ausencias_conteo ac ON js.id_empleado = ac.id_empleado
                GROUP BY js.id_empleado, js.legajo, js.empleado, js.suma_total, js.suma_total_normal, 
                        js.suma_total_50, js.suma_total_100, js.suma_total_feriado, js.suma_total_nocturno
                ORDER BY js.empleado
            `;

            const getResult = await client.query(getQuery, valoresBase);

            return getResult.rows;
        },

        parametros
    );
};//

export async function getJornadasByImportacion(parametros: getJornadasByImportacionParametros) {
    return executeQuery(
        'getJornadasByImportacion',
        async () => {

            const id_estadojornada_valida = await getEstadoJornadaValida();
            const id_tipojornada_ausencia = await getTipoJornadaAusencia();

            const offset = (parametros.pagina) * parametros.filasPorPagina;
            const valoresBase: any = [parametros.id_importacion, id_estadojornada_valida];

            let filtro = `
                WHERE j.id_importacion = $1
                    AND j.id_estadojornada != $2
            `;

            const valoresPrincipal = [...valoresBase, id_tipojornada_ausencia, parametros.filasPorPagina, offset];

            const limite = `
                LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}
            `;

            const getQuery = `
                SELECT
                    j.id,
                    j.fecha,
                    j.entrada,
                    j.salida,
                    ej.nombre AS estadojornada,
                    e.nombreapellido AS nombreempleado,
                    ta.id AS id_tipoausencia,
                    (j.id_tipojornada = $${valoresPrincipal.length - 2}) AS ausencia
                FROM "jornada" j
                JOIN "empleado" e ON j.id_empleado = e.id
                JOIN "estadojornada" ej ON j.id_estadojornada = ej.id
                LEFT JOIN "ausencia" a ON j.id_ausencia = a.id
                LEFT JOIN "tipoausencia" ta ON a.id_tipoausencia = ta.id
                ${filtro}
                ORDER BY ausencia ASC
                ${limite}
            `;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM jornada j
                ${filtro}
            `;

            const countQuery2 = `
                SELECT COUNT(*) AS total
                FROM jornada j
                WHERE j.id_importacion = $1
                    AND j.id_estadojornada != $2
            `;

            //countQuery2 quedo obsoleta con alguno de los cambios realizados luego de su concepcion.

            const getResult = await client.query(getQuery, valoresPrincipal);

            const countResult = await client.query(countQuery, valoresBase);

            return {
                jornadas: getResult.rows,
                totalJornadas: countResult.rows[0].total,
                totalIncompleto: countResult.rows[0].total
            };
        },

        parametros
    );
};//

export async function updateJornada(parametros: updateJornadaParametros) {
    return executeQuery(
        'updateJornada',
        async () => {

            const id_fuentemarca = await getFuenteMarcaManual();

            const updateQuery = `
                UPDATE jornada
                SET
                    entrada = $1,
                    salida = $2,
                    id_fuentemarca = $3,
                    id_usuariomodificacion = $4,
                    fechamodificacion = CURRENT_DATE
                WHERE id = $5
                RETURNING id, entrada, salida
            `;

            const updateResult = await client.query(updateQuery, [
                parametros.entrada,
                parametros.salida,
                id_fuentemarca,
                parametros.id_usuariomodificacion,
                parametros.id_jornada
            ]);

            checkRowsAffected(updateResult, 'Jornada', { id: parametros.id_jornada });

            return updateResult.rows[0];
        },

        parametros
    );
};//

export async function validateJornada(parametros: validateJornadaParametros) {
    return executeQuery(
        'validateJornada',
        async () => {

            const id_estadojornada = await getEstadoJornadaValida();
            const id_fuentemarca = await getFuenteMarcaManual();

            const updateQuery = `
                UPDATE jornada
                SET
                    id_estadojornada = $1,
                    id_fuentemarca = $2,
                    id_usuariovalidacion = $3,
                    fechavalidacion = CURRENT_DATE
                WHERE id = $4
            `

            const updateResult = await client.query(updateQuery, [
                id_estadojornada,
                id_fuentemarca,
                parametros.id_usuariomodificacion,
                parametros.id_jornada
            ]);

            checkRowsAffected(updateResult, 'Jornada', { id: parametros.id_jornada });

            return updateResult.rows[0];
        },

        parametros
    );
};//

export async function deleteJornada(parametros: deleteJornadaParametros) {
    return executeQuery(
        'deleteJornada',
        async () => {

            const deleteQuery = `
                DELETE FROM jornada
                WHERE id = $1
            `;

            const deleteResult = await client.query(deleteQuery, [
                parametros.id
            ]);

            checkRowsAffected(deleteResult, 'Jornada', { id: parametros.id });
        },

        parametros
    );
};//

export async function createJornada(parametros: createJornadaParametros) {
    return executeQuery(
        'createJornada',
        async () => {

            const {
                entrada,
                entradaTarde,
                salida,
                salidaTarde,
                fecha,
                id_tipojornada,
                id_tipoausencia,
                duracionAusencia,
                observacion,
                id_empleado,
                id_usuariocreacion,
            } = parametros;

            const duracionAusenciaNum = duracionAusencia === '' ? 1 : Number(duracionAusencia);

            const [dia, mes, año] = fecha.split("-").map(Number);
            const fechaIso = `${año}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const quincena = dia <= 15 ? 1 : 2;

            const { id_mes, id_quincena } = await getMesQuincena({
                año,
                mes,
                quincena
            });

            const id_proyecto = await getEmpleadoProyecto({
                id: id_empleado
            });

            let id_jornada;
            let id_jornadaTarde;
            let ids_jornadas_ausencia = [];

            const id_estadojornada = await getEstadoJornadaValida();
            const id_fuentemarca = await getFuenteMarcaManual();

            if (id_tipoausencia === '') {

                id_jornada = await insertJornada({
                    fecha: fechaIso,
                    entrada: entrada,
                    salida: salida,
                    id_empleado: id_empleado,
                    id_proyecto: id_proyecto,
                    id_mes: id_mes,
                    id_quincena: id_quincena,
                    id_tipojornada: Number(id_tipojornada),
                    id_ausencia: null,
                    id_estadojornada: id_estadojornada,
                    id_importacion: null,
                    id_fuentemarca: id_fuentemarca,
                    id_usuariocreacion: id_usuariocreacion,
                });
            } else {

                const id_ausencia = await insertAusencia({
                    id_empleado: id_empleado,
                    id_tipoausencia: Number(id_tipoausencia)
                });

                let fechaIteracion = new Date(año, mes - 1, dia, 12, 0, 0, 0);

                for (let i = 0; i < duracionAusenciaNum; i++) {

                    const diaActual = fechaIteracion.getDate();
                    const mesActual = fechaIteracion.getMonth();
                    const añoActual = fechaIteracion.getFullYear();

                    const fechaActualIso = `${añoActual}-${String(mesActual + 1).padStart(2, "0")}-${String(diaActual).padStart(2, "0")}`;
                    const quincenaActual = diaActual <= 15 ? 1 : 2;

                    const { id_mes: id_mes_i, id_quincena: id_quincena_i } = await getMesQuincena({
                        año: añoActual,
                        mes: mesActual,
                        quincena: quincenaActual,
                    });

                    const id_jornada_ausencia = await insertJornada({
                        fecha: fechaActualIso,
                        entrada: null,
                        salida: null,
                        id_empleado: id_empleado,
                        id_proyecto: id_proyecto,
                        id_mes: id_mes_i,
                        id_quincena: id_quincena_i,
                        id_tipojornada: Number(id_tipojornada),
                        id_ausencia: Number(id_ausencia),
                        id_estadojornada: id_estadojornada,
                        id_importacion: null,
                        id_fuentemarca: id_fuentemarca,
                        id_usuariocreacion: id_usuariocreacion,
                    });

                    ids_jornadas_ausencia.push(id_jornada_ausencia);

                    if (i === 0) {
                        id_jornada = id_jornada_ausencia;
                    };

                    fechaIteracion.setDate(fechaIteracion.getDate() + 1);
                };
            };
            if (entradaTarde !== '' || salidaTarde !== '') {

                id_jornadaTarde = await insertJornada({
                    fecha: fechaIso,
                    entrada: entradaTarde,
                    salida: salidaTarde,
                    id_empleado: id_empleado,
                    id_proyecto: id_proyecto,
                    id_mes: id_mes,
                    id_quincena: id_quincena,
                    id_tipojornada: Number(id_tipojornada),
                    id_ausencia: null,
                    id_estadojornada: id_estadojornada,
                    id_importacion: null,
                    id_fuentemarca: id_fuentemarca,
                    id_usuariocreacion: id_usuariocreacion,
                });
            };
            if (observacion !== '') {

                const id_observacion = await insertObservacion({
                    observacion
                });

                if (id_tipoausencia === '') {

                    await insertJornadaObservacion({
                        id_jornada: id_jornada,
                        id_observacion: id_observacion,
                    });

                    if (entradaTarde !== '' || salidaTarde !== '') {

                        await insertJornadaObservacion({
                            id_jornada: id_jornadaTarde,
                            id_observacion: id_observacion,
                        });
                    };
                } else {
                    for (const id_jornada_ausencia of ids_jornadas_ausencia) {

                        await insertJornadaObservacion({
                            id_jornada: id_jornada_ausencia,
                            id_observacion: id_observacion,
                        });
                    };
                };
            };

            await recalculateJornadasEmpleado({ id_empleado: parametros.id_empleado }); 
        },

        parametros,
        true
    );
};//

export async function insertJornada(parametros: insertJornadaParametros) {
    return executeQuery(
        'insertJornada',
        async () => {

            const insertQuery = ` 
                INSERT INTO "jornada" (fecha, entrada, salida, id_empleado, id_proyecto, id_mes, id_quincena, id_tipojornada, id_ausencia, id_estadojornada, id_importacion, id_fuentemarca, id_usuariocreacion)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.fecha,
                parametros.entrada,
                parametros.salida,
                parametros.id_empleado,
                parametros.id_proyecto,
                parametros.id_mes,
                parametros.id_quincena,
                parametros.id_tipojornada,
                parametros.id_ausencia,
                parametros.id_estadojornada,
                parametros.id_importacion,
                parametros.id_fuentemarca,
                parametros.id_usuariocreacion
            ]);

            return insertResult.rows[0].id;
        },

        parametros
    );
};//

export async function getJornadaAusencia(parametros: getJornadaAusenciaParametros) {
    return executeQuery(
        'getJornadaAusencia',
        async () => {

            const getQuery = `
                SELECT id_ausencia FROM jornada
                WHERE id = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.id
            ]);

            return getResult.rows[0].id_ausencia;
        },

        parametros
    );
};

export async function createAbsences(parametros: createAbsencesParametros) {
    return executeQuery(
        'createAbsences',
        async () => {

            const {
                fecha,
                id_proyecto,
                ausentes,
                id_usuario,
                id_importacion,
            } = parametros;

            const [dia, mes, año] = fecha.split("-").map(Number);
            const fechaIso = `${año}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const quincena = dia <= 15 ? 1 : 2;

            const { id_mes, id_quincena } = await getMesQuincena({
                año: año,
                mes: mes,
                quincena: quincena,
            });

            const id_tipoimportacion = await getTipoImportacionAusentes();
            const id_tipojornada = await getTipoJornadaAusencia();
            const id_tipoausencia = await getTipoAusenciaPendiente();
            const id_fuentemarca = await getFuenteMarcaControl();
            const id_estadojornada = await getEstadoJornadaSinValidar();

            for (const id_empleado of ausentes) {

                const id_empleadoPG = await getEmpleadoByRelojProyecto({
                    id_reloj: id_empleado,
                    id_proyecto: id_proyecto,
                    id_tipoimportacion: id_tipoimportacion,
                });

                if (!id_empleadoPG.rows?.length) {
                    continue;
                };

                const id_ausencia = await insertAusencia({
                    id_empleado: id_empleadoPG.rows[0].id,
                    id_tipoausencia: Number(id_tipoausencia),
                });

                await insertJornada({
                    fecha: fechaIso,
                    entrada: null,
                    salida: null,
                    id_empleado: id_empleadoPG.rows[0].id,
                    id_proyecto: id_proyecto,
                    id_mes: id_mes,
                    id_quincena: id_quincena,
                    id_tipojornada: Number(id_tipojornada),
                    id_ausencia: Number(id_ausencia),
                    id_estadojornada: id_estadojornada,
                    id_importacion: id_importacion,
                    id_fuentemarca: id_fuentemarca,
                    id_usuariocreacion: id_usuario
                });
            };

            return { id_importacion };
        },

        parametros,
        true
    );
};

export async function recalculateJornadasEmpleado(parametros: recalculateJornadasEmpleadoParametros) {
    return executeQuery(
        'recalculateJornadasEmpleado',
        async () => {

            const query = `
                WITH ordenadas AS (
                    SELECT id
                    FROM jornada
                    WHERE id_empleado = $1
                    AND fecha >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '4 weeks')
                    ORDER BY fecha ASC
                )
                UPDATE jornada j
                SET entrada = entrada,
                    salida = salida
                FROM ordenadas o
                WHERE j.id = o.id
            `;

            const result = await client.query(query, [
                parametros.id_empleado
            ]);

            checkRowsAffected(result, 'recalculateJornadasEmpleado');
        },

        parametros
    );
};