# 🚀 GUÍA DE TRANSICIÓN A PRODUCTIVO

**Objetivo**: Pasar Workflow Radar a producción de forma segura y controlada  
**Duración estimada**: 3-5 días (incluyendo QA)  
**Responsables**: DevOps, QA, Product, Security

---

## 📅 TIMELINE

### Día 1: QA Integral (8h)
- [ ] 09:00 - Kick-off y briefing
- [ ] 09:30 - QA ejecuta flujos (21 pasos en AUDIT_REPORT.md)
- [ ] 12:00 - Pausa
- [ ] 13:00 - QA continúa testing
- [ ] 15:30 - Security review
- [ ] 16:00 - Bug triage (si aplica)
- [ ] 17:00 - Cierre del día

### Día 2: Fixes Adicionales (si aplica, 4h)
- [ ] 09:00 - Equipo implementa fixes
- [ ] 11:00 - QA regresión
- [ ] 13:00 - Despliegue a staging

### Día 3: Testing en Staging (8h)
- [ ] 09:00 - Smoke tests
- [ ] 10:00 - UAT con Product Team
- [ ] 12:00 - Pausa
- [ ] 13:00 - UAT continúa
- [ ] 15:00 - Performance testing
- [ ] 16:00 - Load testing
- [ ] 17:00 - Sign-off de Product

### Día 4: Preparación de Productivo (4h)
- [ ] 10:00 - Preparar base de datos
- [ ] 11:00 - Configurar backups
- [ ] 12:00 - Briefing final
- [ ] 13:00 - Despliegue a productivo (con rollback preparado)

### Día 5: Monitoreo Intensivo (8h)
- [ ] 08:00 - Monitoreo en vivo
- [ ] 10:00 - Cierre de Day-1 issues
- [ ] 17:00 - Desactivar alerta de crisis

---

## 🧪 QA CHECKLIST DETALLADO

### Preparación
- [ ] QA tiene acceso a todas las cuentas de test
- [ ] Datos de test preparados (usuarios, espacios, pedidos)
- [ ] Ambiente de staging espejo a productivo
- [ ] Base44 Diagnostico.jsx disponible para troubleshooting

### Flujo 1: Login y Selección de Espacios (30 min)
```
1. [ ] User A inicia sesión (correo: user-a@company.com)
2. [ ] User A ve sus 2 espacios asignados
3. [ ] User A selecciona Espacio 1
4. [ ] Sistema carga Bandeja sin errores
5. [ ] User A cambia a Espacio 2 (via EspacioSwitcher)
6. [ ] Sistema carga Bandeja sin errores
7. [ ] User A inicia sesión con correo en mayúscula (USER-A@COMPANY.COM)
8. [ ] Sistema normaliza y carga espacios correctamente
```

### Flujo 2: Creación de Pedido (20 min)
```
1. [ ] User A abre modal "Nuevo pedido"
2. [ ] Dropdown Solicitante carga (min 5 opciones)
3. [ ] Dropdown Responsable carga
4. [ ] Dropdown Proceso carga
5. [ ] Dropdown Prioridad carga
6. [ ] User A crea pedido: "Test Pedido 1", Solicitante A, Proceso SST, Prioridad Alta
7. [ ] Pedido se crea correctamente
8. [ ] Pedido aparece en Bandeja con estado "Nuevo"
9. [ ] Pedido aparece en Kanban columna "Nuevo"
10. [ ] Dashboard actualiza contador de pedidos
```

### Flujo 3: Edición en Detalle (15 min)
```
1. [ ] User A abre pedido desde Bandeja
2. [ ] Detalle de pedido carga sin errores
3. [ ] User A edita "Próxima acción"
4. [ ] User A asigna Responsable "John Doe"
5. [ ] Se guarda sin errores
6. [ ] Email de asignación se envía (verificar en logs)
7. [ ] Bandeja actualiza inmediatamente
8. [ ] Kanban actualiza inmediatamente
```

### Flujo 4: Movimiento en Kanban (15 min)
```
1. [ ] User A ve tarjeta en columna "Nuevo"
2. [ ] User A mueve tarjeta a "Por priorizar"
3. [ ] Tarjeta se mueve visualmente (optimistic)
4. [ ] Backend actualiza estado
5. [ ] User A mueve tarjeta a "Bloqueado"
6. [ ] Modal de "Motivo de bloqueo" aparece
7. [ ] User A ingresa "Falta aprobación"
8. [ ] Modal se cierra
9. [ ] Email de bloqueo se envía
10. [ ] Kanban actualiza
11. [ ] Bandeja actualiza
```

