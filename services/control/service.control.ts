"use server";

import { createControlParametros, deleteControlParametros, editControlParametros, getControlByProyectoParametros, getControlesParametros } from "@/lib/types/control";
import { db } from "@vercel/postgres";

const client = db;

export async function getControlByProyecto(parametros: getControlByProyectoParametros) {
    try {
        const texto = `
            SELECT c.serie
            FROM control c
            WHERE c.id_proyecto = $1
        `;

        const valores = [parametros.id_proyecto];

        const resultado = await client.query(texto, valores);

        return resultado.rows.map(control => control.serie);;
    } catch (error) {
        console.error("Error en getControlByProyecto: ", error);
        throw error;
    };
};

export async function getProyectosConHikVision() {
    try {
        const texto = `
            SELECT DISTINCT c.id_proyecto
            FROM control c
        `;

        const resultado = await client.query(texto);

        return resultado.rows.map(proyecto => proyecto.id_proyecto);
    } catch (error) {
        console.error("Error en getProyectosConHikVision: ", error);
        throw error;
    };
};

export async function deleteControl(parametros: deleteControlParametros) {
    try {
        const texto = `
            DELETE FROM "control"
            WHERE id = $1
        `;

        const valores = [parametros.id_control];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en deleteControl: ", error);
        throw error;
    };
};

export async function editControl(parametros: editControlParametros) {
    try {
        const texto = `
            UPDATE "control"
            SET serie = $1, id_proyecto = $2
            WHERE id = $3
        `;
        const valores = [parametros.serie, parametros.id_proyecto, parametros.id_control];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en editControl: ", error);
        throw error;
    };
};

export async function createControl(parametros: createControlParametros) {
    try {
        const texto = `
                INSERT INTO "control" (serie, id_proyecto)
                VALUES ($1, $2)
            `;

        const valores = [parametros.serie, parametros.id_proyecto];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en createControl: ", error);
        throw error;
    };
};

export async function getControles(parametros: getControlesParametros) {
    try {
        const offset = (parametros.pagina) * parametros.filasPorPagina;

        const texto = `
            SELECT 
                c.id,
                c.serie,
                c.id_proyecto,
                p.nombre AS proyectonombre
            FROM control c
            JOIN proyecto p ON c.id_proyecto = p.id
            LIMIT $1 OFFSET $2
        `;

        const valores = [parametros.filasPorPagina, offset];

        const resultado = await client.query(texto, valores);

        let textoConteo = `
            SELECT COUNT(DISTINCT id) AS total
            FROM "control"
        `;

        const resultadoConteo = await client.query(textoConteo);

        return {
            controles: resultado.rows,
            totalControles: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getControles: ", error);
        throw error;
    };
};