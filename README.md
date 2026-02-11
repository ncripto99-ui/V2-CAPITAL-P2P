# Capital P2P

PWA de gestión financiera para operaciones P2P con USDT, instalable en Android.

## Características

- **PWA Instalable**: Funciona como app nativa en Android con manifest.json y service worker
- **Mobile-First**: Diseño optimizado para dispositivos móviles
- **Modo Oscuro/Claro**: Toggle para cambiar entre temas
- **Sin Backend**: Todos los datos se guardan en localStorage
- **Offline**: Funciona sin conexión a internet

## Secciones

1. **Capital (Dashboard)**: Vista general del capital total en C$ y USD, con variaciones diarias y mensuales
2. **Cuentas**: CRUD de cuentas bancarias, efectivo y Binance (USDT)
3. **Órdenes P2P**: Gestión de compras/ventas de USDT con comisiones y ganancias
4. **Gastos**: Registro de gastos con impacto en capital
5. **Informes**: Snapshots diarios e informes mensuales
6. **Ajustes**: Configuración de tasas de cambio y modo USDT (AUTO/MANUAL)

## Monedas

- **C$ (Córdobas)**: Moneda principal
- **USD (Dólares)**: Con tasas de compra/venta configurables
- **USDT (Tether)**: Para cuenta Binance

## Valuación USDT

### Modo AUTO
Calcula el valor promedio ponderado de USDT basado en tus compras:
```
promedio = SUM(USDT_comprados * precio_en_C$) / SUM(USDT_comprados)
```

### Modo MANUAL
Ingresa manualmente el valor USDT → C$

## Lógica de Órdenes P2P

### COMPRA
- Resta del saldo de la cuenta el total pagado (USDT × precio)
- Suma a Binance (USDT - comisión)

### VENTA
- Resta de Binance (USDT + comisión)
- Suma a la cuenta el total recibido
- Calcula ganancia real considerando el costo promedio

## Instalación como PWA

1. Abre la app en Chrome móvil (Android)
2. Busca el mensaje "Instalar app" o menú "Agregar a pantalla de inicio"
3. Confirma la instalación
4. La app aparecerá en tu cajón de aplicaciones

## Respaldo de Datos

En **Ajustes** puedes:
- **Exportar**: Descarga todos tus datos en formato JSON
- **Importar**: Restaura datos desde un archivo JSON

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Esta aplicación funciona en cualquier hosting estático (Vercel, Netlify, GitHub Pages, etc.)