### Flujo 5: Configuración de Catálogos (30 min)
```
1. [ ] Admin abre Configuración → Solicitantes
2. [ ] Admin crea nuevo Solicitante: "QA Team", "QA", "qa@company.com"
3. [ ] Solicitante aparece en lista
4. [ ] Admin abre Nuevo Pedido (en otra ventana)
5. [ ] QA Team aparece en dropdown
6. [ ] Admin edita Solicitante: nombre → "QA Group"
7. [ ] Nuevo Pedido dropdown actualiza automáticamente
8. [ ] Admin inactiva Solicitante
9. [ ] Solicitante desaparece de dropdown
10. [ ] Admin intenta eliminar Solicitante con uso (paso 2)
11. [ ] Sistema bloquea eliminación
12. [ ] Admin puede inactivar en su lugar
13. [ ] (Repetir pasos 1-12 para Responsable, Proceso, Prioridad)
```

### Flujo 6: Notificaciones (20 min)
```
1. [ ] Admin asigna Responsable a pedido
2. [ ] Responsable recibe email en < 30s
3. [ ] Email contiene: título, solicitante, proceso, prioridad, fecha
4. [ ] Admin marca pedido como Bloqueado
5. [ ] Tanto Responsable como Solicitante reciben email
6. [ ] Admin marca pedido como Cerrado
7. [ ] Solicitante recibe email de cierre
8. [ ] checkVencidos se ejecuta manualmente
9. [ ] Responsables con pedidos vencidos reciben email
10. [ ] Sin correos duplicados
```

### Flujo 7: Gestión de Espacios (Admin Global) (30 min)
```
1. [ ] Admin Global abre Gestion Espacios (sin espacio activo)
2. [ ] Sistema muestra listado de espacios
3. [ ] Admin Global crea Espacio: "Test Space", "Para QA"
4. [ ] Espacio aparece como "Activo"
5. [ ] Admin Global crea Responsable: "Test User", "QA", "testuser@company.com"
6. [ ] Admin Global asigna Responsable a Espacio → rol "User Espacio"
7. [ ] Test User inicia sesión
8. [ ] Test User ve Espacio en selección
9. [ ] Test User entra al Espacio
10. [ ] Admin inactiva Espacio
11. [ ] Test User inicia sesión nuevamente
12. [ ] Test User NO ve Espacio (debe tener acceso a otro)
13. [ ] Admin reactiva Espacio
14. [ ] Test User ve Espacio nuevamente
```

### Flujo 8: Confidencialidad (15 min)
```
1. [ ] Admin marca Pedido como Confidencial
2. [ ] Ingresa motivo: "Salario confidencial"
3. [ ] Pedido muestra ícono de candado en Bandeja
4. [ ] Pedido muestra ícono de candado en Kanban
5. [ ] User sin permisos abre la app
6. [ ] User NO ve el Pedido confidencial en Bandeja
7. [ ] User NO ve el Pedido en Kanban
8. [ ] Admin quita Confidencialidad
9. [ ] Pedido vuelve a aparecer para User
```

### Flujo 9: Archivo y Restauración (15 min)
```
1. [ ] Admin archiva Pedido con motivo "Cerrado"
2. [ ] Pedido desaparece de Bandeja
3. [ ] Pedido desaparece de Kanban
4. [ ] Pedido aparece en Archivados
5. [ ] Admin restaura Pedido desde Archivados
6. [ ] Pedido vuelve a Bandeja
7. [ ] Pedido vuelve a Kanban
8. [ ] Dashboard se actualiza
```

### Flujo 10: Dashboard (10 min)
```
1. [ ] Dashboard carga indicadores
2. [ ] Indicadores son correctos vs Bandeja
3. [ ] Gráficos se dibujan
4. [ ] Al crear/mover/cerrar pedido, Dashboard actualiza
5. [ ] Sin datos de otros espacios
```

### Flujo 11: Panel de Diagnóstico (10 min)
```
1. [ ] Admin abre Diagnostico
2. [ ] Usuario autenticado se muestra
3. [ ] Responsable vinculado se muestra (si existe)
4. [ ] Espacios asignados se listan
5. [ ] Catálogos se cuentan
6. [ ] Advertencias se muestran (si hay responsables sin correo)
7. [ ] Errores se muestran (si hay)
```

---

