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


const client = db;

export async function getEmpleadoJornadas(parametros: getEmpleadoJornadasParametros) {
    try {
        const offset = (parametros.pagina) * parametros.filasPorPagina;
        const valoresBase: any = [parametros.id_empleado];

        let textoJoin = `
            JOIN "tipojornada" t ON j.id_tipojornada = t.id
            JOIN "fuentemarca" fm ON j.id_fuentemarca = fm.id
            LEFT JOIN "ausencia" a ON j.id_ausencia = a.id
            LEFT JOIN "tipoausencia" ta ON a.id_tipoausencia = ta.id
            LEFT JOIN "jornadaobservacion" jo ON j.id = jo.id_jornada
            LEFT JOIN "observacion" o ON jo.id_observacion = o.id
        `;

        let textoFiltroBase = 'WHERE j.id_empleado = $1 ';

        if (parametros.filtroMes !== 0) {
            textoFiltroBase += `AND j.id_mes = $${valoresBase.length + 1} `;
            valoresBase.push(parametros.filtroMes);
        };

        if (parametros.filtroQuincena !== 0) {
            textoJoin += `JOIN "quincena" q ON j.id_quincena = q.id `;
            textoFiltroBase += `AND q.quincena = $${valoresBase.length + 1} `;
            valoresBase.push(parametros.filtroQuincena);
        };

        if (parametros.filtroMarcasIncompletas) {
            textoFiltroBase += `AND (j.entrada IS NULL OR j.salida IS NULL) `;
        };

        if (parametros.ausencias) {
            textoFiltroBase += `AND j.id_ausencia IS NOT NULL `;
        };

        if (parametros.filtroTipoAusencia !== 0) {
            textoFiltroBase += `AND a.id_tipoausencia = $${valoresBase.length + 1} `
            valoresBase.push(parametros.filtroTipoAusencia);
        };

        const valoresPrincipal = [...valoresBase, parametros.filasPorPagina, offset];
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
                ta.nombre AS tipoausencia,
                COALESCE((fm.nombre = 'Manual'), false) AS es_manual,
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
                t.nombre,
                ta.nombre,
                fm.nombre
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
            totalJornadas: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getEmpleadoJornadas: ", error);
        throw error;
    };
};//

export async function getEmpleadoJornadasResumen(parametros: getEmpleadoJornadasResumenParametros) {
    try {
        const ausencia_injustificada = await getTipoAusenciaInjustificada();

        const jornada_no_ausencia = await getTipoJornadaAusencia();

        const valoresBase: any = [parametros.id_empleado];

        let textoJoin = `
            LEFT JOIN ausencia a ON j.id_ausencia = a.id 
        `

        let textoFiltroBase = 'WHERE j.id_empleado = $1 ';

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

        const textoAsistencias = `
            COUNT(j.id) FILTER (WHERE j.id_tipojornada != $${valoresBase.length + 1}) AS total_asistencias,
        `;

        valoresBase.push(jornada_no_ausencia);

        const textoAusencias = `
            COUNT(a.id) FILTER (WHERE a.id_tipoausencia = $${valoresBase.length + 1}) AS total_ausencias_injustificadas,
            COUNT(a.id) FILTER (WHERE a.id_tipoausencia != $${valoresBase.length + 1}) AS total_ausencias_justificadas
        `;

        valoresBase.push(ausencia_injustificada);

        let textoSumatorias = `
            SELECT
                SUM(CAST(j.total AS DECIMAL)) AS suma_total,
                SUM(CAST(j.total_normal AS DECIMAL)) AS suma_total_normal,
                SUM(CAST(j.total_50 AS DECIMAL)) AS suma_total_50,
                SUM(CAST(j.total_100 AS DECIMAL)) AS suma_total_100,
                SUM(CAST(j.total_feriado AS DECIMAL)) AS suma_total_feriado,
                SUM(CAST(j.total_nocturno AS DECIMAL)) AS suma_total_nocturno,
                ${textoAsistencias}
                ${textoAusencias}
            FROM "jornada" j
            ${textoJoin}
            ${textoFiltroBase}
        `;

        const resultado = await client.query(textoSumatorias, valoresBase);

        return {
            resumen: resultado.rows[0],
        };
    } catch (error) {
        console.error("Error en getEmpleadoJornadasResumen: ", error);
        throw error;
    };
};//

