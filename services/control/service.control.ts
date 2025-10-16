"use server";

import { getControlByProyectoParametros } from "@/lib/types/control";
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