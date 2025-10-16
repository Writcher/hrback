export type getProyectoModalidadTrabajoParametros = {
    id_proyecto: number,
};

export type deactivateProyectoParametros = {
    id_proyecto: number,
};

export type editProyectoParametros = {
    id_proyecto: number,
    id_modalidadtrabajo: number,
    nombre: string,
};

export type createProyectoParametros = {
    id_modalidadtrabajo: number,
    nombre: string,
};