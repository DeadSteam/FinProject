/**
 * WebSocket Server Synchronization Hook
 * 
 * Features:
 * - Real-time bidirectional synchronization
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Heartbeat/ping-pong for connection health
 * - Room-based subscriptions for targeted updates
 * - Conflict detection and resolution
 * - Performance monitoring and debugging
 * 
 * @module useServerSync
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch } from '../context/AppStateContext';

// WebSocket connection states
const WS_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  CLOSED: 'closed'
};

// Message types for WebSocket communication
const MESSAGE_TYPES = {
  // System messages
  HEARTBEAT: 'heartbeat',
  PING: 'ping',
  PONG: 'pong',
  AUTH: 'auth',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  
  // Data synchronization
  DATA_UPDATE: 'data_update',
  DATA_CREATE: 'data_create',
  DATA_DELETE: 'data_delete',
  BATCH_UPDATE: 'batch_update',
  
  // Conflict resolution
  CONFLICT_DETECTED: 'conflict_detected',
  CONFLICT_RESOLVED: 'conflict_resolved',
  VERSION_MISMATCH: 'version_mismatch',
  
  // User presence
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_TYPING: 'user_typing',
  
  // Errors
  ERROR: 'error',
  RATE_LIMIT: 'rate_limit'
};

// Default configuration with safe environment checks
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && window.location.hostname === 'localhost';

// Импортируем универсальную функцию для получения WebSocket URL
import { getWebSocketUrl } from '../config/api.js';

// Автоматически определяем URL WebSocket если не передан через конфиг
const getDefaultWsUrl = () => {
  if (!isBrowser) return getWebSocketUrl();
  return getWebSocketUrl();
};

// Безопасный доступ к process.env (может отсутствовать в браузере)
const safeProcessEnv = (key, fallback = undefined) => {
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }
  return fallback;
};

const DEFAULT_CONFIG = {
  // Connection settings
  url: safeProcessEnv('REACT_APP_WS_URL', getDefaultWsUrl()),
  protocols: [],
  reconnectInterval: 1000, // Start with 1 second
  maxReconnectInterval: 30000, // Max 30 seconds
  reconnectDecay: 1.5, // Exponential backoff multiplier
  maxReconnectAttempts: 10,
  timeoutInterval: 5000, // 5 seconds timeout
  
  // Heartbeat settings
  heartbeatInterval: 30000, // 30 seconds
  pongTimeout: 5000, // 5 seconds to receive pong
  
  // Message settings
  enableCompression: true,
  maxMessageSize: 1024 * 1024, // 1MB
  queueSize: 1000, // Max queued messages
  
  // Authentication
  authToken: null,
  enableAuth: true,
  
  // Debug settings
  enableLogging: safeProcessEnv('NODE_ENV', isLocalhost ? 'development' : 'production') === 'development',
  enableMetrics: safeProcessEnv('NODE_ENV', isLocalhost ? 'development' : 'production') === 'development'
};

/**
 * WebSocket Server Synchronization Hook
 * 
 * @param {Object} config - Configuration options
 * @returns {Object} WebSocket connection interface
 */
