"use server"

import { insertJornadaObservacionParametros } from "@/lib/types/jornadaobservacion";
import { checkRowsAffected, executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function insertJornadaObservacion(parametros: insertJornadaObservacionParametros) {
    return executeQuery(
        'insertJornadaObservacion',
        async () => {

            const insertQuery = `
                INSERT INTO jornadaobservacion (id_jornada, id_observacion)
                VALUES ($1, $2)
            `;

            const insertResult = await client.query(insertQuery, [
                parametros.id_jornada,
                parametros.id_observacion
            ]);

            checkRowsAffected(insertResult, 'JornadaObservacion');
        },

        parametros
    );
};//