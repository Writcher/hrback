export type getControlByProyectoParametros = {
    id_proyecto: number,
};

export type deleteControlParametros = {
    id_control: number,
};

export type editControlParametros = {
    id_control: number,
    id_proyecto: number,
    serie: string,
};

export type createControlParametros = {
    id_proyecto: number,
    serie: string,
};

export type getControlesParametros = {
    pagina: number,
    filasPorPagina: number,
};