export type deactivateTipoAusenciaParametros = {
    id_tipoausencia: number,
};

export type editTipoAusenciaParametros = {
    id_tipoausencia: number,
    nombre: string,
};

export type createTipoAusenciaParametros = {
    nombre: string,
};

export type getTiposAusenciaABMParametros = {
    pagina: number,
    filasPorPagina: number,
};