export const useServerSync = (config = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const dispatch = useAppDispatch();
  
  // WebSocket connection state
  const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionMetrics, setConnectionMetrics] = useState({
    connected: false,
    reconnectCount: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastHeartbeat: null,
    latency: null,
    uptime: 0,
    errors: 0
  });

  // Refs for persistent state
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const pongTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const subscriptionsRef = useRef(new Set());
  const reconnectAttemptsRef = useRef(0);
  const connectionStartTimeRef = useRef(null);
  const lastPingTimeRef = useRef(null);

  // Event handlers refs
  const messageHandlersRef = useRef(new Map());
  const errorHandlersRef = useRef([]);
  const connectionHandlersRef = useRef([]);

  /**
   * Log debug messages if logging is enabled
   */
  const log = useCallback((level, message, data = null) => {
    if (!mergedConfig.enableLogging || process.env.NODE_ENV !== 'development') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [WebSocket:${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'debug':
      default:
        console.log(logMessage, data);
        break;
    }
  }, [mergedConfig.enableLogging]);

  /**
   * Update connection metrics
   */
  const updateMetrics = useCallback((updates) => {
    if (!mergedConfig.enableMetrics) return;
    
    setConnectionMetrics(prev => {
      const newMetrics = { ...prev, ...updates };
      
      // Calculate uptime if connected
      if (newMetrics.connected && connectionStartTimeRef.current) {
        newMetrics.uptime = Date.now() - connectionStartTimeRef.current;
      }
      
      return newMetrics;
    });
  }, [mergedConfig.enableMetrics]);

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback((type, payload = {}, options = {}) => {
    const message = {
      type,
      payload,
      timestamp: Date.now(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...options
    };

    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > mergedConfig.maxMessageSize) {
      log('error', 'Message too large', { size: messageSize, maxSize: mergedConfig.maxMessageSize });
      return false;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        updateMetrics({ messagesSent: connectionMetrics.messagesSent + 1 });
        log('debug', 'Message sent', { type, payload });
        return true;
      } catch (error) {
        log('error', 'Failed to send message', { error, message });
        return false;
      }
    } else {
      // Queue message for later sending
      if (messageQueueRef.current.length < mergedConfig.queueSize) {
        messageQueueRef.current.push(message);
        log('debug', 'Message queued', { type, queueSize: messageQueueRef.current.length });
        return 'queued';
      } else {
        log('warn', 'Message queue full, dropping message', { type });
        return false;
      }
    }
  }, [mergedConfig.maxMessageSize, mergedConfig.queueSize, connectionMetrics.messagesSent, log, updateMetrics]);

  /**
   * Process queued messages
   */
  const processMessageQueue = useCallback(() => {
    const queue = messageQueueRef.current;
    messageQueueRef.current = [];
    
    queue.forEach(message => {
      sendMessage(message.type, message.payload, { 
        retransmission: true,
        originalTimestamp: message.timestamp 
      });
    });
    
    if (queue.length > 0) {
      log('info', `Processed ${queue.length} queued messages`);
    }
  }, [sendMessage, log]);

  /**
   * Handle incoming messages
   */
  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      const { type, payload, timestamp, id } = message;
      
      setLastMessage(message);
      updateMetrics({ messagesReceived: connectionMetrics.messagesReceived + 1 });
      
      log('debug', 'Message received', { type, payload });

      // Handle system messages
      switch (type) {
        case MESSAGE_TYPES.PONG:
          if (lastPingTimeRef.current) {
            const latency = Date.now() - lastPingTimeRef.current;
            updateMetrics({ latency, lastHeartbeat: Date.now() });
            lastPingTimeRef.current = null;
          }
          clearTimeout(pongTimeoutRef.current);
          break;

        case MESSAGE_TYPES.PING:
          sendMessage(MESSAGE_TYPES.PONG, { timestamp: Date.now() });
          break;

        case MESSAGE_TYPES.ERROR:
          log('error', 'Server error received', payload);
          errorHandlersRef.current.forEach(handler => handler(payload));
          break;

        case MESSAGE_TYPES.RATE_LIMIT:
          log('warn', 'Rate limit warning', payload);
          break;

        case MESSAGE_TYPES.DATA_UPDATE:
        case MESSAGE_TYPES.DATA_CREATE:
        case MESSAGE_TYPES.DATA_DELETE:
        case MESSAGE_TYPES.BATCH_UPDATE:
          // Dispatch to app state
          dispatch({
            type: `SERVER_SYNC_${type.toUpperCase()}`,
            payload: {
              ...payload,
              serverId: id,
              serverTimestamp: timestamp,
              syncType: type
            }
          });
          break;

        case MESSAGE_TYPES.CONFLICT_DETECTED:
          dispatch({
            type: 'SERVER_CONFLICT_DETECTED',
            payload
          });
          break;

        case MESSAGE_TYPES.VERSION_MISMATCH:
          dispatch({
            type: 'SERVER_VERSION_MISMATCH',
            payload
          });
          break;

        case MESSAGE_TYPES.USER_JOINED:
        case MESSAGE_TYPES.USER_LEFT:
        case MESSAGE_TYPES.USER_TYPING:
          dispatch({
            type: `SERVER_USER_${type.split('_')[1]}`,
            payload
          });
          break;

        default:
          // Custom message handlers
          const handlers = messageHandlersRef.current.get(type);
          if (handlers) {
            handlers.forEach(handler => handler(payload, message));
          } else {
            log('warn', 'Unhandled message type', { type, payload });
          }
          break;
      }
    } catch (error) {
      log('error', 'Failed to parse message', { error, data: event.data });
      updateMetrics({ errors: connectionMetrics.errors + 1 });
    }
  }, [dispatch, log, updateMetrics, connectionMetrics.messagesReceived, connectionMetrics.errors, sendMessage]);

  /**
   * Start heartbeat mechanism
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        lastPingTimeRef.current = Date.now();
        sendMessage(MESSAGE_TYPES.PING, { timestamp: lastPingTimeRef.current });
        
        // Set timeout for pong response
        pongTimeoutRef.current = setTimeout(() => {
          log('warn', 'Pong timeout, connection may be dead');
          if (wsRef.current) {
            wsRef.current.close();
          }
        }, mergedConfig.pongTimeout);
      }
    }, mergedConfig.heartbeatInterval);
  }, [mergedConfig.heartbeatInterval, mergedConfig.pongTimeout, sendMessage, log]);

  /**
   * Stop heartbeat mechanism
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      log('info', 'Already connected');
      return;
    }

    log('info', 'Connecting to WebSocket server', { url: mergedConfig.url });
    setConnectionState(WS_STATES.CONNECTING);

    try {
      wsRef.current = new WebSocket(mergedConfig.url, mergedConfig.protocols);
      
      wsRef.current.onopen = () => {
        log('info', 'WebSocket connected');
        setConnectionState(WS_STATES.CONNECTED);
        connectionStartTimeRef.current = Date.now();
        reconnectAttemptsRef.current = 0;
        
        updateMetrics({
          connected: true,
          reconnectCount: connectionMetrics.reconnectCount + (reconnectAttemptsRef.current > 0 ? 1 : 0)
        });

        // Authenticate if enabled
        if (mergedConfig.enableAuth && mergedConfig.authToken) {
          sendMessage(MESSAGE_TYPES.AUTH, { token: mergedConfig.authToken });
        }

        // Resubscribe to rooms
        subscriptionsRef.current.forEach(room => {
          sendMessage(MESSAGE_TYPES.SUBSCRIBE, { room });
        });

        // Process queued messages
        processMessageQueue();

        // Start heartbeat
        startHeartbeat();

        // Notify connection handlers
        connectionHandlersRef.current.forEach(handler => handler(true));
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        log('info', 'WebSocket connection closed', { code: event.code, reason: event.reason });
        setConnectionState(WS_STATES.DISCONNECTED);
        connectionStartTimeRef.current = null;
        
        updateMetrics({
          connected: false,
          uptime: 0
        });

        stopHeartbeat();
        
        // Notify connection handlers
        connectionHandlersRef.current.forEach(handler => handler(false));

        // Auto-reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < mergedConfig.maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttemptsRef.current >= mergedConfig.maxReconnectAttempts) {
          log('error', 'Max reconnection attempts reached');
          setConnectionState(WS_STATES.ERROR);
        }
      };

      wsRef.current.onerror = (error) => {
        log('error', 'WebSocket error', error);
        setConnectionState(WS_STATES.ERROR);
        updateMetrics({ errors: connectionMetrics.errors + 1 });
        
        errorHandlersRef.current.forEach(handler => handler(error));
      };

    } catch (error) {
      log('error', 'Failed to create WebSocket connection', error);
      setConnectionState(WS_STATES.ERROR);
      updateMetrics({ errors: connectionMetrics.errors + 1 });
    }
  }, [
    mergedConfig.url, 
    mergedConfig.protocols, 
    mergedConfig.enableAuth, 
    mergedConfig.authToken,
    mergedConfig.maxReconnectAttempts,
    connectionMetrics.reconnectCount,
    connectionMetrics.errors,
    log, 
    updateMetrics, 
    sendMessage, 
    processMessageQueue, 
    startHeartbeat, 
    stopHeartbeat, 
    handleMessage
  ]);

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(
      mergedConfig.reconnectInterval * Math.pow(mergedConfig.reconnectDecay, reconnectAttemptsRef.current),
      mergedConfig.maxReconnectInterval
    );

    reconnectAttemptsRef.current++;
    setConnectionState(WS_STATES.RECONNECTING);
    
    log('info', `Scheduling reconnection attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [mergedConfig.reconnectInterval, mergedConfig.reconnectDecay, mergedConfig.maxReconnectInterval, log, connect]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    log('info', 'Disconnecting from WebSocket server');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setConnectionState(WS_STATES.CLOSED);
    updateMetrics({ connected: false, uptime: 0 });
  }, [log, stopHeartbeat, updateMetrics]);

  /**
   * Subscribe to a room/channel
   */
  const subscribe = useCallback((room, callback = null) => {
    subscriptionsRef.current.add(room);
    
    if (callback) {
      const handlers = messageHandlersRef.current.get(`room_${room}`) || [];
      handlers.push(callback);
      messageHandlersRef.current.set(`room_${room}`, handlers);
    }

    if (connectionState === WS_STATES.CONNECTED) {
      sendMessage(MESSAGE_TYPES.SUBSCRIBE, { room });
    }

    log('info', 'Subscribed to room', { room });
  }, [connectionState, sendMessage, log]);

  /**
   * Unsubscribe from a room/channel
   */
  const unsubscribe = useCallback((room) => {
    subscriptionsRef.current.delete(room);
    messageHandlersRef.current.delete(`room_${room}`);

    if (connectionState === WS_STATES.CONNECTED) {
      sendMessage(MESSAGE_TYPES.UNSUBSCRIBE, { room });
    }

    log('info', 'Unsubscribed from room', { room });
  }, [connectionState, sendMessage, log]);

  /**
   * Add message handler for specific message type
   */
  const addMessageHandler = useCallback((type, handler) => {
    const handlers = messageHandlersRef.current.get(type) || [];
    handlers.push(handler);
    messageHandlersRef.current.set(type, handlers);

    return () => {
      const currentHandlers = messageHandlersRef.current.get(type) || [];
      const updatedHandlers = currentHandlers.filter(h => h !== handler);
      if (updatedHandlers.length > 0) {
        messageHandlersRef.current.set(type, updatedHandlers);
      } else {
        messageHandlersRef.current.delete(type);
      }
    };
  }, []);

  /**
   * Add error handler
   */
  const addErrorHandler = useCallback((handler) => {
    errorHandlersRef.current.push(handler);

    return () => {
      errorHandlersRef.current = errorHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  /**
   * Add connection state change handler
   */
  const addConnectionHandler = useCallback((handler) => {
    connectionHandlersRef.current.push(handler);

    return () => {
      connectionHandlersRef.current = connectionHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Only connect once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [disconnect]);

  // Public API
  return useMemo(() => ({
    // Connection state
    connectionState,
    isConnected: connectionState === WS_STATES.CONNECTED,
    isConnecting: connectionState === WS_STATES.CONNECTING,
    isReconnecting: connectionState === WS_STATES.RECONNECTING,
    
    // Connection control
    connect,
    disconnect,
    
    // Messaging
    sendMessage,
    lastMessage,
    
    // Subscriptions
    subscribe,
    unsubscribe,
    subscriptions: Array.from(subscriptionsRef.current),
    
    // Event handlers
    addMessageHandler,
    addErrorHandler,
    addConnectionHandler,
    
    // Metrics and debugging
    metrics: connectionMetrics,
    queueSize: messageQueueRef.current.length,
    
    // Configuration
    config: mergedConfig
  }), [
    connectionState,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    subscribe,
    unsubscribe,
    addMessageHandler,
    addErrorHandler,
    addConnectionHandler,
    connectionMetrics,
    mergedConfig
  ]);
};

export default useServerSync; 