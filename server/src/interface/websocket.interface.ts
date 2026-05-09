interface ClientMessage {
  type?: 'new_connection' | 'recurring_connection' | 'query' | 'ping' | 'get_userdata' | 'user_reply' | 'file_contents' | 'tool_function_call' | 'is_service_available' | 'cancel_query';
  userId?: string; // Deprecated: kept for backward compatibility, not used
  authKey?: string; // Required on `recurring_connection`; validated against the dashboard.
  query?: string;
  logs?: string;
  threadId?: string;
  text?: string;
  prompt?: string;
  filePath?: string;
  fileContent?: string;
  args?: any;
  tool_call_id?: string;
  function_name?: string;
  state?: any; 
  serviceId?: string;
  [key: string]: any;
}

interface ServerMessage {
  type: 'welcome' | 'user_assigned' | 'ack' | 'response' | 'error' | 'auth_error' | 'pong' | 'response_complete' | 'response_userdata' | 'progress' | 'ask_user' | 'tool_function_call';
  userId?: string;
  socketId?: string;
  threadId?: string; 
  message?: string;
  data?: any;
  originalQuery?: string;
  ts: number;
  reqId?: string;
  step?: string;
  args?: any;
  tool_call_id?: string;
  function_name?: string;
}

interface ApiResponse {
  [key: string]: any;
}