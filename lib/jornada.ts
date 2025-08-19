"use server"

export type updateJornadaParametros = {
    id_jornada: number;
    entrada: string;
    salida: string;
};

export type insertJornadaParametros = {
    entrada: string | null,
    salida: string | null,
    entradaTarde: string | null,
    salidaTarde: string | null,
    fecha: string,
    id_tipojornada: number | '',
    id_tipoausencia: number | '',
    observacion: string,
    id_empleado: number,
};