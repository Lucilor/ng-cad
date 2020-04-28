import {MathUtils, Vector2, ArcCurve} from "three";
import {index2RGB, Line, Point, Angle, Arc} from "@lucilor/utils";
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

export interface CadTransform {
	translate?: number[];
	flip?: {vertical?: boolean; horizontal?: boolean; anchor?: number[]};
	rotate?: {angle?: number; anchor?: number[]};
}

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
	visible = true;
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
	getAllEntities(mode = 0b111, visibleOnly = true) {
		const result = new CadEntities();
		if (mode & 0b100) {
			result.merge(this.entities);
		}
		if (mode & 0b010) {
			this.partners.forEach((p) => {
				if (!visibleOnly || p.visible) {
					result.merge(p.entities);
				}
			});
		}
		if (mode & 0b001) {
			this.components.data.forEach((c) => {
				if (!visibleOnly || c.visible) {
					result.merge(c.entities);
				}
			});
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

	clone() {
		return new CadData(this.export());
	}

	private _mergeArray(arr1: any[], arr2: any[], field?: string) {
		if (field) {
			const keys = arr1.map((v) => v[field]);
			arr2.forEach((v) => {
				const idx = keys.indexOf(v[field]);
				if (idx === -1) {
					arr1.push(v);
				} else {
					arr1[idx] = v;
				}
			});
		} else {
			arr1 = Array.from(new Set(arr1.concat(arr2)));
		}
		return arr1;
	}

	merge(data: CadData) {
		this.layers = this.layers.concat(data.layers);
		this.entities.merge(data.entities);
		this.conditions = this._mergeArray(this.conditions, data.conditions);
		this.options = this._mergeArray(this.options, data.options, "name");
		this.partners = this._mergeArray(this.partners, data.partners, "id");
		this.jointPoints = this._mergeArray(this.jointPoints, data.jointPoints, "name");
		this.baseLines = this._mergeArray(this.baseLines, data.baseLines, "name");
		this.components.connections = this._mergeArray(this.components.connections, data.components.connections);
		this.components.data = this._mergeArray(this.components.data, data.components.data, "id");
		return this;
	}

	transform({translate, flip, rotate}: CadTransform) {
		this.entities.transform({translate, flip, rotate});
		this.baseLines.forEach((v) => {
			const point = new Point(v.valueX, v.valueY);
			if (translate) {
				point.add(translate[0], translate[1]);
				point.add(translate[0], translate[1]);
			}
			if (flip) {
				point.flip(flip.vertical, flip.horizontal, new Point(flip.anchor));
			}
			if (rotate) {
				point.rotate(rotate.angle, new Point(rotate.anchor));
			}
			v.valueX = point.x;
			v.valueY = point.y;
		});
		this.jointPoints.forEach((v) => {
			const point = new Point(v.valueX, v.valueY);
			if (translate) {
				point.add(translate[0], translate[1]);
				point.add(translate[0], translate[1]);
			}
			if (flip) {
				point.flip(flip.vertical, flip.horizontal, new Point(flip.anchor));
			}
			if (rotate) {
				point.rotate(rotate.angle, new Point(rotate.anchor));
			}
			v.valueX = point.x;
			v.valueY = point.y;
		});
	}

	addComponent(component: CadData) {
		const rect1 = this.getAllEntities().getBounds();
		const rect2 = component.entities.getBounds();
		const offset1 = [rect1.x - rect2.x, rect1.y - rect2.y];
		offset1[0] += (rect1.width + rect2.width) / 2 + 15;
		// offset1[1] += (rect1.height - rect2.height) / 2;
		component.transform({translate: offset1});
		const data = this.components.data;
		const prev = data.findIndex((v) => v.name === component.name);
		if (prev > -1) {
			data[prev] = component;
		} else {
			data.push(component);
		}
		return this;
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

	transform(params: CadTransform) {
		Object.keys(cadTypes).forEach((v) => {
			(this[v] as CadEntity[]).forEach((e) => e.transform(params));
		});
	}

	getBounds() {
		let maxX = -Infinity;
		let minX = Infinity;
		let maxY = -Infinity;
		let minY = Infinity;
		const calc = (point: Vector2) => {
			maxX = Math.max(point.x, maxX);
			maxY = Math.max(point.y, maxY);
			minX = Math.min(point.x, minX);
			minY = Math.min(point.y, minY);
		};
		this.line.forEach((entity) => {
			const {start, end} = entity;
			calc(new Vector2(...start));
			calc(new Vector2(...end));
		});
		this.arc.forEach((entity) => {
			const arcEntity = entity;
			const {center, radius, start_angle, end_angle, clockwise} = arcEntity;
			const arc = new ArcCurve(
				center[0],
				center[1],
				radius,
				MathUtils.degToRad(start_angle),
				MathUtils.degToRad(end_angle),
				clockwise
			);
			calc(arc.getPoint(0));
			calc(arc.getPoint(1));
		});
		this.circle.forEach((entity) => {
			const {center, radius} = entity;
			calc(new Vector2(...center).addScalar(radius));
			calc(new Vector2(...center).subScalar(radius));
		});
		if (!isFinite(maxX + minX) || !isFinite(maxY + minY)) {
			return {x: 0, y: 0, width: 0, height: 0};
		}
		return {x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY};
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
			throw new Error(`Unrecognized cad type: ${data.type}`);
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

	transform({translate, flip, rotate}: CadTransform) {}
}

export class CadLine extends CadEntity {
	start: number[];
	end: number[];
	mingzi?: string;
	qujian?: string;
	gongshi?: string;
	constructor(data: any = {type: cadTypes.line}, layers: CadLayer[] = []) {
		super(data, layers);
		this.start = Array.isArray(data.start) ? data.start.slice(0, 3) : [0, 0, 0];
		this.end = Array.isArray(data.end) ? data.end.slice(0, 3) : [0, 0, 0];
		this.mingzi = data.mingzi || "";
		this.qujian = data.qujian || "";
		this.gongshi = data.gongshi || "";
	}

	transform({translate, flip, rotate}: CadTransform) {
		const line = new Line(new Point(this.start), new Point(this.end));
		if (translate) {
			line.start.add(translate[0], translate[1]);
			line.end.add(translate[0], translate[1]);
		}
		if (flip) {
			line.flip(flip.vertical, flip.horizontal, new Point(flip.anchor));
		}
		if (rotate) {
			line.rotate(rotate.angle, new Point(rotate.anchor));
		}
		this.start = line.start.toArray();
		this.end = line.end.toArray();
	}
}

export class CadCircle extends CadEntity {
	center: number[];
	radius: number;
	constructor(data: any = {type: cadTypes.circle}, layers: CadLayer[] = []) {
		super(data, layers);
		this.center = Array.isArray(data.center) ? data.center.slice(0, 3) : [0, 0, 0];
		this.radius = data.radius || 0;
	}

	transform({translate, flip, rotate}: CadTransform) {
		if (translate) {
			this.center[0] += translate[0];
			this.center[1] += translate[1];
		}
		if (flip) {
			this.center = new Point(this.center).flip(flip.vertical, flip.horizontal, new Point(flip.anchor)).toArray();
		}
		if (rotate) {
			this.center = new Point(this.center).rotate(rotate.angle, new Point(rotate.anchor)).toArray();
		}
	}
}

export class CadArc extends CadEntity {
	center: number[];
	radius: number;
	start_angle: number;
	end_angle: number;
	clockwise?: boolean;
	constructor(data: any = {type: cadTypes.arc}, layers: CadLayer[] = []) {
		super(data, layers);
		this.center = Array.isArray(data.center) ? data.center.slice(0, 3) : [0, 0, 0];
		this.radius = data.radius || 0;
		this.start_angle = data.start_angle || 0;
		this.end_angle = data.end_angle || 0;
		this.clockwise = data.clockwise || false;
	}

	transform({translate, flip, rotate}: CadTransform) {
		const start = new Angle(this.start_angle, "deg");
		const end = new Angle(this.end_angle, "deg");
		const arc = new Arc(new Point(this.center), this.radius, start, end, this.clockwise);
		if (translate) {
			arc.center.add(translate[0], translate[1]);
		}
		if (flip) {
			arc.flip(flip.vertical, flip.horizontal, new Point(flip.anchor));
		}
		if (rotate) {
			arc.rotate(rotate.angle, new Point(rotate.anchor));
		}
		this.center = arc.center.toArray();
		this.start_angle = arc.startAngle.deg;
		this.end_angle = arc.endAngle.deg;
		this.clockwise = arc.clockwise;
	}
}

export class CadMtext extends CadEntity {
	insert: number[];
	font_size: number;
	text: string;
	anchor: number[];
	constructor(data: any = {type: cadTypes.mtext}, layers: CadLayer[] = []) {
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
	constructor(data: any = {type: cadTypes.dimension}, layers: CadLayer[] = []) {
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
	constructor(data: any = {type: cadTypes.hatch}, layers: CadLayer[] = []) {
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
	constructor(data: any = {}) {
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
	constructor(data: any = {}) {
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
	constructor(data: any = {}) {
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
