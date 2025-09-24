"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getTiposEmpleado(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM tipoempleado
        `;

        const resultado = await client.query(texto);
        
        return resultado.rows;
    } catch (error) {
        console.error("Error en getTiposEmpleado: ", error);
        throw error;
    };
};

export async function getTipoEmpleadoMensualizado(){
    try {  
        const texto = `
            SELECT id
            FROM tipoempleado
            WHERE nombre = 'Mensualizado'
        `;

        const resultado = await client.query(texto);
        
        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getTiposEmpleado: ", error);
        throw error;
    };
};