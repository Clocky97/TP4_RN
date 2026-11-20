export function esIsbn(valor: string | string[] | undefined): valor is string {
  return typeof valor === 'string' && /^\d{13}$/.test(valor);
}

export function limpiarIsbn(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, 13);
}
