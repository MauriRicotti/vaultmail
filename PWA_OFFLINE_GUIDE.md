# VaultMail - Modo Offline/PWA

Tu aplicación ahora funciona **sin necesidad de conexión a internet** gracias a la implementación de Service Worker y PWA.

## ¿Qué se agregó?

### 1. **Service Worker (`sw.js`)**
- Cachea todos los recursos (HTML, CSS, JS, Bootstrap CDN, iconos)
- Implementa estrategia "Network First" con fallback a caché
- Permite funcionalidad completa en modo offline

### 2. **Manifest (`manifest.json`)**
- Permite instalar la app como aplicación independiente
- Compatible con iOS (Apple), Android y escritorio

### 3. **Configuración Vercel (`vercel.json`)**
- Headers HTTP correctos para Service Worker
- Cache policies optimizados

### 4. **Meta Tags PWA**
- Compatible con iOS Safari
- Tema de color personalizado
- Capacidad de instalación como app

### 5. **Indicador Visual Offline**
- Banner rojo que aparece cuando no hay conexión
- Informa al usuario que está usando datos guardados

## Cómo funciona

1. **Primera carga**: La app cachea todos los recursos
2. **Sin conexión**: Los datos se cargan desde la caché
3. **Vuelve conexión**: Se sincroniza automáticamente
4. **localStorage**: Ya guardaba datos offline - sigue funcionando igual

## Cómo usar en producción (Vercel)

1. **Push a GitHub**:
```bash
git add .
git commit -m "Add PWA and offline support"
git push
```

2. **Vercel desplegará automáticamente** - No necesitas cambios adicionales

3. **Los usuarios pueden**:
   - Acceder sin conexión a internet (una vez cargada la primera vez)
   - Instalar como app nativa (botón en navegador)
   - Usar datos guardados en localStorage

## Cómo instalar como App

### En Android:
1. Abrir en Chrome
2. Menu (⋮) → "Instalar app"

### En iOS:
1. Abrir en Safari
2. Compartir → "Agregar a pantalla inicio"

### En Windows/Mac:
1. En Chrome: menu (⋮) → "Instalar VaultMail"
2. O en edge: similar

## Características

✅ Funciona sin internet
✅ Se instala como app nativa
✅ Sincronización automática
✅ Datos guardados localmente (localStorage)
✅ Cache inteligente de recursos
✅ Compatible con todos los navegadores modernos
✅ Indicador visual de estado offline

## Qué se cachea

- Página HTML
- Estilos CSS
- JavaScript
- Bootstrap (CSS + JS)
- Bootstrap Icons
- Popper.js
- Favicon
- Todos los Assets en la carpeta Assets/

## Notas importantes

- Los datos (cuentas) se guardan en **localStorage** - esto ya estaba implementado
- El Service Worker cachea **recursos**, no datos
- En offline, todo funciona excepto sincronización con servidores externos
- Cada actualización de código invalida el caché automáticamente

## Próximos pasos opcionales

Si quieres mejorar aún más:
- Agregar notificaciones push
- Sincronización de datos en background
- Modo oscuro/claro como preferencia del sistema
