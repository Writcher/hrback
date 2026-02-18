"use server"

import { editEmpleadoParametros, getEmpleadosParametros, insertEmpleadoParametros, deactivateEmpleadoParametros, getEmpleadoByRelojProyectoParametros, getEmpleadoProyectoParametros, getAusentesParametros } from "@/lib/types/empleado";
import { db } from "@vercel/postgres";
import { getEstadoEmpleadoBaja, getEstadoEmpleadoActivo } from "../estadoempleado/service.estadoempleado";
import { getTipoEmpleadoMensualizado } from "../tipoempleado/service.tipoempleado";
import { getTurnoNocturno } from "../turno/service.turno";
import { getTipoImportacionProSoft } from "../tipoimportacion/service.tipoimportacion";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { createConflictError } from "@/lib/utils/error";

const client = db;

export async function getEmpleados(parametros: getEmpleadosParametros) {
    return executeQuery(
        'getEmpleados',
        async () => {

            const offset = (parametros.pagina) * parametros.filasPorPagina;
            const valoresBase: any = [];

            const id_tipoempleado = await getTipoEmpleadoMensualizado();

            let join = ``;

            let filtro = `
                WHERE 1=1
            `;

            if (parametros.filtroTipoEmpleado !== 0) {
                filtro += `
                    AND e.id_tipoempleado = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroTipoEmpleado);
            };

            if (parametros.busquedaNombre !== "") {
                filtro += `
                    AND unaccent(e.nombreapellido) ILIKE unaccent($${valoresBase.length + 1}) `;
                valoresBase.push(`%${parametros.busquedaNombre}%`);
            };

            if (parametros.filtroProyecto !== 0) {
                filtro += `
                    AND e.id_proyecto = $${valoresBase.length + 1}`;
                valoresBase.push(parametros.filtroProyecto);
            };

            if (parametros.busquedaLegajo !== 0) {
                filtro += `
                    AND CAST(e.legajo AS TEXT) LIKE $${valoresBase.length + 1}`;
                valoresBase.push(`%${parametros.busquedaLegajo}%`);
            };

            if (parametros.filtroMarcaManual === true) {
                join += `
                    JOIN jornada jm ON e.id = jm.id_empleado
                    JOIN fuentemarca fmm ON jm.id_fuentemarca = fmm.id`;
                filtro += `
                    AND fmm.nombre = 'Manual'`;
            };

            if (parametros.filtroTipoAusencia !== -1) {
                join += `
                    JOIN jornada j ON e.id = j.id_empleado`;
                filtro += `
                    AND j.id_ausencia IS NOT NULL`;

                if (parametros.filtroTipoAusencia !== 0) {
                    join += `
                        JOIN ausencia a ON j.id_ausencia = a.id`;
                    filtro += `
                        AND a.id_tipoausencia = $${valoresBase.length + 1}`;
                    valoresBase.push(parametros.filtroTipoAusencia);
                };

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
            };

            const orden = `
                ORDER BY ${parametros.ordenColumna} ${parametros.ordenDireccion.toUpperCase()}
            `;

            const valoresPrincipal = [...valoresBase, id_tipoempleado, parametros.filasPorPagina, offset];

            const limite = `
                LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}
            `;

            const mensualizado = `
                COALESCE((te.id = $${valoresPrincipal.length - 2}), false) AS es_mensualizado
            `;

            const getQuery = `
                SELECT DISTINCT
                    e.id,
                    e.nombreapellido AS nombre,
                    e.id_reloj,
                    e.legajo,
                    e.id_proyecto,
                    e.id_estadoempleado,  -- ADD THIS LINE
                    p.nombre AS nombreproyecto,
                    ee.nombre AS estadoempleado,
                    te.nombre AS tipoempleado,
                    te.id AS id_tipoempleado,
                    t.nombre AS turno,
                    t.id AS id_turno,
                    ${mensualizado}
                FROM empleado e
                JOIN proyecto p ON e.id_proyecto = p.id
                JOIN estadoempleado ee ON e.id_estadoempleado = ee.id
                LEFT JOIN turno t ON e.id_turno = t.id
                LEFT JOIN tipoempleado te ON e.id_tipoempleado = te.id
                ${join}
                ${filtro}
                GROUP BY e.id, p.nombre, ee.nombre, te.nombre, te.id, t.nombre, t.id
                ${orden}
                ${limite}
            `;

            const countQuery = `
                SELECT COUNT(DISTINCT e.id) AS total
                FROM empleado e
                ${join}
                ${filtro}
            `;

            const getResult = await client.query(getQuery, valoresPrincipal);

            const countResult = await client.query(countQuery, valoresBase);

            return {
                empleados: getResult.rows,
                totalEmpleados: countResult.rows[0].total,
            };
        },

        parametros
    );
};//

export async function insertEmpleado(parametros: insertEmpleadoParametros) {
    return executeQuery(
        'insertEmpleado',
        async () => {

            const id_estadoempleado = await getEstadoEmpleadoActivo();

            const insertQuery = `
                INSERT INTO empleado (nombreapellido, id_reloj, id_proyecto, legajo, id_estadoempleado, id_tipoempleado)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.nombre,
                parametros.id_reloj,
                parametros.id_proyecto,
                parametros.legajo,
                id_estadoempleado,
                parametros.id_tipoempleado
            ]);

            checkRowsAffected(insertResult, 'Empleado no creado');

            return insertResult.rows[0].id;
        },

        parametros
    );
};//

