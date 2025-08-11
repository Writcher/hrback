"use server"

import { getEmpleadoJornadasParams } from "@/lib/empleado";
import { db } from "@vercel/postgres";

const client = db;

export async function getEmpleadoJornadas(params: getEmpleadoJornadasParams) {
    try {
        const offset = (params.pagina) * params.filasPorPagina;
       
        const valoresBase: any = [params.idEmpleado];
        let textoJoin = '';
        let textoFiltroBase = 'WHERE j.id_empleado = $1 ';
       
        if (params.filtroMes !== 0) {
            textoFiltroBase += `AND j.id_mes = $${valoresBase.length + 1} `;
            valoresBase.push(params.filtroMes);
        }

        if (params.filtroQuincena !== 0) {
            const quincenaParamIndex = valoresBase.length + 1;
            
            textoJoin = `JOIN "quincena" q ON j.id_quincena = q.id `;
            textoFiltroBase += `AND q.quincena = $${quincenaParamIndex} `;
            
            valoresBase.push(params.filtroQuincena);
        };
        
        if (params.filtroMarcasIncompletas) {
            textoFiltroBase += `AND (j.entrada IS NULL OR j.salida IS NULL) `;
        };
       
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
                j.total
            FROM "jornada" j
            ${textoJoin}
            ${textoFiltroBase}
            ORDER BY j.fecha ASC    
            ${textoLimite}
        `;
  
        const resultado = await client.query(texto, valoresPrincipal);

        let texto2 = `
            SELECT COUNT(*) AS total
            FROM "jornada" j
            ${textoJoin}
            ${textoFiltroBase}
        `;
       
        const resultadoConteo = await client.query(texto2, valoresBase);
        
        return {
            jornadas: resultado.rows,
            totalJornadas: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getEmpleadoJornadas: ", error);
        throw error;
    };
};