## 🔐 SECURITY CHECKLIST

- [ ] RLS se valida en todas las consultas
- [ ] Admin no puede acceder a datos de otros usuarios
- [ ] User no puede acceder a datos de otros espacios
- [ ] User no puede acceder a pedidos confidenciales sin autorización
- [ ] Correos en headers son validados
- [ ] CORS configurado correctamente
- [ ] Secrets no expuestos en logs
- [ ] Rates limit activos (si aplica)

---

## 📊 PERFORMANCE CHECKLIST

- [ ] Bandeja (< 100 pedidos) carga en < 1s
- [ ] Kanban carga en < 1.5s
- [ ] Dashboard carga en < 2s
- [ ] Nuevo pedido modal abre en < 0.5s
- [ ] Sin memory leaks (Chrome DevTools)
- [ ] Sin console errors
- [ ] Sin console warnings (excepto vendor)

---

## 🐛 BUG TRIAGE PROTOCOL

### Si se encuentra un bug en QA:
1. **Severidad Crítica** (bloquea flujo)
   - [ ] Pausar QA
   - [ ] Equipo dev arregla urgentemente
   - [ ] QA regresión punto 1 + bug específico
   - [ ] Continuar QA

2. **Severidad Alta** (limita funcionalidad)
   - [ ] QA continúa (anota bug)
   - [ ] Dev arregla durante day 2
   - [ ] QA hace regresión en day 2
   - [ ] Despliegue a staging

3. **Severidad Media** (workaround disponible)
   - [ ] QA anota bug
   - [ ] Dev crea ticket para post-launch
   - [ ] No bloquea deploy

4. **Severidad Baja** (cosmético)
   - [ ] QA anota bug
   - [ ] Dev crea ticket para backlog

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 2 Horas antes del deploy:
- [ ] Base de datos bakup
- [ ] Rollback procedure testeado
- [ ] Logs monitoreados
- [ ] Alert channels activos (email, Slack, etc)
- [ ] Team en standby

### 30 Minutos antes:
- [ ] Todos los tests pasando
- [ ] Documentación actualizada
- [ ] Release notes preparadas
- [ ] Comunicación a stakeholders enviada

### Al momento del deploy:
- [ ] Despliegue iniciado
- [ ] Logs monitoreados en tiempo real
- [ ] No hay errores críticos
- [ ] Funcionalidad básica verificada (smoke test rápido)

---

## 🚨 ROLLBACK PROCEDURE

**Si algo falla en productivo:**

1. **Pause** - Detener nuevas acciones de usuarios (si es necesario)
2. **Assess** - ¿Qué falló? ¿Cuántos usuarios afectados?
3. **Communicate** - Notificar a stakeholders
4. **Rollback** - Volver a versión anterior
5. **Verify** - Confirmar que sistema está estable
6. **Investigate** - Investigar qué pasó
7. **Fix & Retest** - Arreglar y testear localmente
8. **Redeploy** - Desplegar nuevamente

**Tiempo objetivo de rollback**: < 5 minutos

---

## 📞 ESCALATION

```
Issue Crítico (sistema down):
├─ Nivel 1: Dev lead
├─ Nivel 2: Tech lead
└─ Nivel 3: CTO

Issue Alto (feature broken):
├─ Nivel 1: Dev
└─ Nivel 2: Dev lead

Issue Medio (workaround exists):
├─ Nivel 1: QA -> Dev

Issue Bajo (cosmético):
└─ Nivel 1: Backlog
```

---

## ✅ SIGN-OFF REQUERIDO

**Antes de pasar a productivo, se requiere aprobación de:**

- [ ] **QA Lead**: "Flujos completados, sin blockers"
- [ ] **Security**: "RLS y auth validados"
- [ ] **Product Manager**: "Features funcionan como se espera"
- [ ] **DevOps/Ops**: "Infraestructura lista, backups confirmados"
- [ ] **Stakeholder Principal**: "Aprobado para producción"

---

## 📊 METRICS POST-DEPLOY

Monitorear durante 48h:

- [ ] Uptime: > 99.9%
- [ ] Error rate: < 0.1%
- [ ] Latency p95: < 2s
- [ ] User complaints: 0
- [ ] Performance degradation: 0%

---

**Documento preparado por**: Base44 Audit Team  
**Fecha**: 2025-05-11  
**Versión**: 1.0

¿Preguntas? Revisar AUDIT_REPORT.md y PRODUCTION_CHECKLIST.md