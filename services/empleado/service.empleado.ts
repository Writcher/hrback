"use server"

import { getEmpleadosParametros } from "@/lib/empleado";
import { db } from "@vercel/postgres";

const client = db;

export async function getEmpleados(params: getEmpleadosParametros) {
    try {
        const offset = (params.pagina) * params.filasPorPagina;
        const columnasValidas = ['nombreapellido', 'id_reloj', 'legajo'];
        if (!columnasValidas.includes(params.ordenColumna)) {
            throw new Error('Columna Invalida');
        };
        const direccionesValidas = ['ASC', 'DESC'];
        if (!direccionesValidas.includes(params.ordenDireccion.toUpperCase())) {
            throw new Error('Dirección de ordenación invalida');
        };
        const columna = params.ordenColumna;
        const direccion = params.ordenDireccion.toUpperCase();
        const busquedaNombre = `%${params.busquedaNombre}%`;
        const valoresBase = [params.filasPorPagina, offset];
        let conteoWhere = 0;
        let texto = `
            SELECT
                id,
                nombreapellido AS nombre,
                id_reloj,
                legajo,
                id_proyecto
            FROM "empleado"
        `;
        const valores: any = [...valoresBase];
        const valores2: any = [];
        let textoFiltro = '';
        let textoFiltro2 = '';
        if (params.busquedaNombre !== "") {
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
        if (params.filtroProyecto !== 0) {
            if (conteoWhere === 0) {
                textoFiltro += `WHERE id_proyecto = $${valores.length + 1}
                `;
                textoFiltro2 += `WHERE id_proyecto = $${valores2.length + 1}
                `;
                valores.push(params.filtroProyecto);
                valores2.push(params.filtroProyecto);
                conteoWhere++;
            } else if (conteoWhere > 0) {
                textoFiltro += `AND id_proyecto = $${valores.length + 1} 
                `;
                textoFiltro2 += `AND id_proyecto = $${valores2.length + 1}
                `;
                valores.push(params.filtroProyecto);
                valores2.push(params.filtroProyecto);
            };
        };
        let textoOrden = '';
        if (columna === "nombreapellido") {
            textoOrden = "ORDER BY nombreapellido ";
        } else if (columna === "id_reloj") {
            textoOrden = "ORDER BY id_reloj ";
        } else if (columna === "legajo") {
            textoOrden = "ORDER BY legajo ";
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