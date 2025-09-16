"use server"

export type updateJornadaParametros = {
    id_jornada: number;
    entrada: string;
    salida: string;
};

export type validateJornadaParametros = {
    id_jornada: number;
};

export type createJornadaParametros = {
    entrada: string | null,
    salida: string | null,
    entradaTarde: string | null,
    salidaTarde: string | null,
    fecha: string,
    id_tipojornada: number | '',
    id_tipoausencia: number | '',
    duracionAusencia: number | '',
    observacion: string,
    id_empleado: number,
};

export type resumenJornadasExcel = {
    legajo: string,
    empleado: string,
    suma_total: number,
    suma_total_normal: number,
    suma_total_50: number,
    suma_total_100: number,
    suma_total_feriado: number,
};

export type deleteJornadaParametros = {
    id: number,
}; 

export type insertJornadaParametros = {
    fecha: string,
    entrada: string | null,
    salida: string | null,
    id_empleado: number,
    id_proyecto: number,
    id_mes: number,
    id_quincena: number,
    id_tipojornada: number,
    id_ausencia: number | null,
    id_estadojornada: number,
    id_importacion: number | null,
};