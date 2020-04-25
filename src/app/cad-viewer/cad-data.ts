import {MathUtils} from "three";
import {index2RGB} from "@lucilor/utils";
import {cloneDeep} from "lodash";

export const enum CadTypes {
	Line = "LINE",
	MText = "MTEXT",
	Dimension = "DIMENSION",
	Arc = "ARC",
	Circle = "CIRCLE",
	LWPolyline = "LWPOLYLINE",
	Hatch = "HATCH"
}

export const cadTypes = {
	line: "LINE",
	mtext: "MTEXT",
	dimension: "DIMENSION",
	arc: "ARC",
	circle: "CIRCLE",
	hatch: "HATCH"
};

export class CadData {
	entities: CadEntities;
	layers: CadLayer[];
	id: string;
	name: string;
	type: string;
	conditions: string[];
	options: CadOption[];
	baseLines: CadBaseLine[];
	jointPoints: CadJointPoint[];
	parent: string;
	partners: CadData[];
	components: Components;
	constructor(data: any = {}) {
		if (typeof data !== "object") {
			throw new Error("Invalid data.");
		}
		this.id = typeof data.id === "string" ? data.id : MathUtils.generateUUID();
		this.name = typeof data.name === "string" ? data.name : "";
		this.type = typeof data.type === "string" ? data.type : "";
		this.layers = [];
		if (typeof data.layers === "object") {
			for (const id in data.layers) {
				this.layers.push(new CadLayer(data.layers[id]));
			}
		}
		this.entities = new CadEntities(data.entities || {}, this.layers);
		this.conditions = Array.isArray(data.conditions) ? data.conditions : [];
		this.options = [];
		if (typeof data.options === "object") {
			for (const key in data.options) {
				this.options.push(new CadOption(key, data.options[key]));
			}
		}
		this.baseLines = [];
		if (Array.isArray(data.baseLines)) {
			data.baseLines.forEach((v) => {
				this.baseLines.push(new CadBaseLine(v));
			});
		}
		this.jointPoints = [];
		if (Array.isArray(data.jointPoints)) {
			data.jointPoints.forEach((v) => {
				this.jointPoints.push(new CadJointPoint(v));
			});
		}
		this.parent = data.parent || "";
		this.partners = [];
		if (Array.isArray(data.partners)) {
			data.partners.forEach((v) => this.partners.push(new CadData(v)));
		}
		this.components = new Components(data.components || {});
	}

	export() {
		const exLayers = {};
		this.layers.forEach((v) => {
			exLayers[v.id] = {id: v.id, color: v._indexColor, name: v.name};
		});
		const result = {
			layers: exLayers,
			entities: this.entities.export(),
			id: this.id,
			name: this.name,
			type: this.type,
			conditions: this.conditions.slice(),
			options: this.options.map((v) => {
				const result = {};
				result[v.name] = v.value;
				return result;
			}),
			baseLines: cloneDeep(this.baseLines),
			jointPoints: cloneDeep(this.jointPoints),
			parent: this.parent,
			partners: this.partners.map((v) => v.export()),
			components: this.components.export()
		};
		return result;
	}

	/**
	 * 100: this.entities
	 * 010: this.partners entities
	 * 001: components.partners entities
	 */
	getAllEntities(mode = 0b111) {
		const result = new CadEntities();
		if (mode & 0b100) {
			result.merge(this.entities);
		}
		if (mode & 0b010) {
			this.partners.forEach((p) => result.merge(p.entities));
		}
		if (mode & 0b001) {
			this.components.data.forEach((c) => result.merge(c.entities));
		}
		return result;
	}

	findEntity(id: string) {
		let result: CadEntity = null;
		result = this.entities.find(id);
		if (result) {
			return result;
		}
		for (const p of this.partners) {
			result = p.entities.find(id);
			if (result) {
				return result;
			}
		}
		for (const c of this.components.data) {
			result = c.entities.find(id);
			if (result) {
				return result;
			}
		}
	}
}

