import {
	CadData,
	CadLine,
	CadEntity,
	CadOption,
	CadBaseLine,
	CadJointPoint,
	CadDimension,
	CadArc,
	CadEntities
} from "@app/cad-viewer/cad-data";
import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {Line, Material, Mesh, Vector2, Vector3} from "three";
import {Angle, Arc, Point} from "@lucilor/utils";
import {CadDataService} from "@services/cad-data.service";

interface Mode {
	type: "normal" | "baseLine" | "dimension" | "jointPoint" | "assemble";
	index: number;
}

interface LinesAtPoint {
	point: Vector3;
	tPoint: Vector2;
	lines: CadEntity[];
	selected: boolean;
}

export class CadMenu {
	cad: CadViewer;
	dialog: MatDialog;
	dataService: CadDataService;
	line: CadLine;
	mode: Mode;
	cadIdx = -1;
	cadIdx2 = -1;
	partner: string;
	cadLength = 0;
	readonly accuracy = 1;
	pointsMap: LinesAtPoint[];
	viewMode: "normal" | "partners" | "components" = "normal";

	constructor(dialog: MatDialog, cad: CadViewer, multi = false, dataService: CadDataService) {
		cad.config.selectedColor = null;
		this.cad = cad;
		this.dialog = dialog;
		this.mode = {type: "normal", index: 0};
		this.dataService = dataService;
	}

