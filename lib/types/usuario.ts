export type getUsuarioPorCorreoParametros = {
    correo: string,
};

export type getUsuariosParametros = {
    busquedaNombre: string,
    filtroTipoUsuario: number,
    pagina: number,
    filas: number,
    columna: string,
    direccion: string,
};

export type insertUsuarioParametros = {
    correo: string,
    contraseña: string,
    nombre: string,
    id_tipousuario: number,
};

export type editUsuarioParametros = {
    id: number,
    nombre: string,
    correo: string,
    id_tipousuario: number,
};

export type deleteUsuarioParametros = {
    id: number,
};