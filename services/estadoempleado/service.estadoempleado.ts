"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosEmpleado(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM estadoempleado
        `;

        const resultado = await client.query(texto);

        return resultado.rows;
    } catch (error) {
        console.error("Error en getEstadosEmpleado: ", error);
        throw error;
    };
};//

export async function getEstadoEmpleadoBaja(){
    try {  
        const texto = `
            SELECT
            id
            FROM estadoempleado
            WHERE nombre = 'Baja'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoEmpleadoBaja: ", error);
        throw error;
    };
};//

export async function getEstadoEmpleadoActivo() {
    try {
        const texto = `
            SELECT
            id
            FROM estadoempleado
            WHERE nombre = 'Activo'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoEmpleadoActivo: ", error);
        throw error;
    };
};//