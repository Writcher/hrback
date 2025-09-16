"use server"

export type getEmpleadosParametros = {
    busquedaNombre: string,
    filtroProyecto: number,
    pagina: number,
    filasPorPagina: number,
    ordenColumna: string,
    ordenDireccion: string,
    busquedaLegajo: number,
};

export type getEmpleadoJornadasParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
    filtroMarcasIncompletas: boolean,
    pagina: number,
    filasPorPagina: number,
};

export type getEmpleadoJornadasResumenParametros = {
    id_empleado: number,
    filtroMes: number,
    filtroQuincena: number,
};

export type getJornadasResumenParametros = {
    proyecto: number,
    mes: number,
    quincena: number,
};

export type insertEmpleadoParametros = {
    id_reloj: number,
    id_proyecto: number,
    legajo: number | '',
    nombre: string,
};

export type editEmpleadoParametros = {
    id_reloj: number,
    legajo: number,
    nombre: string,
    id: number
};

export type deactivateEmpleadoParametros = {
    id: number,
};

export type getEmpleadoByRelojProyectoParametros = {
    id_reloj: number,
    id_proyecto: number,
};

export type getEmpleadoProyectoParametros = {
    id: number,
};