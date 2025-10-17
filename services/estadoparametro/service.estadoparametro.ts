"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadoParametroBaja(){
    try {
        const texto = `
            SELECT 
            id
            FROM estadoparametro
            WHERE nombre = 'Baja'
        `;
        
        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoParametroBaja: ", error);
        throw error;
    };
};

export async function getEstadoParametroActivo(){
    try {
        const texto = `
            SELECT 
            id
            FROM estadoparametro
            WHERE nombre = 'Activo'
        `;
        
        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getEstadoParametroActivo: ", error);
        throw error;
    };
};