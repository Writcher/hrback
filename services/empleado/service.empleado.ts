"use server"

import { getEmpleadosParametros, insertEmpleadoParametros } from "@/lib/types/empleado";
import { db } from "@vercel/postgres";
import { getEstadosEmpleado } from "../estadoempleado/service.estadoempleado";

const client = db;

export async function getEmpleados(parametros: getEmpleadosParametros) {
    try {
        const offset = (parametros.pagina) * parametros.filasPorPagina;
        const columnasValidas = ['nombreapellido', 'id_reloj', 'legajo', 'id_proyecto', 'id_estadoempleado'];
        if (!columnasValidas.includes(parametros.ordenColumna)) {
            throw new Error('Columna Invalida');
        };
        const direccionesValidas = ['ASC', 'DESC'];
        if (!direccionesValidas.includes(parametros.ordenDireccion.toUpperCase())) {
            throw new Error('Dirección de ordenación invalida');
        };
        const columna = parametros.ordenColumna;
        const direccion = parametros.ordenDireccion.toUpperCase();
        const busquedaNombre = `%${parametros.busquedaNombre}%`;
        const valoresBase = [parametros.filasPorPagina, offset];
        let conteoWhere = 0;
        let texto = `
            SELECT
                e.id,
                e.nombreapellido AS nombre,
                e.id_reloj,
                e.legajo,
                e.id_proyecto,
                p.nombre AS nombreproyecto,
                ee.nombre AS estadoempleado
            FROM "empleado" e
            JOIN "proyecto" p ON e.id_proyecto = p.id
            JOIN "estadoempleado" ee ON e.id_estadoempleado = ee.id
        `;
        const valores: any = [...valoresBase];
        const valores2: any = [];
        let textoFiltro = '';
        let textoFiltro2 = '';
        if (parametros.busquedaNombre !== "") {
            if (conteoWhere === 0) {
                textoFiltro += `WHERE unaccent(nombreapellido) ILIKE unaccent($${valores.length + 1}) 
                `;
                textoFiltro2 += `WHERE unaccent(nombreapellido) ILIKE unaccent($${valores2.length + 1}) 
                `;
                valores.push(busquedaNombre);
                valores2.push(busquedaNombre);
                conteoWhere++;
            } else if (conteoWhere > 0) {
                textoFiltro += `AND unaccent(nombreapellido) ILIKE unaccent($${valores.length + 1}) 
                `;
                textoFiltro2 += `AND unaccent(nombreapellido) ILIKE unaccent($${valores2.length + 1}) 
                `;
                valores.push(busquedaNombre);
                valores2.push(busquedaNombre);
            };
        };
        if (parametros.filtroProyecto !== 0) {
            if (conteoWhere === 0) {
                textoFiltro += `WHERE id_proyecto = $${valores.length + 1}
                `;
                textoFiltro2 += `WHERE id_proyecto = $${valores2.length + 1}
                `;
                valores.push(parametros.filtroProyecto);
                valores2.push(parametros.filtroProyecto);
                conteoWhere++;
            } else if (conteoWhere > 0) {
                textoFiltro += `AND id_proyecto = $${valores.length + 1} 
                `;
                textoFiltro2 += `AND id_proyecto = $${valores2.length + 1}
                `;
                valores.push(parametros.filtroProyecto);
                valores2.push(parametros.filtroProyecto);
            };
        };
        let textoOrden = '';
        if (columna === "nombreapellido") {
            textoOrden = "ORDER BY nombreapellido ";
        } else if (columna === "id_reloj") {
            textoOrden = "ORDER BY id_reloj ";
        } else if (columna === "legajo") {
            textoOrden = "ORDER BY legajo ";
        } else if (columna === "id_proyecto") {
            textoOrden = "ORDER BY id_proyecto "
        }else if (columna === "id_estadoempleado") {
            textoOrden = "ORDER BY id_estadoempleado "
        };
        if (direccion === "DESC" || direccion === "ASC") {
            textoOrden += direccion;
        };
        texto += textoFiltro
        texto += textoOrden + `
            LIMIT $1 OFFSET $2
        `;
        const resultado = await client.query(texto, valores);
        let texto2 = `
            SELECT COUNT(*) AS total
            FROM "empleado"
        `;
        texto2 += textoFiltro2;
        const resultadoConteo = await client.query(texto2, valores2);

        return {
            empleados: resultado.rows,
            totalEmpleados: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getEmpleados: ", error);
        throw error;
    };
};

export async function insertEmpleado(parametros: insertEmpleadoParametros) {
    try {
        const estadosEmpleado = await getEstadosEmpleado();

        const empleadoActivo = estadosEmpleado.find(e => e.nombre.toLowerCase() === 'activo');

        const texto = `
            INSERT INTO "empleado" (nombreapellido, id_reloj, id_proyecto, legajo, id_estadoempleado)
            VALUES ($1, $2, $3, $4)
        `;
        const valores = [parametros.nombre, parametros.id_reloj, parametros.id_proyecto, parametros.legajo, empleadoActivo.id];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en insertEmpleado: ", error);
        throw error;
    };
};

export async function deactivateEmpleado(id: number) {
    try {
        const estadosEmpleado = await getEstadosEmpleado();

        const empleadoBaja = estadosEmpleado.find(e => e.nombre.toLowerCase() === 'baja');

        const texto = `
            UPDATE "empleado"
            SET id_estadoempleado = $1
            WHERE id = $2
        `;
        const valores = [empleadoBaja.id, id];

        await client.query(texto, valores);
        return;
    } catch (error) {
        console.error("Error en deleteEmpleado: ", error);
        throw error;
    };
};