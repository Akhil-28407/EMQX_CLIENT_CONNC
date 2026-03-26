import { Buffer } from 'buffer'
// Polyfill Buffer for MQTT.js in the browser (MUST BE AT TOP)
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer
}

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import mqtt from 'mqtt'
import './App.css'

type BrokerProtocol = 'mqtt' | 'mqtts' | 'ws' | 'wss'

type MqttMessage = {
  topic: string
  payload: string
  json: any
  qos: number
  retain: boolean
  at: string
}

type MqttStatus = {
  connected: boolean
  reconnecting?: boolean
  subscriptions: string[]
  simulatorEnabled: boolean
}

const initialStatus: MqttStatus = {
  connected: false,
  reconnecting: false,
  subscriptions: [],
  simulatorEnabled: false,
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<MqttStatus>(initialStatus)
  const [logs, setLogs] = useState<string[]>([])
  const [messages, setMessages] = useState<(MqttMessage & { sent?: boolean })[]>([])

  const [host, setHost] = useState('broker.emqx.io')
  const [port, setPort] = useState(8083)
  const [protocol, setProtocol] = useState<BrokerProtocol>('ws')
  const [path, setPath] = useState('/mqtt')
  const [clientId, setClientId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [clean, setClean] = useState(true)
  const [keepalive, setKeepalive] = useState(60)
  const [rejectUnauthorized, setRejectUnauthorized] = useState(true)

  const [subTopic, setSubTopic] = useState('iot/demo/#')
  const [subQos, setSubQos] = useState(0)
  const [ignoreRetained, setIgnoreRetained] = useState(false)

  const [pubTopic, setPubTopic] = useState('iot/demo/control')
  const [pubPayload, setPubPayload] = useState('{"command": "test"}')
  const [pubQos, setPubQos] = useState(0)
  const [retain, setRetain] = useState(false)

  const mqttClientRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [topicCards, setTopicCards] = useState<Record<string, { latest: any; at: string; count: number }>>({})
  const [isMqttConnected, setIsMqttConnected] = useState(false)

  // Initial Boot Sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  // Mouse Tracking Glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const root = document.documentElement
      root.style.setProperty('--mouse-x', `${e.clientX}px`)
      root.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const addLog = (text: string) => {
    const stamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${stamp}] ${text}`, ...prev].slice(0, 100))
  }

  const getStatus = () => {
    if (!mqttClientRef.current) return
    setStatus(prev => ({
      ...prev,
      connected: mqttClientRef.current?.connected || false,
      reconnecting: mqttClientRef.current?.reconnecting || false,
    }))
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.end()
      }
    }
  }, [])

  const onConnect = (e: FormEvent) => {
    e.preventDefault()
    if (mqttClientRef.current) {
      mqttClientRef.current.end()
    }

    const endpoint = `${protocol}://${host}:${port}${path}`
    addLog(`Connecting to ${endpoint}...`)

    const options: any = {
      clientId: clientId || `emqx_react_${Math.random().toString(16).substring(2, 8)}`,
      username,
      password,
      clean,
      keepalive,
      rejectUnauthorized,
      connectTimeout: 30000,
      reconnectPeriod: 2000,
    }

    try {
      if (!mqtt || typeof mqtt.connect !== 'function') {
        throw new Error('MQTT library failed to initialize correctly.')
      }
      
      const client = mqtt.connect(endpoint, options)
      mqttClientRef.current = client

      client.on('connect', () => {
        addLog(`Connected to ${endpoint}`)
        setIsMqttConnected(true)
        getStatus()
      })

      client.on('reconnect', () => {
        addLog('Reconnecting to broker...')
        getStatus()
      })

      client.on('error', (err: Error) => {
        addLog(`Connection error: ${err.message}`)
        setErrorMsg(err.message)
        setIsMqttConnected(false)
        getStatus()
      })

      client.on('close', () => {
        addLog('Broker connection closed')
        setIsMqttConnected(false)
        getStatus()
      })

      client.on('message', (topic: string, message: Buffer, packet: any) => {
        if (ignoreRetained && packet.retain) {
          addLog(`Ignored retained message on ${topic}`)
          return
        }
        const payloadText = message.toString()
        let json: any = null
        try { json = JSON.parse(payloadText) } catch {}
        
        const event: MqttMessage = {
          topic,
          payload: payloadText,
          json,
          qos: packet.qos,
          retain: packet.retain,
          at: new Date().toISOString()
        }

        setMessages(prev => [...prev, event].slice(-500))
        setTopicCards(prev => ({
          ...prev,
          [topic]: {
            latest: json || payloadText,
            at: event.at,
            count: (prev[topic]?.count || 0) + 1
          }
        }))
      })
    } catch (err: any) {
      addLog(`Setup failed: ${err.message}`)
      setErrorMsg(err.message)
    }
  }

  const usePreset = (type: 'public' | 'cloud') => {
    if (type === 'public') {
      setHost('broker.emqx.io'); setPort(8083); setProtocol('ws'); setPath('/mqtt')
    } else {
      setHost('l96965cf.ala.asia-southeast1.emqxsl.com'); setPort(8084); setProtocol('wss'); setPath('/mqtt')
    }
  }

  const mqttSub = (topic: string, qos: number) => {
    if (mqttClientRef.current) {
      mqttClientRef.current.subscribe(topic, { qos: qos as any }, (err: Error | null) => {
        if (err) {
          addLog(`Subscribe error: ${err.message}`)
        } else {
          addLog(`Subscribed to ${topic}`)
          setStatus(prev => ({ ...prev, subscriptions: [...new Set([...prev.subscriptions, topic])] }))
        }
      })
    }
  }

  const mqttUnSub = (topic: string) => {
    if (mqttClientRef.current) {
      mqttClientRef.current.unsubscribe(topic, (err: Error | null) => {
        if (err) {
          addLog(`Unsubscribe error: ${err.message}`)
        } else {
          addLog(`Unsubscribed from ${topic}`)
          setStatus(prev => ({ ...prev, subscriptions: prev.subscriptions.filter(s => s !== topic) }))
        }
      })
    }
  }

  const mqttPublish = () => {
    if (/[#+]/.test(pubTopic)) {
      addLog('Error: Cannot publish to wildcard topics.')
      return
    }
    if (mqttClientRef.current) {
      const now = new Date().toISOString()
      const msg = { topic: pubTopic, payload: pubPayload, at: now, sent: true, qos: pubQos, json: null, retain: false }
      setMessages(prev => [...prev, msg].slice(-500))
      
      mqttClientRef.current.publish(pubTopic, pubPayload, { qos: pubQos as any, retain }, (err: Error | null) => {
        if (err) addLog(`Publish error: ${err.message}`)
        else addLog(`Published to ${pubTopic}`)
      })
    }
  }

  return (
    <>
      {isLoading && (
        <div className="loading-wrapper">
          <div className="spinner">
            <div className="spinner1"></div>
          </div>
          <div className="loading-text">Initializing Tactical Link...</div>
        </div>
      )}
      <div className="app-shell" style={{ opacity: isLoading ? 0 : 1 }}>
        <div className="mouse-glow"></div>
      {!isMqttConnected && (
        <div className="connection-banner">
          MQTT DISCONNECTED - Use the setup form to connect to a broker.
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>IOT EXPLORER</h1>
        </div>
        <div className="sidebar-content">
          {errorMsg && (
            <div className="card" style={{ background: 'var(--error)', color: '#fff', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <strong>Error:</strong> {errorMsg}
              <button style={{ background: 'none', color: '#fff', float: 'right', padding: 0 }} onClick={() => setErrorMsg(null)}>×</button>
            </div>
          )}
          <div className="status-indicator">
            <div className={`dot ${isMqttConnected ? 'live' : 'down'}`}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              {isMqttConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>

          <div className="input-group">
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PRESETS</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="ghost" onClick={() => usePreset('public')}>Public</button>
              <button className="ghost" onClick={() => usePreset('cloud')}>Cloud</button>
            </div>
          </div>

          <form onSubmit={onConnect} className="stack">
            <input value={host} onChange={e => setHost(e.target.value)} placeholder="Host" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <select value={protocol} onChange={e => setProtocol(e.target.value as BrokerProtocol)}>
                <option value="ws">ws</option><option value="wss">wss</option>
              </select>
              <input type="number" value={port} onChange={e => setPort(Number(e.target.value))} placeholder="Port" />
            </div>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
            
            <details style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <summary style={{ cursor: 'pointer', padding: '0.5rem 0' }}>ADVANCED OPTIONS</summary>
              <div className="stack" style={{ paddingTop: '0.5rem' }}>
                <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Client ID" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.6rem' }}>KEEP ALIVE</label>
                    <input type="number" value={keepalive} onChange={e => setKeepalive(Number(e.target.value))} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input type="checkbox" checked={clean} onChange={setClean as any} />
                    Clean
                  </label>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={rejectUnauthorized} onChange={setRejectUnauthorized as any} />
                  Verify SSL
                </label>
              </div>
            </details>

            <button type="submit" className="primary">
              {isMqttConnected ? 'RECONNECT' : 'CONNECT'}
            </button>
          </form>

          <div className="stack" style={{ opacity: isMqttConnected ? 1 : 0.5, pointerEvents: isMqttConnected ? 'auto' : 'none' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={ignoreRetained} onChange={e => setIgnoreRetained(e.target.checked)} />
              IGNORE RETAINED
            </label>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SUBSCRIBE</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 40px', gap: '0.5rem' }}>
              <input value={subTopic} onChange={e => setSubTopic(e.target.value)} placeholder="Topic" />
              <select value={subQos} onChange={e => setSubQos(Number(e.target.value))}>
                <option value={0}>Q0</option><option value={1}>Q1</option><option value={2}>Q2</option>
              </select>
              <button className="primary" onClick={() => mqttSub(subTopic, subQos)}>+</button>
            </div>
            <div className="chip-list">
              {status.subscriptions.map(t => (
                <div className="chip" key={t}>
                  {t} <button onClick={() => mqttUnSub(t)}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-feed">
        <header className="feed-header">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <strong>MESSAGE FEED</strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
              {messages.length} EVENTS
            </span>
          </div>
          <button className="ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setMessages([])}>Clear</button>
        </header>
        
        <div className="messages-container" ref={scrollRef}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.2 }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>WAITING FOR DATA</h3>
              <p>Connect and subscribe to a topic.</p>
            </div>
          )}
          {messages.map((m, i) => {
            const isMe = m.sent
            return (
              <div className={`message-bubble ${isMe ? 'me' : 'them'}`} key={i}>
                <div className="message-topic">
                  <span>{m.topic}</span>
                  <span style={{ opacity: 0.5 }}>{isMe ? 'OUT' : 'IN'}</span>
                </div>
                <div className="message-payload">{m.payload}</div>
                <div className="message-time">{new Date(m.at).toLocaleTimeString()}</div>
              </div>
            )
          })}
        </div>

        <div className="publish-area" style={{ opacity: isMqttConnected ? 1 : 0.5, pointerEvents: isMqttConnected ? 'auto' : 'none' }}>
          <div className="stack">
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input style={{ flex: 0.3 }} value={pubTopic} onChange={e => setPubTopic(e.target.value)} placeholder="Topic" />
              <input style={{ flex: 1 }} value={pubPayload} onChange={e => setPubPayload(e.target.value)} placeholder="Message..." />
              <button className="primary" onClick={mqttPublish} disabled={!isMqttConnected || /[#+]/.test(pubTopic)}>SEND</button>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QOS</span>
                <select style={{ width: '60px', padding: '0.4rem' }} value={pubQos} onChange={e => setPubQos(Number(e.target.value))}>
                  <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={retain} onChange={e => setRetain(e.target.checked)} />
                RETAIN
              </label>
            </div>
          </div>
        </div>
      </main>

      <aside className="insights-panel">
        <div className="panel-header">
          <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>TOPIC CARDS</h2>
        </div>
        <div className="panel-content" style={{ overflowY: 'auto' }}>
          <div className="stack">
            {Object.keys(topicCards).length === 0 ? (
              <div className="card" style={{ textAlign: 'center', opacity: 0.3, borderStyle: 'dashed' }}>
                <p>No active cards.</p>
              </div>
            ) : (
              Object.entries(topicCards).sort((a,b) => b[1].at.localeCompare(a[1].at)).map(([topic, data]) => (
                <div className="card topic-card" key={topic}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{topic}</strong>
                    <span style={{ background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>
                      {data.count}
                    </span>
                  </div>
                  <div className="payload-view">
                    {typeof data.latest === 'object' ? (
                      <pre>{JSON.stringify(data.latest, null, 2)}</pre>
                    ) : (
                      <div className="message-payload">{String(data.latest)}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.8rem', textAlign: 'right' }}>
                    UPDATED {new Date(data.at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="stack" style={{ marginTop: '2.5rem' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DEBUG LOGS</label>
            <div className="log-container card">
              {logs.map((log, i) => <div key={i} className="log-entry">{log}</div>)}
            </div>
          </div>
        </div>
      </aside>
    </div>
    </>
  )
}

export default App
