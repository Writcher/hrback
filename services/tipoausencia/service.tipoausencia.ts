"use server";

import { createTipoAusenciaParametros, deactivateTipoAusenciaParametros, editTipoAusenciaParametros, getTiposAusenciaABMParametros } from "@/lib/types/tipoausencia";
import { db } from "@vercel/postgres";
import { getEstadoParametroActivo, getEstadoParametroBaja } from "../estadoparametro/service.estadoparametro";

const client = db;

export async function getTiposAusencia(){
    try {
        const id_parametrobaja = await getEstadoParametroBaja();
        
        const texto = `
            SELECT 
            id, 
            nombre
            FROM tipoausencia
            WHERE id_estadoparametro != $1
        `;

        const valores = [id_parametrobaja];

        const resultado = await client.query(texto, valores);
        
        return resultado.rows;
    } catch (error) {
        console.error("Error en getTiposAusencia: ", error);
        throw error;
    };
};

export async function getTipoAusenciaInjustificada(){
    try {
        const texto = `
            SELECT id
            FROM tipoausencia
            WHERE nombre = 'Injustificada'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id
    } catch (error) {
        console.error("Error en getTipoAusenciaInjustificada: ", error);
        throw error;
    };
};

export async function getTiposAusenciaABM(parametros: getTiposAusenciaABMParametros) {
    try {
        const offset = (parametros.pagina) * parametros.filasPorPagina;

        const texto = `
            SELECT 
                ta.id, 
                ta.nombre,
                ep.nombre AS estadoparametro
            FROM tipoausencia ta
            JOIN estadoparametro ep ON ta.id_estadoparametro = ep.id
            LIMIT $1 OFFSET $2
        `;

        const valores = [parametros.filasPorPagina, offset];

        const resultado = await client.query(texto, valores);

        let textoConteo = `
            SELECT COUNT(DISTINCT id) AS total
            FROM "tipoausencia"
        `;

        const resultadoConteo = await client.query(textoConteo);

        return {
            tiposAusencia: resultado.rows,
            totalTiposAusencia: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getTiposAusenciaABM: ", error);
        throw error;
    };
};

export async function deactivateTipoAusencia(parametros: deactivateTipoAusenciaParametros) {
    try {
        const id_baja = await getEstadoParametroBaja();

        const texto = `
            UPDATE "tipoausencia"
            SET id_estadoparametro = $2
            WHERE id = $1
                AND id_estadoparametro != $2
        `;

        const valores = [parametros.id_tipoausencia, id_baja];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en deactivateTipoAusencia: ", error);
        throw error;
    };
};

export async function editTipoAusencia(parametros: editTipoAusenciaParametros) {
    try {
        const id_baja = await getEstadoParametroBaja();

        const texto = `
            UPDATE "tipoausencia"
            SET nombre = $1
            WHERE id = $2
                AND id_estadoparametro != $3
        `;
        const valores = [parametros.nombre, parametros.id_tipoausencia, id_baja];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en editTipoAusencia: ", error);
        throw error;
    };
};

export async function createTipoAusencia(parametros: createTipoAusenciaParametros) {
    try {

        const id_estadoparametro = await getEstadoParametroActivo();

        const texto = `
                INSERT INTO "tipoausencia" (nombre, id_estadoparametro)
                VALUES ($1, $2)
            `;

        const valores = [parametros.nombre, id_estadoparametro];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en createTipoAusencia: ", error);
        throw error;
    };
};