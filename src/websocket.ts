import { Nudol } from "../index"
import { type Server } from "bun"

export interface WebSocket {
	path: "/ws",
	idleTimeout: number,
	onopen: (ws:any) => any,
	onmessage: (ws:any, message: any) => any,
	onclose: (ws:any, code: any) => any,
}


export function ws( this: Nudol, ws: WebSocket ) {
	this.websocket = ws
}

export function upgrade( this: Nudol, fn: ( server: Server, request: Request ) => Promise<boolean> ) {
	this.upgrade_function = fn
}