export async function getJornadasResumen(parametros: getJornadasResumenParametros) {
    try {
        const valoresBase: any = [];
        let textoJoin = 'JOIN "empleado" e ON j.id_empleado = e.id ';
        let textoJoin2 = '';
        let textoFiltroBase = 'WHERE 1=1 ';

        if (parametros.mes !== 0) {
            textoFiltroBase += `AND j.id_mes = $${valoresBase.length + 1} `;
            valoresBase.push(parametros.mes);
        };

        if (parametros.quincena !== 0) {
            const quincenaParamIndex = valoresBase.length + 1;
            textoJoin += `JOIN "quincena" q ON j.id_quincena = q.id `;
            textoJoin2 = `JOIN "quincena" q2 ON j2.id_quincena = q2.id `;
            textoFiltroBase += `AND q.quincena = $${quincenaParamIndex} `;
            valoresBase.push(parametros.quincena);
        };

        let textoSumatorias = `
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
                ${textoJoin}
                ${textoFiltroBase}
                GROUP BY j.id_empleado, e.legajo, e.nombreapellido
            ),
            ausencias_conteo AS (
                SELECT
                    j2.id_empleado,
                    ta.id as id_tipoausencia,
                    ta.nombre as nombre_tipoausencia,
                    COUNT(*) as cantidad
                FROM "jornada" j2
                ${textoJoin2}
                LEFT JOIN "ausencia" a ON j2.id_ausencia = a.id
                LEFT JOIN "tipoausencia" ta ON a.id_tipoausencia = ta.id
                ${textoFiltroBase.replace(/\bj\./g, 'j2.').replace(/\bq\./g, 'q2.')}
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
        const resultado = await client.query(textoSumatorias, valoresBase);
        return resultado.rows
    } catch (error) {
        console.error("Error en getEmpleadoJornadas: ", error);
        throw error;
    };
};//

export async function getJornadasByImportacion(parametros: getJornadasByImportacionParametros) {
    try {
        const jornada_valida = await getEstadoJornadaValida();

        const id_ausencia = await getTipoJornadaAusencia();

        const offset = (parametros.pagina) * parametros.filasPorPagina;

        const valoresBase: any = [parametros.id_importacion];

        let textoFiltroBase = 'WHERE j.id_importacion = $1 ';

        if (parametros.filtroMarcasIncompletas) {
            textoFiltroBase += 'AND j.id_estadojornada != $2 '
            valoresBase.push(jornada_valida);
        };

        const valoresPrincipal = [...valoresBase, id_ausencia, parametros.filasPorPagina, offset];

        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

        const texto = `
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
            ${textoFiltroBase}
            ORDER BY ausencia ASC
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
            AND j.id_estadojornada != $2
        `;

        const valoresConteoIncompleto = [parametros.id_importacion, jornada_valida];

        const resultadoConteoIncompleto = await client.query(textoConteoIncompleto, valoresConteoIncompleto);

        return {
            jornadas: resultado.rows,
            totalJornadas: resultadoConteo.rows[0].total,
            totalIncompleto: resultadoConteoIncompleto.rows[0].total
        };
    } catch (error) {
        console.error("Error en getEmpleadoJornadas: ", error);
        throw error;
    };
};//

export async function updateJornada(parametros: updateJornadaParametros) {
    try {
        const fuenteMarca = await getFuenteMarcaManual();

        const texto = `
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

        const valores = [parametros.entrada, parametros.salida, fuenteMarca, parametros.id_usuariomodificacion, parametros.id_jornada];

        const respuesta = await client.query(texto, valores);

        return respuesta.rows[0];
    } catch (error) {
        console.error("Error en updateJornada: ", error);
        throw error;
    };
};//

export async function validateJornada(parametros: validateJornadaParametros) {
    try {
        const jornada_valida = await getEstadoJornadaValida();
        const fuenteMarca = await getFuenteMarcaManual();

        const texto = `
            UPDATE jornada
            SET 
                id_estadojornada = $1,
                id_fuentemarca = $2,
                id_usuariovalidacion = $3,
                fechavalidacion = CURRENT_DATE
            WHERE id = $4
        `;
        const valores = [jornada_valida, fuenteMarca, parametros.id_usuariomodificacion, parametros.id_jornada];

        const respuesta = await client.query(texto, valores);

        return respuesta.rows[0];
    } catch (error) {
        console.error("Error en updateJornada: ", error);
        throw error;
    };
};//

