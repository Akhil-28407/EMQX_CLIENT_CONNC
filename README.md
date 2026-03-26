# MQTT Realtime Environment (NestJS + Vite React)

This project gives you an MQTTX-style workflow:
- Connect to EMQX broker
- Subscribe/unsubscribe topics
- Publish JSON or plain text payloads
- Receive realtime messages in a live stream

## Architecture

- `backend` (NestJS): MQTT bridge to EMQX + REST API + Socket.IO realtime events
- `frontend` (Vite React): Realtime MQTT client UI (connect, subscribe, publish, logs)

## 1) Start Backend

```bash
npm --prefix backend install
npm --prefix backend run start:dev
```

Backend runs on `http://localhost:3000`.

## 2) Start Frontend

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Frontend runs on `http://localhost:5173`.

## EMQX Public Broker Example

In the UI Connection panel, use:
- Protocol: `ws`
- Host: `broker.emqx.io`
- Port: `8083`
- Path: `/mqtt`

Then:
1. Click `Connect`
2. Subscribe to topic like `test/topic`
3. Publish payload (plain text or JSON)
4. See live message stream in `Messages`

## Backend API

- `GET /mqtt/status`
- `POST /mqtt/connect`
- `POST /mqtt/disconnect`
- `POST /mqtt/subscribe`
- `POST /mqtt/unsubscribe`
- `POST /mqtt/publish`

Realtime events (Socket.IO):
- `mqtt:status`
- `mqtt:message`
- `mqtt:log`

## Notes

- If your EMQX instance uses secure websocket, use `wss` and correct TLS port/path.
- For private brokers, provide username/password in the connection form.
