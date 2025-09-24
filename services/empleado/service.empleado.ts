"use server"

import { editEmpleadoParametros, getEmpleadosParametros, insertEmpleadoParametros, deactivateEmpleadoParametros, getEmpleadoByRelojProyectoParametros, getEmpleadoProyectoParametros } from "@/lib/types/empleado";
import { db } from "@vercel/postgres";
import { getEstadoEmpleadoBaja, getEstadoEmpleadoActivo } from "../estadoempleado/service.estadoempleado";
import { getTipoEmpleadoMensualizado } from "../tipoempleado/service.tipoempleado";

const client = db;

export async function getEmpleados(parametros: getEmpleadosParametros) {
    try {

        const empleado_mensualizado = await getTipoEmpleadoMensualizado();

        const offset = (parametros.pagina) * parametros.filasPorPagina;
        const valoresBase: any = [];

        const columnasValidas = ['nombreapellido', 'id_reloj', 'legajo', 'id_proyecto', 'id_estadoempleado', 'id_tipoempleado'];

        if (!columnasValidas.includes(parametros.ordenColumna)) {
            throw new Error('Columna Invalida');
        };

        const direccionesValidas = ['ASC', 'DESC'];

        if (!direccionesValidas.includes(parametros.ordenDireccion.toUpperCase())) {
            throw new Error('Dirección de ordenación invalida');
        };

        const columna = parametros.ordenColumna;
        const direccion = parametros.ordenDireccion.toUpperCase();

        let textoFiltroBase = 'WHERE 1=1 '

        const busquedaNombre = `%${parametros.busquedaNombre}%`;

        if (parametros.filtroTipoEmpleado !== 0) {
            textoFiltroBase += `
                AND e.id_tipoempleado = $${valoresBase.length + 1}
            `;
            valoresBase.push(parametros.filtroTipoEmpleado);
        };

        if (parametros.busquedaNombre !== "") {
            textoFiltroBase += `
                AND unaccent(e.nombreapellido) ILIKE unaccent($${valoresBase.length + 1}) 
            `;
            valoresBase.push(busquedaNombre);
        };

        if (parametros.filtroProyecto !== 0) {
            textoFiltroBase += `
                AND e.id_proyecto = $${valoresBase.length + 1}
            `;
            valoresBase.push(parametros.filtroProyecto);
        };

        const busquedaLegajo = `%${parametros.busquedaLegajo}%`;

        if (parametros.busquedaLegajo !== 0) {
            textoFiltroBase += `
                AND CAST(e.legajo AS TEXT) LIKE $${valoresBase.length + 1} 
            `;
            valoresBase.push(busquedaLegajo);
        };

        const textoOrden = `
            ORDER BY ${columna} ${direccion}
        `;

        const valoresPrincipal = [...valoresBase, empleado_mensualizado, parametros.filasPorPagina, offset];

        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

        const textoMensualizado = `
            COALESCE((te.id = $${valoresPrincipal.length - 2}), false) AS es_mensualizado
        `;

        let texto = `
            SELECT
                e.id,
                e.nombreapellido AS nombre,
                e.id_reloj,
                e.legajo,
                e.id_proyecto,
                p.nombre AS nombreproyecto,
                ee.nombre AS estadoempleado,
                te.nombre AS tipoempleado,
                te.id AS id_tipoempleado,
                ${textoMensualizado}
            FROM "empleado" e
            JOIN "proyecto" p ON e.id_proyecto = p.id
            JOIN "estadoempleado" ee ON e.id_estadoempleado = ee.id
            LEFT JOIN "tipoempleado" te ON e.id_tipoempleado = te.id
            ${textoFiltroBase}
            ${textoOrden}
            ${textoLimite}
        `;

        const resultado = await client.query(texto, valoresPrincipal);

        let textoConteo = `
            SELECT COUNT(*) AS total
            FROM "empleado" e
            ${textoFiltroBase}
        `;

        const resultadoConteo = await client.query(textoConteo, valoresBase);

        return {
            empleados: resultado.rows,
            totalEmpleados: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getEmpleados: ", error);
        throw error;
    };
};//

export async function insertEmpleado(parametros: insertEmpleadoParametros) {
    try {
        const empleadoActivo = await getEstadoEmpleadoActivo();

        const legajo = parametros.legajo === '' ? null : parametros.legajo;

        const id_tipoempleado = parametros.id_tipoempleado === '' ? null : parametros.id_tipoempleado;

        const texto = `
            INSERT INTO "empleado" (nombreapellido, id_reloj, id_proyecto, legajo, id_estadoempleado, id_tipoempleado)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;

        const valores = [parametros.nombre, parametros.id_reloj, parametros.id_proyecto, legajo, empleadoActivo.id, id_tipoempleado];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en insertEmpleado: ", error);
        throw error;
    };
};//

export async function deactivateEmpleado(parametros: deactivateEmpleadoParametros) {
    try {
        const empleadoBaja = await getEstadoEmpleadoBaja();

        const texto = `
            UPDATE "empleado"
            SET id_estadoempleado = $1
            WHERE id = $2
        `;

        const valores = [empleadoBaja.id, parametros.id];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en deleteEmpleado: ", error);
        throw error;
    };
};//

export async function editEmpleado(parametros: editEmpleadoParametros) {
    try {

        const texto = `
            UPDATE "empleado"
            SET nombreapellido = $1, legajo = $2, id_reloj = $3, id_tipoempleado = $4
            WHERE id = $5
        `;
        const valores = [parametros.nombre, parametros.legajo, parametros.id_reloj, parametros.id_tipoempleado, parametros.id];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en editEmpleado: ", error);
        throw error;
    };
};//

export async function getEmpleadoByRelojProyecto(parametros: getEmpleadoByRelojProyectoParametros) {
    try {
        const texto = `
            SELECT id
            FROM empleado
            WHERE id_reloj = $1 AND id_proyecto = $2
        `;

        const valores = [parametros.id_reloj, parametros.id_proyecto];

        const resultado = await client.query(texto, valores);

        return resultado;
    } catch (error) {
        console.error("Error en getEmpleadoByRelojProyecto: ", error);
        throw error;
    };
};//

export async function getEmpleadoProyecto(parametros: getEmpleadoProyectoParametros) {
    try {
        const texto = `
            SELECT id_proyecto
            FROM empleado
            WHERE id = $1
        `;

        const valores = [parametros.id];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id_proyecto;
    } catch (error) {
        console.error("Error en getEmpleadoProyecto: ", error);
        throw error;
    };
};//