import {environment} from "src/environments/environment";
import {CadOption} from "@lucilor/cad-viewer";

const host = environment.host;
export const apiBasePath = host + "/n/zy/index";

export const paths = {
	"draw-cad": "draw-cad"
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

function _obj2Arr(obj: object) {
	if (typeof obj !== "object") {
		return obj;
	}
	const arr = [];
	for (const key in obj) {
		const v = {...obj[key], id: key};
		arr.push(v);
	}
	return arr;
}

function _arr2Obj(arr: any[]) {
	if (!Array.isArray(arr)) {
		return arr;
	}
	const obj = {};
	arr.forEach(v => {
		obj[v.id] = v;
		delete v.id;
	});
	return obj;
}

export function transformData(data: any, to: "array" | "object") {
	if (typeof data !== "object" || Array.isArray(data)) {
		console.warn("Invalid argument: data.");
		return {};
	}
	if (!["array", "object"].includes(to)) {
		console.warn("Invalid argument: to.");
		return {};
	}
	const list = ["entities", "layers", "lineText", "globalText"];
	if (to === "array") {
		for (const key of list) {
			if (data[key]) {
				data[key] = _obj2Arr(data[key]);
			}
		}
		const options: CadOption[] = [];
		for (const key in data.options) {
			options.push({name: key, value: data.options[key]});
		}
		data.options = options;
	}
	if (to === "object") {
		for (const key of list) {
			if (data[key]) {
				data[key] = _arr2Obj(data[key]);
			}
		}
		const options = {};
		(data.options as CadOption[]).forEach(o => {
			if (o.name) {
				options[o.name] = o.value;
			}
		});
		data.options = options;
	}
	data.partners?.forEach(v => transformData(v, to));
	data.components?.data.forEach(v => transformData(v, to));
	return data;
}
