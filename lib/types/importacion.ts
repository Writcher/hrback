"use server"

export type getImportacionesParametros = {
    filtroIncompletas: boolean;
    filtroProyecto: number;
    pagina: number;
    filasPorPagina: number;
};

export type  getJornadasByImportacionParametros = {
    id_importacion: number;
    filtroMarcasIncompletas: boolean;
    pagina: number;
    filasPorPagina: number;
};

export type setImportacionCompletaParametros = {
    id: number,
};

export type deleteImportacionParametros = {
    id: number,
};

export type insertImportacionParametros = {
    id_estadoimportacion: number, 
    id_proyecto: number, 
    nombreArchivo: string,
};