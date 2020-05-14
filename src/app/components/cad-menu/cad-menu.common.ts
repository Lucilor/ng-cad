import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {Material, Mesh, Vector2} from "three";
import {CadDataService} from "@services/cad-data.service";
import {CAD_TYPES} from "@src/app/cad-viewer/cad-data/cad-types";
import {CadEntity} from "@src/app/cad-viewer/cad-data/cad-entity";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {environment} from "@src/environments/environment";

interface Mode {
	type: "normal" | "baseLine" | "dimension" | "jointPoint" | "assemble";
	index: number;
}

interface LinesAtPoint {
	point: Vector2;
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
	checkedIdx = Array<number>();
	partner: string;
	cadLength = 0;
	pointsMap: LinesAtPoint[];
	viewMode: "normal" | "partners" | "components" | "slice" = "normal";
	drawDimensions = true;
	drawMTexts = true;
	readonly accuracy = 1;
	readonly selectedColor = 0xffff00;
	readonly hoverColor = 0x00ffff;

	constructor(dialog: MatDialog, cad: CadViewer, dataService: CadDataService) {
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
				const translate = end.sub(start).divide(new Vector2(scale, -scale));
				const data = this.getData(this.cadIdx, -1);
				if (this.viewMode === "components") {
					this.checkedIdx.forEach((i) => {
						data.moveComponent(this.getData(this.cadIdx, i), translate.clone());
					});
				} else {
					data.transform(new CadTransformation({translate}));
				}
				cad.render();
				start.set(event.clientX, event.clientY);
			}
		});
		cad.controls.on("dragend", () => (button = NaN));
		cad.controls.on("wheel", () => this.updatePointsMap());
		window.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				this.blur();
				cad.unselectAll();
			}
		});

		cad.controls.on("entityselect", (event, entity) => {
			if (!environment.production) {
				console.log(entity);
			}
		});
	}

	getData(cadIdx = this.cadIdx, cadIdx2 = this.cadIdx2) {
		const {cad, viewMode} = this;
		let result: CadData;
		if (viewMode === "normal" || viewMode === "slice" || cadIdx2 < 0) {
			result = cad.data.components.data[cadIdx];
		} else if (viewMode === "partners") {
			result = cad.data.components.data[cadIdx].partners[cadIdx2];
		} else if (viewMode === "components") {
			result = cad.data.components.data[cadIdx].components.data[cadIdx2];
		}
		if (!result) {
			result = new CadData();
		}
		return result;
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
		this.focus();
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
		cad.config.selectedColor = this.selectedColor;
		cad.config.hoverColor = this.hoverColor;
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

	generatePointsMap(entities: CadEntities) {
		if (!entities) {
			this.pointsMap = [];
			return;
		}
		const pointsMap: LinesAtPoint[] = [];
		const addToMap = (point: Vector2, line: CadEntity) => {
			const linesAtPoint = pointsMap.find((v) => v.point.distanceTo(point) <= this.accuracy);
			if (linesAtPoint) {
				linesAtPoint.lines.push(line);
			} else {
				pointsMap.push({point, lines: [line], tPoint: this.cad.translatePoint(point), selected: false});
			}
		};
		entities.line.forEach((entity) => {
			const {start, end} = entity;
			if (start.distanceTo(end) > 0) {
				addToMap(start, entity);
				addToMap(end, entity);
			}
		});
		entities.arc.forEach((entity) => {
			const curve = entity.curve;
			if (curve.getLength() > 0) {
				addToMap(curve.getPoint(0), entity);
				addToMap(curve.getPoint(1), entity);
			}
		});
		return pointsMap;
	}

	updatePointsMap() {
		this.pointsMap = this.generatePointsMap(this.getData().getAllEntities());
	}

	focus(cadIdx = this.cadIdx, cadIdx2 = this.cadIdx2, viewMode: CadMenu["viewMode"] = this.viewMode) {
		this.cadIdx = cadIdx;
		this.cadIdx2 = cadIdx2;
		const viewModeChanged = this.viewMode !== viewMode;
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
		}
		if (viewMode === "normal" || viewMode === "slice") {
			const data = this.getData();
			cad.data.components.data.forEach((d) => {
				const opacity = d.id === data.id ? 1 : 0.3;
				const selectable = d.id === data.id ? true : false;
				cad.traverse((o, e) => {
					o.userData.selectable = selectable;
					const m = (o as Mesh).material as Material;
					m.setValues({opacity, transparent: true});
					e.visible = true;
				}, d.getAllEntities());
			});
		} else {
			const data = this.getData(this.cadIdx, -1);
			if (cadIdx2 >= 0) {
				let subData: CadData[];
				if (viewMode === "partners") {
					subData = data.partners;
					data.components.data.forEach((d) => {
						d.getAllEntities().forEach((e) => (e.visible = false));
					});
					cad.traverse((o) => {
						o.userData.selectable = false;
						const m = (o as Mesh).material as Material;
						m.setValues({opacity: 0.3, transparent: true});
					}, data.entities);
				}
				if (viewMode === "components") {
					subData = data.components.data;
					data.partners.forEach((d) => {
						d.getAllEntities().forEach((e) => (e.visible = false));
					});
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
			} else {
				cad.traverse((o) => {
					o.userData.selectable = true;
					const m = (o as Mesh).material as Material;
					m.setValues({opacity: 1});
				}, data.getAllEntities());
			}
		}
		if (viewMode === "slice") {
			cad.controls.config.selectMode = "multiple";
			cad.config.selectedColor = this.selectedColor;
		} else {
			cad.controls.config.selectMode = "single";
			cad.config.selectedColor = null;
		}
		cad.controls.config.dragAxis = "";
		this.updateCadLength();
		cad.traverse(
			(o, e) => {
				if (e.type === CAD_TYPES.mtext) {
					e.visible = this.drawMTexts;
				}
				if (e.type === CAD_TYPES.dimension) {
					e.visible = this.drawDimensions;
				}
				o.userData.selectable = false;
			},
			cad.data.getAllEntities(),
			["mtext", "dimension"]
		);
		cad.render(viewModeChanged);
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

	toggleDimensions() {
		this.drawDimensions = !this.drawDimensions;
		this.cad.data.getAllEntities().dimension.forEach((e) => (e.visible = this.drawDimensions));
		this.cad.render();
	}

	toggleMtexts() {
		this.drawMTexts = !this.drawMTexts;
		this.cad.data.getAllEntities().mtext.forEach((e) => (e.visible = this.drawMTexts));
		this.cad.render();
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
