import express from 'express';
import { registerRoutes } from '../../server/routes';

const app = express();
app.use(express.json());

// Register all routes
registerRoutes(app);

export const handler = async (event: any, context: any) => {
  const { path, httpMethod, headers, body, queryStringParameters } = event;
  
  // Create a mock request/response for Express
  const req = {
    method: httpMethod,
    url: path.replace('/.netlify/functions/api', ''),
    headers,
    body: body ? JSON.parse(body) : {},
    query: queryStringParameters || {},
  };

  let statusCode = 200;
  let responseBody = '';
  let responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseBody = JSON.stringify(data);
      return res;
    },
    send: (data: any) => {
      responseBody = typeof data === 'string' ? data : JSON.stringify(data);
      return res;
    },
    setHeader: (key: string, value: string) => {
      responseHeaders[key] = value;
      return res;
    }
  };

  try {
    // Handle the request through Express
    await new Promise((resolve, reject) => {
      app(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });
  } catch (error) {
    console.error('Netlify function error:', error);
    statusCode = 500;
    responseBody = JSON.stringify({ error: 'Internal server error' });
  }

  return {
    statusCode,
    headers: responseHeaders,
    body: responseBody,
  };
};