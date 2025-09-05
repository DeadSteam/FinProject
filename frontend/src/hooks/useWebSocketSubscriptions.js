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
import useWebSocketConnection from './useWebSocketConnection';
import useWebSocketMessaging from './useWebSocketMessaging';
import useWebSocketHeartbeat from './useWebSocketHeartbeat';

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

  // Logging and metrics
  const log = useCallback((level, message, data = null) => {
    if (!mergedConfig.enableLogging) return;
    console[level](`[WS:${level.toUpperCase()}] ${message}`, data);
  }, [mergedConfig.enableLogging]);

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
  const updateMetrics = useCallback((updates) => {
    if (!mergedConfig.enableMetrics) return;
    setConnectionMetrics(prev => ({ ...prev, ...updates }));
  }, [mergedConfig.enableMetrics]);

  // Connection handling
  const { wsRef, connectionState, connect, disconnect } = useWebSocketConnection(
    mergedConfig,
    handleOpen,
    handleClose,
    handleError
  );
  
  // Messaging handling
  const { sendMessage, processMessageQueue, registerMessageHandler, handleMessage } = useWebSocketMessaging(
    wsRef,
    mergedConfig,
    log,
    updateMetrics
  );

  const { startHeartbeat, stopHeartbeat, handlePong } = useWebSocketHeartbeat(
    wsRef, 
    sendMessage, 
    mergedConfig, 
    log, 
    () => disconnect()
  );

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = handleMessage;
    }
  }, [wsRef.current, handleMessage]);

  // Example of using heartbeat
  const handleOpen = useCallback(() => {
    log('info', 'WebSocket connected');
    startHeartbeat();
    // ...
  }, [log, startHeartbeat]);

  const handleClose = useCallback(() => {
    log('info', 'WebSocket disconnected');
    stopHeartbeat();
    // ...
  }, [log, stopHeartbeat]);

  // Register pong handler
  useEffect(() => {
    registerMessageHandler('pong', handlePong);
  }, [registerMessageHandler, handlePong]);

  // Heartbeat, subscriptions, and other logic will be refactored next...

  return {
    connectionState,
    connect,
    disconnect,
    sendMessage,
    registerMessageHandler,
    connectionMetrics,
  };
};

export default useServerSync; 