export type getMarcasSQLServerParametros = {
    fecha: string, // formato ISO: YYYY-MM-DD
    dispositivos: string[],
};

export type RegistroEmpleado = {
    fecha: string,
    hora: string,
    tipo: string,
};

export type EmpleadoJornada = {
    nombre: string,
    registros: RegistroEmpleado[],
    requiresManualReview: boolean,
};

export type ResultadoProcesado = {
    empleadosJornada: Map<string, EmpleadoJornada>,
    importacionCompleta: boolean,
};

export type getPresentesProyectoParametros = {
    fecha: string,
    dispositivos: string[],
    filtroProyecto: number,
    pagina?: number,
    filasPorPagina?: number,
};