	initData() {
		const {cad} = this;
		cad.data.components.data.forEach((d) => this.setData(d));
		const start = new Vector2();
		let button: number;
		cad.controls.on("dragstart", (event) => {
			start.set(event.clientX, event.clientY);
			button = event.button;
		});
		cad.controls.on("drag", (event) => {
			if (this.cadIdx >= 0 && (button === 1 || (event.shiftKey && button === 0))) {
				const scale = cad.scale;
				const end = new Vector2(event.clientX, event.clientY);
				const offset = end.sub(start).divide(new Vector2(scale, -scale));
				const data = this.getData(this.cadIdx, -1);
				if (this.viewMode === "components") {
					data.moveComponent(this.getData(), offset.toArray());
				} else {
					data.transform({translate: offset.toArray()});
				}
				cad.render();
				start.set(event.clientX, event.clientY);
			}
		});
		cad.controls.on("dragend", () => (button = NaN));
		cad.controls.on("wheel", () => this.generatePointsMap());
		window.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				this.blur();
			}
		});
	}

	getData(cadIdx = this.cadIdx, cadIdx2 = this.cadIdx2) {
		const {cad, viewMode} = this;
		if (viewMode === "normal" || cadIdx2 < 0) {
			return cad.data.components.data[cadIdx];
		}
		if (viewMode === "partners") {
			return cad.data.components.data[cadIdx].partners[cadIdx2];
		}
		if (viewMode === "components") {
			return cad.data.components.data[cadIdx].components.data[cadIdx2];
		}
	}

	setData(d: CadData) {
		if (d.options.length < 1) {
			this.addOption(0, d);
		}
		if (d.conditions.length < 1) {
			this.addCondition(0, d);
		}
		if (d.baseLines.length < 1) {
			this.addBaseLine(0, d);
		}
		if (d.jointPoints.length < 1) {
			this.addJointPoint(0, d);
		}
		if (d.entities.dimension.length < 1) {
			this.addDimension(0, d);
		}
		d.partners.forEach((v) => this.setData(v));
		d.components.data.forEach((v) => this.setData(v));
	}

	async submit() {
		const {cadIdx, dataService, cad} = this;
		const data = this.getData(cadIdx, -1);
		const resData = (await dataService.postCadData([data]))[0];
		cad.data.components.data[cadIdx] = resData;
		cad.reset();
	}

	addOption(i: number, data = this.getData()) {
		data.options.splice(i + 1, 0, new CadOption());
	}
	async removeOption(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.options;
			if (arr.length === 1) {
				arr[0] = new CadOption();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addCondition(i: number, data = this.getData()) {
		data.conditions.splice(i + 1, 0, "");
	}
	async removeCondition(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.conditions;
			if (arr.length === 1) {
				arr[0] = "";
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addBaseLine(i: number, data = this.getData()) {
		data.baseLines.splice(i + 1, 0, new CadBaseLine());
	}
	async removeBaseLine(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.baseLines;
			if (arr.length === 1) {
				arr[0] = new CadBaseLine();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addJointPoint(i: number, data = this.getData()) {
		data.jointPoints.splice(i + 1, 0, new CadJointPoint());
	}
	async removeJointPoint(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.jointPoints;
			if (arr.length === 1) {
				arr[0] = new CadJointPoint();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addDimension(i: number, data = this.getData()) {
		data.entities.dimension.splice(i + 1, 0, new CadDimension());
	}
	async removeDimension(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.entities.dimension;
			if (arr.length === 1) {
				arr[0] = new CadDimension();
			} else {
				arr.splice(i, 1);
			}
			this.cad.render();
		}
	}

	selectLineBegin(type: Mode["type"], index: number) {
		const cad = this.cad;
		this.mode.type = type;
		this.mode.index = index;
		cad.config.selectedColor = 0x0000ff;
		cad.config.hoverColor = 0x00ffff;
		cad.render();
	}

	selectLineEnd() {
		const {cad} = this;
		this.focus();
		cad.config.selectedColor = null;
		cad.config.hoverColor = null;
		cad.render();
		this.mode.type = "normal";
	}

	generatePointsMap() {
		const data = this.getData();
		if (!data) {
			this.pointsMap = [];
			return;
		}
		const pointsMap: LinesAtPoint[] = [];
		const addToMap = (point: Vector3, line: CadEntity) => {
			const linesAtPoint = pointsMap.find((v) => v.point.distanceTo(point) <= this.accuracy);
			if (linesAtPoint) {
				linesAtPoint.lines.push(line);
			} else {
				pointsMap.push({point, lines: [line], tPoint: this.cad.translatePoint(point), selected: false});
			}
		};
		data.entities.line.forEach((entity) => {
			const {start, end} = entity;
			if (start.distanceTo(end) > 0) {
				addToMap(start, entity);
				addToMap(end, entity);
			}
		});
		data.entities.arc.forEach((entity) => {
			const start = new Angle(entity.start_angle, "deg");
			const end = new Angle(entity.end_angle, "deg");
			const arc = new Arc(new Point(entity.center.x, entity.center.y), entity.radius, start, end, entity.clockwise);
			if (arc.length > 0) {
				addToMap(new Vector3(arc.startPoint.x, arc.startPoint.y), entity);
				addToMap(new Vector3(arc.endPoint.x, arc.endPoint.y), entity);
			}
		});
		this.pointsMap = pointsMap;
	}

	findAdjacentLines(entity: CadEntity, point?: Vector3): CadEntity[] {
		if (!point && entity instanceof CadLine) {
			const adjStart = this.findAdjacentLines(entity, entity.start);
			const adjEnd = this.findAdjacentLines(entity, entity.end);
			return [...adjStart, ...adjEnd];
		}
		const pal = this.pointsMap.find((v) => v.point.distanceTo(point) <= this.accuracy);
		if (pal) {
			const lines = pal.lines.filter((v) => v.id !== entity.id);
			return lines;
		}
		return [];
	}

	findAllAdjacentLines(entity: CadEntity, point: Vector3) {
		const entities = new CadEntities();
		while (entity && point) {
			entity = this.findAdjacentLines(entity, point)[0];
			if (entity) {
				if (entity instanceof CadLine) {
					entities.line.push(entity);
					const {start, end} = entity;
					if (start.distanceTo(point) <= this.accuracy) {
						point = end;
					} else if (end.distanceTo(point) < this.accuracy) {
						point = start;
					} else {
						point = null;
					}
				}
				if (entity instanceof CadArc) {
					entities.arc.push(entity);
					const starta = new Angle(entity.start_angle, "deg");
					const enda = new Angle(entity.end_angle, "deg");
					const arc = new Arc(new Point(entity.center.x, entity.center.y), entity.radius, starta, enda, entity.clockwise);
					const start = new Vector3(arc.startPoint.x, arc.startPoint.y);
					const end = new Vector3(arc.endPoint.x, arc.endPoint.y);
					if (start.distanceTo(point) <= this.accuracy) {
						point = end;
					} else if (end.distanceTo(point) <= this.accuracy) {
						point = start;
					} else {
						point = null;
					}
				}
			}
		}
		return entities;
	}

	focus(cadIdx = this.cadIdx, cadIdx2 = this.cadIdx2, viewMode: CadMenu["viewMode"] = this.viewMode) {
		this.cadIdx = cadIdx;
		this.cadIdx2 = cadIdx2;
		this.viewMode = viewMode;
		const cad = this.cad;
		if (cadIdx2 >= 0) {
			cad.data.components.data.forEach((d, i) => {
				if (cadIdx === i || viewMode === "normal") {
					d.show();
				} else {
					d.hide();
				}
			});
			cad.render();
		}
		if (viewMode === "normal") {
			const data = this.getData();
			cad.data.components.data.forEach((d) => {
				const opacity = d.id === data.id ? 1 : 0.3;
				const selectable = d.id === data.id ? true : false;
				cad.traverse((o) => {
					o.userData.selectable = selectable;
					const m = (o as Mesh).material as Material;
					m.setValues({opacity, transparent: true});
				}, d.getAllEntities());
			});
		} else {
			const data = this.getData(this.cadIdx, -1);
			if (cadIdx2 >= 0) {
				let subData: CadData[];
				if (viewMode === "partners") {
					subData = data.partners;
				}
				if (viewMode === "components") {
					subData = data.components.data;
				}
				subData.forEach((d, i) => {
					const opacity = i === cadIdx2 ? 1 : 0.3;
					const selectable = i === cadIdx2 ? true : false;
					cad.traverse((o) => {
						o.userData.selectable = selectable;
						const m = (o as Mesh).material as Material;
						m.setValues({opacity, transparent: true});
					}, d.getAllEntities());
				});
				cad.traverse((o) => {
					o.userData.selectable = false;
					const m = (o as Mesh).material as Material;
					m.setValues({opacity: 0.3, transparent: true});
				}, data.entities);
			} else {
				cad.traverse((o) => {
					o.userData.selectable = true;
					const m = (o as Mesh).material as Material;
					m.setValues({opacity: 1});
				}, data.getAllEntities());
			}
		}
		cad.controls.config.dragAxis = "";
		this.updateCadLength();
	}

	blur(cadIdx = -1, cadIdx2 = -1) {
		if (this.cadIdx2 >= 0) {
			this.cadIdx2 = cadIdx2;
		} else if (this.cadIdx >= 0) {
			this.cadIdx = cadIdx;
		}
		this.cad.traverse((o) => {
			o.userData.selectable = true;
			const m = (o as Mesh).material as Material;
			m.setValues({opacity: 1});
		});
		this.cad.controls.config.dragAxis = "xy";
	}

	updateCadLength() {
		const data = this.getData();
		if (data) {
			this.cadLength = 0;
			const entities = data.entities;
			entities.line.forEach((e) => (this.cadLength += e.length));
			entities.arc.forEach((e) => {
				const {radius, start_angle, end_angle} = e;
				const l = ((Math.abs(start_angle - end_angle) % 360) * Math.PI * radius) / 180;
				this.cadLength += l;
			});
			this.cadLength = Number(this.cadLength.toFixed(2));
		}
	}

	private _beforeRemove() {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		return new Promise((r) => {
			ref.afterClosed().subscribe((res) => {
				r(res);
			});
		});
	}
}