export async function deleteJornada(parametros: deleteJornadaParametros) {
    try {
        const texto = `
            DELETE FROM "jornada"
            WHERE id = $1
        `;

        const valores = [parametros.id];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en deleteJornada: ", error);
        throw error;
    };
};//

export async function createJornada(parametros: createJornadaParametros) {
    try {

        await client.query('BEGIN');

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

        const getMesQuincenaParametros = {
            año: año,
            mes: mes,
            quincena: quincena,
        };

        const ids = await getMesQuincena(getMesQuincenaParametros);

        const getEmpleadoProyectoParametros = {
            id: id_empleado,
        };

        const id_proyecto = await getEmpleadoProyecto(getEmpleadoProyectoParametros)

        let id_jornada;
        let id_jornadaTarde;
        let ids_jornadas_ausencia = [];

        const jornada_valida = await getEstadoJornadaValida();

        const id_fuentemarca = await getFuenteMarcaManual();

        if (id_tipoausencia === '') {
            const insertJornadaParametros = {
                fecha: fechaIso,
                entrada: entrada,
                salida: salida,
                id_empleado: id_empleado,
                id_proyecto: id_proyecto,
                id_mes: ids.id_mes,
                id_quincena: ids.id_quincena,
                id_tipojornada: Number(id_tipojornada),
                id_ausencia: null,
                id_estadojornada: jornada_valida,
                id_importacion: null,
                id_fuentemarca: id_fuentemarca,
                id_usuariocreacion: id_usuariocreacion,
            };

            id_jornada = await insertJornada(insertJornadaParametros);
        } else {

            const insertAusenciaParametros = {
                id_empleado: id_empleado,
                id_tipoausencia: Number(id_tipoausencia),
            };

            const id_ausencia = await insertAusencia(insertAusenciaParametros);

            let fechaIteracion = new Date(año, mes - 1, dia, 12, 0, 0, 0);

            for (let i = 0; i < duracionAusenciaNum; i++) {

                const diaActual = fechaIteracion.getDate();
                const mesActual = fechaIteracion.getMonth() + 1;
                const añoActual = fechaIteracion.getFullYear();

                const fechaActualIso = `${añoActual}-${String(mesActual).padStart(2, "0")}-${String(diaActual).padStart(2, "0")}`;
                const quincenaActual = diaActual <= 15 ? 1 : 2;

                const getMesQuincenaParametros = {
                    año: añoActual,
                    mes: mesActual,
                    quincena: quincenaActual,
                };

                const idsActual = await getMesQuincena(getMesQuincenaParametros);

                const insertJornadaParametros = {
                    fecha: fechaActualIso,
                    entrada: null,
                    salida: null,
                    id_empleado: id_empleado,
                    id_proyecto: id_proyecto,
                    id_mes: idsActual.id_mes,
                    id_quincena: idsActual.id_quincena,
                    id_tipojornada: Number(id_tipojornada),
                    id_ausencia: Number(id_ausencia),
                    id_estadojornada: jornada_valida,
                    id_importacion: null,
                    id_fuentemarca: id_fuentemarca,
                    id_usuariocreacion: id_usuariocreacion,
                };

                const id_jornada_ausencia = await insertJornada(insertJornadaParametros);

                ids_jornadas_ausencia.push(id_jornada_ausencia);

                if (i === 0) {
                    id_jornada = id_jornada_ausencia;
                };

                fechaIteracion.setDate(fechaIteracion.getDate() + 1);
            };
        };

        if (entradaTarde !== '' || salidaTarde !== '') {
            const insertJornadaParametros = {
                fecha: fechaIso,
                entrada: entradaTarde,
                salida: salidaTarde,
                id_empleado: id_empleado,
                id_proyecto: id_proyecto,
                id_mes: ids.id_mes,
                id_quincena: ids.id_quincena,
                id_tipojornada: Number(id_tipojornada),
                id_ausencia: null,
                id_estadojornada: jornada_valida,
                id_importacion: null,
                id_fuentemarca: id_fuentemarca,
                id_usuariocreacion: id_usuariocreacion,
            };

            id_jornadaTarde = await insertJornada(insertJornadaParametros);
        };

        if (observacion !== '') {

            const insertObservacionParametros = {
                observacion: observacion,
            };

            const id_observacion = await insertObservacion(insertObservacionParametros);

            if (id_tipoausencia === '') {

                const insertJornadaObservacionParametros = {
                    id_jornada: id_jornada,
                    id_observacion: id_observacion,
                };

                await insertJornadaObservacion(insertJornadaObservacionParametros);

                if (entradaTarde !== '' || salidaTarde !== '') {

                    const insertJornadaObservacionParametros = {
                        id_jornada: id_jornadaTarde,
                        id_observacion: id_observacion,
                    };

                    await insertJornadaObservacion(insertJornadaObservacionParametros);

                };
            } else {
                for (const id_jornada_ausencia of ids_jornadas_ausencia) {

                    const insertJornadaObservacionParametros = {
                        id_jornada: id_jornada_ausencia,
                        id_observacion: id_observacion,
                    };

                    await insertJornadaObservacion(insertJornadaObservacionParametros);

                };
            };
        };

        await recalculateJornadasEmpleado({id_empleado: parametros.id_empleado});

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error en createJornada: ", error);
        throw error;
    };
};//