export async function deactivateEmpleado(parametros: deactivateEmpleadoParametros) {
    return executeQuery(
        'deactivateEmpleado',
        async () => {

            const id_estadoempleado = await getEstadoEmpleadoBaja();

            const deactivateQuery = `
                UPDATE empleado
                SET id_estadoempleado = $1
                WHERE id = $2
            `;

            const deactivateResult = await client.query(deactivateQuery, [
                id_estadoempleado,
                parametros.id,
            ]);

            checkRowsAffected(deactivateResult, 'Empleado', { id: parametros.id });
        },

        parametros
    );
};//

export async function editEmpleado(parametros: editEmpleadoParametros) {
    return executeQuery(
        'editEmpleado',
        async () => {

            const checkQuery = `
                SELECT id FROM empleado
                WHERE legajo = $1 AND id != $2
            `;

            const checkResult = await client.query(checkQuery, [
                parametros.legajo,
                parametros.id,
            ]);

            if (checkResult.rows.length > 0) {
                throw createConflictError(
                    'Legajo ya existe',
                    { serie: parametros.legajo, id: parametros.id }
                );
            };

            const updateQuery = `
                UPDATE empleado
                SET nombreapellido = $1, legajo = $2, id_reloj = $3, id_tipoempleado = $4, id_turno = $5, id_proyecto = $6
                WHERE id = $7
            `;

            const updateResult = await client.query(updateQuery, [
                parametros.nombre,
                parametros.legajo,
                parametros.id_reloj,
                parametros.id_tipoempleado,
                parametros.id_turno,
                parametros.id_proyecto,
                parametros.id
            ]);

            checkRowsAffected(updateResult, 'Empleado', { id: parametros.id });
        },

        parametros
    );
};//

export async function getEmpleadoByRelojProyecto(parametros: getEmpleadoByRelojProyectoParametros) {
    return executeQuery(
        'getEmpleadoByRelojProyecto',
        async () => {

            let getQuery = `
                SELECT id FROM empleado
                WHERE id_reloj = $1
            `;

            const valores = [parametros.id_reloj]

            const getResult = await client.query(getQuery, valores);
            
            return getResult;
        },

        parametros
    );
};//

export async function getEmpleadoProyecto(parametros: getEmpleadoProyectoParametros) {
    return executeQuery(
        'getEmpleadoProyecto',
        async () => {

            const getQuery = `
                SELECT id_proyecto FROM empleado
                WHERE id = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.id
            ]);

            return getResult.rows[0].id_proyecto;
        },

        parametros
    );
};//

export async function getEmpleadosNocturnos() {
    return executeQuery(
        'getEmpleadosNocturnos',
        async () => {

            const id_turno = await getTurnoNocturno();

            const getQuery = `
                SELECT id_reloj FROM empleado
                WHERE id_turno = $1
            `;

            const getResult = await client.query(getQuery, [
                id_turno
            ]);

            return getResult.rows.map(row => String(row.id_reloj));
        }
    );
};//

export async function getEmpleadosAsistencia() {
    return executeQuery(
        'getEmpleadosAsistencia',
        async () => {

            const getQuery = `
                SELECT DISTINCT
                    e.id,
                    e.nombreapellido AS nombre,
                    e.id_reloj,
                    te.nombre AS tipoempleado,
                    te.id AS id_tipoempleado
                FROM empleado e
                LEFT JOIN tipoempleado te ON e.id_tipoempleado = te.id
                LEFT JOIN jornada j ON j.id_empleado = e.id
            `;

            const getResult = await client.query(getQuery);

            return {
                empleados: getResult.rows
            };
        }
    );
};//

export async function getAllEmpleados() {
    return executeQuery(
        'getAllEmpleados',
        async () => {

            const getQuery = `
                SELECT DISTINCT
                    id,
                    id_reloj
                FROM empleado
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//
