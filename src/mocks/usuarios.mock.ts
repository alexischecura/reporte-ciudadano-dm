import { Usuario } from "../tipos";

export const MOCK_USUARIO_VECINO: Usuario = {
  id: "usr-084",
  nombre: "Norma Pereyra",
  email: "norma@mail.com",
  telefono: "3446-412233",
  rol: "vecino",
  zonaId: null,
  avisosActivos: true,
  creadoEn: "2026-08-30T19:10:00-03:00",
};

export const MOCK_USUARIO_OPERADOR: Usuario = {
  id: "usr-003",
  nombre: "Claudia Benítez",
  email: "cbenitez@gualeguaychu.gov.ar",
  telefono: "3446-554433",
  rol: "operador",
  zonaId: "zon-centro",
  avisosActivos: true,
  creadoEn: "2026-01-15T08:00:00-03:00",
};

export const MOCK_USUARIOS: Usuario[] = [
  MOCK_USUARIO_VECINO,
  MOCK_USUARIO_OPERADOR,
];