export async function insertJornada(parametros: insertJornadaParametros) {
    try {
        const texto = ` 
            INSERT INTO "jornada" (fecha, entrada, salida, id_empleado, id_proyecto, id_mes, id_quincena, id_tipojornada, id_ausencia, id_estadojornada, id_importacion, id_fuentemarca, id_usuariocreacion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;

        const valores = [parametros.fecha, parametros.entrada, parametros.salida, parametros.id_empleado, parametros.id_proyecto, parametros.id_mes, parametros.id_quincena, parametros.id_tipojornada, parametros.id_ausencia, parametros.id_estadojornada, parametros.id_importacion, parametros.id_fuentemarca, parametros.id_usuariocreacion];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en insertJornada: ", error);
        throw error;
    };
};//

export async function getJornadaAusencia(parametros: getJornadaAusenciaParametros) {
    try {
        const texto = `
            SELECT id_ausencia
            FROM "jornada"
            WHERE id = $1
        `;

        const valores = [parametros.id];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id_ausencia;
    } catch (error) {
        console.error("Error en getJornadaAusencia: ", error);
        throw error;
    };
};//

export async function createAbsences(parametros: createAbsencesParametros) {
    try {

        await client.query('BEGIN');

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

        const getMesQuincenaParametros = {
            año: año,
            mes: mes,
            quincena: quincena,
        };

        const { id_mes, id_quincena } = await getMesQuincena(getMesQuincenaParametros);

        const id_tipoimportacion = await getTipoImportacionAusentes();
        const id_tipojornada = await getTipoJornadaAusencia();
        const id_tipoausencia = await getTipoAusenciaPendiente();
        const id_fuentemarca = await getFuenteMarcaControl();
        const id_estadojornada = await getEstadoJornadaSinValidar();

        for (const id_empleado of ausentes) {

            const getEmpleadoByRelojProyectoParametros = {
                id_reloj: id_empleado,
                id_proyecto: id_proyecto,
                id_tipoimportacion: id_tipoimportacion,
            };

            const id_empleadoPG = await getEmpleadoByRelojProyecto(getEmpleadoByRelojProyectoParametros);

            if (!id_empleadoPG.rows?.length) {
                continue;
            };

            const insertAusenciaParametros = {
                id_empleado: id_empleadoPG.rows[0].id,
                id_tipoausencia: Number(id_tipoausencia),
            };

            const id_ausencia = await insertAusencia(insertAusenciaParametros);

            const insertJornadaParametros = {
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
            };

            await insertJornada(insertJornadaParametros);
        };

        await client.query('COMMIT');

        return { id_importacion };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error en createAbsences: ", error);
        throw error;
    };
};//

export async function recalculateJornadasEmpleado(parametros: recalculateJornadasEmpleadoParametros) {
    try {
        const texto = `
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

        const valores = [parametros.id_empleado];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en recalculateJornadasEmpleado: ", error);
        throw error;
    };
};