export class CadEntities {
	line: CadLine[] = [];
	circle: CadCircle[] = [];
	arc: CadArc[] = [];
	mtext: CadMtext[] = [];
	dimension: CadDimension[] = [];
	hatch: CadHatch[] = [];
	constructor(data: any = {}, layers: CadLayer[] = []) {
		if (typeof data !== "object") {
			throw new Error("Invalid data.");
		}
		if (typeof data.line === "object") {
			for (const id in data.line) {
				this.line.push(new CadLine(data.line[id], layers));
			}
		}
		if (typeof data.circle === "object") {
			for (const id in data.circle) {
				this.circle.push(new CadCircle(data.circle[id], layers));
			}
		}
		if (typeof data.arc === "object") {
			for (const id in data.arc) {
				this.arc.push(new CadArc(data.arc[id], layers));
			}
		}
		if (typeof data.mtext === "object") {
			for (const id in data.mtext) {
				this.mtext.push(new CadMtext(data.mtext[id], layers));
			}
		}
		if (typeof data.dimension === "object") {
			for (const id in data.dimension) {
				this.dimension.push(new CadDimension(data.dimension[id], layers));
			}
		}
		if (typeof data.hatch === "object") {
			for (const id in data.hatch) {
				this.hatch.push(new CadHatch(data.hatch[id], layers));
			}
		}
	}

	merge(entities: CadEntities) {
		Object.keys(cadTypes).forEach((type) => {
			this[type] = this[type].concat(entities[type]);
		});
	}

	find(id: string) {
		for (const type of Object.keys(cadTypes)) {
			const result = (this[type] as CadEntity[]).find((e) => e.id === id);
			if (result) {
				return result;
			}
		}
		return null;
	}

	filter(fn: (value: CadEntity, index: number, array: CadEntity[]) => boolean) {
		const result = new CadEntities();
		for (const type of Object.keys(cadTypes)) {
			result[type] = (this[type] as CadEntity[]).filter(fn);
		}
		return result;
	}

	export() {
		const result = {line: {}, circle: {}, arc: {}, mtext: {}, dimension: {}, hatch: {}};
		Object.keys(cadTypes).forEach((type) => {
			(this[type] as CadEntity[]).forEach((e) => {
				const ee = JSON.parse(JSON.stringify(e));
				ee.color = ee._indexColor;
				delete ee._indexColor;
				result[type][e.id] = ee;
			});
		});
		return result;
	}
}

export class CadEntity {
	id: string;
	type: string;
	layer: string;
	color: number;
	_indexColor: number;
	constructor(data: any = {}, layers: CadLayer[] = []) {
		if (typeof data !== "object") {
			throw new Error("Invalid data.");
		}
		if (Object.values(cadTypes).includes(data.type)) {
			this.type = data.type;
		} else {
			throw new Error("Unrecognized cad type.");
		}
		this.id = typeof data.id === "string" ? data.id : MathUtils.generateUUID();
		this.layer = typeof data.layer === "string" ? data.layer : "0";
		this.color = 0;
		if (data._indexColor && typeof data.color === "number") {
			this._indexColor = data._indexColor;
			this.color = data.color;
		} else {
			this._indexColor = data.color;
			if (typeof data.color === "number") {
				if (data.color === 256) {
					const layer = layers.find((layer) => layer.name === this.layer);
					if (layer) {
						this.color = layer.color;
					}
				} else {
					this.color = index2RGB(data.color, "number");
				}
			}
		}
	}
}

export class CadLine extends CadEntity {
	start: number[];
	end: number[];
	mingzi?: string;
	qujian?: string;
	gongshi?: string;
	constructor(data?: any, layers: CadLayer[] = []) {
		super(data, layers);
		this.start = Array.isArray(data.start) ? data.start.slice(0, 3) : [0, 0, 0];
		this.end = Array.isArray(data.end) ? data.end.slice(0, 3) : [0, 0, 0];
		this.mingzi = data.mingzi || "";
		this.qujian = data.qujian || "";
		this.gongshi = data.gongshi || "";
	}
}

export class CadCircle extends CadEntity {
	center: number[];
	radius: number;
	constructor(data?: any, layers: CadLayer[] = []) {
		super(data, layers);
		this.center = Array.isArray(data.center) ? data.center.slice(0, 3) : [0, 0, 0];
		this.radius = data.radius || 0;
	}
}

export class CadArc extends CadEntity {
	center: number[];
	radius: number;
	start_angle: number;
	end_angle: number;
	clockwise?: boolean;
	constructor(data?: any, layers: CadLayer[] = []) {
		super(data, layers);
		this.center = Array.isArray(data.center) ? data.center.slice(0, 3) : [0, 0, 0];
		this.radius = data.radius || 0;
		this.start_angle = data.start_angle || 0;
		this.end_angle = data.end_angle || 0;
		this.clockwise = data.clockwise || false;
	}
}

