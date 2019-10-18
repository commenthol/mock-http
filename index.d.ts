declare module 'mock-http' {
	import { ServerResponse, IncomingMessage } from "http"

	export interface MockResponseData {
		headers: object		// Response headers
		trailers: object	// Trailing Response headers
		buffer: Buffer		// Internal buffer represents response body
		timedout: boolean	// If true than `Response.setTimeout` was called.
		ended: boolean		// If true than `Response.end` was called.
	}

	export interface MockResponseOptions {
		highWaterMark?: number	// highWaterMark for Writable Stream
		onEnd?: Function		// `function()` called on "end"
		onFinish?: Function		// `function()` called on "finish" event
	}

	export class Response extends ServerResponse {
		_internal: MockResponseData

		constructor(options?: MockResponseOptions)
	}

	export interface MockRequestOptions {
		highWaterMark?: number	// highWaterMark for Readable Stream
		url?: string			// internal Server URL of the request (should start with "/")
		method?: string			// HTTP method (GET|POST|PUT|DELETE|HEAD|...)
		headers?: object		// HTTP-header object
		buffer?: Buffer			// buffer to send as Readable Stream, e.g. for POST-requests
		emitClose?: number		// emit `close` event after sending num bytes
		remoteAddress?: string	// remoteAddress of connection. Default=127.0.0.1
 		remotePort?: number		// remotePort of connection. Default=51501
	}

	export class Request extends IncomingMessage {
		constructor(url: string)
		constructor(options?: MockRequestOptions)
	}
}
