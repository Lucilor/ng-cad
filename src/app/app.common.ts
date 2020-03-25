import {environment} from "src/environments/environment";

const host = environment.host;
export const apiBasePath = host + "/n/zy/index";

export const paths = {
	"draw-cad": "draw-cad",
	"edit-cad": "edit-cad"
};

export interface Response {
	code: number;
	msg?: string;
	data?: any;
	count?: number;
}

export function checkLogout(response: string, execute = true) {
	if (typeof response === "string") {
		const match = response.replace(/\r\n|\n/g, "").match(/<script>(.*)<\/script>/);
		if (match) {
			if (execute) {
				window.eval(match[1]);
			}
			return true;
		}
	}
	return false;
}
