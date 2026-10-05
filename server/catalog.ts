export const PRODUCT_CATALOG: Array<{
  name: string;
  category: string;
  price: number;
  star?: boolean;
  weight: number;
}> = [
  { name: "Hamburguesa Angus", category: "Hamburguesas", price: 24500, star: true, weight: 9.5 },
  { name: "Rib Eye 400 g", category: "Cortes", price: 52000, weight: 1.6 },
  { name: "Hamburguesa clásica", category: "Hamburguesas", price: 16500, weight: 6.2 },
  { name: "Hamburguesa de pollo", category: "Hamburguesas", price: 17500, weight: 4.4 },
  { name: "Hamburguesa vegetariana", category: "Hamburguesas", price: 18500, weight: 2.1 },
  { name: "Tacos de arrachera", category: "Tacos", price: 19800, weight: 5.5 },
  { name: "Tacos al pastor", category: "Tacos", price: 15600, weight: 5.8 },
  { name: "Quesadilla de flor de calabaza", category: "Antojitos", price: 12800, weight: 2.4 },
  { name: "Enchiladas suizas", category: "Cocina mexicana", price: 17200, weight: 3.1 },
  { name: "Chilaquiles rojos", category: "Desayunos", price: 14900, weight: 2.8 },
  { name: "Chilaquiles verdes", category: "Desayunos", price: 14900, weight: 2.6 },
  { name: "Ensalada César", category: "Ensaladas", price: 15500, weight: 2.9 },
  { name: "Ensalada de quinoa", category: "Ensaladas", price: 16800, weight: 1.5 },
  { name: "Sopa de tortilla", category: "Entradas", price: 9800, weight: 2.2 },
  { name: "Guacamole y totopos", category: "Entradas", price: 11900, weight: 4.1 },
  { name: "Alitas BBQ", category: "Entradas", price: 18900, weight: 3.6 },
  { name: "Papas trufa", category: "Acompañamientos", price: 8900, weight: 3.8 },
  { name: "Elote asado", category: "Acompañamientos", price: 6900, weight: 2.0 },
  { name: "Arrachera a la parrilla", category: "Cortes", price: 34500, weight: 3.3 },
  { name: "New York 300 g", category: "Cortes", price: 41000, weight: 1.8 },
  { name: "Salmón a las brasas", category: "Pescados", price: 33500, weight: 2.0 },
  { name: "Camarones al ajillo", category: "Pescados", price: 29800, weight: 1.7 },
  { name: "Pasta alfredo", category: "Pastas", price: 18900, weight: 2.3 },
  { name: "Pizza margarita", category: "Pizzas", price: 21500, weight: 2.5 },
  { name: "Pizza pepperoni", category: "Pizzas", price: 23500, weight: 2.7 },
  { name: "Club sandwich", category: "Sandwiches", price: 16500, weight: 2.4 },
  { name: "Bowl poke", category: "Bowls", price: 19800, weight: 1.9 },
  { name: "Agua de horchata", category: "Bebidas", price: 4500, weight: 4.6 },
  { name: "Agua de jamaica", category: "Bebidas", price: 4500, weight: 4.2 },
  { name: "Limonada mineral", category: "Bebidas", price: 5500, weight: 3.9 },
  { name: "Cerveza artesanal", category: "Bebidas", price: 8900, weight: 3.5 },
  { name: "Margarita clásica", category: "Bebidas", price: 14500, weight: 2.8 },
  { name: "Café de olla", category: "Bebidas", price: 4900, weight: 2.2 },
  { name: "Flan napolitano", category: "Postres", price: 8900, weight: 2.1 },
  { name: "Brownie con helado", category: "Postres", price: 9800, weight: 2.3 },
  { name: "Churros con cajeta", category: "Postres", price: 7900, weight: 2.0 },
  { name: "Pay de limón", category: "Postres", price: 8500, weight: 1.6 },
  { name: "Kids hamburger", category: "Infantil", price: 11900, weight: 1.8 },
  { name: "Nuggets de pollo", category: "Infantil", price: 10900, weight: 1.7 },
  { name: "Soda italiana", category: "Bebidas", price: 6900, weight: 2.1 },
];

export const MODIFIERS = [
  "Extra queso",
  "Papas grandes",
  "Sin cebolla",
  "Extra aguacate",
  "Término medio",
  "Salsa extra",
  "Sin picante",
  "Pan integral",
] as const;

export const CANCEL_REASONS = [
  "Cliente canceló",
  "Fuera de zona",
  "Tiempo de espera",
  "Sin inventario",
  "Error de pago",
] as const;

export const FIRST_NAMES = [
  "Juan", "María", "Luis", "Ana", "Carlos", "Sofía", "Diego", "Valentina",
  "Miguel", "Camila", "Jorge", "Fernanda", "Alejandro", "Daniela", "Ricardo",
  "Paola", "Andrés", "Gabriela", "Eduardo", "Andrea", "Pablo", "Lucía",
  "Héctor", "Mariana", "Roberto", "Elena", "Francisco", "Isabel", "Raúl", "Claudia",
];

export const LAST_NAMES = [
  "Pérez", "García", "Hernández", "López", "Martínez", "González", "Rodríguez",
  "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz",
  "Morales", "Reyes", "Ortiz", "Gutiérrez", "Chávez",
];

export const PREFERENCES = [
  { mesa: "Terraza", momento: "Cena", dia: "Viernes" },
  { mesa: "Interior", momento: "Comida", dia: "Domingo" },
  { mesa: "Barra", momento: "Cena", dia: "Sábado" },
  { mesa: "Ventana", momento: "Comida", dia: "Jueves" },
  { mesa: "Privado", momento: "Cena", dia: "Sábado" },
  { mesa: "Patio", momento: "Brunch", dia: "Domingo" },
];

export const WA_TEMPLATES = [
  "Confirmación de reservación",
  "Menú del día",
  "Horario de servicio",
  "Ubicación y valet",
  "Agradecimiento post-visita",
];