export class CadMtext extends CadEntity {
	insert: number[];
	font_size: number;
	text: string;
	anchor: number[];
	constructor(data?: any, layers: CadLayer[] = []) {
		super(data, layers);
		this.insert = Array.isArray(data.insert) ? data.insert.slice(0, 3) : [0, 0, 0];
		this.font_size = data.font_size || 16;
		this.text = data.text || "";
		this.anchor = Array.isArray(data.anchor) ? data.anchor.slice(0, 2) : [0, 0];
	}
}

export class CadDimension extends CadEntity {
	font_size: number;
	dimstyle: string;
	axis: "x" | "y";
	entity1?: {
		id: string;
		location: "start" | "end" | "center";
	};
	entity2?: {
		id: string;
		location: "start" | "end" | "center";
	};
	distance: number;
	cad1?: string;
	cad2?: string;
	mingzi?: string;
	qujian?: string;
	constructor(data?: any, layers: CadLayer[] = []) {
		super(data, layers);
		this.font_size = data.font_size || 16;
		this.dimstyle = data.dimstyle || "";
		["entity1", "entity2"].forEach((field) => {
			if (data[field]) {
				this[field] = {id: "", location: "center"};
				if (typeof data[field].id === "string") {
					this[field].id = data[field].id;
				}
				if (["start", "end", "center"].includes(data[field].location)) {
					this[field].location = data[field].location;
				}
			} else {
				this[field] = null;
			}
		});
		this.axis = data.axis || "";
		this.distance = data.distance || 16;
		this.cad1 = data.cad1 || "";
		this.cad2 = data.cad2 || "";
		this.mingzi = data.mingzi || "";
		this.qujian = data.qujian || "";
	}
}

export class CadHatch extends CadEntity {
	paths: {
		edges?: {
			start: number[];
			end: number;
		}[];
		vertices?: number[][];
	}[];
	constructor(data?: any, layers: CadLayer[] = []) {
		super(data, layers);
		if (data.paths) {
			this.paths = data.paths;
		} else {
			this.paths = [];
		}
	}
}

export class CadLayer {
	id: string;
	color: number;
	name: string;
	_indexColor: number;
	constructor(data?: any) {
		this.color = index2RGB(data.color, "number") || 0;
		this.name = data.name || "";
		this.id = data.id || "";
		this.color = 0;
		if (data._indexColor && typeof data.color === "number") {
			this._indexColor = data._indexColor;
			this.color = data.color;
		} else {
			this._indexColor = data.color;
			this.color = index2RGB(data.color, "number");
		}
	}

	export() {
		return {id: this.id, color: this._indexColor, name: this.name};
	}
}

export class CadBaseLine {
	name: string;
	idX: string;
	idY: string;
	valueX?: number;
	valueY?: number;
	constructor(data?: any) {
		this.name = data.name || "";
		this.idX = data.idX || "";
		this.idY = data.idY || "";
		this.valueX = data.valueX || null;
		this.valueY = data.valueY || null;
	}
}

export class CadJointPoint {
	name: string;
	valueX?: number;
	valueY?: number;
	constructor(data?: any) {
		this.name = data.name || "";
		this.valueX = data.valueX || null;
		this.valueY = data.valueY || null;
	}
}

export class CadOption {
	name: string;
	value: string;
	constructor(name = "", value = "") {
		this.name = name;
		this.value = value;
	}
}

export interface Connection {
	names: string[];
	lines: string[];
	space: string;
	position: "absolute" | "relative";
	axis?: "x" | "y";
	offset?: {
		x?: number;
		y?: number;
	};
}
export class Components {
	data: CadData[];
	connections: Connection[];
	constructor(data: any = {}) {
		if (typeof data !== "object") {
			throw new Error("Invalid data.");
		}
		this.data = [];
		if (Array.isArray(data.data)) {
			data.data.forEach((d) => {
				this.data.push(new CadData(d));
			});
		}
		this.connections = data.connections || [];
	}

	export() {
		const result = {data: [], connections: this.connections};
		this.data.forEach((v) => result.data.push(v.export()));
		return result;
	}
}
