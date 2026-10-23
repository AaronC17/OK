# SINPE automático con n8n (BAC personal, sin iniciar sesión en la banca)

Flujo: `integrations/n8n/sinpe-bac-automatico.json`. Endpoint del backend: `POST /api/automation/bank-movements`.

## Cómo "escucha" n8n el banco

No inicia sesión en la banca en línea. BAC avisa cada SINPE recibido por correo (y SMS); n8n lee ese **buzón** (IMAP) y trata cada aviso como un movimiento. Si más adelante BAC te habilita una API, o usas una app que reenvíe SMS, entra por el **webhook alternativo** al mismo flujo.

```text
IMAP (aviso BAC) ─┐
Webhook (API/SMS) ─┼→ Configuración → Normalizar aviso → ¿legible? → POST backend → Interpretar → ¿notificar? → correo al admin
Cada 5 min ───────┘   (reenvía pendientes)                  └→ no legible → correo al admin
```

## Regla de decisión (la aplica el backend, no n8n)

Confirma automáticamente **solo si todo se cumple**:

| Condición | Detalle |
| --- | --- |
| Origen verificado | Remitente del dominio de BAC **y** `dkim=pass` + `spf=pass` (webhook: Header Auth). |
| Vínculo inequívoco | **Código `ONK-…` en el detalle** del SINPE, o la **referencia bancaria** que el cliente escribió al subir el comprobante. |
| Monto exacto | Igual al total del pedido, en céntimos, sin tolerancia. |
| Tiempo | Abono entre la creación del pedido (−5 min de desfase) y 72 h después; nunca futuro. |
| Pedido abierto | `pending_review` o `awaiting_payment`; un único pedido candidato. |

**Monto + hora sin código ni referencia NO confirma**: devuelve los pedidos candidatos y n8n te avisa para confirmar con un clic en `/admin`. Con montos como ₡8.500 es común que dos personas paguen lo mismo; confirmar por monto marcaría pagado el pedido equivocado.

Otras salidas: `no_match` (se reintenta cada 5 min hasta 6 h, por si el cliente pagó antes de enviar el pedido; luego te avisa), `review` (monto distinto, varios códigos, origen no verificado, etc.). Repetir un aviso es seguro: un pedido `ready` responde `already_confirmed`.

Al confirmar, el backend registra al actor `auto:n8n-bac` en la auditoría, marca el pedido «Listo para preparar» y envía al cliente el correo de pago confirmado. n8n avisa al administrador.

## Puesta en marcha

1. **Token del backend** (no compartirlo):
   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```
   Pégalo como `BANK_AUTOMATION_TOKEN` en `.env.store.local` (y en Vercel si aplica). Sin variable, el endpoint responde 404. Requiere ≥ 32 caracteres.
2. **n8n debe alcanzar el backend por HTTPS** (la tienda desplegada). n8n Cloud no ve tu `localhost`.
3. **Buzón**: reenvíos rompen DKIM, así que el buzón IMAP debe recibir los avisos de BAC **directamente** (en BAC, registra ese correo para notificaciones SINPE). Usa un correo exclusivo y una contraseña de aplicación, no la de tu banca.
4. Importar el JSON (queda inactivo) y crear credenciales: **IMAP**, **SMTP**, **Header Auth** `Authorization: Bearer <BANK_AUTOMATION_TOKEN>` para *Conciliar en backend*, y otro **Header Auth** para el webhook.
5. Editar el nodo **Configuración**: `backendBaseUrl`, `adminEmail`, `fromEmail`, `bankDomains`.
6. **Calibrar con un aviso real** (obligatorio): hice los patrones de *Normalizar aviso* sin ver un correo real de BAC; no sé el asunto, dominio ni etiquetas exactas. Haz un SINPE pequeño a ti mismo, ejecuta el nodo IMAP y ajusta: filtro `FROM` del IMAP, `bankDomains`, y las expresiones de monto/referencia/detalle. Verifica en los encabezados que existe `Authentication-Results` con `dkim=pass`/`spf=pass`; si no, todo irá a revisión manual (comportamiento seguro).
7. Pruebas de aceptación antes de activar, con montos bajos: (a) SINPE con código → confirma; (b) sin código, monto igual → solo avisa; (c) monto distinto → revisión; (d) mismo aviso dos veces → un solo pago.
8. Activar. La cola de reintentos usa *static data*, que solo persiste con el flujo **activo** (no en ejecuciones manuales).

## Límites

- Depende de que el aviso de BAC incluya el **detalle** del SINPE. Si no lo trae, solo funciona la vía por referencia o la revisión manual; no relajes la regla del monto.
- Correos retrasados o perdidos no se detectan: revisa periódicamente `/admin` para pedidos pendientes antiguos.
- La confirmación automática se guarda con `paymentVerification: 'manual'` (tipo existente); distingue la automática por el actor `auto:n8n-bac` en la auditoría.
- Un bot que inicie sesión en BAC no se implementó: exige guardar tus credenciales y eludir el MFA, y puede violar los términos del banco.
