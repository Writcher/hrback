"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getUsuarioPorCorreo(parametros: { correo: string }) {
    try { 
        const correoMinuscula = parametros.correo.toLowerCase();

        const texto = `
            SELECT * 
            FROM "usuario"
            WHERE correo ILIKE $1
        `;

        const valores = [correoMinuscula];

        const respuestaRaw = await client.query(texto, valores);
        const respuesta = respuestaRaw.rows[0];

        return respuesta;
    } catch (error) {
        console.error("Error en getUsuarioPorCorreo: ", error);
        throw error;
    };
};